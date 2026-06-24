import axios from "axios";
import Order from "../models/Order.js";
import { getAccessToken } from "../utils/blingTokenManager.js";
import { obterSituacaoBling } from "../utils/situacoes.js";
import { montarPayloadAtualizacaoPedidoBling } from "./blingPedidoUpdatePayloadService.js";

const BLING_API = "https://api.bling.com.br";

const blingRequest = async () => {
  const token = await getAccessToken();

  return axios.create({
    baseURL: BLING_API,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
};

const buscarPedidoNoBling = async (pedido_bagy_id) => {
  const client = await blingRequest();

  const { data } = await client.get("/Api/v3/pedidos/vendas", {
    params: { numerosLojas: [pedido_bagy_id] },
  });

  const pedidoBling = data?.data?.[0];

  if (!pedidoBling) {
    throw new Error(
      `Pedido com numerosLojas=${pedido_bagy_id} nao encontrado no Bling.`,
    );
  }

  return {
    bling_pedido_id: String(pedidoBling.id),
    situacao_id: pedidoBling.situacao?.id ?? null,
  };
};

const buscarCodigoRastreio = async (bling_pedido_id) => {
  const client = await blingRequest();

  const { data } = await client.get(`/Api/v3/pedidos/vendas/${bling_pedido_id}`);

  return data?.data?.transporte?.volumes?.[0]?.codigoRastreamento ?? null;
};

const buscarPedidoCompletoNoBling = async (bling_pedido_id) => {
  const client = await blingRequest();

  const { data } = await client.get(`/Api/v3/pedidos/vendas/${bling_pedido_id}`);

  return data?.data ?? null;
};

const atualizarPedidoNoBling = async (pedidoMongo, bling_pedido_id) => {
  const client = await blingRequest();
  const pedidoBlingAtual = await buscarPedidoCompletoNoBling(bling_pedido_id);

  if (!pedidoBlingAtual) {
    throw new Error(`Pedido ${bling_pedido_id} nao encontrado na Bling para atualizar.`);
  }

  const payload = montarPayloadAtualizacaoPedidoBling(
    pedidoMongo,
    pedidoBlingAtual,
  );

  await client.put(`/Api/v3/pedidos/vendas/${bling_pedido_id}`, payload);

  return payload;
};

const gerarNotaFiscalNoBling = async (bling_pedido_id) => {
  const client = await blingRequest();

  const { data } = await client.post(
    `/Api/v3/pedidos/vendas/${bling_pedido_id}/gerar-nfe`,
  );

  const idNotaFiscal = data?.data?.idNotaFiscal;

  if (!idNotaFiscal) {
    throw new Error(
      `Bling nao retornou idNotaFiscal ao gerar a nota do pedido ${bling_pedido_id}.`,
    );
  }

  return String(idNotaFiscal);
};

const vincularNotaFiscalAoPedido = async (pedidoId, idNotaFiscal) => {
  await Order.findByIdAndUpdate(pedidoId, {
    bling_nota_fiscal_id: idNotaFiscal,
    status_nota_fiscal: "GERADA",
    ultima_emissao_nota: new Date(),
    erro_nota_fiscal: null,
  });
};

export const sincronizarComBling = async (
  pedido,
  { gerarNotaFiscal = false } = {},
) => {
  const { bling_pedido_id, situacao_id } = await buscarPedidoNoBling(
    pedido.pedido_bagy_id,
  );
  const codigo_rastreio = await buscarCodigoRastreio(bling_pedido_id);

  const pedidoAtualizado = await Order.findByIdAndUpdate(
    pedido._id,
    {
      bling_pedido_id,
      status_pedido_bling: obterSituacaoBling(Number(situacao_id)),
      codigo_rastreio,
      ultima_sincronizacao: new Date(),
    },
    { new: true },
  );

  if (gerarNotaFiscal) {
    if (pedidoAtualizado?.bling_nota_fiscal_id) {
      console.log(
        `Pedido ${pedido._id} ja possui NF-e ${pedidoAtualizado.bling_nota_fiscal_id}.`,
      );
      return pedidoAtualizado;
    }

    await atualizarPedidoNoBling(pedidoAtualizado, bling_pedido_id);

    const idNotaFiscal = await gerarNotaFiscalNoBling(bling_pedido_id);
    await vincularNotaFiscalAoPedido(pedidoAtualizado._id, idNotaFiscal);

    console.log(
      `NF-e ${idNotaFiscal} gerada e vinculada ao pedido ${pedidoAtualizado._id}.`,
    );
  }

  console.log(`Bling sincronizado com sucesso para o pedido ${pedido._id}.`);

  return pedidoAtualizado;
};

export const gerarNotaFiscalParaPedido = gerarNotaFiscalNoBling;
