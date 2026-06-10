# Regras de Negócio

## 1. Origem dos Dados

### RN-001 — Origem Oficial dos Pedidos

A Bagy é a única origem dos pedidos do sistema.

Todo pedido recebido através do webhook da Bagy deve ser considerado a fonte inicial das informações do pedido.

---

## 2. Recebimento de Pedidos

### RN-002 — Recebimento via Webhook

O sistema deve receber pedidos através do endpoint:

`POST /webhooks/bagy/order`

---

### RN-003 — Persistência Inicial

Ao receber um pedido da Bagy, o sistema deve:

- Salvar o pedido no MongoDB.
- Armazenar o payload original recebido.
- Iniciar o processamento do pedido.

---

### RN-004 — Status Inicial do Pedido

Todo pedido recebido da Bagy deve iniciar com:

`status_pedido = PAGO`

---

## 3. Consulta de Pagamentos (Vindi)

### RN-005 — Critério para Consulta na Vindi

A consulta à Vindi deve ocorrer somente quando a forma de pagamento for:

- Cartão de crédito
- Cartão de débito
- Boleto

---

### RN-006 — Pagamentos Não Elegíveis

Quando a forma de pagamento não for cartão ou boleto, o sistema não deve consultar a API da Vindi.

---

### RN-008 — Informação Obtida da Vindi

Após a consulta da transação, o sistema deve armazenar:

- `transaction_id`

---

## 4. Consulta de Pedidos (Bling)

### RN-009 — Pedido Já Existente na Bling

O sistema deve considerar que o pedido já foi criado automaticamente na Bling após sua aprovação na Bagy.

---

### RN-010 — Utilização da API da Bling

A API da Bling deve ser utilizada apenas para:

- Buscar o ID do pedido na Bling.
- Consultar o pedido.
- Consultar o status do pedido.

---

### RN-011 — Dados Atualizados pela Bling

Após a consulta da Bling, o sistema deve atualizar:

- `bling_pedido_id`
- `status_pedido`
- `codigo_rastreio`
- `ultima_sincronizacao`

---

### RN-012 — Atualização do Status do Pedido

Após a primeira consulta na Bling, o campo `status_pedido` deixa de refletir o status inicial da Bagy e passa a refletir o status retornado pela Bling.

---

### RN-013 — Código de Rastreio

O campo `codigo_rastreio` deve ser preenchido com a informação retornada pela consulta do pedido na Bling.

---

## 5. Gerenciamento de Tokens da Bling

### RN-014 — Validação do Access Token

Antes de qualquer chamada para a API da Bling, o sistema deve verificar se o Access Token ainda está válido.

---

### RN-015 — Renovação dos Tokens

Quando o Access Token estiver expirado, o sistema deve:

1. Renovar os tokens.
2. Atualizar os tokens armazenados.
3. Continuar a requisição originalmente solicitada.

---

## 6. Armazenamento dos Pedidos

### RN-016 — Centralização dos Dados

O MongoDB deve ser o repositório central dos dados utilizados pelo dashboard.

---

### RN-017 — Dados Persistidos

Cada pedido deve permitir o armazenamento dos seguintes grupos de informações:

#### Identificação

- pedido_bagy_id
- numero_pedido_bagy

#### Cliente

- nome_cliente

#### Endereço

- cep
- cidade
- estado

#### Pagamento

- token_transaction_vindi
- forma_pagamento
- valor_total
- transaction_id

#### Pedido

- status_pedido
- bling_pedido_id
- codigo_rastreio
- ultima_sincronizacao

#### Itens

- nome
- quantidade
- variacao

#### Auditoria

- webhook_original
- createdAt
- updatedAt

---

## 7. Reprocessamento e Sincronização

### RN-018 — Reprocessamento Manual

O sistema deve disponibilizar uma operação para forçar uma nova sincronização do pedido na Bling.

---

### RN-019 — Sincronização Manual pelo Operador

Após a criação da nota fiscal no Bling pelo operador, o sistema deve permitir que o operador execute manualmente uma sincronização do pedido.

---

### RN-020 — Atualização Pós-Sincronização

Durante a sincronização manual, o sistema deve consultar a Bling e atualizar as informações disponíveis do pedido.

---

## 8. Dashboard

### RN-021 — Exibição de Pedidos

O dashboard deve exibir a listagem dos pedidos armazenados no MongoDB.

---

### RN-022 — Informações da Listagem

Cada pedido deve exibir:

- Número do pedido (Bagy)
- Cliente
- Forma de pagamento
- Valor
- Status
- Data

---

### RN-023 — Regra de Exibição da Forma de Pagamento

Quando a forma de pagamento for PIX:

- Exibir apenas "PIX".

Quando a forma de pagamento não for PIX:

- Exibir a forma de pagamento.
- Exibir também o `transaction_id`.

---

### RN-024 — Tela de Detalhes

A tela de detalhes do pedido deve exibir:

- Dados do pedido
- Itens do pedido
- Código de rastreio
- ID do pedido na Bling

---

### RN-025 — Exibição dos Itens

Cada item do pedido deve apresentar:

- Nome
- Quantidade
- Variação

---

### RN-026 — Sincronização pelo Dashboard

O dashboard deve disponibilizar um botão para que o operador realize a sincronização dos pedidos.

---

### RN-027 — Filtro por Status

O dashboard deve permitir filtrar pedidos pelo campo:

`status_pedido`

---

### RN-028 — Filtro de Pedidos do Dia

O dashboard deve permitir filtrar apenas pedidos do dia através do critério:

`updatedAt`

representado pelo indicador:

`pedidosDeHoje = true`

---

## 9. Fluxo Operacional

### RN-029 — Fluxo Principal

O fluxo operacional deve seguir a seguinte sequência:

1. Receber pedido da Bagy.
2. Salvar pedido.
3. Buscar `transaction_id` quando a forma de pagamento for cartão ou boleto.
4. Exibir pedido no dashboard.
5. Operador criar nota fiscal no Bling.
6. Operador acionar sincronização.
7. Consultar status do pedido na Bling.
8. Atualizar informações do pedido.

---

## 10. Arquitetura e Desenvolvimento

### RN-030 — Separação de Responsabilidades

Controllers devem permanecer simples.

As regras de negócio devem ser implementadas em Services.

---

### RN-031 — Variáveis Sensíveis

Credenciais, tokens e demais informações sensíveis devem ser armazenadas através de variáveis de ambiente.

---

### RN-032 — Consumo da API

O front-end React deve consumir exclusivamente a API Express.

Novas regras de negócio :

RN-033: Toda chamada para a API da Bling deve verificar previamente a validade do Access Token.

RN-034 O Refresh Token mais recente deve sempre substituir o anterior.

RN-035: A aplicação nunca deve depender de atualização manual dos tokens após a implantação.

RN-036: Em caso de falha na renovação dos tokens, a requisição para a API da Bling deve ser interrompida e registrada em log.

RN-037: Credenciais sensíveis (`CLIENT_ID` e `CLIENT_SECRET`) devem permanecer armazenadas apenas em variáveis de ambiente.
