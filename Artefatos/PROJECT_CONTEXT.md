# Referência do Projeto

## Objetivo

Receber pedidos da Bagy via webhook, salvar no MongoDB, consultar informações de pagamento na Vindi, consultar status do pedido na Bling e exibir tudo em um dashboard React.

---

## Stack

### Front-end

- React
- Axios

### Back-end

- Express.js
- Axios

### Banco

- MongoDB + Mongoose

---

## Fluxo

```text
Pedido Pago na Bagy
│
▼
Webhook Bagy → Express
│
▼
Salvar Pedido no MongoDB
(status_pedido = PAGO, forma_pagamento)
│
▼
Forma de pagamento é cartão de crédito, débito ou boleto?
│
├── SIM ──► Consultar Transação na Vindi ──► Atualizar Pedido (transaction_id) ──► Continuar
│
└── NÃO ──────────────────────────────────────────────────────────────────────────► Continuar
                                                                                       │
┌──────────────────────────────────────────────────────────────────────────────────────┘
│
▼
Consultar Pedido na Bling
│
▼
Atualizar status_pedido
codigo_rastreio
ultima_sincronizacao
│
▼
Dashboard React exibe os pedidos
```

---

## Webhook Bagy

Endpoint:

```http
POST /webhooks/bagy/order
```

Responsabilidades:

- Receber JSON da Bagy
- Salvar pedido no MongoDB
- Armazenar payload original
- Iniciar processamento do pedido

---

## Vindi

SOMENTE EM PEDIDOS PAGO NO CARTÃO DE CRÉDITO OU BOLETO
Antes de efetuar qualquer requisição na API da Vindi para consultar as informações da transação, o sistema obrigatoriamente deve verificar se o Access Token expirou, se sim, renovar.
Usar a API da Vindi para consultar informações da transação.

Salvar no pedido:

```js
transaction_id;
```

---

## Bling

A Bling já recebe/cria o pedido automaticamente após aprovação na Bagy.

Por enquanto usar a API da Bling apenas para:

- Buscar ID do pedido na bling
- Consultar pedido
- Consultar status do pedido

Salvar:

```js
bling_pedido_id;
status_pedido;
codigo_rastreio;
ultima_sincronizacao;
```

Observações:

- O campo `status_pedido` inicia como `PAGO` quando o pedido chega da Bagy.
- Após a consulta na Bling, o campo `status_pedido` passa a refletir o status retornado pela Bling.
- O campo `codigo_rastreio` é obtido através da consulta do pedido na Bling.

---

## Tokens Bling

A API da Bling utiliza:

- Access Token (12 horas)
- Refresh Token (30 dias)

Sempre verificar se o access token expirou antes de chamar a API.

Se expirou, renovar ambos:

```js
renovarToken();
```

Atualizar os tokens armazenados e continuar a requisição.

Vou fornecer os tokens e credenciais quando necessário.

---

## MongoDB

Coleção: Orders

Campos principais:

```js
{
  pedido_bagy_id,
  numero_pedido_bagy,

  forma_pagamento,
  nome_cliente,
  endereco : {
    cep,
    cidade,
    estado,
  }
  valor_total,

  status_pedido,

  itens: [
    {
      nome,
      quantidade,
      variacao
    }
  ],

  bling_pedido_id
  codigo_rastreio,

  transaction_id,

  ultima_sincronizacao,

  webhook_original,

  createdAt,
  updatedAt
}
```

---

## API Interna

```http
GET /api/orders
```

Lista pedidos.

```http
GET /api/orders/:id
```

Detalhes do pedido.

```http
POST /api/orders/:id/reprocess
```

Força uma nova sincronização do pedido na Bling.

---

## Dashboard React

Lista de pedidos contendo:

- Número (Bagy)
- Cliente
- Forma de pagamento (se for PIX, mostrar só "PIX" senão, mostrar a forma de pagamento e o transaction_id junto)
- Valor
- Status
- Data

Tela de detalhes:

- Dados do pedido
- Itens do pedido
  - Nome
  - Quantidade
  - Variação

- Código de rastreio
- ID do pedido na Bling

Botão flutuante para o operador sincronizar pedidos.

Dashboard deve permitir filtrar apenas os pedidos de hoje via
Filtros :
`status_pedido`
`updatedAt`(pedidosDeHoje : Boolean)

---

## Regras de Desenvolvimento

- Utilizar async/await
- Utilizar try/catch
- Controllers simples
- Regras de negócio em Services
- Variáveis sensíveis via .env
- Código modular e organizado
- React consome apenas a API Express

---

## Regra Principal

A Bagy é a origem dos pedidos.

A Vindi fornece informações de pagamento. (somente se for cartão ou boleto)

A Bling fornece informações do pedido e logística.

O MongoDB centraliza todos os dados para exibição no dashboard.

## Objetivo

Receber pedido
↓
Salvar
↓
Buscar transaction_id (somente se for cartão ou boleto)
↓
Mostrar no dashboard
↓
Operador do sistema cria nota fiscal no Bling
↓
Operador clica no botão "Sincronizar"
↓
Buscar status no Bling
↓
Atualizar status
