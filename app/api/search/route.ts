import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { customers, inventory, invoices, shops } from "@/db/schema";
import { eq, and, or, ilike, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = user.role === "OWNER";
    let activeShopId = user.shopId;

    if (isOwner) {
      const cookieStore = await cookies();
      const contextShopId = cookieStore.get("active_shop_context_id")?.value;
      if (contextShopId) {
        activeShopId = contextShopId;
      }
    }

    // If activeShopId is still null for owner, try resolving first shop
    if (!activeShopId && isOwner && user.organizationId) {
      const [firstShop] = await db
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.organizationId, user.organizationId))
        .limit(1);
      if (firstShop) {
        activeShopId = firstShop.id;
      }
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const shopParam = searchParams.get("shopId");
    if (shopParam && shopParam.trim()) {
      activeShopId = shopParam.trim();
    }

    if (query.trim().length < 1) {
      return NextResponse.json({ customers: [], inventory: [], invoices: [] });
    }

    // 1. Parallel Lookup: Search Patients (Customers)
    const customerScope = activeShopId
      ? and(
          eq(customers.shopId, activeShopId),
          eq(customers.organizationId, user.organizationId),
          or(
            ilike(customers.fullName, `%${query}%`),
            ilike(customers.phone, `%${query}%`),
            ilike(customers.registrationId, `%${query}%`),
            ilike(customers.gstin, `%${query}%`)
          )
        )
      : and(
          eq(customers.organizationId, user.organizationId),
          or(
            ilike(customers.fullName, `%${query}%`),
            ilike(customers.phone, `%${query}%`),
            ilike(customers.registrationId, `%${query}%`),
            ilike(customers.gstin, `%${query}%`)
          )
        );

    const customerQuery = db
      .select({
        id: customers.id,
        name: customers.fullName,
        fullName: customers.fullName,
        phone: customers.phone,
        email: customers.email,
        registrationId: customers.registrationId,
        storeCredit: customers.storeCredit,
        dateOfBirth: customers.dateOfBirth,
        gender: customers.gender,
        bloodGroup: customers.bloodGroup,
        referredBy: customers.referredBy,
        gstin: customers.gstin,
        address: customers.address,
        city: customers.city,
        state: customers.state,
        pincode: customers.pincode,
        chiefComplaint: customers.chiefComplaint,
        familyHistory: customers.familyHistory,
        systemicIllness: customers.systemicIllness,
        allergies: customers.allergies,
      })
      .from(customers)
      .where(customerScope)
      .limit(10);

    // 2. Parallel Lookup: Search Stock Inventory (Frames, Lenses, etc.)
    const inventoryScope = and(
      eq(inventory.organizationId, user.organizationId),
      ne(inventory.isActive, false),
      activeShopId
        ? or(
            eq(inventory.shopId, activeShopId),
            sql`${inventory.shopId} is null`
          )
        : sql`true`,
      or(
        ilike(inventory.name, `%${query}%`),
        ilike(inventory.productName, `%${query}%`),
        ilike(inventory.productCode, `%${query}%`),
        ilike(inventory.sku, `%${query}%`),
        ilike(inventory.brand, `%${query}%`),
        ilike(inventory.model, `%${query}%`)
      )
    );

    const inventoryQuery = db
      .select({
        id: inventory.id,
        name: inventory.name,
        productName: inventory.productName,
        productCode: inventory.productCode,
        sku: inventory.sku,
        category: inventory.category,
        brand: inventory.brand,
        model: inventory.model,
        price: inventory.price,
        sellingPrice: inventory.price,
        costPrice: inventory.costPrice,
        quantity: inventory.quantity,
        stockQuantity: inventory.quantity,
        stock_quantity: inventory.quantity,
        cgstPercent: inventory.cgstPercent,
        sgstPercent: inventory.sgstPercent,
        igstPercent: inventory.igstPercent,
      })
      .from(inventory)
      .where(inventoryScope)
      .limit(15);

    // 3. Parallel Lookup: Search Invoices Ledger
    const invoiceScope = activeShopId
      ? and(
          eq(invoices.shopId, activeShopId),
          ilike(invoices.invoiceNumber, `%${query}%`)
        )
      : and(
          eq(invoices.organizationId, user.organizationId),
          ilike(invoices.invoiceNumber, `%${query}%`)
        );

    const invoiceQuery = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
      })
      .from(invoices)
      .where(invoiceScope)
      .limit(10);

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
