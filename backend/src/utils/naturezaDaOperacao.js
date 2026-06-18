function obterNaturezaDaOperacao(estado, ie) {
  return estado == "PR"
    ? "Venda - PR"
    : ie
      ? "Interestadual C/IE"
      : "Interestadual S/IE";
}

export default obterNaturezaDaOperacao;
