"use client";

import { useEffect, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import { toast } from "sonner";
import {
  Package, Plus, Edit2, Trash2, BoxSelect, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  notes?: string;
}

const CATEGORIES: Record<string, string> = {
  bebidas: "Bebidas",
  gelo: "Gelo",
  copos: "Copos/Descartáveis",
  limpeza: "Limpeza",
  alimentacao: "Alimentação",
  equipamentos: "Equipamentos",
  outros: "Outros",
};

const UNITS = ["un", "kg", "L", "cx", "saco", "pct", "par", "rolo"];

const CATEGORY_COLORS: Record<string, string> = {
  bebidas: "text-blue-400 border-blue-500/30 bg-blue-500/5",
  gelo: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
  copos: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
  limpeza: "text-green-400 border-green-500/30 bg-green-500/5",
  alimentacao: "text-orange-400 border-orange-500/30 bg-orange-500/5",
  equipamentos: "text-purple-400 border-purple-500/30 bg-purple-500/5",
  outros: "text-zinc-400 border-zinc-500/30 bg-zinc-500/5",
};

const defaultForm = { name: "", quantity: "", unit: "un", category: "outros", notes: "" };

export default function StockPage() {
  const { activeEvent } = useEvent();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  async function fetchItems() {
    if (!activeEvent) return;
    setLoading(true);
    const res = await fetch(`/api/stock?eventId=${activeEvent.id}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, [activeEvent]);

  function openCreate() {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: StockItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      category: item.category,
      notes: item.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!activeEvent) return;
    setSaving(true);

    const method = editingItem ? "PUT" : "POST";
    const body = editingItem
      ? { id: editingItem.id, ...form }
      : { eventId: activeEvent.id, ...form };

    const res = await fetch("/api/stock", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editingItem ? "Item atualizado!" : "Item adicionado!");
      setDialogOpen(false);
      fetchItems();
    } else {
      toast.error("Erro ao salvar item");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este item do estoque?")) return;
    const res = await fetch(`/api/stock?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Item removido");
      fetchItems();
    } else {
      toast.error("Erro ao remover item");
    }
  }

  const filtered = filterCategory === "all"
    ? items
    : items.filter((i) => i.category === filterCategory);

  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, StockItem[]>);

  const totalItems = items.length;

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package className="w-14 h-14 text-muted-foreground/20 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Nenhum evento selecionado</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Selecione um evento para gerenciar o estoque.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {totalItems} ite{totalItems !== 1 ? "ns" : "m"} cadastrado{totalItems !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-500 text-white gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Item
        </Button>
      </div>

      {/* Filter */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterCategory === "all"
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : "text-muted-foreground border-border hover:border-green-500/30"
            }`}
          >
            Todos ({items.length})
          </button>
          {Object.entries(CATEGORIES).map(([key, label]) => {
            const count = items.filter((i) => i.category === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setFilterCategory(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filterCategory === key
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "text-muted-foreground border-border hover:border-green-500/30"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-24 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BoxSelect className="w-12 h-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">Nenhum item no estoque.</p>
          <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Adicionar primeiro item
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {CATEGORIES[category] ?? category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {catItems.map((item) => (
                  <Card key={item.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-bold tabular-nums">{item.quantity}</span>
                            <span className="text-sm text-muted-foreground">{item.unit}</span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Badge className={`text-[10px] px-2 py-0.5 border ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.outros}`}>
                          {CATEGORIES[item.category] ?? item.category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Adicionar ao Estoque"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do item *</Label>
              <Input
                placeholder="Ex: Sacos de Gelo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={form.unit} onValueChange={(v: string | null) => setForm({ ...form, unit: v ?? "un" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v: string | null) => setForm({ ...form, category: v ?? "outros" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Notas adicionais..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.quantity}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {saving ? "Salvando..." : editingItem ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
