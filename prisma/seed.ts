import { PrismaClient } from "@prisma/client";
// @ts-ignore
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Iniciando seed...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nightcontrol.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@nightcontrol.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  // Create operator user
  const opPassword = await bcrypt.hash("op123", 10);
  await prisma.user.upsert({
    where: { email: "operador@nightcontrol.com" },
    update: {},
    create: {
      name: "Operador",
      email: "operador@nightcontrol.com",
      password: opPassword,
      role: "operator",
    },
  });

  console.log("✅ Usuários criados");

  // Create sample event
  const event = await prisma.event.create({
    data: {
      name: "Rave Underground 2024",
      date: new Date("2024-12-21T23:00:00"),
      location: "Armazém 21 — São Paulo",
      description: "A maior rave do ano com line-up exclusivo",
      ticketGoal: 800,
      status: "active",
    },
  });

  // Create ticket types
  const pista = await prisma.ticketType.create({
    data: { eventId: event.id, name: "Pista" },
  });
  const vip = await prisma.ticketType.create({
    data: { eventId: event.id, name: "VIP" },
  });
  const meia = await prisma.ticketType.create({
    data: { eventId: event.id, name: "Meia-entrada" },
  });

  // Create batches
  const pista1 = await prisma.ticketBatch.create({
    data: { ticketTypeId: pista.id, name: "1º Lote", price: 60, quantity: 200, sold: 145 },
  });
  const pista2 = await prisma.ticketBatch.create({
    data: { ticketTypeId: pista.id, name: "2º Lote", price: 80, quantity: 300, sold: 89, status: "active" },
  });
  const vip1 = await prisma.ticketBatch.create({
    data: { ticketTypeId: vip.id, name: "VIP Premium", price: 180, quantity: 100, sold: 42 },
  });
  const meia1 = await prisma.ticketBatch.create({
    data: { ticketTypeId: meia.id, name: "Meia-entrada", price: 30, quantity: 100, sold: 38 },
  });

  // Create promoters
  const prom1 = await prisma.promoter.create({
    data: {
      eventId: event.id,
      name: "João Silva",
      commission: 10,
      discountAmount: 10,
      uniqueLink: `${event.id}-joao-silva-${Date.now()}`,
    },
  });
  const prom2 = await prisma.promoter.create({
    data: {
      eventId: event.id,
      name: "Maria Costa",
      commission: 8,
      discountAmount: 5,
      uniqueLink: `${event.id}-maria-costa-${Date.now() + 1}`,
    },
  });

  // Create ticket sales
  const salesData = [
    { typeId: pista.id, batchId: pista1.id, qty: 50, channel: "platform", promoId: prom1.id, price: 60, date: "2024-12-01" },
    { typeId: pista.id, batchId: pista1.id, qty: 30, channel: "pix", promoId: null, price: 60, date: "2024-12-02" },
    { typeId: pista.id, batchId: pista1.id, qty: 40, channel: "platform", promoId: prom2.id, price: 60, date: "2024-12-03" },
    { typeId: pista.id, batchId: pista1.id, qty: 25, channel: "pix", promoId: prom1.id, price: 60, date: "2024-12-05" },
    { typeId: pista.id, batchId: pista2.id, qty: 60, channel: "platform", promoId: null, price: 80, date: "2024-12-06" },
    { typeId: pista.id, batchId: pista2.id, qty: 29, channel: "pix", promoId: prom2.id, price: 80, date: "2024-12-08" },
    { typeId: vip.id, batchId: vip1.id, qty: 20, channel: "platform", promoId: null, price: 180, date: "2024-12-03" },
    { typeId: vip.id, batchId: vip1.id, qty: 22, channel: "pix", promoId: prom1.id, price: 180, date: "2024-12-07" },
    { typeId: meia.id, batchId: meia1.id, qty: 38, channel: "pix", promoId: null, price: 30, date: "2024-12-04" },
  ];

  for (const s of salesData) {
    await prisma.ticketSale.create({
      data: {
        eventId: event.id,
        ticketTypeId: s.typeId,
        batchId: s.batchId,
        quantity: s.qty,
        unitPrice: s.price,
        totalValue: s.price * s.qty,
        channel: s.channel,
        promoterId: s.promoId,
        saleDate: new Date(s.date + "T12:00:00"),
      },
    });
  }

  // Create bar items
  const cerveja = await prisma.barItem.create({
    data: { eventId: event.id, name: "Cerveja Long Neck", price: 15 },
  });
  const whisky = await prisma.barItem.create({
    data: { eventId: event.id, name: "Whisky Dose", price: 25 },
  });
  const agua = await prisma.barItem.create({
    data: { eventId: event.id, name: "Água Mineral", price: 8 },
  });
  const energetico = await prisma.barItem.create({
    data: { eventId: event.id, name: "Energético", price: 18 },
  });

  // Bar sales
  const barSalesData = [
    { itemId: cerveja.id, qty: 85, date: "2024-12-15T22:00:00" },
    { itemId: whisky.id, qty: 32, date: "2024-12-15T23:00:00" },
    { itemId: agua.id, qty: 60, date: "2024-12-15T22:30:00" },
    { itemId: energetico.id, qty: 45, date: "2024-12-15T23:30:00" },
    { itemId: cerveja.id, qty: 110, date: "2024-12-16T00:00:00" },
    { itemId: whisky.id, qty: 28, date: "2024-12-16T01:00:00" },
  ];

  const barItems = { [cerveja.id]: 15, [whisky.id]: 25, [agua.id]: 8, [energetico.id]: 18 };

  for (const s of barSalesData) {
    await prisma.barSale.create({
      data: {
        eventId: event.id,
        barItemId: s.itemId,
        quantity: s.qty,
        totalValue: barItems[s.itemId] * s.qty,
        saleTime: new Date(s.date),
      },
    });
  }

  // Create expenses
  const expensesData = [
    { desc: "DJ Skrillex Brasil Tour", cat: "dj_artists", val: 8000, status: "paid", date: "2024-12-01" },
    { desc: "Equipe de Segurança (8 pessoas)", cat: "security", val: 3200, status: "paid", date: "2024-12-05" },
    { desc: "Bartenders (4 pessoas)", cat: "bartenders", val: 1600, status: "paid", date: "2024-12-05" },
    { desc: "Divulgação Instagram + TikTok", cat: "marketing", val: 2500, status: "paid", date: "2024-11-20" },
    { desc: "Aluguel Armazém 21", cat: "venue", val: 5000, status: "partial", date: "2024-12-01" },
    { desc: "Equipe de Produção", cat: "production", val: 2000, status: "pending", date: "2024-12-10" },
    { desc: "Compra de Bebidas", cat: "drinks", val: 4500, status: "paid", date: "2024-12-14" },
    { desc: "Decoração LED e Iluminação", cat: "decoration", val: 1800, status: "pending", date: "2024-12-10" },
    { desc: "Copos e Insumos", cat: "supplies", val: 600, status: "paid", date: "2024-12-15" },
  ];

  for (const e of expensesData) {
    await prisma.expense.create({
      data: {
        eventId: event.id,
        description: e.desc,
        category: e.cat,
        value: e.val,
        status: e.status,
        date: new Date(e.date + "T10:00:00"),
      },
    });
  }

  // Create guests
  const guestsData = [
    { name: "Carlos Mendes", email: "carlos@email.com", status: "confirmed" },
    { name: "Ana Paula Lima", email: "ana@email.com", status: "confirmed" },
    { name: "Roberto Santos", status: "pending" },
    { name: "Fernanda Oliveira", email: "fern@email.com", status: "confirmed" },
    { name: "Diego Ferreira", status: "cancelled" },
    { name: "Juliana Alves", email: "ju@email.com", status: "pending" },
  ];

  for (const g of guestsData) {
    await prisma.guest.create({
      data: {
        eventId: event.id,
        name: g.name,
        email: g.email,
        status: g.status,
      },
    });
  }

  console.log("✅ Evento de demonstração criado com sucesso!");
  console.log(`
  📊 Dados criados:
  - Evento: Rave Underground 2024
  - Tipos de ingresso: 3 (Pista, VIP, Meia-entrada)
  - Lotes: 4
  - Vendas de ingresso: ${salesData.length}
  - Itens do bar: 4
  - Vendas do bar: ${barSalesData.length}
  - Despesas: ${expensesData.length}
  - Convidados: ${guestsData.length}
  - Promotores: 2

  🔐 Login:
  - Admin: admin@nightcontrol.com / admin123
  - Operador: operador@nightcontrol.com / op123
  `);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
