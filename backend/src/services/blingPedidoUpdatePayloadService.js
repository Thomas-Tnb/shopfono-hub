import { getServicoTransporte } from "../utils/servicoTransporte.js";
import { getFormaPagamentoId } from "../utils/formasPagamento.js";

export const montarPayloadAtualizacaoPedidoBling = (
  pedidoMongo,
  pedidoBlingAtual,
) => {
  const pedidoId = pedidoMongo?._id ?? "desconhecido";

  try {
    console.log(
      `[blingPedidoUpdatePayloadService] Montando payload do pedido ${pedidoId}...`,
    );

    if (!pedidoBlingAtual) {
      throw new Error("pedidoBlingAtual e obrigatorio para montar o payload.");
    }

    const payload = { ...pedidoBlingAtual };

    console.log(
      `[blingPedidoUpdatePayloadService] Resolvendo mapeamentos do pedido ${pedidoId}. forma_pagamento=${pedidoMongo?.forma_pagamento}, correio=${pedidoMongo?.correio}, parcelas=${payload.parcelas?.length ?? 0}.`,
    );

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

    console.log(
      `[blingPedidoUpdatePayloadService] Mapeamentos resolvidos para o pedido ${pedidoId}. formaPagamentoId=${formaPagamentoId}, servicoTransporte=${servicoTransporte}, observacoes=${observacoes}.`,
    );

    if (typeof formaPagamentoId !== "number") {
      throw new Error(
        `Forma de pagamento invalida para o pedido ${pedidoId}: ${formaPagamentoId}`,
      );
    }

    if (typeof servicoTransporte !== "string") {
      throw new Error(
        `Servico de transporte invalido para o pedido ${pedidoId}: ${servicoTransporte}`,
      );
    }

    if (pedidoMongo?.id_natureza_operacao == null) {
      throw new Error(
        `Natureza de operacao nao encontrada para o pedido ${pedidoId}.`,
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

    console.log(
      `[blingPedidoUpdatePayloadService] Payload do pedido ${pedidoId} montado com sucesso. itens=${payload.itens?.length ?? 0}, parcelas=${payload.parcelas?.length ?? 0}, volumes=${payload.volumes?.length ?? 0}.`,
    );

    return payload;
  } catch (error) {
    console.error(
      `[blingPedidoUpdatePayloadService] Falha ao montar payload do pedido ${pedidoId}:`,
      error.message,
    );
    throw error;
  }
};

export default montarPayloadAtualizacaoPedidoBling;
