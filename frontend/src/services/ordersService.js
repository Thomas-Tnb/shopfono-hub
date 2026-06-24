import axios from "axios";

async function buscarPedidos(guardaPedidos) {
  try {
    const response = await axios.get(import.meta.env.VITE_API_URL);
    guardaPedidos(response.data.data);
  } catch (err) {
    console.log(`Erro ao buscar pedidos : ${err}`);
  }
}

export async function sincronizarPedido(id) {
  const response = await axios.post(
    `${import.meta.env.VITE_API_URL}/${id}/reprocess`,
  );
  return response.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sincronizarTodos(pedidos, onProgresso) {
  const LOTE = 3;
  const INTERVALO_MS = 1000;

  let sucesso = 0;
  let erro = 0;

  for (let i = 0; i < pedidos.length; i += LOTE) {
    const lote = pedidos.slice(i, i + LOTE);

    const resultados = await Promise.allSettled(
      lote.map((pedido) => sincronizarPedido(pedido._id)),
    );

    sucesso += resultados.filter((r) => r.status === "fulfilled").length;
    erro += resultados.filter((r) => r.status === "rejected").length;

    onProgresso?.({
      sucesso,
      erro,
      total: pedidos.length,
      processados: i + lote.length,
    });

    // aguarda 1s antes do próximo lote, exceto no último
    if (i + LOTE < pedidos.length) {
      await sleep(INTERVALO_MS);
    }
  }

  return { sucesso, erro };
}

export default buscarPedidos;
