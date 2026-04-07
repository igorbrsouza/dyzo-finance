import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  const expenses = await prisma.expense.findMany({
    where: { eventId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const rawPaid = parseFloat(body.paidAmount) || 0;
  const value = parseFloat(body.value);
  const status = body.status || "pending";
  const paidAmount =
    status === "paid"    ? value :
    status === "pending" ? 0 :
    Math.min(rawPaid, value); // partial: clamp to value

  const expense = await prisma.expense.create({
    data: {
      eventId: body.eventId,
      description: body.description,
      category: body.category,
      value,
      paidAmount,
      status,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });

  return NextResponse.json(expense, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const rawPaid = parseFloat(body.paidAmount) || 0;
  const value = parseFloat(body.value);
  const status = body.status;
  const paidAmount =
    status === "paid"    ? value :
    status === "pending" ? 0 :
    Math.min(rawPaid, value); // partial: clamp to value

  const expense = await prisma.expense.update({
    where: { id: body.id },
    data: {
      description: body.description,
      category: body.category,
      value,
      paidAmount,
      status,
      date: body.date ? new Date(body.date) : undefined,
    },
  });

  return NextResponse.json(expense);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.expense.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
