const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM "User"');
    if (parseInt(rows[0].count) > 0) {
      console.log("Database already initialized, skipping seed.");
      return;
    }

    console.log("Initializing database...");
    const now = new Date().toISOString();

    const adminPassword = await bcrypt.hash("admin123", 10);
    await pool.query(
      `INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), "Admin", "admin@nightcontrol.com", adminPassword, "admin", now, now]
    );

    const opPassword = await bcrypt.hash("op123", 10);
    await pool.query(
      `INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), "Operador", "operador@nightcontrol.com", opPassword, "operator", now, now]
    );

    console.log("Users created successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Init DB error:", e);
  process.exit(1);
});
