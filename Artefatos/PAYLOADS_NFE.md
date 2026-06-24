# Payload do PUT

> **Observação:** Embora abaixo estejam listados apenas os campos que serão alterados, a requisição deve enviar **todo o body do pedido**.

## Origem dos Dados

```javascript
pedido = payload do MongoDB
```

## Estrutura das Alterações

```json
{
  "itens": [
    {
      "naturezaOperacao": {
        "id": obterNaturezaOperacao(pedido.natureza_operacao)
      }
    }
  ],
  "parcelas": [
    {
      "observacoes": pedido.obterTransactionId(pedido.transaction_id),
      "formaPagamento": {
        "id": obterFormaPagamento(pedido.forma_pagamento)
      }
    }
  ],
  "volumes": [
    {
      "servico": "SEDEX CONTRATO AGENCIA"
    }
  ]
}
```

## Regras de Preenchimento

### Itens (`itens`)

Todos os itens do pedido devem possuir a mesma **natureza de operação**.

```javascript
naturezaOperacao.id = obterNaturezaOperacao(pedido.natureza_operacao);
```

### Parcelas (`parcelas`)

Todas as parcelas devem possuir:

- A mesma **forma de pagamento**;
- O campo **observacoes** preenchido com o Transaction ID.

```javascript
observacoes = pedido.obterTransactionId(pedido.transaction_id);

formaPagamento.id = obterFormaPagamento(pedido.forma_pagamento);
```

### Volumes (`volumes`)

Todos os volumes devem possuir o mesmo serviço:

```javascript
servico = obterTransporte(pedido.correio);
```
