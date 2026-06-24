export const getServicoTransporte = (transporte) => {
  switch (transporte) {
    case "PAC":
      return "PAC CONTRATO AG";
    case "SEDEX":
      return "SEDEX CONTRATO AG";
    default:
      throw new Error(
        `Servico de logistica nao encontrado para: ${transporte}`,
      );
  }
};
