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

  const guests = await prisma.guest.findMany({
    where: { eventId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(guests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const guest = await prisma.guest.create({
    data: {
      eventId: body.eventId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      status: body.status || "pending",
    },
  });

  return NextResponse.json(guest, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const guest = await prisma.guest.update({
    where: { id: body.id },
    data: { status: body.status },
  });

  return NextResponse.json(guest);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.guest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
