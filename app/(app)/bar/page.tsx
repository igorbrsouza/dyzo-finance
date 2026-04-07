"use client";

import { useEffect, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import { toast } from "sonner";
import { GlassWater, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { formatCurrency, formatDatetime } from "@/lib/constants";

interface BarItem {
  id: string;
  name: string;
  price: number;
  cost: number | null;
  sales: Array<{ quantity: number; totalValue: number }>;
}

interface BarSale {
  id: string;
  barItem: { name: string; price: number; cost: number | null };
  quantity: number;
  totalValue: number;
  saleTime: string;
}

export default function BarPage() {
  const { activeEvent } = useEvent();
  const [items, setItems] = useState<BarItem[]>([]);
  const [sales, setSales] = useState<BarSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemDialog, setItemDialog] = useState(false);
  const [saleDialog, setSaleDialog] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", price: "", cost: "" });
  const [saleForm, setSaleForm] = useState({ barItemId: "", quantity: "1", saleTime: "" });
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    if (!activeEvent) return;
    setLoading(true);
    const [itemsRes, salesRes] = await Promise.all([
      fetch(`/api/bar?eventId=${activeEvent.id}&type=items`),
      fetch(`/api/bar?eventId=${activeEvent.id}&type=sales`),
    ]);
    const itemsData = await itemsRes.json();
    const salesData = await salesRes.json();
    setItems(itemsData);
    setSales(salesData);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [activeEvent]);

  async function createItem() {
    if (!activeEvent || !itemForm.name || !itemForm.price) return;
    setSaving(true);
    const res = await fetch("/api/bar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "item", eventId: activeEvent.id, ...itemForm }),
    });
    if (res.ok) {
      toast.success("Item criado!");
      setItemDialog(false);
      setItemForm({ name: "", price: "", cost: "" });
      fetchData();
    } else toast.error("Erro ao criar item");
    setSaving(false);
  }

  async function createSale() {
    if (!activeEvent || !saleForm.barItemId || !saleForm.quantity) return;
    setSaving(true);
    const res = await fetch("/api/bar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "sale", eventId: activeEvent.id, ...saleForm }),
    });
    if (res.ok) {
      toast.success("Venda registrada!");
      setSaleDialog(false);
      setSaleForm({ barItemId: "", quantity: "1", saleTime: "" });
      fetchData();
    } else toast.error("Erro ao registrar venda");
    setSaving(false);
  }

  async function deleteItem(id: string) {
    if (!confirm("Remover este item?")) return;
    await fetch(`/api/bar?id=${id}&type=item`, { method: "DELETE" });
    toast.success("Item removido");
    fetchData();
  }

  async function deleteSale(id: string) {
    await fetch(`/api/bar?id=${id}&type=sale`, { method: "DELETE" });
    toast.success("Venda removida");
    fetchData();
  }

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalValue, 0);
  const totalItems = sales.reduce((sum, s) => sum + s.quantity, 0);
  const totalProfit = sales.reduce((sum, s) => {
    if (s.barItem?.cost == null) return sum;
    return sum + (s.barItem.price - s.barItem.cost) * s.quantity;
  }, 0);
  const hasCostData = sales.some((s) => s.barItem?.cost != null);

  const selectedItem = items.find((i) => i.id === saleForm.barItemId);

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <GlassWater className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">Selecione um evento para gerenciar o bar.</p>
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
          <h1 className="text-xl font-bold">Bar</h1>
          <p className="text-muted-foreground text-sm">{activeEvent.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setItemDialog(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Item
          </Button>
          <Button size="sm" onClick={() => setSaleDialog(true)} className="bg-green-600 hover:bg-green-500 text-white gap-1.5" disabled={items.length === 0}>
            <ShoppingBag className="w-3.5 h-3.5" /> Registrar Venda
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-xl font-bold text-green-400 tabular-nums">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Itens no Cardápio</p>
            <p className="text-xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Itens Vendidos</p>
            <p className="text-xl font-bold tabular-nums">{totalItems}</p>
          </CardContent>
        </Card>
        {hasCostData && (
          <Card className="col-span-3 sm:col-span-1">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Lucro Estimado</p>
              <p className="text-xl font-bold text-blue-400 tabular-nums">{formatCurrency(totalProfit)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="menu">
        <TabsList>
          <TabsTrigger value="menu">Cardápio</TabsTrigger>
          <TabsTrigger value="sales">Vendas ({sales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                Nenhum item no cardápio.
                <br />
                <button onClick={() => setItemDialog(true)} className="text-green-400 hover:underline mt-1">
                  Adicionar primeiro item
                </button>
              </div>
            ) : (
              items.map((item) => {
                const itemRevenue = item.sales.reduce((sum, s) => sum + s.totalValue, 0);
                const itemSold = item.sales.reduce((sum, s) => sum + s.quantity, 0);
                return (
                  <Card key={item.id} className="flex items-center justify-between p-4 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{itemSold} vendido{itemSold !== 1 ? "s" : ""} · {formatCurrency(itemRevenue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-sm font-semibold text-green-400 tabular-nums">{formatCurrency(item.price)}</span>
                        {item.cost != null && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {((item.price - item.cost) / item.price * 100).toFixed(0)}% margem
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Horário</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                        Nenhuma venda registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium text-sm">{sale.barItem?.name}</TableCell>
                        <TableCell className="text-center text-sm">{sale.quantity}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {formatCurrency(sale.barItem?.price)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-green-400 tabular-nums">
                          {formatCurrency(sale.totalValue)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDatetime(sale.saleTime)}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => deleteSale(sale.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo Item do Bar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Cerveja Long Neck, Whisky dose" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Custo unitário (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={itemForm.cost} onChange={(e) => setItemForm({ ...itemForm, cost: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancelar</Button>
            <Button onClick={createItem} disabled={saving || !itemForm.name || !itemForm.price} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Sale Dialog */}
      <Dialog open={saleDialog} onOpenChange={setSaleDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar Venda no Bar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Item *</Label>
              <Select value={saleForm.barItemId ?? ""} onValueChange={(v: string | null) => setSaleForm({ ...saleForm, barItemId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} — {formatCurrency(i.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade *</Label>
              <Input type="number" min="1" value={saleForm.quantity} onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input type="datetime-local" value={saleForm.saleTime} onChange={(e) => setSaleForm({ ...saleForm, saleTime: e.target.value })} />
            </div>
            {saleForm.barItemId && saleForm.quantity && selectedItem && (
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs text-muted-foreground">Total da venda</p>
                <p className="text-lg font-bold text-green-400 tabular-nums">
                  {formatCurrency(selectedItem.price * parseInt(saleForm.quantity || "0"))}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDialog(false)}>Cancelar</Button>
            <Button onClick={createSale} disabled={saving || !saleForm.barItemId} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
