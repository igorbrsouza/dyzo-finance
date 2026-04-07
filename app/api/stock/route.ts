import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  const items = await prisma.stockItem.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const item = await prisma.stockItem.create({
    data: {
      eventId: body.eventId,
      name: body.name,
      quantity: parseFloat(body.quantity) || 0,
      unit: body.unit || "un",
      category: body.category || "outros",
      notes: body.notes || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const item = await prisma.stockItem.update({
    where: { id: body.id },
    data: {
      name: body.name,
      quantity: parseFloat(body.quantity) || 0,
      unit: body.unit || "un",
      category: body.category || "outros",
      notes: body.notes || null,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.stockItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
