import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/drizzle";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { exportOrdersToCSVData, TimeframeType } from "@/services/order.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get shopId from profile
    const [profile] = await db
      .select({ shopId: profiles.shopId })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile || !profile.shopId) {
      return new Response("No shop associated with user", { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tab = (searchParams.get("tab") || "ALL") as "ALL" | "PAID" | "PARTIALLY_PAID";
    const search = searchParams.get("search") || "";
    const timeframe = (searchParams.get("timeframe") || "30d") as TimeframeType;
    const filter = (searchParams.get("filter") || "ALL").toUpperCase() as "ALL" | "DELIVERED" | "PENDING" | "DELAYED";

    // Generate CSV
    const csvContent = await exportOrdersToCSVData({
      shopId: profile.shopId,
      tab,
      search,
      timeframe,
      filter,
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `orders-export-${timestamp}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Error exporting orders CSV:", error);
    return new Response(error.message || "Internal Server Error", { status: 500 });
  }
}
