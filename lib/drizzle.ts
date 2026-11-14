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

// Max connections: configurable via ENV, defaulting to 4 in production (serverless concurrency safe) and 8 in development
const maxConnections = process.env.DB_MAX_CONNECTIONS
  ? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
  : process.env.NODE_ENV === "production"
    ? 4
    : 8;

const client =
  globalThis.__postgresClient ||
  postgres(connectionString, {
    prepare: false, // Required for Supabase pgbouncer in transaction mode
    max: maxConnections, // Optimized for serverless concurrency without exhausting Supavisor pooler
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // 10 seconds connection timeout
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__postgresClient = client;
}

export const db = drizzle(client, { schema });
