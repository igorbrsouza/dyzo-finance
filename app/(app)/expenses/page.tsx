"use client";

import { useEffect, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import { toast } from "sonner";
import { Receipt, Plus, Trash2, Edit2, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, getExpenseCategoryLabel } from "@/lib/constants";

interface Expense {
  id: string;
  description: string;
  category: string;
  value: number;
  paidAmount: number;
  status: string;
  date: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: "Pago", color: "border-green-500/30 text-green-400" },
  pending: { label: "Pendente", color: "border-amber-500/30 text-amber-400" },
  partial: { label: "Parcial", color: "border-blue-500/30 text-blue-400" },
};

const defaultForm = {
  description: "", category: "", value: "", status: "pending", date: "", paidAmount: ""
};

export default function ExpensesPage() {
  const { activeEvent } = useEvent();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  async function fetchExpenses() {
    if (!activeEvent) return;
    setLoading(true);
    const res = await fetch(`/api/expenses?eventId=${activeEvent.id}`);
    const data = await res.json();
    setExpenses(data);
    setLoading(false);
  }

  useEffect(() => { fetchExpenses(); }, [activeEvent]);

  function openCreate() {
    setEditingExpense(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

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

  async function handleSave() {
    if (!activeEvent || !form.description || !form.category || !form.value) return;
    setSaving(true);

    const method = editingExpense ? "PUT" : "POST";
    const res = await fetch("/api/expenses", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingExpense ? { id: editingExpense.id } : { eventId: activeEvent.id }),
        ...form,
      }),
    });

    if (res.ok) {
      toast.success(editingExpense ? "Despesa atualizada!" : "Despesa registrada!");
      setDialogOpen(false);
      fetchExpenses();
    } else toast.error("Erro ao salvar despesa");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta despesa?")) return;
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    toast.success("Despesa excluída");
    fetchExpenses();
  }

  const totalPaid =
    expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.value, 0) +
    expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + e.paidAmount, 0);

  const totalPending =
    expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.value, 0) +
    expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + (e.value - e.paidAmount), 0);
  const totalAll = expenses.reduce((sum, e) => sum + e.value, 0);

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Receipt className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">Selecione um evento para gerenciar despesas.</p>
        <Link href="/events" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium mt-4 bg-green-600 hover:bg-green-500 text-white">
          <ArrowRight className="w-4 h-4" />Ir para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Despesas</h1>
          <p className="text-muted-foreground text-sm">{activeEvent.name} · {expenses.length} despesa{expenses.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-500 text-white gap-2">
          <Plus className="w-4 h-4" /> Nova Despesa
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-red-400 tabular-nums">{formatCurrency(totalAll)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-xl font-bold text-green-400 tabular-nums">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className={totalPending > 0 ? "border-amber-500/30" : ""}>
          <CardContent className="p-3 flex items-start gap-2">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-xl font-bold text-amber-400 tabular-nums">{formatCurrency(totalPending)}</p>
            </div>
            {totalPending > 0 && <AlertTriangle className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="hidden md:table-cell text-right">Data</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma despesa registrada
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => {
                  const statusConfig = STATUS_CONFIG[expense.status];
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium text-sm">{expense.description}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {getExpenseCategoryLabel(expense.category)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
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
                      <TableCell className="hidden md:table-cell text-right text-xs text-muted-foreground">
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(expense)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(expense.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input placeholder="Descrição da despesa" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={
              saving ||
              !form.description ||
              !form.category ||
              !form.value ||
              (form.status === "partial" && (!form.paidAmount || parseFloat(form.paidAmount) <= 0))
            } className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Salvando..." : editingExpense ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
