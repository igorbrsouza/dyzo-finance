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

  const promoters = await prisma.promoter.findMany({
    where: { eventId },
    include: {
      sales: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(promoters);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  const promoter = await prisma.promoter.create({
    data: {
      eventId: body.eventId,
      name: body.name,
      commission: parseFloat(body.commission),
      discountAmount: parseFloat(body.discountAmount) || 0,
      discountType: body.discountType || "fixed",
      uniqueLink: body.uniqueLink || "",
    },
  });

  return NextResponse.json(promoter, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const promoter = await prisma.promoter.update({
    where: { id: body.id },
    data: {
      name: body.name,
      commission: parseFloat(body.commission),
      discountAmount: parseFloat(body.discountAmount) || 0,
      discountType: body.discountType || "fixed",
      uniqueLink: body.uniqueLink || "",
    },
  });

  return NextResponse.json(promoter);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.promoter.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
