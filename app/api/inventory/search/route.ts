import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchInventoryItems } from "@/services/inventory.service";
import { db } from "@/lib/drizzle";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get shopId from profile
    const [profile] = await db
      .select({ shopId: profiles.shopId })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile || !profile.shopId) {
      return NextResponse.json(
        { error: "No shop associated with user" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";

    // Search inventory items
    const items = await searchInventoryItems(profile.shopId, query);

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Error searching inventory:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
