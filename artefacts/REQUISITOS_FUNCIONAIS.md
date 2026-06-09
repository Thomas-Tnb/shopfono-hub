# Requisitos Funcionais

## Webhook Bagy

**RF-001** — O sistema deve expor o endpoint `POST /webhooks/bagy/order` para receber pedidos da Bagy.

**RF-002** — Ao receber o webhook, o sistema deve salvar o pedido imediatamente na coleção `Orders` do MongoDB.

**RF-003** — O campo `status_pedido` deve ser definido como `PAGO` no momento da criação do pedido.

**RF-004** — O payload original do webhook deve ser armazenado no campo `webhook_original` do pedido.

**RF-005** — Após salvar o pedido, o sistema deve iniciar automaticamente o processamento do pedido.

---

## Integração com a Vindi

**RF-006** — Após salvar o pedido, o sistema deve consultar a API da Vindi para obter as informações da transação de pagamento.

**RF-007** — O campo `transaction_id` deve ser atualizado no pedido com o valor retornado pela Vindi.

---

## Integração com o Bling

**RF-008** — O sistema deve consultar a API do Bling para buscar o ID do pedido (`bling_pedido_id`).

**RF-009** — O sistema deve consultar o pedido no Bling para obter o status atual e o código de rastreio.

**RF-010** — Após a consulta ao Bling, o campo `status_pedido` deve ser atualizado com o status retornado pela Bling, substituindo o valor `PAGO`.

**RF-011** — O campo `codigo_rastreio` deve ser atualizado com o valor retornado pela consulta ao Bling.

**RF-012** — O campo `ultima_sincronizacao` deve ser atualizado com a data e hora de cada sincronização realizada com o Bling.

---

## Autenticação com o Bling

**RF-013** — Antes de toda requisição à API do Bling, o sistema deve verificar se o Access Token está expirado (validade de 12 horas).

**RF-014** — Se o Access Token estiver expirado, o sistema deve renovar ambos os tokens (Access Token e Refresh Token) antes de prosseguir com a requisição.

**RF-015** — Os tokens renovados devem ser armazenados para uso nas próximas requisições.

---

## API Interna

**RF-016** — O sistema deve expor o endpoint `GET /api/orders` para listar todos os pedidos.

**RF-017** — O sistema deve expor o endpoint `GET /api/orders/:id` para retornar os detalhes de um pedido específico.

**RF-018** — O sistema deve expor o endpoint `POST /api/orders/:id/reprocess` para forçar uma nova sincronização do pedido com o Bling, atualizando `status_pedido`, `codigo_rastreio` e `ultima_sincronizacao`.

---

## Dashboard React

**RF-019** — O dashboard deve exibir a listagem de pedidos contendo: número do pedido, nome do cliente, valor total, status, código de rastreio e data.

**RF-020** — O dashboard deve exibir uma tela de detalhes com os dados completos do pedido, os itens (nome, quantidade e variação) e o ID do pedido no Bling.

**RF-021** — Deve haver um botão flutuante "Sincronizar" para sincronização manual, via `POST /api/orders/:id/reprocess`

**RF-022** — Dashboard deve permitir ser filtrado via `status_pedido`

**RF-023** — Dashboard deve permitir filtrar apenas os pedidos de hoje via `updatedAt`

**RF-024** — O React deve consumir dados exclusivamente pela API interna Express, sem consultar Bagy, Vindi ou Bling diretamente.
