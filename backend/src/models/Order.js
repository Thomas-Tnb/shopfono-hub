import mongoose from "mongoose";

const EnderecoSchema = new mongoose.Schema(
  {
    cep: { type: String },
    rua: { type: String },
    numero: { type: String },
    complemento: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    estado: { type: String },
  },
  { _id: false },
);

const ClienteSchema = new mongoose.Schema(
  {
    nome: { type: String },
    email: { type: String },
    cpf_cnpj: { type: String },
    telefone: { type: String },
    ie: { type: String },
    endereco: { type: EnderecoSchema },
  },
  { _id: false },
);

const ItemSchema = new mongoose.Schema(
  {
    produto_id: { type: String },
    nome: { type: String },
    variacao: { type: String },
    quantidade: { type: Number },
    preco_unitario: { type: Number },
    preco_total: { type: Number },
    sku: { type: String },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    // Identificacao Bagy
    pedido_bagy_id: { type: String, required: true, unique: true },
    numero_pedido_bagy: { type: String, required: true, unique: true },
    token_transaction_vindi: { type: String, default: null },

    // Cliente
    nome_cliente: { type: String },
    cliente: { type: ClienteSchema },

    // Itens
    itens: { type: [ItemSchema], default: [] },

    // Financeiro
    valor_total: { type: Number, required: true },
    forma_pagamento: { type: String, required: true },

    // Vindi
    transaction_id: { type: String, default: null },

    // Bling
    bling_pedido_id: { type: String, default: null },
    bling_nota_fiscal_id: { type: String, default: null },
    codigo_rastreio: { type: String, default: null },
    ultima_sincronizacao: { type: Date, default: null },
    status_nota_fiscal: { type: String, default: null },
    ultima_emissao_nota: { type: Date, default: null },
    erro_nota_fiscal: { type: String, default: null },
    natureza_operacao: { type: String, default: null },
    correio: { type: String, default: null },

    // Status
    status_pedido_bagy: { type: String, default: null },
    status_pedido_bling: { type: String, default: null },

    // Payload original
    webhook_original: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
    collection: "orders",
  },
);

OrderSchema.index({ status_pedido_bagy: 1 });
OrderSchema.index({ status_pedido_bling: 1 });
OrderSchema.index({ updatedAt: -1 });
OrderSchema.index({ bling_pedido_id: 1 });
OrderSchema.index({ bling_nota_fiscal_id: 1 });

const Order = mongoose.model("Order", OrderSchema);

export default Order;
