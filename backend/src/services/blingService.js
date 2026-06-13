import axios from "axios";
import Order from "../models/Order.js";
import { getAccessToken } from "../utils/blingTokenManager.js";

const BLING_API = "https://api.bling.com.br";

// Instância axios com o token injetado antes de cada chamada
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
  } catch (err) {
    console.log("Falha ao requisitar token: " + err);
  }
};

// Busca o pedido no Bling pelo número da loja (pedido_bagy_id)
const buscarPedidoNoBling = async (pedido_bagy_id) => {
  try {
    const client = await blingRequest();

    const { data } = await client.get("/Api/v3/pedidos/vendas", {
      params: { numerosLojas: pedido_bagy_id },
    });

    const pedidoBling = data?.data?.[0];

    if (!pedidoBling) {
      throw new Error(
        `Pedido com numerosLojas=${pedido_bagy_id} não encontrado no Bling.`,
      );
    }

    return {
      bling_pedido_id: String(pedidoBling.id),
      status_pedido: String(pedidoBling.situacao.id),
    };
  } catch (err) {
    console.log(`Falha ao buscar pedido no Bling : ${err}`);
  }
};

// Busca o código de rastreio pelo bling_pedido_id
const buscarCodigoRastreio = async (bling_pedido_id) => {
  try {
    const client = await blingRequest();

    const { data } = await client.get(
      `/Api/v3/pedidos/vendas/${bling_pedido_id}`,
    );

    const codigo_rastreio =
      data?.data?.transporte?.volumes?.[0]?.codigoRastreamento ?? null;

    return codigo_rastreio;
  } catch (err) {
    console.log(
      `Falha ao buscar código de rastreio para o pedido : ${bling_pedido_id}`,
    );
  }
};

// ── Orquestrador principal — chamado pelo orderService ───────────────────────
export const sincronizarComBling = async (pedido) => {
  const { bling_pedido_id, status_pedido } = await buscarPedidoNoBling(
    pedido.pedido_bagy_id,
  );

  // Segunda requisição usando o id obtido acima
  const codigo_rastreio = await buscarCodigoRastreio(bling_pedido_id);

  // Atualiza o pedido no banco
  await Order.findByIdAndUpdate(pedido._id, {
    bling_pedido_id,
    status_pedido,
    codigo_rastreio,
    ultima_sincronizacao: new Date(),
  });

  console.log(`Bling sincronizado com sucesso para o pedido ${pedido._id}.`);
};
