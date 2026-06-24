export const getServicoTransporte = (transporte) => {
  switch (transporte) {
    case "PAC":
      return "PAC CONTRATO AG";
      break;
    case "SEDEX":
      return "SEDEX CONTRATO AG";
      break;
    default:
      return "Serviço de logística não encontrado.";
  }
};
