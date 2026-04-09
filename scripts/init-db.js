const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log("Database already initialized, skipping seed.");
      return;
    }

    console.log("Initializing database...");

    const adminPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@nightcontrol.com",
        password: adminPassword,
        role: "admin",
      },
    });

    const opPassword = await bcrypt.hash("op123", 10);
    await prisma.user.create({
      data: {
        name: "Operador",
        email: "operador@nightcontrol.com",
        password: opPassword,
        role: "operator",
      },
    });

    console.log("Users created successfully.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Init DB error:", e);
  process.exit(1);
});
