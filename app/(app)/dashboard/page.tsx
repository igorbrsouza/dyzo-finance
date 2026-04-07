"use client";

import { useEffect, useState } from "react";
import { useEvent } from "@/contexts/event-context";
import Link from "next/link";
import {
  TrendingUp, Wallet, Clock, CreditCard, AlertTriangle, Users,
  Target, BarChart3, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { formatCurrency, getExpenseCategoryLabel } from "@/lib/constants";

interface DashboardData {
  event: any;
  financials: {
    totalRevenue: number;
    totalTicketRevenue: number;
    barRevenue: number;
    platformRevenue: number;
    platformAvailable: number;
    platformRetained: number;
    pixRevenue: number;
    availableNow: number;
    totalExpenses: number;
    paidExpenses: number;
    pendingExpenses: number;
    realBalance: number;
  };
  tickets: {
    totalSold: number;
    goal: number;
    progress: number;
    revenueByType: Record<string, number>;
  };
  expenses: {
    byCategory: Record<string, number>;
    list: any[];
  };
  promoters: Array<{
    id: string;
    name: string;
    salesCount: number;
    revenue: number;
    commission: number;
    commissionRate: number;
  }>;
}

const CHART_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function StatCard({
  title, value, subtitle, icon: Icon, color, alert
}: {
  title: string; value: string; subtitle?: string; icon: any; color: string; alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-amber-500/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg flex-shrink-0 ml-3 ${
            alert ? "bg-amber-500/10" :
            color.includes("green") ? "bg-green-500/10" :
            color.includes("red") ? "bg-red-500/10" :
            color.includes("amber") ? "bg-amber-500/10" :
            "bg-secondary"
          }`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { activeEvent } = useEvent();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeEvent) return;
    setLoading(true);
    fetch(`/api/dashboard?eventId=${activeEvent.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeEvent]);

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-14 h-14 text-muted-foreground/20 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Nenhum evento selecionado</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">
          Selecione um evento para visualizar o dashboard financeiro completo.
        </p>
        <Link href="/events" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white">
          <ArrowRight className="w-4 h-4" />
          Ir para Eventos
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { financials, tickets, expenses, promoters } = data;

  // Chart data
  const ticketChartData = Object.entries(tickets.revenueByType).map(([name, value]) => ({
    name, value
  }));
  ticketChartData.push({ name: "Bar", value: financials.barRevenue });

  const expenseChartData = Object.entries(expenses.byCategory).map(([cat, value]) => ({
    name: getExpenseCategoryLabel(cat),
    value: Math.round(value * 100) / 100,
  }));

  const isHighPending = financials.pendingExpenses > financials.availableNow * 0.5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{activeEvent.name}</h1>
        <p className="text-muted-foreground text-sm">Resumo financeiro em tempo real</p>
      </div>

      {/* Financial cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Receita Bruta"
          value={formatCurrency(financials.totalRevenue)}
          subtitle={`Ingressos + Bar`}
          icon={TrendingUp}
          color="text-green-400"
        />
        <StatCard
          title="Disponível Agora"
          value={formatCurrency(financials.availableNow)}
          subtitle="Após retenção plataforma"
          icon={Wallet}
          color="text-green-400"
        />
        <StatCard
          title="A Receber"
          value={formatCurrency(financials.platformRetained)}
          subtitle="Retenção da plataforma"
          icon={Clock}
          color="text-amber-400"
        />
        <StatCard
          title="Total Despesas"
          value={formatCurrency(financials.totalExpenses)}
          subtitle={`${formatCurrency(financials.paidExpenses)} pago`}
          icon={CreditCard}
          color="text-red-400"
        />
        <StatCard
          title="Saldo Real"
          value={formatCurrency(financials.realBalance)}
          subtitle="Disponível − Pagas"
          icon={Wallet}
          color={financials.realBalance >= 0 ? "text-green-400" : "text-red-400"}
        />
        <StatCard
          title="Pendências"
          value={formatCurrency(financials.pendingExpenses)}
          subtitle={isHighPending ? "Atenção: valor alto" : "Despesas a pagar"}
          icon={AlertTriangle}
          color="text-amber-400"
          alert={isHighPending}
        />
      </div>

      {/* Caixa breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Receita Plataforma (bruta)</p>
            <p className="text-lg font-bold text-green-400">{formatCurrency(financials.platformRevenue)}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Disponível (70%)</span>
                <span className="text-green-400">{formatCurrency(financials.platformAvailable)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Retido (30%)</span>
                <span className="text-amber-400">{formatCurrency(financials.platformRetained)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Receita PIX Direto</p>
            <p className="text-lg font-bold text-green-400">{formatCurrency(financials.pixRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-2">100% no caixa imediatamente</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Receita Bar</p>
            <p className="text-lg font-bold text-green-400">{formatCurrency(financials.barRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-2">Vendas avulsas no evento</p>
          </CardContent>
        </Card>
      </div>

      {/* Meta de ingressos */}
      {tickets.goal > 0 && (
        <Card className={tickets.progress >= 100 ? "border-green-500/50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Meta de Ingressos</span>
              </div>
              <div className="flex items-center gap-2">
                {tickets.progress >= 100 && (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                    Meta atingida!
                  </Badge>
                )}
                <span className="text-sm font-bold tabular-nums">
                  {tickets.totalSold} / {tickets.goal}
                </span>
              </div>
            </div>
            <Progress
              value={Math.min(tickets.progress, 100)}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {tickets.progress.toFixed(1)}% da meta atingida
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Receita por categoria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Receita por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de receita
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ticketChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} />
                  <Tooltip
                    contentStyle={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    formatter={(v: number) => [formatCurrency(v), "Receita"]}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Despesas por categoria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Sem despesas registradas
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseChartData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v: number) => [formatCurrency(v), "Valor"]}
                  />
                  <Legend
                    iconSize={10}
                    formatter={(value) => <span style={{ fontSize: 11, color: "#71717a" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promotores ranking */}
      {promoters.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Ranking de Promotores
              </CardTitle>
              <Link href="/promoters" className="inline-flex items-center rounded-lg px-2 py-1 text-xs text-muted-foreground">Ver todos →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {promoters.slice(0, 5).map((promoter, idx) => (
                <div key={promoter.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">
                    {idx + 1}º
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{promoter.name}</p>
                    <p className="text-xs text-muted-foreground">{promoter.salesCount} venda{promoter.salesCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400 tabular-nums">{formatCurrency(promoter.revenue)}</p>
                    <p className="text-xs text-amber-400 tabular-nums">Comissão: {formatCurrency(promoter.commission)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
