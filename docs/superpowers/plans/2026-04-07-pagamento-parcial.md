# Pagamento Parcial de Despesas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campo `paidAmount` às despesas para rastrear quanto foi pago em pagamentos parciais, atualizando os cálculos financeiros e a UI.

**Architecture:** Campo `paidAmount Float @default(0)` direto no model `Expense`; a API aplica regras de consistência (paid→paidAmount=value, pending→paidAmount=0, partial→paidAmount do body); o dashboard e os cards da página usam `paidAmount` para calcular `paidExpenses` e `pendingExpenses` corretamente.

**Tech Stack:** Prisma 7 + SQLite (better-sqlite3), Next.js 14 App Router, TypeScript, React

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Adicionar `paidAmount Float @default(0)` ao model `Expense` |
| `app/api/expenses/route.ts` | POST e PUT aplicam regras de consistência e persistem `paidAmount` |
| `app/api/dashboard/route.ts` | `paidExpenses` e `pendingExpenses` consideram `paidAmount` de parciais |
| `app/(app)/expenses/page.tsx` | Interface, form (campo condicional), tabela (valor pago/total), cards |

---

## Task 1: Schema — adicionar campo `paidAmount`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar campo ao model Expense**

Abrir `prisma/schema.prisma`. Localizar o model `Expense`. Adicionar `paidAmount` após `value`:

```prisma
model Expense {
  id          String   @id @default(cuid())
  eventId     String
  description String
  category    String
  value       Float
  paidAmount  Float    @default(0)
  status      String   @default("pending")
  date        DateTime @default(now())
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Aplicar ao banco**

```bash
npx prisma db push
```

Saída esperada: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git -c user.email="dev@nightcontrol.com" -c user.name="NightControl" commit -m "feat: add paidAmount field to Expense schema"
```

---

## Task 2: API — persistir `paidAmount` com regras de consistência

**Files:**
- Modify: `app/api/expenses/route.ts`

- [ ] **Step 1: Atualizar o POST**

Localizar o bloco `data` dentro de `prisma.expense.create` (linha ~28). Substituir por:

```ts
const rawPaid = parseFloat(body.paidAmount) || 0;
const value = parseFloat(body.value);
const status = body.status || "pending";
const paidAmount =
  status === "paid"    ? value :
  status === "pending" ? 0 :
  Math.min(rawPaid, value); // partial: clamp to value

const expense = await prisma.expense.create({
  data: {
    eventId: body.eventId,
    description: body.description,
    category: body.category,
    value,
    paidAmount,
    status,
    date: body.date ? new Date(body.date) : new Date(),
  },
});
```

- [ ] **Step 2: Atualizar o PUT**

Localizar o bloco `data` dentro de `prisma.expense.update` (linha ~47). Substituir por:

```ts
const rawPaid = parseFloat(body.paidAmount) || 0;
const value = parseFloat(body.value);
const status = body.status;
const paidAmount =
  status === "paid"    ? value :
  status === "pending" ? 0 :
  Math.min(rawPaid, value); // partial: clamp to value

const expense = await prisma.expense.update({
  where: { id: body.id },
  data: {
    description: body.description,
    category: body.category,
    value,
    paidAmount,
    status,
    date: body.date ? new Date(body.date) : undefined,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/expenses/route.ts
git -c user.email="dev@nightcontrol.com" -c user.name="NightControl" commit -m "feat: persist paidAmount with consistency rules in expenses API"
```

---

## Task 3: Dashboard — usar `paidAmount` nos cálculos

**Files:**
- Modify: `app/api/dashboard/route.ts`

- [ ] **Step 1: Atualizar cálculo de `paidExpenses` e `pendingExpenses`**

Localizar as linhas que calculam `paidExpenses` e `pendingExpenses` (em torno da linha 53). Substituir:

```ts
// ANTES:
const paidExpenses = expenses
  .filter((e) => e.status === "paid")
  .reduce((sum, e) => sum + e.value, 0);
const pendingExpenses = expenses
  .filter((e) => e.status !== "paid")
  .reduce((sum, e) => sum + e.value, 0);
```

Por:

```ts
const paidExpenses =
  expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.value, 0) +
  expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + e.paidAmount, 0);

const pendingExpenses =
  expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.value, 0) +
  expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + (e.value - e.paidAmount), 0);
```

`realBalance` é derivado de `availableNow - paidExpenses` — atualiza automaticamente.

- [ ] **Step 2: Verificar manualmente**

Acessar `http://localhost:3000/api/dashboard?eventId=<id>` com uma despesa parcial registrada. Confirmar que `financials.paidExpenses` inclui o `paidAmount` da parcial e `financials.pendingExpenses` inclui o restante.

- [ ] **Step 3: Commit**

```bash
git add app/api/dashboard/route.ts
git -c user.email="dev@nightcontrol.com" -c user.name="NightControl" commit -m "feat: use paidAmount in dashboard expense calculations"
```

---

## Task 4: UI — formulário, tabela e cards de despesas

**Files:**
- Modify: `app/(app)/expenses/page.tsx`

- [ ] **Step 1: Atualizar a interface `Expense` e o `defaultForm`**

Localizar a interface `Expense` (linha ~18) e o `defaultForm` (linha ~33).

Atualizar a interface:
```ts
interface Expense {
  id: string;
  description: string;
  category: string;
  value: number;
  paidAmount: number;
  status: string;
  date: string;
}
```

Atualizar o `defaultForm`:
```ts
const defaultForm = {
  description: "", category: "", value: "", status: "pending", date: "", paidAmount: ""
};
```

- [ ] **Step 2: Popular `paidAmount` no `openEdit`**

Localizar a função `openEdit` (linha ~63). Adicionar `paidAmount` ao `setForm`:

```ts
function openEdit(expense: Expense) {
  setEditingExpense(expense);
  setForm({
    description: expense.description,
    category: expense.category,
    value: String(expense.value),
    status: expense.status,
    date: new Date(expense.date).toISOString().slice(0, 10),
    paidAmount: String(expense.paidAmount),
  });
  setDialogOpen(true);
}
```

- [ ] **Step 3: Atualizar os cards de resumo**

Localizar as linhas de `totalPaid` e `totalPending` (linha ~104). Substituir por:

```ts
const totalPaid =
  expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.value, 0) +
  expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + e.paidAmount, 0);

const totalPending =
  expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.value, 0) +
  expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + (e.value - e.paidAmount), 0);
```

- [ ] **Step 4: Atualizar a coluna "Valor" na tabela**

Localizar a célula de valor na tabela (linha ~196):
```tsx
<TableCell className="text-right text-sm font-semibold text-red-400 tabular-nums">
  {formatCurrency(expense.value)}
</TableCell>
```

Substituir por:
```tsx
<TableCell className="text-right text-sm font-semibold text-red-400 tabular-nums">
  {expense.status === "partial" ? (
    <span>
      <span className="text-blue-400">{formatCurrency(expense.paidAmount)}</span>
      <span className="text-muted-foreground text-xs"> / {formatCurrency(expense.value)}</span>
    </span>
  ) : (
    formatCurrency(expense.value)
  )}
</TableCell>
```

- [ ] **Step 5: Adicionar campo "Valor Pago" condicional no formulário**

Localizar o grid de 2 colunas com "Valor" e "Status" no dialog (linha ~243). Após o fechamento desse grid (`</div>`), adicionar o campo condicional:

```tsx
{form.status === "partial" && (
  <div className="space-y-1.5">
    <Label>Valor Pago (R$) *</Label>
    <Input
      type="number"
      step="0.01"
      min="0"
      max={form.value || undefined}
      placeholder="0,00"
      value={form.paidAmount}
      onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
    />
  </div>
)}
```

- [ ] **Step 6: Atualizar validação do botão Salvar**

Localizar o atributo `disabled` do botão Salvar (linha ~267):
```tsx
disabled={saving || !form.description || !form.category || !form.value}
```

Substituir por:
```tsx
disabled={
  saving ||
  !form.description ||
  !form.category ||
  !form.value ||
  (form.status === "partial" && (!form.paidAmount || parseFloat(form.paidAmount) <= 0))
}
```

- [ ] **Step 7: Verificar manualmente**

1. Criar despesa com status "Parcial" — confirmar que o campo "Valor Pago" aparece
2. Criar despesa de R$4.000 com pago R$2.000 — confirmar que a tabela mostra "R$ 2.000,00 / R$ 4.000,00"
3. Verificar que o card "Pago" soma R$2.000 e "Pendente" soma R$2.000
4. Mudar status para "Pago" — confirmar que o campo "Valor Pago" some
5. Criar despesa com status "Pago" — confirmar que o card "Pago" aumenta pelo valor total

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/expenses/page.tsx"
git -c user.email="dev@nightcontrol.com" -c user.name="NightControl" commit -m "feat: add paidAmount field to expense form, table, and summary cards"
```

---

## Verificação Final

- [ ] Despesa "Pago" R$1.000: card Pago +R$1.000, card Pendente sem mudança
- [ ] Despesa "Parcial" R$4.000 / pago R$2.000: card Pago +R$2.000, card Pendente +R$2.000
- [ ] Despesa "Pendente" R$500: card Pago sem mudança, card Pendente +R$500
- [ ] Dashboard: `paidExpenses` e `realBalance` refletem corretamente os três cenários
- [ ] Editar despesa de "Parcial" para "Pago": `paidAmount` vira igual ao `value` automaticamente (via API)
