import { getServicoTransporte } from "../utils/servicoTransporte.js";
import { getFormaPagamentoId } from "../utils/formasPagamento.js";

export const montarPayloadAtualizacaoPedidoBling = (
  pedidoMongo,
  pedidoBlingAtual,
) => {
  if (!pedidoBlingAtual) {
    throw new Error("pedidoBlingAtual é obrigatorio para montar o payload.");
  }

  const payload = { ...pedidoBlingAtual };

  const formaPagamentoId = getFormaPagamentoId(
    pedidoMongo?.forma_pagamento,
    payload.parcelas ?? [],
  );
  const servicoTransporte = getServicoTransporte(
    pedidoMongo?.correio,
    payload.parcelas,
  );
  const observacoes = String(
    pedidoMongo?.transaction_id ?? "Transferencia Bancaria",
  ).trim();

  if (typeof formaPagamentoId !== "number") {
    throw new Error(
      `Forma de pagamento invalida para o pedido ${pedidoMongo?._id ?? "desconhecido"}: ${formaPagamentoId}`,
    );
  }

  if (typeof servicoTransporte !== "string") {
    throw new Error(
      `Servico de transporte invalido para o pedido ${pedidoMongo?._id ?? "desconhecido"}: ${servicoTransporte}`,
    );
  }

  if (pedidoMongo?.id_natureza_operacao == null) {
    throw new Error(
      `Natureza de operacao nao encontrada para o pedido ${pedidoMongo?._id ?? "desconhecido"}.`,
    );
  }

  if (Array.isArray(payload.itens)) {
    payload.itens = payload.itens.map((item) => ({
      ...item,
      naturezaOperacao: {
        ...(item.naturezaOperacao || {}),
        id: pedidoMongo.id_natureza_operacao,
      },
    }));
  }

  if (Array.isArray(payload.parcelas)) {
    payload.parcelas = payload.parcelas.map((parcela) => ({
      ...parcela,
      observacoes,
      formaPagamento: {
        ...(parcela.formaPagamento || {}),
        id: formaPagamentoId,
      },
    }));
  } else {
    payload.parcelas = [
      {
        observacoes,
        formaPagamento: {
          id: formaPagamentoId,
        },
      },
    ];
  }

  if (Array.isArray(payload.volumes)) {
    payload.volumes = payload.volumes.map((volume) => ({
      ...volume,
      servico: servicoTransporte,
    }));
  } else {
    payload.volumes = [
      {
        servico: servicoTransporte,
      },
    ];
  }

  return payload;
};

export default montarPayloadAtualizacaoPedidoBling;
