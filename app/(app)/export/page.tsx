"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useEvent } from "@/contexts/event-context";
import { toast } from "sonner";
import { Download, FileText, Table2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { formatCurrency, getExpenseCategoryLabel } from "@/lib/constants";

// ─── PDF design constants ────────────────────────────────────────────────────

const C = {
  headerBg:  [26,  26,  46]  as [number, number, number], // #1a1a2e
  sectionBg: [22,  33,  62]  as [number, number, number], // #16213e
  tableHdr:  [45,  55,  100] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  midGray:   [160, 165, 180] as [number, number, number],
  darkText:  [30,  30,  50]  as [number, number, number],
  green:     [0,   120, 50]  as [number, number, number], // darker for readability on light rows
  red:       [180, 20,  20]  as [number, number, number],
  orange:    [160, 80,  0]   as [number, number, number],
  rowAlt:    [235, 238, 248] as [number, number, number],
  border:    [200, 205, 220] as [number, number, number],
};

const PAGE_W        = 210;
const PAGE_H        = 297;
const MARGIN        = 14;
const COL_W         = PAGE_W - MARGIN * 2;
const FOOTER_AREA   = 14;
const CONTENT_MAX_Y = PAGE_H - FOOTER_AREA - 2;

type Doc = import("jspdf").jsPDF;

// ─── Utilities ───────────────────────────────────────────────────────────────

function fmtExportDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

async function drawHeader(
  doc: Doc,
  eventName: string,
  eventDate: string,
  eventLocation: string,
  imageUrl?: string | null
): Promise<number> {
  const H = 40;
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, PAGE_W, H, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.text("Dyzo Finance", MARGIN, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(170, 195, 235);
  doc.text(eventName, MARGIN, 26);

  doc.setFontSize(8.5);
  doc.setTextColor(130, 160, 205);
  const dateStr = new Date(eventDate).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  doc.text(`${dateStr}  •  ${eventLocation}`, MARGIN, 34);

  if (imageUrl) {
    try {
      const imgData = await urlToBase64(imageUrl);
      const imgSize = 32;
      doc.addImage(
        imgData, "JPEG",
        PAGE_W - MARGIN - imgSize, 4,
        imgSize, imgSize,
        undefined, "FAST"
      );
    } catch {
      // skip silently if image fails
    }
  }

  return H + 7;
}

function drawFooters(doc: Doc, exportedAt: string, username: string) {
  const n = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const fy = PAGE_H - FOOTER_AREA + 3;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, fy - 2, PAGE_W - MARGIN, fy - 2);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.midGray);
    doc.text("Dyzo Finance", MARGIN, fy + 3);
    doc.text(
      `Gerado em ${exportedAt}  |  Exportado por: ${username}`,
      PAGE_W - MARGIN, fy + 3,
      { align: "right" }
    );
  }
}

function drawSection(doc: Doc, title: string, y: number): number {
  doc.setFillColor(...C.sectionBg);
  doc.rect(MARGIN, y, COL_W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text(title, MARGIN + 3, y + 5.6);
  return y + 8 + 2;
}

function ensureSpace(doc: Doc, y: number, needed: number): number {
  if (y + needed > CONTENT_MAX_Y) {
    doc.addPage();
    return 16;
  }
  return y;
}

// ─── Generic table renderer ──────────────────────────────────────────────────

interface ColDef {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
  color?: (val: string) => [number, number, number] | null;
}

function drawTable(doc: Doc, cols: ColDef[], rows: string[][], startY: number): number {
  const ROW_H = 6.5;
  const HDR_H = 7;
  let y = startY;

  const renderHeader = () => {
    doc.setFillColor(...C.tableHdr);
    doc.rect(MARGIN, y, COL_W, HDR_H, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    let x = MARGIN;
    cols.forEach((col) => {
      const tx =
        col.align === "right"  ? x + col.width - 2 :
        col.align === "center" ? x + col.width / 2 :
        x + 2;
      doc.text(col.header, tx, y + 5, { align: col.align ?? "left" });
      x += col.width;
    });
    y += HDR_H;
  };

  renderHeader();

  rows.forEach((row, idx) => {
    if (y + ROW_H > CONTENT_MAX_Y) {
      doc.addPage();
      y = 16;
      renderHeader();
    }
    if (idx % 2 === 0) {
      doc.setFillColor(...C.rowAlt);
      doc.rect(MARGIN, y, COL_W, ROW_H, "F");
    }
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y + ROW_H, MARGIN + COL_W, y + ROW_H);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let x = MARGIN;
    row.forEach((cell, ci) => {
      const col = cols[ci];
      const customColor = col.color ? col.color(cell) : null;
      doc.setTextColor(...(customColor ?? C.darkText));
      const tx =
        col.align === "right"  ? x + col.width - 2 :
        col.align === "center" ? x + col.width / 2 :
        x + 2;
      doc.text(cell, tx, y + 4.5, { align: col.align ?? "left" });
      x += col.width;
    });
    y += ROW_H;
  });

  return y + 5;
}

// ─── Summary (key/value) table ────────────────────────────────────────────────

interface SummaryRow {
  label: string;
  value: string;
  valueColor?: [number, number, number] | null;
  bold?: boolean;
}

function drawSummaryTable(doc: Doc, rows: SummaryRow[], startY: number): number {
  const ROW_H = 7;
  const HDR_H = 7;
  let y = startY;

  doc.setFillColor(...C.tableHdr);
  doc.rect(MARGIN, y, COL_W, HDR_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text("Campo", MARGIN + 3, y + 5);
  doc.text("Valor", MARGIN + COL_W - 3, y + 5, { align: "right" });
  y += HDR_H;

  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...C.rowAlt);
      doc.rect(MARGIN, y, COL_W, ROW_H, "F");
    }
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y + ROW_H, MARGIN + COL_W, y + ROW_H);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setTextColor(...C.darkText);
    doc.text(row.label, MARGIN + 3, y + 4.8);

    doc.setTextColor(...(row.valueColor ?? C.darkText));
    doc.text(row.value, MARGIN + COL_W - 3, y + 4.8, { align: "right" });
    y += ROW_H;
  });

  return y + 5;
}

// ─── Main PDF generator ──────────────────────────────────────────────────────

async function generatePdf(
  activeEvent: any,
  eventData: any,
  dashData: any,
  username: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const exportedAt = fmtExportDateTime(new Date());

  // ── Header ────────────────────────────────────────────────────────────────
  let y = await drawHeader(
    doc,
    activeEvent.name,
    activeEvent.date,
    activeEvent.location,
    eventData.imageUrl
  );

  // ── RESUMO FINANCEIRO ─────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 12);
  y = drawSection(doc, "RESUMO FINANCEIRO", y);

  const f = dashData.financials;
  y = drawSummaryTable(doc, [
    { label: "Caixa Inicial",                value: formatCurrency(f.initialCash),     valueColor: C.green },
    { label: "Receita Bruta Total",          value: formatCurrency(f.totalRevenue),    valueColor: C.green },
    { label: "Disponível no Caixa",          value: formatCurrency(f.availableNow),    valueColor: C.green },
    { label: "Retido pela Plataforma (30%)", value: formatCurrency(f.platformRetained),valueColor: C.orange },
    { label: "Despesas Pagas",               value: formatCurrency(f.paidExpenses),    valueColor: C.red },
    {
      label: "Saldo Real",
      value: formatCurrency(f.realBalance),
      valueColor: f.realBalance >= 0 ? C.green : C.red,
      bold: true,
    },
  ], y);

  // ── INGRESSOS ─────────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 20);
  y = drawSection(doc, "INGRESSOS", y);

  const sales: any[] = eventData.ticketSales || [];
  if (sales.length === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...C.midGray);
    doc.text("Nenhuma venda de ingresso registrada.", MARGIN + 3, y + 4);
    y += 10;
  } else {
    y = drawTable(doc, [
      { header: "Tipo de Ingresso", width: 48 },
      { header: "Lote",             width: 36 },
      { header: "Canal",            width: 28 },
      { header: "Qtd",              width: 14, align: "right" },
      { header: "Preço Unit.",      width: 28, align: "right" },
      { header: "Total",            width: 28, align: "right" },
    ], sales.map((s: any) => [
      s.ticketType?.name ?? "—",
      s.batch?.name ?? "—",
      s.channel === "pix" ? "PIX Direto" : "Plataforma",
      String(s.quantity),
      formatCurrency(s.unitPrice),
      formatCurrency(s.totalValue),
    ]), y);
  }

  // ── DESPESAS ──────────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 20);
  y = drawSection(doc, "DESPESAS", y);

  const expenses: any[] = eventData.expenses || [];
  if (expenses.length === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...C.midGray);
    doc.text("Nenhuma despesa registrada.", MARGIN + 3, y + 4);
    y += 10;
  } else {
    const statusLabel = (s: string) =>
      s === "paid" ? "Pago" : s === "pending" ? "Pendente" : "Parcial";
    const statusColor = (v: string): [number, number, number] | null =>
      v === "Pago" ? C.green : v === "Pendente" ? C.red : C.orange;

    y = drawTable(doc, [
      { header: "Descrição", width: 68 },
      { header: "Categoria", width: 50 },
      { header: "Valor",     width: 34, align: "right" },
      { header: "Status",    width: 30, color: statusColor },
    ], expenses.map((e: any) => [
      e.description,
      getExpenseCategoryLabel(e.category),
      formatCurrency(e.value),
      statusLabel(e.status),
    ]), y);
  }

  // ── BAR ───────────────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 20);
  y = drawSection(doc, "BAR", y);

  const barSales: any[] = eventData.barSales || [];
  if (barSales.length === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...C.midGray);
    doc.text("Nenhuma venda de bar registrada.", MARGIN + 3, y + 4);
    y += 10;
  } else {
    const barMap = new Map<string, { name: string; qty: number; unitPrice: number; total: number }>();
    barSales.forEach((s: any) => {
      const key = s.barItem?.id ?? s.barItem?.name ?? "?";
      const name = s.barItem?.name ?? "—";
      const unitPrice = s.barItem?.price ?? 0;
      if (!barMap.has(key)) barMap.set(key, { name, qty: 0, unitPrice, total: 0 });
      const entry = barMap.get(key)!;
      entry.qty += s.quantity;
      entry.total += s.totalValue;
    });
    y = drawTable(doc, [
      { header: "Item",         width: 82 },
      { header: "Qtd. Vendida", width: 34, align: "right" },
      { header: "Preço Unit.",  width: 34, align: "right" },
      { header: "Receita",      width: 32, align: "right" },
    ], Array.from(barMap.values()).map((b) => [
      b.name,
      String(b.qty),
      formatCurrency(b.unitPrice),
      formatCurrency(b.total),
    ]), y);
  }

  // ── PROMOTORES ────────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 20);
  y = drawSection(doc, "PROMOTORES", y);

  const promoters: any[] = dashData.promoters || [];
  if (promoters.length === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...C.midGray);
    doc.text("Nenhum promotor registrado.", MARGIN + 3, y + 4);
    y += 10;
  } else {
    y = drawTable(doc, [
      { header: "#",              width: 12, align: "center" },
      { header: "Nome",           width: 65 },
      { header: "Vendas",         width: 22, align: "right" },
      { header: "Receita Gerada", width: 43, align: "right" },
      { header: "Comissão",       width: 40, align: "right" },
    ], promoters.map((p: any, i: number) => [
      String(i + 1),
      p.name,
      String(p.salesCount),
      formatCurrency(p.revenue),
      formatCurrency(p.commission),
    ]), y);
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  drawFooters(doc, exportedAt, username);

  // ── Save ──────────────────────────────────────────────────────────────────
  const slug = activeEvent.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  doc.save(`dyzofinance-${slug}.pdf`);
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function ExportPage() {
  const { activeEvent } = useEvent();
  const { data: session } = useSession();
  const [eventData, setEventData] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  useEffect(() => {
    if (!activeEvent) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/events/${activeEvent.id}`).then((r) => r.json()),
      fetch(`/api/dashboard?eventId=${activeEvent.id}`).then((r) => r.json()),
    ]).then(([event, dash]) => {
      setEventData(event);
      setDashData(dash);
      setLoading(false);
    });
  }, [activeEvent]);

  async function exportPdf() {
    if (!activeEvent || !eventData || !dashData) return;
    setExportingPdf(true);
    try {
      const username = session?.user?.name ?? session?.user?.email ?? "desconhecido";
      await generatePdf(activeEvent, eventData, dashData, username);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF.");
    }
    setExportingPdf(false);
  }

  async function exportExcel() {
    if (!activeEvent || !eventData || !dashData) return;
    setExportingXlsx(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Ingressos
      const ticketData = (eventData.ticketSales || []).map((s: any) => ({
        "Tipo": s.ticketType?.name,
        "Lote": s.batch?.name,
        "Quantidade": s.quantity,
        "Preço Unit.": s.unitPrice,
        "Total": s.totalValue,
        "Canal": s.channel === "pix" ? "PIX Direto" : "Plataforma",
        "Promotor": s.promoter?.name ?? "",
        "Data": new Date(s.saleDate).toLocaleString("pt-BR"),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ticketData), "Ingressos");

      // Bar
      const barData = (eventData.barSales || []).map((s: any) => ({
        "Item": s.barItem?.name,
        "Quantidade": s.quantity,
        "Preço Unit.": s.barItem?.price,
        "Total": s.totalValue,
        "Horário": new Date(s.saleTime).toLocaleString("pt-BR"),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(barData), "Bar");

      // Despesas
      const expData = (eventData.expenses || []).map((e: any) => ({
        "Descrição": e.description,
        "Categoria": getExpenseCategoryLabel(e.category),
        "Valor": e.value,
        "Status": e.status === "paid" ? "Pago" : e.status === "pending" ? "Pendente" : "Parcial",
        "Data": new Date(e.date).toLocaleDateString("pt-BR"),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expData), "Despesas");

      // Promotores
      const promData = (dashData.promoters || []).map((p: any) => ({
        "Promotor": p.name,
        "Vendas": p.salesCount,
        "Receita Gerada": p.revenue,
        "Comissão (%)": p.commissionRate,
        "Comissão (R$)": p.commission,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(promData), "Promotores");

      // Resumo
      const f = dashData.financials;
      const summaryData = [
        { "Campo": "Caixa Inicial",               "Valor": f.initialCash },
        { "Campo": "Receita Bruta Total",        "Valor": f.totalRevenue },
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Resumo");

      const slug = activeEvent.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      XLSX.writeFile(wb, `dyzofinance-${slug}.xlsx`);
      toast.success("Excel exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar Excel.");
    }
    setExportingXlsx(false);
  }

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Download className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">Selecione um evento para exportar relatórios.</p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium mt-4 bg-green-600 hover:bg-green-500 text-white"
        >
          <ArrowRight className="w-4 h-4" />
          Ir para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Exportação</h1>
        <p className="text-muted-foreground text-sm">{activeEvent.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-red-400" />
              Relatório PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Exporta um relatório profissional do evento em PDF com:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-none">
              {[
                "Cabeçalho escuro com logo do evento",
                "Resumo financeiro com valores coloridos",
                "Tabela de vendas de ingressos por lote",
                "Despesas com status em cores",
                "Vendas do bar agrupadas por item",
                "Ranking de promotores com comissões",
                "Rodapé com data/hora e usuário em cada página",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              onClick={exportPdf}
              disabled={exportingPdf || loading}
              className="w-full gap-2 bg-red-600/80 hover:bg-red-600 text-white"
            >
              <Download className="w-4 h-4" />
              {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
            </Button>
          </CardContent>
        </Card>

        {/* Excel Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="w-5 h-5 text-green-400" />
              Planilha Excel / CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Exporta os dados em planilha Excel com abas separadas:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-none">
              {[
                "Aba: Ingressos (tipo, lote, canal, promotor)",
                "Aba: Bar (item, quantidade, total, horário)",
                "Aba: Despesas (descrição, categoria, status)",
                "Aba: Promotores (vendas, receita, comissão)",
                "Aba: Resumo (todos os totais financeiros)",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              onClick={exportExcel}
              disabled={exportingXlsx || loading}
              className="w-full gap-2 bg-green-600 hover:bg-green-500 text-white"
            >
              <Download className="w-4 h-4" />
              {exportingXlsx ? "Gerando Excel..." : "Exportar Excel"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground text-center">
          Carregando dados do evento...
        </p>
      )}
    </div>
  );
}
