# Caixa Inicial do Evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campo obrigatório `initialCash` ao evento, somá-lo ao caixa disponível no dashboard, e exibi-lo no PDF e Excel de exportação.

**Architecture:** Campo `Float` direto no model `Event`; o dashboard some `event.initialCash` a `availableNow` antes de calcular `realBalance`; o formulário de criação/edição exige o campo; PDF e Excel exibem o valor no Resumo Financeiro.

**Tech Stack:** Prisma 7 + SQLite (better-sqlite3), Next.js 14 App Router, TypeScript, jsPDF, xlsx

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Adicionar `initialCash Float @default(0)` ao model `Event` |
| `app/api/events/route.ts` | Ler e salvar `initialCash` no POST |
| `app/api/events/[id]/route.ts` | Ler e salvar `initialCash` no PUT |
| `app/api/dashboard/route.ts` | Somar `initialCash` a `availableNow`; expor em `financials` |
| `app/(app)/events/page.tsx` | Adicionar campo `initialCash` ao form (obrigatório) |
| `app/(app)/export/page.tsx` | Linha "Caixa Inicial" no PDF e Excel |

---

## Task 1: Schema — adicionar campo `initialCash`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar campo ao model Event**

Abrir `prisma/schema.prisma`. Localizar o model `Event` (linha 57). Adicionar o campo após `ticketGoal`:

```prisma
model Event {
  id          String   @id @default(cuid())
  name        String
  date        DateTime
  location    String
  description String?
  imageUrl    String?
  ticketGoal  Int      @default(0)
  initialCash Float    @default(0)
  status      String   @default("planning")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // ... relações permanecem iguais
```

- [ ] **Step 2: Executar a migração**

```bash
npx prisma migrate dev --name add_initial_cash
```

Saída esperada: `✔ Generated Prisma Client` e uma migration criada em `prisma/migrations/`.

- [ ] **Step 3: Verificar que o banco foi atualizado**

```bash
npx prisma studio
```

Abrir `http://localhost:5555`, verificar que a tabela `Event` tem a coluna `initialCash`. Fechar o studio com Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add initialCash field to Event schema"
```

---

## Task 2: API — criar e editar evento com `initialCash`

**Files:**
- Modify: `app/api/events/route.ts`
- Modify: `app/api/events/[id]/route.ts`

- [ ] **Step 1: Atualizar o POST em `app/api/events/route.ts`**

Localizar o bloco `data` dentro de `prisma.event.create` (linha 27). Adicionar `initialCash`:

```ts
const event = await prisma.event.create({
  data: {
    name: body.name,
    date: new Date(body.date),
    location: body.location,
    description: body.description,
    imageUrl: body.imageUrl || null,
    ticketGoal: parseInt(body.ticketGoal) || 0,
    initialCash: parseFloat(body.initialCash) || 0,
    status: body.status || "planning",
  },
});
```

- [ ] **Step 2: Atualizar o PUT em `app/api/events/[id]/route.ts`**

Localizar o bloco `data` dentro de `prisma.event.update` (linha 41). Adicionar `initialCash`:

```ts
const event = await prisma.event.update({
  where: { id: params.id },
  data: {
    name: body.name,
    date: new Date(body.date),
    location: body.location,
    description: body.description,
    imageUrl: body.imageUrl || null,
    ticketGoal: parseInt(body.ticketGoal) || 0,
    initialCash: parseFloat(body.initialCash) || 0,
    status: body.status,
  },
});
```

- [ ] **Step 3: Verificar manualmente**

Com o servidor rodando (`npm run dev`), usar o formulário de criação de eventos para criar um evento com caixa inicial. Verificar via Prisma Studio que o valor foi salvo na coluna `initialCash`.

- [ ] **Step 4: Commit**

```bash
git add app/api/events/route.ts app/api/events/[id]/route.ts
git commit -m "feat: persist initialCash on event create and update"
```

---

## Task 3: Dashboard — incluir `initialCash` nos cálculos

**Files:**
- Modify: `app/api/dashboard/route.ts`

- [ ] **Step 1: Atualizar `availableNow`**

Localizar a linha (linha 50):
```ts
const availableNow = platformAvailable + pixRevenue + barRevenue;
```

Substituir por:
```ts
const availableNow = platformAvailable + pixRevenue + barRevenue + (event.initialCash ?? 0);
```

- [ ] **Step 2: Expor `initialCash` em `financials`**

Localizar o objeto retornado em `financials` (linha 92). Adicionar o campo:

```ts
financials: {
  totalRevenue,
  totalTicketRevenue,
  barRevenue,
  platformRevenue,
  platformAvailable,
  platformRetained,
  pixRevenue,
  initialCash: event.initialCash,
  availableNow,
  totalExpenses,
  paidExpenses,
  pendingExpenses,
  realBalance,
},
```

- [ ] **Step 3: Verificar manualmente**

Acessar `http://localhost:3000/api/dashboard?eventId=<id>` no browser (com sessão ativa) e confirmar que `financials.initialCash` aparece no JSON e que `availableNow` e `realBalance` refletem o valor.

- [ ] **Step 4: Commit**

```bash
git add app/api/dashboard/route.ts
git commit -m "feat: include initialCash in dashboard calculations"
```

---

## Task 4: Formulário de eventos — campo obrigatório `initialCash`

**Files:**
- Modify: `app/(app)/events/page.tsx`

- [ ] **Step 1: Adicionar `initialCash` ao `defaultForm` e à interface**

Localizar `const defaultForm` (linha 46) e a interface `Event` (linha 21).

Atualizar `defaultForm`:
```ts
const defaultForm = {
  name: "", date: "", location: "", description: "",
  ticketGoal: "", status: "planning", imageUrl: "", initialCash: ""
};
```

Adicionar `initialCash` à interface `Event`:
```ts
interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  description?: string;
  imageUrl?: string;
  ticketGoal: number;
  initialCash: number;
  status: string;
  ticketSales: Array<{ totalValue: number; channel: string }>;
  expenses: Array<{ value: number; status: string }>;
}
```

- [ ] **Step 2: Popular `initialCash` ao abrir edição**

Localizar a função `openEdit` (linha 76). Adicionar `initialCash` ao `setForm`:

```ts
function openEdit(event: Event) {
  setEditingEvent(event);
  setForm({
    name: event.name,
    date: new Date(event.date).toISOString().slice(0, 10),
    location: event.location,
    description: event.description ?? "",
    ticketGoal: String(event.ticketGoal),
    status: event.status,
    imageUrl: event.imageUrl ?? "",
    initialCash: String(event.initialCash),
  });
  setDialogOpen(true);
}
```

- [ ] **Step 3: Adicionar campo no dialog do formulário**

Localizar o grid de 2 colunas com "Data" e "Meta de Ingressos" (linha 330). Adicionar um novo campo abaixo do grid (depois do `</div>` do grid, antes do campo "Local"):

```tsx
<div className="space-y-1.5">
  <Label>Caixa Inicial (R$) *</Label>
  <Input
    type="number"
    min="0"
    step="0.01"
    placeholder="0,00"
    value={form.initialCash}
    onChange={(e) => setForm({ ...form, initialCash: e.target.value })}
  />
</div>
```

- [ ] **Step 4: Tornar o campo obrigatório na validação do botão Salvar**

Localizar o atributo `disabled` do botão Salvar (linha 370):
```tsx
disabled={saving || !form.name || !form.date || !form.location}
```

Substituir por:
```tsx
disabled={saving || !form.name || !form.date || !form.location || form.initialCash === "" || parseFloat(form.initialCash) < 0}
```

- [ ] **Step 5: Verificar manualmente**

Abrir o formulário de novo evento: confirmar que o botão "Criar Evento" fica desabilitado sem o campo preenchido. Criar um evento com caixa inicial de R$ 500. Verificar no dashboard que o valor aparece em "Disponível no Caixa".

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/events/page.tsx"
git commit -m "feat: add required initialCash field to event form"
```

---

## Task 5: Exportação — PDF e Excel

**Files:**
- Modify: `app/(app)/export/page.tsx`

- [ ] **Step 1: Adicionar linha "Caixa Inicial" no PDF**

Localizar a chamada `drawSummaryTable` na seção "RESUMO FINANCEIRO" (linha 284). Inserir a linha de `initialCash` **antes** de "Receita Bruta Total":

```ts
y = drawSummaryTable(doc, [
  { label: "Caixa Inicial",                  value: formatCurrency(f.initialCash),    valueColor: C.green },
  { label: "Receita Bruta Total",            value: formatCurrency(f.totalRevenue),   valueColor: C.green },
  { label: "Disponível no Caixa",            value: formatCurrency(f.availableNow),   valueColor: C.green },
  { label: "Retido pela Plataforma (30%)",   value: formatCurrency(f.platformRetained), valueColor: C.orange },
  { label: "Despesas Pagas",                 value: formatCurrency(f.paidExpenses),   valueColor: C.red },
  {
    label: "Saldo Real",
    value: formatCurrency(f.realBalance),
    valueColor: f.realBalance >= 0 ? C.green : C.red,
    bold: true,
  },
], y);
```

- [ ] **Step 2: Adicionar linha "Caixa Inicial" no Excel**

Localizar o array `summaryData` na função `exportExcel` (linha 515). Inserir como **primeira linha**:

```ts
const summaryData = [
  { "Campo": "Caixa Inicial",               "Valor": f.initialCash },
  { "Campo": "Receita Bruta Total",         "Valor": f.totalRevenue },
  { "Campo": "Receita de Ingressos",        "Valor": f.totalTicketRevenue },
  { "Campo": "Receita do Bar",              "Valor": f.barRevenue },
  { "Campo": "Plataforma (bruta)",          "Valor": f.platformRevenue },
  { "Campo": "Plataforma disponível (70%)", "Valor": f.platformAvailable },
  { "Campo": "Plataforma retido (30%)",     "Valor": f.platformRetained },
  { "Campo": "PIX Direto",                  "Valor": f.pixRevenue },
  { "Campo": "Disponível no Caixa",         "Valor": f.availableNow },
  { "Campo": "Total Despesas",              "Valor": f.totalExpenses },
  { "Campo": "Despesas Pagas",              "Valor": f.paidExpenses },
  { "Campo": "Despesas Pendentes",          "Valor": f.pendingExpenses },
  { "Campo": "Saldo Real",                  "Valor": f.realBalance },
];
```

- [ ] **Step 3: Verificar manualmente**

Acessar `/export` com um evento selecionado. Exportar o PDF e confirmar que a linha "Caixa Inicial" aparece na seção RESUMO FINANCEIRO em verde. Exportar o Excel e confirmar que a aba "Resumo" tem "Caixa Inicial" como primeira linha.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/export/page.tsx"
git commit -m "feat: show initialCash in PDF and Excel export"
```

---

## Verificação Final

- [ ] Criar um evento com `initialCash = 1000`
- [ ] Acessar o dashboard: `availableNow` deve incluir os R$ 1.000
- [ ] Editar o evento e alterar `initialCash = 500`: confirmar que dashboard atualiza
- [ ] Exportar PDF: linha "Caixa Inicial R$ 500,00" aparece no Resumo Financeiro
- [ ] Exportar Excel: primeira linha da aba Resumo é "Caixa Inicial / 500"
