# FLUXO_AUTH_BLING.md

# Fluxo de Autenticação Bling

## Objetivo

Garantir que a aplicação possua sempre um `access_token` válido para realizar chamadas à API da Bling sem intervenção manual.

---

## Conceitos

A autenticação da Bling utiliza OAuth2.

A aplicação possui dois tokens:

### Access Token

Utilizado para autenticar as requisições da API.

Características:

- Validade aproximada de 6 horas (`21600 segundos`)
- Deve ser enviado no header:

```http
Authorization: Bearer ACCESS_TOKEN
```

- Expira periodicamente

---

### Refresh Token

Utilizado para gerar um novo Access Token.

Características:

- Possui validade maior
- Também é renovado a cada atualização de token
- Deve ser armazenado permanentemente

---

## Primeira Autenticação

A primeira autorização OAuth já foi realizada manualmente.

Os seguintes dados já estão disponíveis:

```env
BLING_BASIC=
```

No mongoDB deixei na coleção integrations um documento contendo os tokens de partida.

```integrations
{
  "access_token": "primeiro_access_token",
  "expires_at" : "2026-06-10T21:05:00",
  "token_type": "Bearer",
  "scope": "...",
  "refresh_token": "primeiro_refresh_token"
}
```

Esses valores servem apenas como ponto de partida da aplicação.

---

## Processo de Renovação

Quando o Access Token estiver expirado:

### Endpoint

```http
POST https://api.bling.com.br/Api/v3/oauth/token
```

### Headers

```http
Content-Type: application/x-www-form-urlencoded
Accept: 1.0
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)
```

### Body

```text
grant_type=refresh_token
refresh_token=ULTIMO_REFRESH_TOKEN
```

### Exemplo

```bash
curl --location 'https://api.bling.com.br/Api/v3/oauth/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Accept: 1.0' \
--header 'Authorization: Basic <BASE64_CLIENT_ID_CLIENT_SECRET>' \
--data-urlencode 'grant_type=refresh_token' \
--data-urlencode 'refresh_token=<ULTIMO_REFRESH_TOKEN>'
```

---

## Resposta Esperada

```json
{
  "access_token": "NOVO_ACCESS_TOKEN",
  "expires_in": 21600,
  "token_type": "Bearer",
  "scope": "...",
  "refresh_token": "NOVO_REFRESH_TOKEN"
}
```

---

## Regra Importante

A Bling gera:

- Novo Access Token
- Novo Refresh Token

em toda renovação.

O Refresh Token anterior não deve continuar sendo utilizado após a renovação.

---

## Persistência dos Tokens

Os tokens devem ser armazenados na coleção:

```javascript
integrations;
```

Documento:

```javascript
{
  provider: "bling",

  access_token: "...",

  refresh_token: "...",

  expires_at: Date,

  updatedAt: Date
}
```

Ao receber a resposta, armazenar no mongo :

```javascript
expires_at = agora + expires_in;
```

---

## Fluxo Completo

```text
Aplicação inicia
        │
        ▼
Ler tokens do MongoDB
        │
        ▼
Usuário solicita ação
        │
        ▼
Verificar expires_at
        │
   ┌────┴────┐
   │         │
Válido    Expirado
   │         │
   ▼         ▼
Chama     Renovar
API       Tokens
Bling        │
             ▼
      Salvar novos tokens
             │
             ▼
      Chamar API Bling
```
