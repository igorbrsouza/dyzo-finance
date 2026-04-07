# Design: Caixa Inicial do Evento

**Data:** 2026-04-07  
**Status:** Aprovado

## Objetivo

Permitir que ao criar um evento seja informado um valor de caixa inicial (dinheiro físico disponível antes das vendas), que some ao caixa disponível e ao saldo real do evento.

## Decisões

- Campo obrigatório na criação do evento (não pode ser zero ou vazio)
- O valor entra diretamente no cálculo de `availableNow` e `realBalance`
- Aparece como linha destacada no Resumo Financeiro do PDF e do Excel

## Mudanças por Camada

### 1. Schema — `prisma/schema.prisma`

Adicionar campo ao model `Event`:

```prisma
initialCash Float @default(0)
```

Executar migração: `prisma migrate dev --name add_initial_cash`

### 2. API — `app/api/events/route.ts`

**POST** (criação):
- Ler `body.initialCash` como `Float`
- Validar: valor deve ser um número >= 0 (campo obrigatório no form — nunca chegará vazio ao backend)
- Passar para `prisma.event.create`

**PUT** `app/api/events/[id]/route.ts`:
- Ler e atualizar `initialCash` da mesma forma

### 3. Dashboard — `app/api/dashboard/route.ts`

Alterar cálculo de `availableNow`:

```ts
const availableNow = platformAvailable + pixRevenue + barRevenue + event.initialCash
```

`realBalance` já é derivado de `availableNow`, então é atualizado automaticamente.

Expor em `financials`:
```ts
initialCash: event.initialCash,
```

### 4. Formulário — `app/(app)/events/page.tsx`

- Adicionar `initialCash: ""` ao `defaultForm`
- Adicionar campo numérico obrigatório "Caixa Inicial (R$)" no dialog
- Ao abrir edição, popular com `event.initialCash`
- Validação client-side: não permite submit sem valor preenchido e >= 0
- Enviar `initialCash: parseFloat(form.initialCash)` no body do POST/PUT

### 5. PDF — `app/(app)/export/page.tsx`

Na seção **RESUMO FINANCEIRO**, inserir linha antes de "Receita Bruta Total":

```ts
{ label: "Caixa Inicial", value: formatCurrency(f.initialCash), valueColor: C.green }
```

No **Excel** (aba Resumo), inserir linha:
```ts
{ "Campo": "Caixa Inicial", "Valor": f.initialCash }
```

## Fluxo de Dados

```
Criação do evento (form)
  → initialCash salvo no Event
  → Dashboard lê event.initialCash
  → availableNow += initialCash
  → realBalance = availableNow - paidExpenses
  → PDF/Excel exibe initialCash no Resumo Financeiro
```

## Fora de Escopo

- Histórico de alterações do caixa inicial
- Múltiplas entradas de caixa manual
- Validação de valor máximo
