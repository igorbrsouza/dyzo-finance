"use client";

import { useEffect, useRef, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import { toast } from "sonner";
import {
  CalendarDays, MapPin, Target, Plus, Edit2, Trash2,
  CheckCircle2, Clock, Archive, ImageIcon, Upload, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, getEventStatusLabel } from "@/lib/constants";
import Image from "next/image";

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

const STATUS_ICONS: Record<string, React.ReactNode> = {
  planning: <Clock className="w-3 h-3" />,
  active: <CheckCircle2 className="w-3 h-3" />,
  closed: <Archive className="w-3 h-3" />,
};

const STATUS_COLORS: Record<string, string> = {
  planning: "border-amber-500/30 text-amber-400 bg-amber-500/5",
  active: "border-green-500/30 text-green-400 bg-green-500/5",
  closed: "border-zinc-500/30 text-zinc-400 bg-zinc-500/5",
};

const defaultForm = {
  name: "", date: "", location: "", description: "", ticketGoal: "", status: "planning", imageUrl: "", initialCash: ""
};

export default function EventsPage() {
  const { activeEvent, setActiveEvent } = useEvent();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchEvents() {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  }

  useEffect(() => { fetchEvents(); }, []);

  function openCreate() {
    setEditingEvent(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: url }));
      toast.success("Imagem carregada!");
    } else {
      toast.error("Erro ao carregar imagem");
    }
    setUploadingImage(false);
  }

  async function handleSave() {
    setSaving(true);
    const method = editingEvent ? "PUT" : "POST";
    const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success(editingEvent ? "Evento atualizado!" : "Evento criado!");
      setDialogOpen(false);
      fetchEvents();
    } else {
      toast.error("Erro ao salvar evento");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este evento? Todos os dados serão removidos.")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Evento excluído");
      if (activeEvent?.id === id) setActiveEvent(null);
      fetchEvents();
    } else {
      toast.error("Erro ao excluir evento");
    }
  }

  function handleSelectEvent(event: Event) {
    setActiveEvent({
      id: event.id,
      name: event.name,
      date: event.date,
      location: event.location,
      status: event.status,
    });
    toast.success(`Evento "${event.name}" selecionado`);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-secondary rounded animate-pulse w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {events.length} evento{events.length !== 1 ? "s" : ""} cadastrado{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-500 text-white gap-2">
          <Plus className="w-4 h-4" />
          Novo Evento
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum evento cadastrado.</p>
          <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Criar primeiro evento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const isActive = activeEvent?.id === event.id;
            const revenue = event.ticketSales.reduce((sum, s) => sum + s.totalValue, 0);
            const totalExpenses = event.expenses.reduce((sum, e) => sum + e.value, 0);

            return (
              <Card
                key={event.id}
                className={`relative overflow-hidden transition-all cursor-pointer hover:border-green-500/30 ${
                  isActive ? "border-green-500/50 shadow-green-500/5 shadow-lg" : ""
                }`}
                onClick={() => handleSelectEvent(event)}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500/0 via-green-500 to-green-500/0" />
                )}

                {/* Event image */}
                {event.imageUrl ? (
                  <div className="relative h-32 w-full overflow-hidden">
                    <Image
                      src={event.imageUrl}
                      alt={event.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
                  </div>
                ) : (
                  <div className="h-20 bg-gradient-to-br from-green-500/5 to-green-500/10 flex items-center justify-center border-b border-border">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/20" />
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{event.name}</CardTitle>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(event)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <Badge className={`w-fit text-[10px] px-2 py-0.5 gap-1 border ${STATUS_COLORS[event.status]}`}>
                    {STATUS_ICONS[event.status]}
                    {getEventStatusLabel(event.status)}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                    {formatDate(event.date)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Receita</p>
                      <p className="text-sm font-semibold text-green-400 tabular-nums">{formatCurrency(revenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Despesas</p>
                      <p className="text-sm font-semibold text-red-400 tabular-nums">{formatCurrency(totalExpenses)}</p>
                    </div>
                  </div>
                  {event.ticketGoal > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Target className="w-3.5 h-3.5" />
                      Meta: {event.ticketGoal} ingressos
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image upload */}
            <div className="space-y-1.5">
              <Label>Logo / Imagem do Evento</Label>
              {form.imageUrl ? (
                <div className="relative h-32 rounded-lg overflow-hidden border border-border group">
                  <Image src={form.imageUrl} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 rounded-lg border border-dashed border-border hover:border-green-500/50 hover:bg-green-500/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-green-400"
                  disabled={uploadingImage}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">{uploadingImage ? "Enviando..." : "Clique para enviar imagem"}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nome do Evento *</Label>
              <Input
                placeholder="Ex: Festa de Verão 2024"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Meta de Ingressos</Label>
                <Input type="number" placeholder="500" value={form.ticketGoal} onChange={(e) => setForm({ ...form, ticketGoal: e.target.value })} />
              </div>
            </div>
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
            <div className="space-y-1.5">
              <Label>Local *</Label>
              <Input placeholder="Nome do local ou endereço" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: string | null) => setForm({ ...form, status: v ?? "planning" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Em Planejamento</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="closed">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição opcional do evento..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.date || !form.location || form.initialCash === "" || parseFloat(form.initialCash) < 0}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {saving ? "Salvando..." : editingEvent ? "Salvar" : "Criar Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
