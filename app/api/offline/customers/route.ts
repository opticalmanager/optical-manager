import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { customers, shops } from "@/db/schema";
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

    // Conditions: Owners without specific shop get all organization customers; Shop managers get active shop
    const whereConditions = isOwner && !activeShopId
      ? [eq(customers.organizationId, user.organizationId)]
      : activeShopId
      ? [
          eq(customers.shopId, activeShopId),
          eq(customers.organizationId, user.organizationId),
        ]
      : [eq(customers.organizationId, user.organizationId)];

    // Fetch customers
    const customerList = await db
      .select({
        id: customers.id,
        shopId: customers.shopId,
        organizationId: customers.organizationId,
        registrationId: customers.registrationId,
        fullName: customers.fullName,
        email: customers.email,
        phone: customers.phone,
        dateOfBirth: customers.dateOfBirth,
        gender: customers.gender,
        bloodGroup: customers.bloodGroup,
        referredBy: customers.referredBy,
        address: customers.address,
        city: customers.city,
        state: customers.state,
        pincode: customers.pincode,
        storeCredit: customers.storeCredit,
        chiefComplaint: customers.chiefComplaint,
        familyHistory: customers.familyHistory,
        systemicIllness: customers.systemicIllness,
        allergies: customers.allergies,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(and(...whereConditions))
      .orderBy(customers.fullName);

    return NextResponse.json({
      shopId: activeShopId || "all",
      customers: customerList,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API] Offline customers warming error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch offline customers databank" },
      { status: 500 }
    );
  }
}
