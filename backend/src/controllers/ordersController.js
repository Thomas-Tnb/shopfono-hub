import Order from "../models/Order.js";
import { sincronizarComBling } from "../services/blingService.js";
import axios from "axios";
import { getAccessToken } from "../utils/blingTokenManager.js";
import { montarPayloadAtualizacaoPedidoBling } from "../services/blingPedidoUpdatePayloadService.js";

const BLING_API = "https://api.bling.com.br";

const criarClientBling = async () => {
  const token = await getAccessToken();

  return axios.create({
    baseURL: BLING_API,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
};

// GET /api/orders
// Query params opcionais:
//   pedidosDeHoje : 'true'  — filtra updatedAt no dia corrente
export const getOrders = async (req, res) => {
  try {
    const { status_pedido_bling, pedidosDeHoje } = req.query;

    const filtro = {};

    if (status_pedido_bling) {
      filtro.status_pedido_bling = status_pedido_bling;
    }

    if (pedidosDeHoje === "true") {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);

      const fim = new Date();
      fim.setHours(23, 59, 59, 999);

      filtro.updatedAt = { $gte: inicio, $lte: fim };
    }

    // Projeta apenas os campos necessários para a listagem
    // webhook_original e itens completos ficam de fora para aliviar o payload
    const pedidos = await Order.find(filtro)
      .select(
        "pedido_bagy_id numero_pedido_bagy cliente.nome forma_pagamento transaction_id natureza_operacao correio valor_total status_pedido_bagy status_pedido_bling createdAt updatedAt",
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: pedidos });
  } catch (error) {
    console.error("[getOrders] Erro:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Erro ao listar pedidos." });
  }
};

// GET /api/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const pedido = await Order.findById(req.params.id).select(
      "-webhook_original",
    );

    if (!pedido) {
      return res
        .status(404)
        .json({ success: false, message: "Pedido não encontrado." });
    }

    return res.status(200).json({ success: true, data: pedido });
  } catch (error) {
    console.error("[getOrderById] Erro:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Erro ao buscar pedido." });
  }
};

// POST /api/orders/:id/reprocess
export const reprocessOrder = async (req, res) => {
  try {
    const pedido = await Order.findById(req.params.id).lean();

    if (!pedido) {
      return res
        .status(404)
        .json({ success: false, message: "Pedido não encontrado." });
    }

    await sincronizarComBling(pedido);

    return res
      .status(200)
      .json({ success: true, message: "Pedido sincronizado com sucesso." });
  } catch (error) {
    console.error("[reprocessOrder] Erro:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Erro ao sincronizar pedido." });
  }
};

// POST /api/orders/:id/test-put-bling
export const testPutBlingOrder = async (req, res) => {
  try {
    const pedido = await Order.findById(req.params.id).lean();

    if (!pedido) {
      return res
        .status(404)
        .json({ success: false, message: "Pedido nao encontrado." });
    }

    if (!pedido.bling_pedido_id) {
      return res.status(400).json({
        success: false,
        message:
          "Pedido ainda nao possui bling_pedido_id. Sincronize com a Bling primeiro.",
      });
    }

    console.log(
      `[testPutBlingOrder] Iniciando teste de PUT para o pedido ${pedido._id}. bling_pedido_id=${pedido.bling_pedido_id}.`,
    );

    const client = await criarClientBling();

    const { data: pedidoAtualData } = await client.get(
      `/Api/v3/pedidos/vendas/${pedido.bling_pedido_id}`,
    );

    const pedidoBlingAtual = pedidoAtualData?.data;

    if (!pedidoBlingAtual) {
      return res.status(404).json({
        success: false,
        message: "Pedido nao encontrado na Bling para teste de PUT.",
      });
    }

    const payload = montarPayloadAtualizacaoPedidoBling(
      pedido,
      pedidoBlingAtual,
    );

    console.log(
      `[testPutBlingOrder] Enviando PUT para o pedido ${pedido.bling_pedido_id} na Bling...`,
    );
    await client.put(`/Api/v3/pedidos/vendas/${pedido.bling_pedido_id}`, payload);

    const { data: pedidoAtualizadoData } = await client.get(
      `/Api/v3/pedidos/vendas/${pedido.bling_pedido_id}`,
    );

    const pedidoBlingAtualizado = pedidoAtualizadoData?.data ?? null;

    console.log(
      `[testPutBlingOrder] PUT concluido para o pedido ${pedido.bling_pedido_id}.`,
    );

    return res.status(200).json({
      success: true,
      message: "Teste de PUT executado com sucesso.",
      data: {
        pedido_id: pedido._id,
        bling_pedido_id: pedido.bling_pedido_id,
        payload_enviado: payload,
        pedido_bling_antes: pedidoBlingAtual,
        pedido_bling_depois: pedidoBlingAtualizado,
      },
    });
  } catch (error) {
    console.error("[testPutBlingOrder] Erro:", error.message);
    console.error(
      "[testPutBlingOrder] Detalhe retorno Bling:",
      JSON.stringify(error.response?.data ?? null),
    );
    return res.status(500).json({
      success: false,
      message: "Erro ao testar PUT do pedido na Bling.",
      error: error.message,
      detalhe_bling: error.response?.data ?? null,
    });
  }
};
