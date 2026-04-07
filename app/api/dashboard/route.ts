import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PLATFORM_RETENTION } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  const [event, ticketSales, barSales, expenses, promoters] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: { include: { batches: true } } },
    }),
    prisma.ticketSale.findMany({
      where: { eventId },
      include: { ticketType: true, promoter: true },
    }),
    prisma.barSale.findMany({ where: { eventId }, include: { barItem: true } }),
    prisma.expense.findMany({ where: { eventId } }),
    prisma.promoter.findMany({ where: { eventId }, include: { sales: true } }),
  ]);

  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  // Receita de ingressos
  const platformSales = ticketSales.filter((s) => s.channel === "platform");
  const pixSales = ticketSales.filter((s) => s.channel === "pix");

  const platformRevenue = platformSales.reduce((sum, s) => sum + s.totalValue, 0);
  const pixRevenue = pixSales.reduce((sum, s) => sum + s.totalValue, 0);
  const totalTicketRevenue = platformRevenue + pixRevenue;

  const platformAvailable = platformRevenue * (1 - PLATFORM_RETENTION);
  const platformRetained = platformRevenue * PLATFORM_RETENTION;

  // Receita do bar
  const barRevenue = barSales.reduce((sum, s) => sum + s.totalValue, 0);

  // Receita bruta total
  const totalRevenue = totalTicketRevenue + barRevenue;

  // Caixa disponível agora
  const availableNow = platformAvailable + pixRevenue + barRevenue + (event.initialCash ?? 0);

  // Despesas
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const paidExpenses =
    expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.value, 0) +
    expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + e.paidAmount, 0);
  const pendingExpenses =
    expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.value, 0) +
    expenses.filter((e) => e.status === "partial").reduce((sum, e) => sum + (e.value - e.paidAmount), 0);

  // Saldo real
  const realBalance = availableNow - paidExpenses;

  // Total de ingressos vendidos
  const totalTicketsSold = ticketSales.reduce((sum, s) => sum + s.quantity, 0);

  // Receita por tipo de ingresso
  const revenueByTicketType = ticketSales.reduce<Record<string, number>>((acc, sale) => {
    const name = sale.ticketType.name;
    acc[name] = (acc[name] || 0) + sale.totalValue;
    return acc;
  }, {});

  // Despesas por categoria
  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.value;
    return acc;
  }, {});

  // Ranking de promotores
  const promoterRanking = promoters.map((p) => ({
    id: p.id,
    name: p.name,
    salesCount: p.sales.length,
    revenue: p.sales.reduce((sum, s) => sum + s.totalValue, 0),
    commission: p.sales.reduce((sum, s) => sum + s.totalValue, 0) * (p.commission / 100),
    commissionRate: p.commission,
  })).sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({
    event,
    financials: {
      totalRevenue,
      totalTicketRevenue,
      barRevenue,
      platformRevenue,
      platformAvailable,
      platformRetained,
      pixRevenue,
      initialCash: event.initialCash,
      availableNow,
      totalExpenses,
      paidExpenses,
      pendingExpenses,
      realBalance,
    },
    tickets: {
      totalSold: totalTicketsSold,
      goal: event.ticketGoal,
      progress: event.ticketGoal > 0 ? (totalTicketsSold / event.ticketGoal) * 100 : 0,
      revenueByType: revenueByTicketType,
    },
    expenses: {
      byCategory: expensesByCategory,
      list: expenses,
    },
    promoters: promoterRanking,
  });
}
