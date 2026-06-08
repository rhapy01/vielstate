import "./load-env";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Add it to .ENV or .env at the repo root.",
  );
}

function poolConfig(connectionString: string): pg.PoolConfig {
  const requiresSsl =
    connectionString.includes("neon.tech") ||
    /sslmode=(require|verify-full|verify-ca)/i.test(connectionString);

  return {
    connectionString,
    ...(requiresSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export const pool = new Pool(poolConfig(process.env.DATABASE_URL));
export const db = drizzle(pool, { schema });

export * from "./schema";
