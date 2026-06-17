export const SITUACOES_BLING = {
  6: "EM_ABERTO",
  9: "ATENDIDO",
  12: "CANCELADO",
  15: "EM_ANDAMENTO",
  18: "VENDA_AGENCIADA",
  21: "EM_DIGITACAO",
  24: "VERIFICADO",
};

export const obterSituacaoBling = (id) => {
  return SITUACOES_BLING[id] ?? "DESCONHECIDO";
};

export const STATUS_BAGY = {
  "order.created": "CRIADO",
  "order.approved": "APROVADO",
  "order.paid": "PAGO",
  "order.cancelled": "CANCELADO",
  "order.shipped": "ENVIADO",
};

export const obterStatusBagy = (evento) => {
  return STATUS_BAGY[evento] ?? "DESCONHECIDO";
};
