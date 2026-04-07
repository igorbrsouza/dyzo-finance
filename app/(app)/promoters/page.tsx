"use client";

import { useEffect, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import { toast } from "sonner";
import { Users, Plus, Trash2, ArrowRight, Copy, TrendingUp, Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

interface Promoter {
  id: string;
  name: string;
  commission: number;
  discountAmount: number;
  discountType: string;
  uniqueLink: string;
  sales: Array<{ totalValue: number }>;
  createdAt: string;
}

export default function PromotersPage() {
  const { activeEvent } = useEvent();
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromoter, setEditingPromoter] = useState<Promoter | null>(null);
  const [form, setForm] = useState({ name: "", commission: "", discountAmount: "", discountType: "fixed", uniqueLink: "" });
  const [saving, setSaving] = useState(false);

  async function fetchPromoters() {
    if (!activeEvent) return;
    setLoading(true);
    const res = await fetch(`/api/promoters?eventId=${activeEvent.id}`);
    const data = await res.json();
    setPromoters(data);
    setLoading(false);
  }

  useEffect(() => { fetchPromoters(); }, [activeEvent]);

  function openCreate() {
    setEditingPromoter(null);
    setForm({ name: "", commission: "", discountAmount: "", discountType: "fixed", uniqueLink: "" });
    setDialogOpen(true);
  }

  function openEdit(promoter: Promoter) {
    setEditingPromoter(promoter);
    setForm({
      name: promoter.name,
      commission: String(promoter.commission),
      discountAmount: String(promoter.discountAmount),
      discountType: promoter.discountType || "fixed",
      uniqueLink: promoter.uniqueLink,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!activeEvent || !form.name || !form.commission) return;
    setSaving(true);
    const isEdit = !!editingPromoter;
    const res = await fetch("/api/promoters", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit
        ? { id: editingPromoter.id, ...form }
        : { ...form, eventId: activeEvent.id }
      ),
    });
    if (res.ok) {
      toast.success(isEdit ? "Promotor atualizado!" : "Promotor cadastrado!");
      setDialogOpen(false);
      setForm({ name: "", commission: "", discountAmount: "", discountType: "fixed", uniqueLink: "" });
      setEditingPromoter(null);
      fetchPromoters();
    } else toast.error(isEdit ? "Erro ao atualizar promotor" : "Erro ao cadastrar promotor");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este promotor?")) return;
    const res = await fetch(`/api/promoters?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Promotor removido");
      fetchPromoters();
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(`${window.location.origin}/promo/${link}`);
    toast.success("Link copiado!");
  }

  const totalRevenue = promoters.reduce((sum, p) => sum + p.sales.reduce((s, sale) => s + sale.totalValue, 0), 0);
  const totalCommission = promoters.reduce((sum, p) => {
    const rev = p.sales.reduce((s, sale) => s + sale.totalValue, 0);
    return sum + rev * (p.commission / 100);
  }, 0);

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">Selecione um evento para gerenciar promotores.</p>
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
          <h1 className="text-xl font-bold">Promotores</h1>
          <p className="text-muted-foreground text-sm">{activeEvent.name} · {promoters.length} promotor{promoters.length !== 1 ? "es" : ""}</p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-500 text-white gap-2">
          <Plus className="w-4 h-4" /> Novo Promotor
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total de Promotores</p>
            <p className="text-xl font-bold">{promoters.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Receita Gerada</p>
            <p className="text-xl font-bold text-green-400 tabular-nums">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Comissão a Pagar</p>
            <p className="text-xl font-bold text-amber-400 tabular-nums">{formatCurrency(totalCommission)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promotor</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Comissão</TableHead>
                <TableHead className="text-center hidden md:table-cell">Desconto</TableHead>
                <TableHead className="hidden lg:table-cell">Link</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : promoters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum promotor cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                promoters
                  .map((p) => ({
                    ...p,
                    revenue: p.sales.reduce((s, sale) => s + sale.totalValue, 0),
                  }))
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((promoter, idx) => {
                    const commission = promoter.revenue * (promoter.commission / 100);
                    return (
                      <TableRow key={promoter.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{idx + 1}º</span>
                            <div>
                              <p className="text-sm font-medium">{promoter.name}</p>
                              <p className="text-xs text-muted-foreground">{promoter.commission}% comissão</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{promoter.sales.length}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-green-400 tabular-nums">
                          {formatCurrency(promoter.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-amber-400 tabular-nums hidden sm:table-cell">
                          {formatCurrency(commission)}
                        </TableCell>
                        <TableCell className="text-center text-sm hidden md:table-cell">
                          {promoter.discountAmount > 0 ? (
                            <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px]">
                              {promoter.discountType === "percent"
                                ? `−${promoter.discountAmount}%`
                                : `−${formatCurrency(promoter.discountAmount)}`}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {promoter.uniqueLink ? (
                            <a
                              href={promoter.uniqueLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors max-w-[160px] truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{promoter.uniqueLink}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem link</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(promoter)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(promoter.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingPromoter ? "Editar Promotor" : "Novo Promotor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome do promotor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Comissão (%) *</Label>
              <Input type="number" step="0.1" min="0" max="100" placeholder="10" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto no Ingresso</Label>
              <div className="flex gap-2">
                <div className="flex rounded-md border border-input overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, discountType: "fixed" })}
                    className={`px-3 py-2 transition-colors ${form.discountType === "fixed" ? "bg-green-600 text-white" : "text-muted-foreground hover:bg-secondary"}`}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, discountType: "percent" })}
                    className={`px-3 py-2 transition-colors ${form.discountType === "percent" ? "bg-green-600 text-white" : "text-muted-foreground hover:bg-secondary"}`}
                  >
                    %
                  </button>
                </div>
                <Input
                  type="number"
                  step={form.discountType === "percent" ? "1" : "0.01"}
                  min="0"
                  max={form.discountType === "percent" ? "100" : undefined}
                  placeholder={form.discountType === "percent" ? "0" : "0,00"}
                  value={form.discountAmount}
                  onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Desconto que o promotor pode oferecer no valor do ingresso</p>
            </div>
            <div className="space-y-1.5">
              <Label>Link do promotor</Label>
              <Input placeholder="https://..." value={form.uniqueLink} onChange={(e) => setForm({ ...form, uniqueLink: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.commission} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? (editingPromoter ? "Salvando..." : "Cadastrando...") : (editingPromoter ? "Salvar" : "Cadastrar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
