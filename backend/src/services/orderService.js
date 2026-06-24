import Order from "../models/Order.js";
import { obterStatusBagy } from "../utils/situacoes.js";
import getIdNaturezaOperacao from "../utils/naturezaDaOperacao.js";

const PAGAMENTOS_VINDI = ["creditcard", "debitcard", "billet"];

// Salvando webhook Bagy no mongoDB
export const criarPedido = async (payload) => {
  try {
    const { customer, address, payment, items } = payload.data;
    const pedidoBagyId = String(payload.data.id || payload.id);

    console.log(
      `[orderService.criarPedido] Salvando pedido Bagy ${pedidoBagyId} no Mongo...`,
    );

    const pedido = await Order.findOneAndUpdate(
      {
        pedido_bagy_id: pedidoBagyId,
      },
      {
        $set: {
          numero_pedido_bagy: payload.data.code,
          nome_cliente: `${customer.first_name} ${customer.last_name}`,
          cliente: {
            nome: `${customer.first_name} ${customer.last_name}`,
            email: customer.email,
            cpf_cnpj: customer.doc,
            ie: customer.ie,
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
          id_natureza_operacao: getIdNaturezaOperacao(
            address.state,
            customer.ie,
          ),
          correio: payload.data.shipping.name,
          valor_total: payload.data.total,
          forma_pagamento: payment.method,
          token_transaction_vindi: payment.token ?? null,
          status_pedido_bagy: obterStatusBagy(payload.event),
          webhook_original: payload,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    console.log(
      `[orderService.criarPedido] Pedido Bagy ${pedidoBagyId} salvo com sucesso no Mongo (${pedido._id}).`,
    );

    return pedido;
  } catch (error) {
    console.error(
      `Erro ao criar/atualizar pedido ${payload?.data?.id}:`,
      error,
    );

    throw error;
  }
};

// Orquestrador do processamento ───────────────────────────────────
export const processarPedido = async (pedido) => {
  console.log(
    `[orderService.processarPedido] Iniciando processamento do pedido ${pedido?._id ?? "desconhecido"}...`,
  );
  try {
    console.log(
      `[orderService.processarPedido] Buscando pedido ${pedido._id} completo no Mongo...`,
    );
    const pedidoCompleto = await Order.findById(pedido._id).lean();

    if (!pedidoCompleto) {
      throw new Error(`Pedido ${pedido._id} não encontrado no banco.`);
    }

    console.log(
      `[orderService.processarPedido] Pedido ${pedido._id} carregado. Forma de pagamento: ${pedidoCompleto.forma_pagamento}.`,
    );

    if (PAGAMENTOS_VINDI.includes(pedidoCompleto.forma_pagamento)) {
      try {
        console.log(
          `[orderService.processarPedido] Consultando Vindi para o pedido ${pedido._id}...`,
        );
        const { consultarTransacaoVindi } = await import("./vindiService.js");
        const transaction_id = await consultarTransacaoVindi(
          pedidoCompleto.token_transaction_vindi,
        );

        await Order.findByIdAndUpdate(pedidoCompleto._id, { transaction_id });
        console.log(
          `[orderService.processarPedido] Vindi concluída para o pedido ${pedido._id}. transaction_id=${transaction_id}.`,
        );
      } catch (error) {
        console.error(
          `Falha ao consultar Vindi para o pedido ${pedido._id}:`,
          error.message,
        );
      }
    } else {
      console.log(
        `[orderService.processarPedido] Pedido ${pedido._id} não exige consulta à Vindi.`,
      );
    }

    try {
      console.log(
        `[orderService.processarPedido] Iniciando sincronização com Bling para o pedido ${pedido._id}...`,
      );
      const { sincronizarComBling } = await import("./blingService.js");
      await sincronizarComBling(pedidoCompleto, { gerarNotaFiscal: true });
      console.log(
        `[orderService.processarPedido] Sincronização com Bling concluída para o pedido ${pedido._id}.`,
      );
    } catch (error) {
      console.error(
        `[orderService.processarPedido] Falha ao sincronizar pedido ${pedido._id} com a Bling:`,
        error.message,
      );
      throw error;
    }

    console.log(
      `[orderService.processarPedido] Processamento finalizado para o pedido ${pedido._id}.`,
    );
  } catch (error) {
    console.error(
      `Erro no processamento do pedido ${pedido._id}:`,
      error.message,
    );
    throw error;
  }
};
