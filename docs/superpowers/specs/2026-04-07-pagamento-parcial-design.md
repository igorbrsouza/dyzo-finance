# Design: Pagamento Parcial de Despesas

**Data:** 2026-04-07  
**Status:** Aprovado

## Objetivo

Permitir registrar quanto de uma despesa já foi pago quando o pagamento é parcial (ex: R$2.000 de uma despesa de R$4.000). Apenas o valor pago impacta o saldo real; o restante permanece como pendente.

## Decisões

- Campo `paidAmount Float @default(0)` adicionado ao model `Expense`
- Somente relevante quando `status === "partial"` — para "paid" é igualado a `value`, para "pending" é ignorado
- O dashboard usa `paidAmount` no cálculo de `paidExpenses` e `pendingExpenses`
- UI exibe campo "Valor Pago" apenas quando status = Parcial
- Na tabela, despesas parciais mostram "R$ pago / R$ total"

## Mudanças por Camada

### 1. Schema — `prisma/schema.prisma`

```prisma
model Expense {
  ...
  paidAmount  Float    @default(0)
  ...
}
```

Aplicar via: `npx prisma db push`

### 2. API — `app/api/expenses/route.ts`

**POST e PUT:** ler `body.paidAmount` como `Float`.

Regra de consistência aplicada na API:
- Se `status === "paid"` → `paidAmount = value` (pago integral)
- Se `status === "pending"` → `paidAmount = 0`
- Se `status === "partial"` → `paidAmount = parseFloat(body.paidAmount) || 0`

### 3. Dashboard — `app/api/dashboard/route.ts`

Cálculo atualizado:

```ts
const paidExpenses =
  expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.value, 0) +
  expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + e.paidAmount, 0);

const pendingExpenses =
  expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.value, 0) +
  expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + (e.value - e.paidAmount), 0);
```

`realBalance` é derivado automaticamente pois depende de `paidExpenses`.

### 4. UI — Formulário (`app/(app)/expenses/page.tsx`)

- Adicionar `paidAmount: ""` ao `defaultForm`
- Adicionar `paidAmount: number` à interface `Expense`
- Popular `paidAmount` no `openEdit`
- Exibir campo "Valor Pago (R$)" condicionalmente quando `form.status === "partial"`
- Validação: `0 < paidAmount < value`
- Enviar `paidAmount` no body do POST/PUT

### 5. UI — Tabela (`app/(app)/expenses/page.tsx`)

Na coluna "Valor", para despesas com `status === "partial"`:
```
R$ 2.000,00 / R$ 4.000,00
```
Para demais status: exibe só `formatCurrency(expense.value)`.

### 6. UI — Cards de Resumo (`app/(app)/expenses/page.tsx`)

Atualizar cálculos dos cards:

```ts
const totalPaid =
  expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.value, 0) +
  expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + e.paidAmount, 0);

const totalPending =
  expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.value, 0) +
  expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + (e.value - e.paidAmount), 0);
```

## Fluxo de Dados

```
Formulário (status=partial, paidAmount=2000, value=4000)
  → API aplica regra de consistência
  → paidAmount salvo na Expense
  → Dashboard: paidExpenses += 2000, pendingExpenses += 2000
  → realBalance = availableNow − paidExpenses
  → PDF/Excel: "Despesas Pagas" já reflete o novo cálculo (sem mudança estrutural)
```

## Fora de Escopo

- Histórico de múltiplos pagamentos parciais com datas
- Notificações de saldo pendente
- Validação de paidAmount > value (tratado como erro silencioso → clamp a value)
