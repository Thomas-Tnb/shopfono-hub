export const getFormaPagamentoId = (formaPagamento, parcelas = []) => {
  const qtdParcelas = parcelas.length;

  switch (formaPagamento) {
    case "pix":
      return 750841;

    case "Dinheiro":
      return 18793;

    case "debitcard":
      return 750829;

    case "billet":
      return 750835;

    case "creditcard":
      switch (qtdParcelas) {
        case 1:
          return 3129230;
        case 2:
          return 3129233;
        case 3:
          return 3129235;
        case 4:
          return 3129236;
        default:
          return "Quantidade de parcelas não encontrada.";
      }

    default:
      return "Forma de pagamento não encontrada.";
  }
};
