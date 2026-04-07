import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Get ticket types for an event
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    include: {
      batches: true,
      sales: true,
    },
  });

  return NextResponse.json(ticketTypes);
}

// Create ticket type
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  if (body.type === "ticket_type") {
    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: body.eventId,
        name: body.name,
      },
      include: { batches: true },
    });
    return NextResponse.json(ticketType, { status: 201 });
  }

  if (body.type === "batch") {
    const batch = await prisma.ticketBatch.create({
      data: {
        ticketTypeId: body.ticketTypeId,
        name: body.name,
        price: parseFloat(body.price),
        quantity: parseInt(body.quantity),
        status: body.status || "active",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
    return NextResponse.json(batch, { status: 201 });
  }

  if (body.type === "sale") {
    const batch = await prisma.ticketBatch.findUnique({ where: { id: body.batchId } });
    if (!batch) return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 });

    const totalValue = batch.price * parseInt(body.quantity);

    const [sale] = await prisma.$transaction([
      prisma.ticketSale.create({
        data: {
          eventId: body.eventId,
          ticketTypeId: body.ticketTypeId,
          batchId: body.batchId,
          quantity: parseInt(body.quantity),
          unitPrice: batch.price,
          totalValue,
          channel: body.channel,
          promoterId: body.promoterId || null,
          saleDate: body.saleDate ? new Date(body.saleDate) : new Date(),
        },
      }),
      prisma.ticketBatch.update({
        where: { id: body.batchId },
        data: { sold: { increment: parseInt(body.quantity) } },
      }),
    ]);

    return NextResponse.json(sale, { status: 201 });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}

// Update batch
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  if (body.type === "batch") {
    if (!body.batchId) return NextResponse.json({ error: "batchId obrigatório" }, { status: 400 });
    const batch = await prisma.ticketBatch.update({
      where: { id: body.batchId },
      data: {
        name: body.name,
        price: parseFloat(body.price),
        quantity: parseInt(body.quantity),
        status: body.status,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
    return NextResponse.json(batch);
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}

// Delete batch
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");

  if (!batchId) return NextResponse.json({ error: "batchId obrigatório" }, { status: 400 });

  await prisma.ticketBatch.delete({ where: { id: batchId } });
  return NextResponse.json({ ok: true });
}
