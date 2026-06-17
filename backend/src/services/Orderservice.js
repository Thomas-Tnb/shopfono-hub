import Order from "../models/Order.js";
import { obterStatusBagy } from "../utils/situacoes.js";

const PAGAMENTOS_VINDI = ["creditcard", "debitcard", "billet"];

// ── RF-002, RF-003, RF-004 ───────────────────────────────────────────────────
export const criarPedido = async (payload) => {
  const { customer, address, payment, items } = payload.data;

  return await Order.findOneAndUpdate(
    // 1º argumento — apenas o filtro
    {
      pedido_bagy_id: String(payload.data.id || payload.id),
    },
    // 2º argumento — o que salvar/atualizar
    {
      $set: {
        numero_pedido_bagy: payload.data.code,
        nome_cliente: `${customer.first_name} ${customer.last_name}`,
        cliente: {
          nome: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          cpf_cnpj: customer.doc,
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
        itens: items.map((item) => ({
          produto_id: String(item.product_id),
          nome: item.name,
          variacao: item.variation,
          quantidade: item.quantity,
          preco_unitario: item.price,
          preco_total: item.total,
        })),
        valor_total: payload.data.total,
        forma_pagamento: payment.method,
        token_transaction_vindi: payment.token ?? null,
        status_pedido_bagy: obterStatusBagy(payload.event),
        webhook_original: payload,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );
};

// Orquestrador do processamento ───────────────────────────────────
export const processarPedido = async (pedido) => {
  console.log("Processando pedido...");
  try {
    const pedidoCompleto = await Order.findById(pedido._id).lean();

    if (!pedidoCompleto) {
      throw new Error(`Pedido ${pedido._id} não encontrado no banco.`);
    }

    if (PAGAMENTOS_VINDI.includes(pedidoCompleto.forma_pagamento)) {
      const { consultarTransacaoVindi } = await import("./vindiService.js");
      const transaction_id = await consultarTransacaoVindi(
        pedidoCompleto.token_transaction_vindi,
      );
      await Order.findByIdAndUpdate(pedidoCompleto._id, { transaction_id });
    }
  } catch (error) {
    console.error(
      `Erro no processamento do pedido ${pedido._id}:`,
      error.message,
    );
    throw error;
  }
};
