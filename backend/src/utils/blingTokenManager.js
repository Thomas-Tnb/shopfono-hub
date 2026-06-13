import axios from "axios";
import Integration from "../models/Integration.js";

// Retorna o access_token válido, renovando se necessário
export const getAccessToken = async () => {
  const integration = await Integration.findOne({ provider: "bling" });

  if (!integration) {
    throw new Error("Integração com o Bling não encontrada no banco.");
  }

  // Verifica se o token ainda é válido
  const agora = new Date();
  const expirado = agora >= new Date(integration.expires_at);

  if (!expirado) {
    return integration.access_token;
  }

  // Token expirado: renova
  console.log("Access Token Bling expirado. Renovando...");
  return await renovarTokens(integration.refresh_token);
};

const renovarTokens = async (refreshToken) => {
  try {
    const { data } = await axios.post(
      "https://api.bling.com.br/Api/v3/oauth/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "1.0",
          Authorization: `Basic ${process.env.BLING_BASIC}`,
        },
      },
    );

    const { access_token, refresh_token, expires_in } = data;

    // Salva os novos tokens, substituindo os anteriores
    const agora = new Date();
    const expires_at = new Date(agora.getTime() + expires_in * 1000);

    await Integration.findOneAndUpdate(
      { provider: "bling" },
      { access_token, refresh_token, expires_at },
      { new: true },
    );

    console.log("Tokens Bling renovados com sucesso.");
    return access_token;
  } catch (error) {
    // Falha na renovação: loga e interrompe
    console.error("Falha ao renovar tokens do Bling:", error.message);
    throw new Error("Não foi possível renovar o Access Token do Bling.");
  }
};
