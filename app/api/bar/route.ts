import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const type = searchParams.get("type") || "items";

  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  if (type === "sales") {
    const sales = await prisma.barSale.findMany({
      where: { eventId },
      include: { barItem: true },
      orderBy: { saleTime: "desc" },
    });
    return NextResponse.json(sales);
  }

  const items = await prisma.barItem.findMany({
    where: { eventId },
    include: { sales: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  if (body.type === "item") {
    const item = await prisma.barItem.create({
      data: {
        eventId: body.eventId,
        name: body.name,
        price: parseFloat(body.price),
        cost: body.cost ? parseFloat(body.cost) : null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  }

  if (body.type === "sale") {
    const item = await prisma.barItem.findUnique({ where: { id: body.barItemId } });
    if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

    const totalValue = item.price * parseInt(body.quantity);
    const sale = await prisma.barSale.create({
      data: {
        eventId: body.eventId,
        barItemId: body.barItemId,
        quantity: parseInt(body.quantity),
        totalValue,
        saleTime: body.saleTime ? new Date(body.saleTime) : new Date(),
      },
      include: { barItem: true },
    });
    return NextResponse.json(sale, { status: 201 });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "item";

  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  if (type === "sale") {
    await prisma.barSale.delete({ where: { id } });
  } else {
    await prisma.barItem.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
