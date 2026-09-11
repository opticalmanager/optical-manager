import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkDb = searchParams.get("db") === "1";

  if (checkDb) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB_PING_TIMEOUT")), 3500)
      );
      await Promise.race([
        db.execute(sql`SELECT 1`),
        timeoutPromise,
      ]);
    } catch {
      return NextResponse.json(
        { status: "db_offline", timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function HEAD(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkDb = searchParams.get("db") === "1";

  if (checkDb) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB_PING_TIMEOUT")), 3500)
      );
      await Promise.race([
        db.execute(sql`SELECT 1`),
        timeoutPromise,
      ]);
    } catch {
      return new Response(null, { status: 503 });
    }
  }

  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

