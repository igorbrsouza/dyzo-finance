"use client";

import { useEffect, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import { ClipboardList, Download, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatCurrency, formatDate, getExpenseCategoryLabel, PLATFORM_RETENTION } from "@/lib/constants";
import { toast } from "sonner";

interface DailyData {
  date: string;
  ticketSales: any[];
  barSales: any[];
  expenses: any[];
  promoters: any[];
  allTicketsSold: number;
  ticketGoal: number;
}

export default function ClosingPage() {
  const { activeEvent } = useEvent();
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [dashData, setDashData] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (!activeEvent) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/dashboard?eventId=${activeEvent.id}`).then((r) => r.json()),
      fetch(`/api/events/${activeEvent.id}`).then((r) => r.json()),
    ]).then(([dash, event]) => {
      setDashData(dash);
      setEventData(event);
      setLoading(false);
    });
  }, [activeEvent]);

  function filterByDate(items: any[], dateField: string) {
    return items.filter((item) => {
      const itemDate = new Date(item[dateField]).toISOString().slice(0, 10);
      return itemDate === selectedDate;
    });
  }

  async function exportPdf() {
    if (!activeEvent || !eventData) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const date = new Date(selectedDate).toLocaleDateString("pt-BR");
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(34, 197, 94);
      doc.text("NightControl", 20, y);
      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(200, 200, 200);
      doc.text(`Fechamento do Dia — ${date}`, 20, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(`Evento: ${activeEvent.name}`, 20, y);
      y += 14;

      // Ticket sales for the day
      const dayTicketSales = filterByDate(eventData.ticketSales || [], "saleDate");
      const dayBarSales = filterByDate(eventData.barSales || [], "saleTime");
      const dayExpenses = filterByDate(eventData.expenses || [], "date");

      const dayTicketRevenue = dayTicketSales.reduce((sum: number, s: any) => sum + s.totalValue, 0);
      const dayPlatformRevenue = dayTicketSales.filter((s: any) => s.channel === "platform").reduce((sum: number, s: any) => sum + s.totalValue, 0);
      const dayPixRevenue = dayTicketSales.filter((s: any) => s.channel === "pix").reduce((sum: number, s: any) => sum + s.totalValue, 0);
      const dayBarRevenue = dayBarSales.reduce((sum: number, s: any) => sum + s.totalValue, 0);

      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      doc.text("RESUMO FINANCEIRO DO DIA", 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      doc.text(`Receita Ingressos: R$ ${dayTicketRevenue.toFixed(2)}`, 20, y); y += 5;
      doc.text(`  — Plataforma: R$ ${dayPlatformRevenue.toFixed(2)} (disponível: R$ ${(dayPlatformRevenue * 0.7).toFixed(2)}, retido: R$ ${(dayPlatformRevenue * 0.3).toFixed(2)})`, 20, y); y += 5;
      doc.text(`  — PIX Direto: R$ ${dayPixRevenue.toFixed(2)}`, 20, y); y += 5;
      doc.text(`Receita Bar: R$ ${dayBarRevenue.toFixed(2)}`, 20, y); y += 5;
      doc.text(`Receita Total do Dia: R$ ${(dayTicketRevenue + dayBarRevenue).toFixed(2)}`, 20, y); y += 10;

      // Meta progress
      const totalSold = (eventData.ticketSales || []).reduce((sum: number, s: any) => sum + s.quantity, 0);
      const goal = activeEvent ? (eventData.ticketGoal ?? 0) : 0;
      if (goal > 0) {
        doc.setFontSize(12);
        doc.setTextColor(34, 197, 94);
        doc.text("META DE INGRESSOS (ACUMULADO)", 20, y); y += 8;
        doc.setFontSize(10);
        doc.setTextColor(180, 180, 180);
        doc.text(`${totalSold} / ${goal} (${((totalSold / goal) * 100).toFixed(1)}%)`, 20, y); y += 10;
      }

      // Despesas do dia
      if (dayExpenses.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68);
        doc.text("DESPESAS DO DIA", 20, y); y += 8;
        doc.setFontSize(10);
        doc.setTextColor(180, 180, 180);
        dayExpenses.forEach((exp: any) => {
          doc.text(`${exp.description}: R$ ${exp.value.toFixed(2)} [${exp.status}]`, 20, y); y += 5;
        });
        y += 5;
      }

      doc.save(`fechamento-${selectedDate}-${activeEvent.name}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar PDF");
    }
    setExportingPdf(false);
  }

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ClipboardList className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">Selecione um evento para ver o fechamento.</p>
        <Link href="/events" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium mt-4 bg-green-600 hover:bg-green-500 text-white">
          <ArrowRight className="w-4 h-4" />Ir para Eventos
        </Link>
      </div>
    );
  }

  const dayTicketSales = eventData ? filterByDate(eventData.ticketSales || [], "saleDate") : [];
  const dayBarSales = eventData ? filterByDate(eventData.barSales || [], "saleTime") : [];
  const dayExpenses = eventData ? filterByDate(eventData.expenses || [], "date") : [];

  const dayTicketRevenue = dayTicketSales.reduce((sum: number, s: any) => sum + s.totalValue, 0);
  const dayPlatformRevenue = dayTicketSales.filter((s: any) => s.channel === "platform").reduce((sum: number, s: any) => sum + s.totalValue, 0);
  const dayPixRevenue = dayTicketSales.filter((s: any) => s.channel === "pix").reduce((sum: number, s: any) => sum + s.totalValue, 0);
  const dayBarRevenue = dayBarSales.reduce((sum: number, s: any) => sum + s.totalValue, 0);
  const dayExpensesTotal = dayExpenses.reduce((sum: number, e: any) => sum + e.value, 0);

  const totalSold = eventData ? (eventData.ticketSales || []).reduce((sum: number, s: any) => sum + s.quantity, 0) : 0;
  const ticketGoal = eventData?.ticketGoal ?? 0;
  const goalProgress = ticketGoal > 0 ? Math.min((totalSold / ticketGoal) * 100, 100) : 0;

  // Promoter ranking for the day
  const promoterDaySales: Record<string, { name: string; count: number; revenue: number }> = {};
  dayTicketSales.forEach((sale: any) => {
    if (sale.promoter) {
      const id = sale.promoter.id;
      if (!promoterDaySales[id]) {
        promoterDaySales[id] = { name: sale.promoter.name, count: 0, revenue: 0 };
      }
      promoterDaySales[id].count += sale.quantity;
      promoterDaySales[id].revenue += sale.totalValue;
    }
  });
  const promoterRanking = Object.values(promoterDaySales).sort((a, b) => b.revenue - a.revenue);

  // Tickets by type for the day
  const ticketsByType: Record<string, { name: string; pix: number; platform: number; revenue: number }> = {};
  dayTicketSales.forEach((sale: any) => {
    const name = sale.ticketType?.name ?? "Desconhecido";
    if (!ticketsByType[name]) ticketsByType[name] = { name, pix: 0, platform: 0, revenue: 0 };
    if (sale.channel === "pix") ticketsByType[name].pix += sale.quantity;
    else ticketsByType[name].platform += sale.quantity;
    ticketsByType[name].revenue += sale.totalValue;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Fechamento Diário</h1>
          <p className="text-muted-foreground text-sm">{activeEvent.name}</p>
        </div>
        <Button onClick={exportPdf} disabled={exportingPdf} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {exportingPdf ? "Exportando..." : "Exportar PDF"}
        </Button>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <Label className="text-sm">Data:</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
        </div>
        <span className="text-sm text-muted-foreground">{new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Financials for the day */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Receita do Dia</p>
                <p className="text-base font-bold text-green-400 tabular-nums">{formatCurrency(dayTicketRevenue + dayBarRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="text-base font-bold text-green-400 tabular-nums">
                  {formatCurrency(dayPlatformRevenue * (1 - PLATFORM_RETENTION) + dayPixRevenue + dayBarRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Retido Plataforma</p>
                <p className="text-base font-bold text-amber-400 tabular-nums">
                  {formatCurrency(dayPlatformRevenue * PLATFORM_RETENTION)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Despesas do Dia</p>
                <p className="text-base font-bold text-red-400 tabular-nums">{formatCurrency(dayExpensesTotal)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Ingressos por tipo */}
          {Object.values(ticketsByType).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ingressos Vendidos no Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">PIX</TableHead>
                      <TableHead className="text-center">Plataforma</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(ticketsByType).map((t) => (
                      <TableRow key={t.name}>
                        <TableCell className="font-medium text-sm">{t.name}</TableCell>
                        <TableCell className="text-center text-sm">
                          <span className="text-green-400">{t.pix}</span>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <span className="text-blue-400">{t.platform}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-green-400 tabular-nums">
                          {formatCurrency(t.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Meta acumulada */}
          {ticketGoal > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Progresso Acumulado da Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{totalSold} de {ticketGoal} ingressos</span>
                  <span className="text-sm font-semibold">{goalProgress.toFixed(1)}%</span>
                </div>
                <Progress value={goalProgress} className="h-2" />
                {goalProgress >= 100 && (
                  <Badge className="mt-2 bg-green-500/10 text-green-400 border-green-500/30">Meta atingida!</Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Promoter ranking for the day */}
          {promoterRanking.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ranking de Promotores no Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {promoterRanking.map((p, idx) => (
                    <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{idx + 1}º</span>
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-400 tabular-nums">{formatCurrency(p.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{p.count} venda{p.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expenses for the day */}
          {dayExpenses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Despesas do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayExpenses.map((exp: any) => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-sm">{exp.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getExpenseCategoryLabel(exp.category)}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] border ${exp.status === "paid" ? "border-green-500/30 text-green-400" : "border-amber-500/30 text-amber-400"}`}>
                            {exp.status === "paid" ? "Pago" : exp.status === "pending" ? "Pendente" : "Parcial"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-red-400 tabular-nums">
                          {formatCurrency(exp.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {dayTicketSales.length === 0 && dayBarSales.length === 0 && dayExpenses.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">Nenhum registro encontrado para {formatDate(selectedDate)}.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
