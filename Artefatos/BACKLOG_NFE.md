# Fluxo de Normalização da Bling e Emissão de NF-e

## 1. Criar a etapa de "normalização Bling"

Criar um service dedicado apenas para montar o payload de atualização do pedido na Bling.

- Entrada: dados vindos do Mongo
- Saída: body final do `PUT /pedidos/vendas/{idPedidoVenda}`
- Objetivo: centralizar a transformação dos dados antes da atualização

## 2. Criar os de/para de regras

Separar as regras de conversão fora do controller.

- De/para de `natureza_operacao`
- De/para dos 2 serviços de correio
- Local ideal: `utils` ou collection de configuração

## 3. Buscar o pedido na Bling e atualizar antes de gerar a nota

A sequência deve ser:

1. Fazer `GET` do pedido na Bling
2. Montar o payload final
3. Fazer `PUT` no pedido alterando somente o necessário
4. Só depois disso gerar a NF-e

Campos que precisam ser tratados:

- observações das parcelas
- transporte / logística
- natureza da operação

## 4. Validar o pedido atualizado antes de emitir

Depois do `PUT`, fazer um novo `GET` para confirmar a atualização.

- Conferir os campos críticos
- Garantir que o pedido ficou correto
- Evitar gerar nota em cima de pedido incompleto

## 5. Gerar a NF-e a partir do pedido já corrigido

Quando o pedido estiver validado, chamar:

- `POST /pedidos/vendas/{idPedidoVenda}/gerar-nfe`

Depois disso, salvar:

- `bling_nota_fiscal_id`
- status da nota

## 6. Autorizar a nota, se necessário

Se a geração estiver confiável, seguir com a autorização.

- `POST /nfe/{idNotaFiscal}/enviar`
- Fazer isso somente depois da geração e validação do pedido

## 7. Adicionar idempotência e rastreabilidade

Antes de atualizar ou gerar a nota, verificar se já existe `bling_nota_fiscal_id`.

Guardar histórico de processamento:

- payload original da Bling
- payload atualizado enviado no `PUT`
- resposta do `PUT`
- resposta do `gerar-nfe`
- erro da última tentativa

Isso facilita muito o reprocessamento e a auditoria.

## 8. Separar o fluxo em um job assíncrono mais explícito

Hoje o webhook dispara o processamento direto.  
O ideal é transformar isso em um job interno com estados claros:

- `PENDENTE`
- `ATUALIZANDO_BLING`
- `ATUALIZADO`
- `NF_GERADA`
- `NF_AUTORIZADA`
- `ERRO`

Mesmo sem fila nesse primeiro momento, esse controle de estado já traz bastante segurança.
