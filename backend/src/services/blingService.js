import axios from "axios";
import Order from "../models/Order.js";
import { getAccessToken } from "../utils/blingTokenManager.js";
import { obterSituacaoBling } from "../utils/situacoes.js";
import { montarPayloadAtualizacaoPedidoBling } from "./blingPedidoUpdatePayloadService.js";

const BLING_API = "https://api.bling.com.br";
const RETRY_DELAYS_MS = [5000, 10000, 20000, 30000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const blingRequest = async () => {
  try {
    const token = await getAccessToken();

    return axios.create({
      baseURL: BLING_API,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch (error) {
    console.error(
      "[blingService] Falha ao requisitar token do Bling:",
      error.message,
    );
    throw error;
  }
};

const extrairCodigoRastreio = (pedidoBling) => {
  return pedidoBling?.transporte?.volumes?.[0]?.codigoRastreamento ?? null;
};

const buscarPedidoNoBlingUmaVez = async (pedido_bagy_id) => {
  const client = await blingRequest();

  const { data } = await client.get("/Api/v3/pedidos/vendas", {
    params: { numerosLojas: pedido_bagy_id },
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

const buscarPedidoNoBling = async (pedido_bagy_id) => {
  const delays = [0, ...RETRY_DELAYS_MS];
  let ultimoErro = null;

  for (let tentativa = 0; tentativa < delays.length; tentativa += 1) {
    const esperaMs = delays[tentativa];

    if (esperaMs > 0) {
      console.log(
        `[blingService] Pedido ${pedido_bagy_id} ainda nao disponivel na Bling. Aguardando ${esperaMs}ms antes da tentativa ${tentativa + 1}/${delays.length}...`,
      );
      await sleep(esperaMs);
    }

    try {
      console.log(
        `[blingService] Buscando pedido ${pedido_bagy_id} no Bling. Tentativa ${tentativa + 1}/${delays.length}...`,
      );

      const resultado = await buscarPedidoNoBlingUmaVez(pedido_bagy_id);

      console.log(
        `[blingService] Pedido ${pedido_bagy_id} encontrado no Bling na tentativa ${tentativa + 1}/${delays.length}. bling_pedido_id=${resultado.bling_pedido_id}.`,
      );

      return resultado;
    } catch (error) {
      ultimoErro = error;
      console.warn(
        `[blingService] Tentativa ${tentativa + 1}/${delays.length} falhou para o pedido ${pedido_bagy_id}: ${error.message}`,
      );
    }
  }

  throw new Error(
    `Pedido ${pedido_bagy_id} nao apareceu no Bling apos ${delays.length} tentativas. Ultimo erro: ${ultimoErro?.message ?? "desconhecido"}`,
  );
};

const buscarPedidoCompletoNoBling = async (bling_pedido_id) => {
  const client = await blingRequest();

  console.log(
    `[blingService] Buscando pedido completo ${bling_pedido_id} na Bling...`,
  );

  const { data } = await client.get(`/Api/v3/pedidos/vendas/${bling_pedido_id}`);

  if (!data?.data) {
    throw new Error(
      `Pedido ${bling_pedido_id} nao retornou dados completos na Bling.`,
    );
  }

  return data.data;
};

const atualizarPedidoNoBling = async (pedidoMongo, bling_pedido_id) => {
  console.log(
    `[blingService] Iniciando atualizacao via PUT do pedido ${pedidoMongo?._id ?? "desconhecido"} no Bling. bling_pedido_id=${bling_pedido_id}.`,
  );

  const client = await blingRequest();
  const pedidoBlingAtual = await buscarPedidoCompletoNoBling(bling_pedido_id);
  const payload = montarPayloadAtualizacaoPedidoBling(
    pedidoMongo,
    pedidoBlingAtual,
  );

  console.log(
    `[blingService] Enviando PUT do pedido ${bling_pedido_id} para a Bling...`,
  );
  await client.put(`/Api/v3/pedidos/vendas/${bling_pedido_id}`, payload);

  console.log(
    `[blingService] PUT concluido para o pedido ${bling_pedido_id}. Reconsultando para validacao...`,
  );

  const pedidoBlingAtualizado =
    await buscarPedidoCompletoNoBling(bling_pedido_id);

  return {
    payload,
    pedidoBlingAtualizado,
  };
};

const gerarNotaFiscalNoBling = async (bling_pedido_id) => {
  const client = await blingRequest();

  console.log(
    `[blingService] Gerando NF-e para o pedido ${bling_pedido_id} na Bling...`,
  );

  const { data } = await client.post(
    `/Api/v3/pedidos/vendas/${bling_pedido_id}/gerar-nfe`,
  );

  const idNotaFiscal = data?.data?.idNotaFiscal;

  if (!idNotaFiscal) {
    throw new Error(
      `Bling nao retornou idNotaFiscal ao gerar a NF-e do pedido ${bling_pedido_id}.`,
    );
  }

  return String(idNotaFiscal);
};

const persistirSincronizacao = async (
  pedidoId,
  bling_pedido_id,
  pedidoBlingAtualizado,
) => {
  const situacao_id = pedidoBlingAtualizado?.situacao?.id ?? null;
  const codigo_rastreio = extrairCodigoRastreio(pedidoBlingAtualizado);

  await Order.findByIdAndUpdate(pedidoId, {
    bling_pedido_id,
    status_pedido_bling: obterSituacaoBling(Number(situacao_id)),
    codigo_rastreio,
    ultima_sincronizacao: new Date(),
  });

  return {
    situacao_id,
    codigo_rastreio,
  };
};

const persistirNotaFiscal = async (pedidoId, idNotaFiscal) => {
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
  try {
    console.log(
      `[blingService] Iniciando sincronizacao do pedido ${pedido?._id ?? "desconhecido"} com a Bling...`,
    );

    const { bling_pedido_id, situacao_id } = await buscarPedidoNoBling(
      pedido.pedido_bagy_id,
    );

    await Order.findByIdAndUpdate(pedido._id, {
      bling_pedido_id,
      status_pedido_bling: obterSituacaoBling(Number(situacao_id)),
      ultima_sincronizacao: new Date(),
    });

    console.log(
      `[blingService] bling_pedido_id ${bling_pedido_id} salvo no Mongo para o pedido ${pedido._id}.`,
    );

    const pedidoAtualizado = await Order.findById(pedido._id).lean();

    if (!pedidoAtualizado) {
      throw new Error(`Pedido ${pedido._id} nao encontrado no Mongo apos sync.`);
    }

    const { payload, pedidoBlingAtualizado } = await atualizarPedidoNoBling(
      pedidoAtualizado,
      bling_pedido_id,
    );

    const { codigo_rastreio } = await persistirSincronizacao(
      pedido._id,
      bling_pedido_id,
      pedidoBlingAtualizado,
    );

    if (gerarNotaFiscal) {
      if (pedidoAtualizado.bling_nota_fiscal_id) {
        console.log(
          `[blingService] Pedido ${pedido._id} ja possui NF-e ${pedidoAtualizado.bling_nota_fiscal_id}. Pulando geracao.`,
        );
      } else {
        const idNotaFiscal = await gerarNotaFiscalNoBling(bling_pedido_id);
        await persistirNotaFiscal(pedido._id, idNotaFiscal);
        console.log(
          `[blingService] NF-e ${idNotaFiscal} gerada com sucesso para o pedido ${pedido._id}.`,
        );
      }
    }

    console.log(
      `[blingService] Sincronizacao concluida para o pedido ${pedido._id}. bling_pedido_id=${bling_pedido_id}, codigo_rastreio=${codigo_rastreio}.`,
    );

    return {
      bling_pedido_id,
      codigo_rastreio,
      payload_enviado: payload,
    };
  } catch (error) {
    console.error(
      `[blingService] Falha na sincronizacao do pedido ${pedido?._id ?? "desconhecido"} com a Bling:`,
      error.message,
    );

    if (pedido?._id) {
      await Order.findByIdAndUpdate(pedido._id, {
        erro_nota_fiscal: error.message,
      }).catch(() => {});
    }

    throw error;
  }
};

export const gerarNotaFiscalParaPedido = gerarNotaFiscalNoBling;
