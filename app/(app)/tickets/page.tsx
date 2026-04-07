"use client";

import { useEffect, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import { toast } from "sonner";
import {
  Ticket, Plus, ChevronDown, ChevronRight, Trash2, ShoppingCart, ArrowRight, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDatetime } from "@/lib/constants";
import Link from "next/link";

interface TicketBatch {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface TicketType {
  id: string;
  name: string;
  batches: TicketBatch[];
  sales: any[];
}

interface TicketSale {
  id: string;
  ticketType: { name: string };
  batch: { name: string };
  quantity: number;
  unitPrice: number;
  totalValue: number;
  channel: string;
  promoter?: { name: string } | null;
  saleDate: string;
}

const BATCH_STATUS_COLORS: Record<string, string> = {
  active: "border-green-500/30 text-green-400",
  sold_out: "border-red-500/30 text-red-400",
  closed: "border-zinc-500/30 text-zinc-400",
  cancelled: "border-red-500/30 text-red-400",
};

const BATCH_STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  sold_out: "Esgotado",
  closed: "Encerrado",
  cancelled: "Cancelado",
};

export default function TicketsPage() {
  const { activeEvent } = useEvent();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [sales, setSales] = useState<TicketSale[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Dialogs
  const [typeDialog, setTypeDialog] = useState(false);
  const [batchDialog, setBatchDialog] = useState(false);
  const [saleDialog, setSaleDialog] = useState(false);
  const [editBatchDialog, setEditBatchDialog] = useState(false);
  const [deleteBatchId, setDeleteBatchId] = useState<string | null>(null);

  const [typeForm, setTypeForm] = useState({ name: "" });
  const [batchForm, setBatchForm] = useState({
    ticketTypeId: "", name: "", price: "", quantity: "", status: "active", startDate: "", endDate: ""
  });
  const [editBatchForm, setEditBatchForm] = useState({
    batchId: "", name: "", price: "", quantity: "", status: "active", startDate: "", endDate: ""
  });
  const [saleForm, setSaleForm] = useState({
    ticketTypeId: "", batchId: "", quantity: "1", channel: "pix", promoterId: "", saleDate: ""
  });
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    if (!activeEvent) return;
    setLoading(true);
    const [typesRes, eventRes, promotersRes] = await Promise.all([
      fetch(`/api/tickets?eventId=${activeEvent.id}`),
      fetch(`/api/events/${activeEvent.id}`),
      fetch(`/api/promoters?eventId=${activeEvent.id}`),
    ]);
    const types = await typesRes.json();
    const eventData = await eventRes.json();
    const promsData = await promotersRes.json();
    setTicketTypes(types);
    setSales(eventData.ticketSales || []);
    setPromoters(promsData);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [activeEvent]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createType() {
    if (!activeEvent || !typeForm.name) return;
    setSaving(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ticket_type", eventId: activeEvent.id, name: typeForm.name }),
    });
    if (res.ok) {
      toast.success("Tipo de ingresso criado!");
      setTypeDialog(false);
      setTypeForm({ name: "" });
      fetchData();
    } else toast.error("Erro ao criar tipo");
    setSaving(false);
  }

  async function createBatch() {
    if (!batchForm.ticketTypeId || !batchForm.name || !batchForm.price || !batchForm.quantity) return;
    setSaving(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "batch", ...batchForm }),
    });
    if (res.ok) {
      toast.success("Lote criado!");
      setBatchDialog(false);
      setBatchForm({ ticketTypeId: "", name: "", price: "", quantity: "", status: "active", startDate: "", endDate: "" });
      fetchData();
    } else toast.error("Erro ao criar lote");
    setSaving(false);
  }

  function openEditBatch(batch: TicketBatch) {
    setEditBatchForm({
      batchId: batch.id,
      name: batch.name,
      price: String(batch.price),
      quantity: String(batch.quantity),
      status: batch.status,
      startDate: batch.startDate ? batch.startDate.slice(0, 10) : "",
      endDate: batch.endDate ? batch.endDate.slice(0, 10) : "",
    });
    setEditBatchDialog(true);
  }

  async function updateBatch() {
    if (!editBatchForm.batchId || !editBatchForm.name || !editBatchForm.price || !editBatchForm.quantity) return;
    setSaving(true);
    const res = await fetch("/api/tickets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "batch", ...editBatchForm }),
    });
    if (res.ok) {
      toast.success("Lote atualizado!");
      setEditBatchDialog(false);
      fetchData();
    } else toast.error("Erro ao atualizar lote");
    setSaving(false);
  }

  async function deleteBatch(batchId: string) {
    setSaving(true);
    const res = await fetch(`/api/tickets?batchId=${batchId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Lote excluído!");
      setDeleteBatchId(null);
      fetchData();
    } else toast.error("Erro ao excluir lote");
    setSaving(false);
  }

  async function createSale() {
    if (!activeEvent || !saleForm.ticketTypeId || !saleForm.batchId || !saleForm.quantity) return;
    setSaving(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sale",
        eventId: activeEvent.id,
        ...saleForm,
        promoterId: saleForm.promoterId || null,
      }),
    });
    if (res.ok) {
      toast.success("Venda registrada!");
      setSaleDialog(false);
      setSaleForm({ ticketTypeId: "", batchId: "", quantity: "1", channel: "pix", promoterId: "", saleDate: "" });
      fetchData();
    } else toast.error("Erro ao registrar venda");
    setSaving(false);
  }

  const selectedTypeForSale = ticketTypes.find((t) => t.id === saleForm.ticketTypeId);
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalValue, 0);
  const platformSales = sales.filter((s) => s.channel === "platform");
  const pixSales = sales.filter((s) => s.channel === "pix");

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Ticket className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">Selecione um evento para gerenciar ingressos.</p>
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
          <h1 className="text-xl font-bold">Ingressos</h1>
          <p className="text-muted-foreground text-sm">{activeEvent.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTypeDialog(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Tipo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBatchDialog(true)} className="gap-1.5" disabled={ticketTypes.length === 0}>
            <Plus className="w-3.5 h-3.5" /> Lote
          </Button>
          <Button size="sm" onClick={() => setSaleDialog(true)} className="bg-green-600 hover:bg-green-500 text-white gap-1.5" disabled={ticketTypes.length === 0}>
            <ShoppingCart className="w-3.5 h-3.5" /> Registrar Venda
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-base font-bold text-green-400 tabular-nums">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Plataforma</p>
            <p className="text-base font-bold tabular-nums">{platformSales.length} venda{platformSales.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">PIX Direto</p>
            <p className="text-base font-bold text-green-400 tabular-nums">{pixSales.length} venda{pixSales.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">Tipos e Lotes</TabsTrigger>
          <TabsTrigger value="sales">Vendas ({sales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : ticketTypes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhum tipo de ingresso criado.
              <br />
              <button onClick={() => setTypeDialog(true)} className="text-green-400 hover:underline mt-1">
                Criar primeiro tipo
              </button>
            </div>
          ) : (
            ticketTypes.map((type) => (
              <Card key={type.id}>
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => toggleExpanded(type.id)}
                >
                  {expanded.has(type.id) ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{type.name}</p>
                    <p className="text-xs text-muted-foreground">{type.batches.length} lote{type.batches.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">
                      {formatCurrency(type.sales.reduce((sum: number, s: any) => sum + s.totalValue, 0))}
                    </p>
                  </div>
                </div>

                {expanded.has(type.id) && (
                  <div className="border-t border-border px-4 pb-4">
                    {type.batches.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3">Nenhum lote criado.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {type.batches.map((batch) => (
                          <div key={batch.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                            <div>
                              <span className="font-medium">{batch.name}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {batch.sold}/{batch.quantity} vendidos
                              </span>
                              {(batch.startDate || batch.endDate) && (
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {batch.startDate ? formatDate(batch.startDate) : ""}
                                  {batch.startDate && batch.endDate ? " – " : ""}
                                  {batch.endDate ? formatDate(batch.endDate) : ""}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums">{formatCurrency(batch.price)}</span>
                              <Badge className={`text-[10px] border ${BATCH_STATUS_COLORS[batch.status] ?? "border-zinc-500/30 text-zinc-400"}`}>
                                {BATCH_STATUS_LABELS[batch.status] ?? batch.status}
                              </Badge>
                              <button
                                onClick={() => openEditBatch(batch)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Editar lote"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteBatchId(batch.id)}
                                className="text-muted-foreground hover:text-red-400"
                                title="Excluir lote"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => { setBatchForm({ ...batchForm, ticketTypeId: type.id }); setBatchDialog(true); }}
                      className="mt-2 text-xs text-green-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar lote
                    </button>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Promotor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                        Nenhuma venda registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-sm">{sale.ticketType?.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{sale.batch?.name}</TableCell>
                        <TableCell className="text-center text-sm">{sale.quantity}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] border ${sale.channel === "pix" ? "border-green-500/30 text-green-400" : "border-blue-500/30 text-blue-400"}`}>
                            {sale.channel === "pix" ? "PIX" : "Plataforma"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sale.promoter?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-green-400 tabular-nums">
                          {formatCurrency(sale.totalValue)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDatetime(sale.saleDate)}
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

      {/* Create Type Dialog */}
      <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo Tipo de Ingresso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Pista, VIP, Meia-entrada" value={typeForm.name} onChange={(e) => setTypeForm({ name: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialog(false)}>Cancelar</Button>
            <Button onClick={createType} disabled={saving || !typeForm.name} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Batch Dialog */}
      <Dialog open={batchDialog} onOpenChange={setBatchDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo Lote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo de Ingresso *</Label>
              <Select value={batchForm.ticketTypeId} onValueChange={(v) => setBatchForm({ ...batchForm, ticketTypeId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Lote *</Label>
              <Input placeholder="Ex: 1º Lote, Promocional" value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço (R$) *</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={batchForm.price} onChange={(e) => setBatchForm({ ...batchForm, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade *</Label>
                <Input type="number" placeholder="100" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={batchForm.status} onValueChange={(v) => setBatchForm({ ...batchForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="sold_out">Esgotado</SelectItem>
                  <SelectItem value="closed">Encerrado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data início</Label>
                <Input type="date" value={batchForm.startDate} onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Data fim</Label>
                <Input type="date" value={batchForm.endDate} onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialog(false)}>Cancelar</Button>
            <Button onClick={createBatch} disabled={saving || !batchForm.ticketTypeId || !batchForm.name || !batchForm.price || !batchForm.quantity} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Criando..." : "Criar Lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      <Dialog open={editBatchDialog} onOpenChange={setEditBatchDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Lote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome do Lote *</Label>
              <Input placeholder="Ex: 1º Lote" value={editBatchForm.name} onChange={(e) => setEditBatchForm({ ...editBatchForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço (R$) *</Label>
                <Input type="number" step="0.01" value={editBatchForm.price} onChange={(e) => setEditBatchForm({ ...editBatchForm, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade *</Label>
                <Input type="number" value={editBatchForm.quantity} onChange={(e) => setEditBatchForm({ ...editBatchForm, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editBatchForm.status} onValueChange={(v) => setEditBatchForm({ ...editBatchForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="sold_out">Esgotado</SelectItem>
                  <SelectItem value="closed">Encerrado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data início</Label>
                <Input type="date" value={editBatchForm.startDate} onChange={(e) => setEditBatchForm({ ...editBatchForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Data fim</Label>
                <Input type="date" value={editBatchForm.endDate} onChange={(e) => setEditBatchForm({ ...editBatchForm, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBatchDialog(false)}>Cancelar</Button>
            <Button onClick={updateBatch} disabled={saving || !editBatchForm.name || !editBatchForm.price || !editBatchForm.quantity} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Batch Confirmation Dialog */}
      <Dialog open={!!deleteBatchId} onOpenChange={(open) => { if (!open) setDeleteBatchId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Lote</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBatchId(null)}>Cancelar</Button>
            <Button onClick={() => deleteBatchId && deleteBatch(deleteBatchId)} disabled={saving} className="bg-red-600 hover:bg-red-500 text-white">
              {saving ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Sale Dialog */}
      <Dialog open={saleDialog} onOpenChange={setSaleDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar Venda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo de Ingresso *</Label>
              <Select value={saleForm.ticketTypeId} onValueChange={(v) => setSaleForm({ ...saleForm, ticketTypeId: v, batchId: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedTypeForSale && (
              <div className="space-y-1.5">
                <Label>Lote *</Label>
                <Select value={saleForm.batchId} onValueChange={(v) => setSaleForm({ ...saleForm, batchId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
                  <SelectContent>
                    {selectedTypeForSale.batches.filter((b) => b.status === "active").map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} — {formatCurrency(b.price)} ({b.quantity - b.sold} restantes)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade *</Label>
                <Input type="number" min="1" value={saleForm.quantity} onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Canal *</Label>
                <Select value={saleForm.channel} onValueChange={(v) => setSaleForm({ ...saleForm, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX Direto</SelectItem>
                    <SelectItem value="platform">Plataforma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {promoters.length > 0 && (
              <div className="space-y-1.5">
                <Label>Promotor (opcional)</Label>
                <Select value={saleForm.promoterId} onValueChange={(v) => setSaleForm({ ...saleForm, promoterId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {promoters.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Data da Venda</Label>
              <Input type="datetime-local" value={saleForm.saleDate} onChange={(e) => setSaleForm({ ...saleForm, saleDate: e.target.value })} />
            </div>
            {saleForm.batchId && saleForm.quantity && (
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs text-muted-foreground">Total da venda</p>
                <p className="text-lg font-bold text-green-400 tabular-nums">
                  {formatCurrency(
                    (selectedTypeForSale?.batches.find((b) => b.id === saleForm.batchId)?.price ?? 0) * parseInt(saleForm.quantity || "0")
                  )}
                </p>
                {saleForm.channel === "platform" && (
                  <p className="text-xs text-amber-400 mt-1">30% será retido pela plataforma</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDialog(false)}>Cancelar</Button>
            <Button onClick={createSale} disabled={saving || !saleForm.ticketTypeId || !saleForm.batchId} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Registrando..." : "Registrar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
