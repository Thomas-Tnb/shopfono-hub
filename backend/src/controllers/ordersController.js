import Order from "../models/Order.js";
import { sincronizarComBling } from "../services/blingService.js";

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
        "pedido_bagy_id numero_pedido_bagy cliente.nome forma_pagamento transaction_id valor_total status_pedido_bagy status_pedido_bling createdAt updatedAt",
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
