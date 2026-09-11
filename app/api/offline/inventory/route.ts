import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { inventory, shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
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

    // If activeShopId is still null, attempt to resolve first shop in organization for fallback
    if (!activeShopId && user.organizationId) {
      const [firstShop] = await db
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.organizationId, user.organizationId))
        .limit(1);

      if (firstShop) {
        activeShopId = firstShop.id;
      }
    }

    // Conditions: Owners without specific shop get all organization inventory; Shop managers get active shop
    const whereConditions = isOwner && !activeShopId
      ? [
          eq(inventory.organizationId, user.organizationId),
          eq(inventory.isActive, true),
        ]
      : activeShopId
      ? [
          eq(inventory.shopId, activeShopId),
          eq(inventory.organizationId, user.organizationId),
          eq(inventory.isActive, true),
        ]
      : [
          eq(inventory.organizationId, user.organizationId),
          eq(inventory.isActive, true),
        ];

    // Fetch active inventory
    const inventoryList = await db
      .select({
        id: inventory.id,
        shopId: inventory.shopId,
        organizationId: inventory.organizationId,
        name: inventory.name,
        category: inventory.category,
        brand: inventory.brand,
        model: inventory.model,
        sku: inventory.sku,
        price: inventory.price,
        quantity: inventory.quantity,
        isActive: inventory.isActive,
        cgstPercent: inventory.cgstPercent,
        sgstPercent: inventory.sgstPercent,
        igstPercent: inventory.igstPercent,
        updatedAt: inventory.updatedAt,
      })
      .from(inventory)
      .where(and(...whereConditions))
      .orderBy(inventory.name);

    return NextResponse.json({
      shopId: activeShopId || "all",
      inventory: inventoryList,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API] Offline inventory warming error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch offline inventory databank" },
      { status: 500 }
    );
  }
}
