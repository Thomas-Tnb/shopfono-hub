import axios from "axios";

// RF-006, RF-007, RF-026, RF-027
export const consultarTransacaoVindi = async (tokenTransaction) => {
  const url = `https://api.intermediador.yapay.com.br/api/v3/transactions/get_by_token?token_account=${process.env.VINDI_TOKEN_ACCOUNT}&token_transaction=${tokenTransaction}`;

  const { data } = await axios.get(url, {
    headers: { accept: "application/json" },
  });

  const transaction_id = data?.data_response?.transaction?.transaction_id;

  if (!transaction_id) {
    throw new Error(
      `transaction_id não encontrado na Vindi para o token ${tokenTransaction}`,
    );
  }

  console.log("Vindi consultada com sucesso! transaction_id:", transaction_id);

  return String(transaction_id);
};
