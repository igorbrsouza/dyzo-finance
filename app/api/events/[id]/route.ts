import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      ticketTypes: { include: { batches: true } },
      ticketSales: { include: { ticketType: true, batch: true, promoter: true } },
      guests: true,
      promoters: { include: { sales: true } },
      barItems: true,
      barSales: { include: { barItem: true } },
      expenses: true,
    },
  });

  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  return NextResponse.json(event);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const event = await prisma.event.update({
    where: { id: params.id },
    data: {
      name: body.name,
      date: new Date(body.date + "T12:00:00"),
      location: body.location,
      description: body.description,
      imageUrl: body.imageUrl || null,
      ticketGoal: parseInt(body.ticketGoal) || 0,
      initialCash: parseFloat(body.initialCash) || 0,
      status: body.status,
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await prisma.event.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
