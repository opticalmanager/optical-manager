import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * Drizzle ORM database instance.
 *
 * Uses the `DATABASE_URL` environment variable which should point to
 * Supabase's connection pooler (port 6543 with pgbouncer).
 *
 * The schema is passed to enable relational queries and type inference.
 */

const connectionString = process.env.DATABASE_URL!;

if (!connectionString || connectionString.includes("[project-ref]") || connectionString.includes("[password]")) {
  throw new Error(
    "🛑 DATABASE_URL is missing or contains placeholder values. " +
    "Please update your .env file with your actual Supabase PostgreSQL connection string."
  );
}

// Global singleton to prevent connection pool leaks across Next.js HMR reloads
declare global {
  // eslint-disable-next-line no-var
  var __postgresClient: postgres.Sql | undefined;
}

const client =
  globalThis.__postgresClient ||
  postgres(connectionString, {
    prepare: false, // Required for Supabase pgbouncer in transaction mode
    max: 10, // Cap connections per Node process to avoid exceeding Supabase connection limits
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // 10 seconds connection timeout
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__postgresClient = client;
}

export const db = drizzle(client, { schema });
