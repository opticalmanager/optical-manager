import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/drizzle";
import { customers, inventory, invoices, profiles } from "@/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

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

    // Retrieve the user profile to scope searches within their shopId
    const [profile] = await db
      .select({ shopId: profiles.shopId })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile || !profile.shopId) {
      return NextResponse.json(
        { error: "No associated active shop outlet." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";

    if (query.trim().length < 1) {
      return NextResponse.json({ customers: [], inventory: [], invoices: [] });
    }

    // 1. Parallel Lookup: Search Patients (Customers)
    const customerQuery = db
      .select({
        id: customers.id,
        name: customers.fullName,
        phone: customers.phone,
        registrationId: customers.registrationId,
      })
      .from(customers)
      .where(
        and(
          eq(customers.shopId, profile.shopId),
          or(
            ilike(customers.fullName, `%${query}%`),
            ilike(customers.phone, `%${query}%`),
            ilike(customers.registrationId, `%${query}%`)
          )
        )
      )
      .limit(5);

    // 2. Parallel Lookup: Search Stock Inventory (Frames, Lenses, etc.)
    const inventoryQuery = db
      .select({
        id: inventory.id,
        name: inventory.name,
        sku: inventory.sku,
        category: inventory.category,
        brand: inventory.brand,
        price: inventory.price,
        quantity: inventory.quantity,
        cgstPercent: inventory.cgstPercent,
        sgstPercent: inventory.sgstPercent,
        igstPercent: inventory.igstPercent,
      })
      .from(inventory)
      .where(
        and(
          eq(inventory.shopId, profile.shopId),
          eq(inventory.isActive, true),
          or(
            ilike(inventory.name, `%${query}%`),
            ilike(inventory.sku, `%${query}%`),
            ilike(inventory.brand, `%${query}%`),
            ilike(inventory.model, `%${query}%`)
          )
        )
      )
      .limit(5);

    // 3. Parallel Lookup: Search Invoices Ledger
    const invoiceQuery = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, profile.shopId),
          ilike(invoices.invoiceNumber, `%${query}%`)
        )
      )
      .limit(5);

    // Execute queries in parallel to minimize response latency
    const [customerResults, inventoryResults, invoiceResults] = await Promise.all([
      customerQuery,
      inventoryQuery,
      invoiceQuery,
    ]);

    return NextResponse.json({
      customers: customerResults,
      inventory: inventoryResults,
      invoices: invoiceResults,
    });
  } catch (error: any) {
    console.error("Unified search route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
