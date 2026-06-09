# Regras de Negócio

## 1. Origem dos Dados

- A **Bagy** é a única origem dos pedidos. Nenhum pedido é criado manualmente no sistema.
- A **Vindi** é consultada exclusivamente para obter informações de pagamento (`transaction_id`).
- O **Bling** é consultado exclusivamente para obter status do pedido e código de rastreio. A criação do pedido no Bling ocorre de forma automática pela integração Bagy–Bling, fora do escopo deste sistema.
- O **MongoDB** centraliza todos os dados e é a única fonte de verdade para o dashboard.

---

## 2. Recebimento do Pedido (Webhook Bagy)

- O sistema recebe pedidos exclusivamente via webhook da Bagy no endpoint `POST /webhooks/bagy/order`.
- Ao receber o webhook, o pedido deve ser salvo imediatamente no MongoDB.
- O payload original do webhook deve ser armazenado no campo `webhook_original`.
- O campo `status_pedido` deve ser definido como `PAGO` no momento da criação do pedido.
- Após salvar, o processamento do pedido deve ser iniciado.

---

## 3. Consulta à Vindi

- Após salvar o pedido, o sistema deve consultar a API da Vindi para obter as informações da transação de pagamento.
- O campo `transaction_id` deve ser atualizado no pedido com o valor retornado pela Vindi.

---

## 4. Consulta ao Bling

- A consulta ao Bling serve apenas para leitura: buscar o status do pedido e o código de rastreio.
- Os campos atualizados após a consulta ao Bling são: `bling_pedido_id`, `status_pedido`, `codigo_rastreio` e `ultima_sincronizacao`.
- Após a consulta ao Bling, o campo `status_pedido` passa a refletir o status retornado pela Bling, substituindo o valor inicial `PAGO`.
- O campo `codigo_rastreio` é obtido exclusivamente através da consulta ao Bling.
- O campo `ultima_sincronizacao` deve ser atualizado com a data e hora de cada sincronização realizada com o Bling.

---

## 5. Sincronização Manual (Reprocessamento)

- O operador do sistema é responsável por criar a nota fiscal no Bling de forma manual.
- Após criar a nota fiscal, o operador pode acionar manualmente uma nova sincronização via endpoint `POST /api/orders/:id/reprocess`.
- A sincronização manual força uma nova consulta ao Bling, atualizando `status_pedido`, `codigo_rastreio` e `ultima_sincronizacao`.

---

## 6. Autenticação com a API do Bling

- A API do Bling utiliza Access Token com validade de 12 horas e Refresh Token com validade de 30 dias.
- Antes de toda requisição à API do Bling, o sistema deve verificar se o Access Token está expirado.
- Se o Access Token estiver expirado, ambos os tokens (Access e Refresh) devem ser renovados antes de prosseguir com a requisição.
- Os tokens atualizados devem ser armazenados para uso nas próximas requisições.

---

## 7. Dados Armazenados por Pedido

Cada pedido no MongoDB deve conter:

- Identificadores da Bagy: `pedido_bagy_id`, `numero_pedido_bagy`
- Dados do cliente: `nome_cliente`, `endereco` (com `cep`, `cidade` e `estado`)
- Valor total do pedido: `valor_total`
- Status atual: `status_pedido`
- Itens do pedido: lista com `nome`, `quantidade` e `variacao` de cada item
- Código de rastreio: `codigo_rastreio`
- Identificador de pagamento: `transaction_id`
- Identificador no Bling: `bling_pedido_id`
- Controle de sincronização: `ultima_sincronizacao`
- Payload original: `webhook_original`
- Datas de controle: `createdAt`, `updatedAt`

---

## 8. Exibição no Dashboard

- O dashboard exibe apenas dados provenientes da API interna Express. O React não consulta Bagy, Vindi ou Bling diretamente.
- A listagem de pedidos deve exibir: número do pedido, nome do cliente, valor total, status, código de rastreio e data.
- A tela de detalhes deve exibir: dados completos do pedido, itens (nome, quantidade e variação) e o ID do pedido no Bling.
