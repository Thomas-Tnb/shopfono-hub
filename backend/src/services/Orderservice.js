import Order from "../models/Order.js";

// Formas de pagamento que exigem consulta à Vindi (RF-026)
const PAGAMENTOS_VINDI = ["credit_card", "debit_card", "boleto"];

// ── RF-002, RF-003, RF-004 ───────────────────────────────────────────────────
export const criarPedido = async (payload) => {
  const { customer, address, payment, items } = payload;

  const pedido = new Order({
    // Identificação
    pedido_bagy_id: String(payload.id),
    numero_pedido_bagy: String(payload.code),

    // Cliente
    cliente: {
      nome: customer.name,
      email: customer.email,
      cpf_cnpj: customer.cgc,
      telefone: customer.phone,
      endereco: {
        cep: address.zipcode,
        rua: address.street,
        numero: address.number,
        complemento: address.detail,
        bairro: address.district,
        cidade: address.city,
        estado: address.state,
      },
    },

    // Itens
    itens: items.map((item) => ({
      produto_id: String(item.product_id),
      nome: item.name,
      variacao: item.variation ?? null,
      quantidade: item.quantity,
      preco_unitario: parseFloat(item.price),
      preco_total: parseFloat(item.total),
      sku: item.sku,
    })),

    // Financeiro
    valor_total: parseFloat(payload.total),
    forma_pagamento: payment.method,
    token_transaction_vindi: String(payment.token),

    // RF-003
    status_pedido: "PAGO",

    // RF-004
    webhook_original: payload,
  });

  await pedido.save();
  return pedido;
};

// ── RF-005 — orquestrador do processamento ───────────────────────────────────
export const processarPedido = async (pedido) => {
  try {
    // RF-026/027 — consulta Vindi apenas para cartão e boleto
    if (PAGAMENTOS_VINDI.includes(pedido.forma_pagamento)) {
      const { consultarTransacaoVindi } = await import("./vindiService.js");
      const transaction_id = await consultarTransacaoVindi(
        pedido.token_transaction_vindi,
      );

      await Order.findByIdAndUpdate(pedido._id, { transaction_id });
    }

    // RF-008 ao RF-012 — consulta Bling e atualiza pedido
    const { sincronizarComBling } = await import("./blingService.js");
    await sincronizarComBling(pedido);
  } catch (error) {
    console.error(
      `Erro no processamento do pedido ${pedido._id}:`,
      error.message,
    );
    throw error;
  }
};
