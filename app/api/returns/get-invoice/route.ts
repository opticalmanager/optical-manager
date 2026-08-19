import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInvoiceForReturnForm } from "@/services/return.service";
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

    const [profile] = await db
      .select({ organizationId: profiles.organizationId })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile || !profile.organizationId) {
      return NextResponse.json(
        { error: "No organization associated with user" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("id");

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Missing invoice ID parameter" },
        { status: 400 }
      );
    }

    const invoiceData = await getInvoiceForReturnForm(invoiceId, profile.organizationId);

    if (!invoiceData) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoiceData);
  } catch (error: any) {
    console.error("Error fetching invoice for return:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
