import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { ticketSales: true, expenses: true } },
      ticketSales: { select: { totalValue: true, channel: true } },
      expenses: { select: { value: true, status: true } },
    },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const event = await prisma.event.create({
    data: {
      name: body.name,
      date: new Date(body.date),
      location: body.location,
      description: body.description,
      imageUrl: body.imageUrl || null,
      ticketGoal: parseInt(body.ticketGoal) || 0,
      initialCash: parseFloat(body.initialCash) || 0,
      status: body.status || "planning",
    },
  });

  return NextResponse.json(event, { status: 201 });
}
