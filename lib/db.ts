import { Pool } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for PostgreSQL score storage.");
  }

  globalForPg.pgPool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return globalForPg.pgPool;
}
