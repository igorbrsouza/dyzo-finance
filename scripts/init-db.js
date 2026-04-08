const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error("Init DB error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
