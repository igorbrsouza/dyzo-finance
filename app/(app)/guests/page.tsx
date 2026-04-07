"use client";

import { useEffect, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import { toast } from "sonner";
import { UserCheck, Plus, Trash2, CheckCircle2, Clock, XCircle, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { formatDate } from "@/lib/constants";

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  confirmed: { label: "Confirmado", icon: <CheckCircle2 className="w-3 h-3" />, color: "border-green-500/30 text-green-400" },
  pending: { label: "Pendente", icon: <Clock className="w-3 h-3" />, color: "border-amber-500/30 text-amber-400" },
  cancelled: { label: "Cancelado", icon: <XCircle className="w-3 h-3" />, color: "border-red-500/30 text-red-400" },
};

export default function GuestsPage() {
  const { activeEvent } = useEvent();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "pending" });
  const [saving, setSaving] = useState(false);

  async function fetchGuests() {
    if (!activeEvent) return;
    setLoading(true);
    const res = await fetch(`/api/guests?eventId=${activeEvent.id}`);
    const data = await res.json();
    setGuests(data);
    setLoading(false);
  }

  useEffect(() => { fetchGuests(); }, [activeEvent]);

  async function handleSave() {
    if (!activeEvent || !form.name) return;
    setSaving(true);
    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, eventId: activeEvent.id }),
    });
    if (res.ok) {
      toast.success("Convidado adicionado!");
      setDialogOpen(false);
      setForm({ name: "", email: "", phone: "", status: "pending" });
      fetchGuests();
    } else toast.error("Erro ao adicionar convidado");
    setSaving(false);
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch("/api/guests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      toast.success("Status atualizado");
      fetchGuests();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este convidado?")) return;
    const res = await fetch(`/api/guests?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Convidado removido");
      fetchGuests();
    }
  }

  const filtered = guests.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.email?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    confirmed: guests.filter((g) => g.status === "confirmed").length,
    pending: guests.filter((g) => g.status === "pending").length,
    cancelled: guests.filter((g) => g.status === "cancelled").length,
  };

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <UserCheck className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">Selecione um evento para gerenciar convidados.</p>
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
          <h1 className="text-xl font-bold">Lista de Convidados</h1>
          <p className="text-muted-foreground text-sm">{activeEvent.name} · {guests.length} convidado{guests.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-green-600 hover:bg-green-500 text-white gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <Card key={key}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`p-1.5 rounded-md border ${config.color}`}>{config.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{config.label}</p>
                <p className="text-lg font-bold tabular-nums">{counts[key as keyof typeof counts]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Adicionado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center gap-2">
                      {[1,2,3].map(i => <div key={i} className="w-2 h-2 bg-muted rounded-full animate-pulse" />)}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                    {search ? "Nenhum resultado encontrado" : "Nenhum convidado cadastrado"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((guest) => {
                  const config = STATUS_CONFIG[guest.status];
                  return (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium text-sm">{guest.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {guest.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {guest.phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Select value={guest.status} onValueChange={(v) => handleStatusChange(guest.id, v)}>
                          <SelectTrigger className={`w-32 h-7 text-xs border ${config.color}`}>
                            <span className="flex items-center gap-1">
                              {config.icon}
                              {config.label}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDate(guest.createdAt)}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleDelete(guest.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Convidado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="(11) 9 0000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
