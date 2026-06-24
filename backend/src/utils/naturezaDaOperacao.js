function getIdNaturezaOperacao(estado, ie) {
  return estado == "PR" ? 508157478 : ie ? 638602876 : 512298699;
}

export default getIdNaturezaOperacao;
