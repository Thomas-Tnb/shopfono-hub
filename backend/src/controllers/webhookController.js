import { criarPedido, processarPedido } from "../services/orderService.js";

// RF-001 - POST /webhooks/bagy/order
export const receberPedidoBagy = async (req, res) => {
  try {
    const payload = req.body;
    const evento = payload?.event ?? "desconhecido";

    console.log(`Webhook Bagy recebido: ${evento} (${payload?.id ?? "sem id"})`);

    // RF-002, RF-003, RF-004 - salva imediatamente
    const pedido = await criarPedido(payload);

    // RF-005 - responde antes de processar (nao bloqueia o webhook)
    res.status(200).json({ received: true, pedido_id: pedido._id });

    // Somente pedidos aprovados disparam o processamento em background
    if (evento === "order.approved") {
      console.log(
        `Pedido ${pedido._id} aprovado. Iniciando processamento em background.`,
      );

      processarPedido(pedido).catch((err) => {
        console.error(`Erro ao processar pedido ${pedido._id}:`, err.message);
      });
    }
  } catch (error) {
    console.error("Erro no webhook Bagy:", error.message);
    res.status(500).json({ error: "Erro ao processar webhook." });
  }
};
