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

const buscarPedidoCompletoNoBling = async (bling_pedido_id) => {
  const client = await blingRequest();

  const { data } = await client.get(
    `/Api/v3/pedidos/vendas/${bling_pedido_id}`,
  );

  return data?.data ?? null;
};

// Para validar no reprocessamento
const camposEsperadosDaAtualizacao = (payload) => {
  const itens = Array.isArray(payload?.itens) ? payload.itens : [];
  const parcelas = Array.isArray(payload?.parcelas) ? payload.parcelas : [];
  const volumes = Array.isArray(payload?.volumes) ? payload.volumes : [];

  return {
    naturezaOperacaoIds: itens
      .map((item) => item?.naturezaOperacao?.id)
      .filter((id) => id != null),
    formaPagamentoIds: parcelas
      .map((parcela) => parcela?.formaPagamento?.id)
      .filter((id) => id != null),
    observacoes: parcelas.map((parcela) =>
      String(parcela?.observacoes ?? "").trim(),
    ),
    servicosTransporte: volumes
      .map((volume) => volume?.servico)
      .filter((servico) => servico != null),
  };
};

// Reprocessamento para validação
const validarPedidoAtualizado = (
  pedidoMongo,
  payloadEsperado,
  pedidoBlingAtualizado,
) => {
  if (!pedidoBlingAtualizado) {
    throw new Error(
      `Pedido ${pedidoMongo?.bling_pedido_id ?? "desconhecido"} nao retornou na validacao pos-PUT.`,
    );
  }

  const esperados = camposEsperadosDaAtualizacao(payloadEsperado);
  const itensAtualizados = Array.isArray(pedidoBlingAtualizado.itens)
    ? pedidoBlingAtualizado.itens
    : [];
  const parcelasAtualizadas = Array.isArray(pedidoBlingAtualizado.parcelas)
    ? pedidoBlingAtualizado.parcelas
    : [];
  const volumesAtualizados = Array.isArray(
    pedidoBlingAtualizado.transporte?.volumes,
  )
    ? pedidoBlingAtualizado.transporte.volumes
    : [];

  const falhas = [];

  if (esperados.naturezaOperacaoIds.length > 0) {
    if (itensAtualizados.length === 0) {
      falhas.push("naturezaOperacao");
    }

    const itensComNaturezaEsperada = itensAtualizados.every(
      (item) => item?.naturezaOperacao?.id === esperados.naturezaOperacaoIds[0],
    );

    if (!itensComNaturezaEsperada) {
      falhas.push("naturezaOperacao");
    }
  }

  if (esperados.formaPagamentoIds.length > 0) {
    if (parcelasAtualizadas.length === 0) {
      falhas.push("formaPagamento");
    }

    const parcelasComFormaEsperada = parcelasAtualizadas.every(
      (parcela) =>
        parcela?.formaPagamento?.id === esperados.formaPagamentoIds[0],
    );

    if (!parcelasComFormaEsperada) {
      falhas.push("formaPagamento");
    }
  }

  if (esperados.observacoes.length > 0) {
    if (parcelasAtualizadas.length === 0) {
      falhas.push("observacoes");
    }

    const parcelasComObservacaoEsperada = parcelasAtualizadas.every(
      (parcela) =>
        String(parcela?.observacoes ?? "").trim() === esperados.observacoes[0],
    );

    if (!parcelasComObservacaoEsperada) {
      falhas.push("observacoes");
    }
  }

  if (esperados.servicosTransporte.length > 0) {
    if (volumesAtualizados.length === 0) {
      falhas.push("servicoTransporte");
    }

    const volumesComServicoEsperado = volumesAtualizados.every(
      (volume) => volume?.servico === esperados.servicosTransporte[0],
    );

    if (!volumesComServicoEsperado) {
      falhas.push("servicoTransporte");
    }
  }

  if (falhas.length > 0) {
    throw new Error(
      `Pedido ${pedidoMongo?.bling_pedido_id ?? "desconhecido"} nao foi validado corretamente no Bling. Campos divergentes: ${falhas.join(", ")}`,
    );
  }

  return {
    codigo_rastreio: extrairCodigoRastreio(pedidoBlingAtualizado),
    status_pedido_bling: obterSituacaoBling(
      Number(pedidoBlingAtualizado.situacao?.id ?? null),
    ),
  };
};

const atualizarPedidoNoBling = async (pedidoMongo, bling_pedido_id) => {
  const client = await blingRequest();
  const pedidoBlingAtual = await buscarPedidoCompletoNoBling(bling_pedido_id);

  if (!pedidoBlingAtual) {
    throw new Error(
      `Pedido ${bling_pedido_id} nao encontrado na Bling para atualizar.`,
    );
  }

  const payload = montarPayloadAtualizacaoPedidoBling(
    pedidoMongo,
    pedidoBlingAtual,
  );

  await client.put(`/Api/v3/pedidos/vendas/${bling_pedido_id}`, payload);

  const pedidoBlingAtualizado =
    await buscarPedidoCompletoNoBling(bling_pedido_id);
  const validacao = validarPedidoAtualizado(
    pedidoMongo,
    payload,
    pedidoBlingAtualizado,
  );

  return {
    payload,
    pedidoBlingAtualizado,
    validacao,
  };
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

const vincularPedidoAoEstadoAtualizado = async (
  pedidoId,
  pedidoBlingAtualizado,
  codigoRastreio,
) => {
  await Order.findByIdAndUpdate(pedidoId, {
    status_pedido_bling: obterSituacaoBling(
      Number(pedidoBlingAtualizado?.situacao?.id ?? null),
    ),
    codigo_rastreio: codigoRastreio,
    ultima_sincronizacao: new Date(),
  });
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

  const pedidoAtualizado = await Order.findByIdAndUpdate(
    pedido._id,
    {
      bling_pedido_id,
      status_pedido_bling: obterSituacaoBling(Number(situacao_id)),
      ultima_sincronizacao: new Date(),
    },
    { new: true },
  );

  const { pedidoBlingAtualizado, validacao } = await atualizarPedidoNoBling(
    pedidoAtualizado,
    bling_pedido_id,
  );

  await vincularPedidoAoEstadoAtualizado(
    pedidoAtualizado._id,
    pedidoBlingAtualizado,
    validacao.codigo_rastreio,
  );

  if (gerarNotaFiscal) {
    if (pedidoAtualizado?.bling_nota_fiscal_id) {
      console.log(
        `Pedido ${pedido._id} ja possui NF-e ${pedidoAtualizado.bling_nota_fiscal_id}.`,
      );
      const pedidoJaAtualizado = await Order.findById(
        pedidoAtualizado._id,
      ).lean();
      return pedidoJaAtualizado ?? pedidoAtualizado;
    }

    const idNotaFiscal = await gerarNotaFiscalNoBling(bling_pedido_id);
    await vincularNotaFiscalAoPedido(pedidoAtualizado._id, idNotaFiscal);

    console.log(
      `NF-e ${idNotaFiscal} gerada e vinculada ao pedido ${pedidoAtualizado._id}.`,
    );
  }

  console.log(`Bling sincronizado com sucesso para o pedido ${pedido._id}.`);

  const pedidoFinal = await Order.findById(pedidoAtualizado._id).lean();

  return (
    pedidoFinal ?? {
      ...(pedidoAtualizado.toObject?.() ?? pedidoAtualizado),
      codigo_rastreio: validacao.codigo_rastreio,
      status_pedido_bling: validacao.status_pedido_bling,
    }
  );
};

export const gerarNotaFiscalParaPedido = gerarNotaFiscalNoBling;
