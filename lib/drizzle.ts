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

// Use connection pooling for serverless environments
const client = postgres(connectionString, {
  prepare: false, // Required for Supabase pgbouncer in transaction mode
});

export const db = drizzle(client, { schema });
