import axios from "axios";

async function buscarPedidos(guardaPedidos) {
  try {
    const response = await axios.get("http://localhost:3000/api/orders");
    guardaPedidos(response.data.data);
    console.log(response.data.data);
  } catch (err) {
    console.log(`Erro ao buscar pedidos : ${err}`);
  }
}

export default buscarPedidos;
