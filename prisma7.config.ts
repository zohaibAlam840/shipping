import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env automatically. This project keeps every
// setting in .env.local (already gitignored), so load that single file here
// instead of adding a second env file and a dotenv dependency.
// process.loadEnvFile is native to Node 20.6+.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Absent in CI / production — fall back to the real environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Supabase SESSION-mode pooler (port 5432). DDL, introspection and
    // migrations must go through this one — the transaction pooler (6543,
    // pgbouncer) is for short-lived app queries and can't run them reliably.
    url: process.env.DATABASE_URL,
  },
});
