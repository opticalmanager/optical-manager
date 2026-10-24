"use server";

import { db } from "@/lib/drizzle";
import { vendors, purchaseOrders } from "@/db/schema";
import { eq, and, or, ilike, desc, asc, sql, inArray } from "drizzle-orm";
import type { Vendor, NewVendor, VendorCategory } from "@/types";

export interface VendorWithStats extends Vendor {
  totalPurchaseCount: number;
  totalPurchaseAmount: number;
  lastPurchaseDate: string | null;
}

export interface VendorKPIs {
  totalVendors: number;
  totalValuation: number;
  framesCount: number;
  lensesCount: number;
}

export interface GetVendorsOptions {
  search?: string;
  category?: string;
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  limit?: number;
  offset?: number;
}

export interface VendorDetailAnalytics {
  totalPurchaseCount: number;
  totalSpend: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
  draftCount: number;
  completedCount: number;
}

export interface VendorOrderDetail {
  id: string;
  purchaseNumber: string;
  purchaseDate: string;
  status: "DRAFT" | "COMPLETED" | "CANCELLED";
  totalQuantity: number;
  totalNetPurchase: string;
  taxType: string;
  taxRule: string;
  itemCount: number;
}

/**
 * Get all active vendors for an organization.
 */
export async function getVendorsByOrganization(
  organizationId: string
): Promise<Vendor[]> {
  return db
    .select()
    .from(vendors)
    .where(
      and(
        eq(vendors.organizationId, organizationId),
        eq(vendors.isActive, true)
      )
    )
    .orderBy(asc(vendors.name));
}

/**
 * Search vendors for autocomplete based on name, contact person, phone, or GSTIN.
 */
export async function searchVendors(
  organizationId: string,
  query: string
): Promise<Vendor[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return getVendorsByOrganization(organizationId);
  }

  return db
    .select()
    .from(vendors)
    .where(
      and(
        eq(vendors.organizationId, organizationId),
        eq(vendors.isActive, true),
        or(
          ilike(vendors.name, `%${cleanQuery}%`),
          ilike(vendors.contactPerson, `%${cleanQuery}%`),
          ilike(vendors.phone, `%${cleanQuery}%`),
          ilike(vendors.gstin, `%${cleanQuery}%`)
        )
      )
    )
    .orderBy(asc(vendors.name))
    .limit(20);
}

/**
 * Get vendors with aggregated purchase stats for the Directory Table.
 */
export async function getVendorsWithStats(
  shopId: string,
  organizationId: string,
  options?: GetVendorsOptions
): Promise<{ vendors: VendorWithStats[]; totalCount: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const status = options?.status ?? "ACTIVE";
  const search = options?.search?.trim();
  const category = options?.category;

  // Build filter conditions
  const conditions = [eq(vendors.organizationId, organizationId)];

  if (status === "ACTIVE") {
    conditions.push(eq(vendors.isActive, true));
  } else if (status === "INACTIVE") {
    conditions.push(eq(vendors.isActive, false));
  }

  if (category && category !== "ALL") {
    conditions.push(eq(vendors.category, category));
  }

  if (search) {
    conditions.push(
      or(
        ilike(vendors.name, `%${search}%`),
        ilike(vendors.contactPerson, `%${search}%`),
        ilike(vendors.phone, `%${search}%`),
        ilike(vendors.gstin, `%${search}%`),
        ilike(vendors.city, `%${search}%`),
        ilike(vendors.state, `%${search}%`)
      )!
    );
  }

  const whereClause = and(...conditions);

  // Aggregated purchase stats subquery
  const poStats = db
    .select({
      vendorId: purchaseOrders.vendorId,
      purchaseCount: sql<number>`count(${purchaseOrders.id})::int`.as("po_count"),
      purchaseAmount: sql<number>`coalesce(sum(${purchaseOrders.totalNetPurchase}::numeric), 0)::float`.as("po_amount"),
      lastPurchaseDate: sql<string | null>`max(${purchaseOrders.purchaseDate}::text)`.as("po_last_date"),
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.organizationId, organizationId))
    .groupBy(purchaseOrders.vendorId)
    .as("po_stats");

  // Query vendors joined with stats
  const [rows, countResult] = await Promise.all([
    db
      .select({
        vendor: vendors,
        totalPurchaseCount: sql<number>`coalesce(${poStats.purchaseCount}, 0)::int`,
        totalPurchaseAmount: sql<number>`coalesce(${poStats.purchaseAmount}, 0)::float`,
        lastPurchaseDate: poStats.lastPurchaseDate,
      })
      .from(vendors)
      .leftJoin(poStats, eq(vendors.id, poStats.vendorId))
      .where(whereClause)
      .orderBy(desc(vendors.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendors)
      .where(whereClause),
  ]);

  const mappedVendors: VendorWithStats[] = rows.map((r) => ({
    ...r.vendor,
    totalPurchaseCount: r.totalPurchaseCount || 0,
    totalPurchaseAmount: r.totalPurchaseAmount || 0,
    lastPurchaseDate: r.lastPurchaseDate ?? null,
  }));

  const totalCount = countResult[0]?.count || 0;

  return { vendors: mappedVendors, totalCount };
}

/**
 * Get KPI aggregates for the Vendor Directory.
 */
export async function getVendorKPIs(
  organizationId: string
): Promise<VendorKPIs> {
  const [vendorCounts, totalValuationResult] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        frames: sql<number>`count(case when ${vendors.category} = 'FRAMES' then 1 end)::int`,
        lenses: sql<number>`count(case when ${vendors.category} in ('LENSES', 'CONTACT_LENSES') then 1 end)::int`,
      })
      .from(vendors)
      .where(
        and(eq(vendors.organizationId, organizationId), eq(vendors.isActive, true))
      ),
    db
      .select({
        totalValuation: sql<number>`coalesce(sum(${purchaseOrders.totalNetPurchase}::numeric), 0)::float`,
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.organizationId, organizationId)),
  ]);

  return {
    totalVendors: vendorCounts[0]?.total || 0,
    totalValuation: totalValuationResult[0]?.totalValuation || 0,
    framesCount: vendorCounts[0]?.frames || 0,
    lensesCount: vendorCounts[0]?.lenses || 0,
  };
}

/**
 * Get a single vendor by ID.
 */
export async function getVendorById(
  id: string,
  organizationId: string
): Promise<Vendor | null> {
  const [vendor] = await db
    .select()
    .from(vendors)
    .where(
      and(eq(vendors.id, id), eq(vendors.organizationId, organizationId))
    )
    .limit(1);

  return vendor ?? null;
}

/**
 * Create a new vendor.
 */
export async function createVendor(data: NewVendor): Promise<Vendor> {
  const [vendor] = await db.insert(vendors).values(data).returning();
  return vendor;
}

/**
 * Update an existing vendor.
 */
export async function updateVendor(
  id: string,
  organizationId: string,
  data: Partial<NewVendor>
): Promise<Vendor> {
  const [vendor] = await db
    .update(vendors)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(vendors.id, id), eq(vendors.organizationId, organizationId))
    )
    .returning();

  return vendor;
}

/**
 * Soft-delete / deactivate or reactivate a vendor.
 */
export async function toggleVendorActive(
  id: string,
  organizationId: string,
  isActive: boolean
): Promise<Vendor> {
  const [vendor] = await db
    .update(vendors)
    .set({ isActive, updatedAt: new Date() })
    .where(
      and(eq(vendors.id, id), eq(vendors.organizationId, organizationId))
    )
    .returning();

  return vendor;
}

/**
 * Backward-compatible deactivate vendor.
 */
export async function deactivateVendor(
  id: string,
  organizationId: string
): Promise<void> {
  await toggleVendorActive(id, organizationId, false);
}

/**
 * Get detailed vendor data with analytics and full purchase history for Vendor Detail Page.
 */
export async function getVendorDetailWithAnalytics(
  vendorId: string,
  organizationId: string
): Promise<{
  vendor: Vendor;
  analytics: VendorDetailAnalytics;
  orders: VendorOrderDetail[];
} | null> {
  const vendor = await getVendorById(vendorId, organizationId);
  if (!vendor) return null;

  const orders = await db
    .select({
      id: purchaseOrders.id,
      purchaseNumber: purchaseOrders.purchaseNumber,
      purchaseDate: purchaseOrders.purchaseDate,
      status: purchaseOrders.status,
      totalQuantity: purchaseOrders.totalQuantity,
      totalNetPurchase: purchaseOrders.totalNetPurchase,
      taxType: purchaseOrders.taxType,
      taxRule: purchaseOrders.taxRule,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.vendorId, vendorId),
        eq(purchaseOrders.organizationId, organizationId)
      )
    )
    .orderBy(desc(purchaseOrders.purchaseDate));

  let totalSpend = 0;
  let draftCount = 0;
  let completedCount = 0;
  let lastPurchaseDate: string | null = null;

  for (const o of orders) {
    const amt = parseFloat(o.totalNetPurchase) || 0;
    totalSpend += amt;
    if (o.status === "DRAFT") draftCount++;
    if (o.status === "COMPLETED") completedCount++;
    if (!lastPurchaseDate && o.purchaseDate) {
      lastPurchaseDate = String(o.purchaseDate);
    }
  }

  const orderCount = orders.length;
  const averageOrderValue = orderCount > 0 ? totalSpend / orderCount : 0;

  return {
    vendor,
    analytics: {
      totalPurchaseCount: orderCount,
      totalSpend,
      averageOrderValue,
      lastPurchaseDate,
      draftCount,
      completedCount,
    },
    orders: orders.map((o) => ({
      id: o.id,
      purchaseNumber: o.purchaseNumber,
      purchaseDate: String(o.purchaseDate),
      status: o.status,
      totalQuantity: o.totalQuantity,
      totalNetPurchase: o.totalNetPurchase,
      taxType: o.taxType,
      taxRule: o.taxRule,
      itemCount: o.totalQuantity,
    })),
  };
}

/**
 * Safely delete a vendor.
 * If vendor has associated purchase orders, prevents deletion and returns canDelete: false.
 */
export async function deleteVendorSafe(
  vendorId: string,
  organizationId: string
): Promise<{ success: boolean; canDelete: boolean; orderCount: number; message: string }> {
  // Check purchase orders count
  const [poResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.vendorId, vendorId),
        eq(purchaseOrders.organizationId, organizationId)
      )
    );

  const orderCount = poResult?.count || 0;

  if (orderCount > 0) {
    return {
      success: false,
      canDelete: false,
      orderCount,
      message: `Cannot delete vendor: ${orderCount} purchase bill(s) are linked to this supplier. Archive the vendor to preserve stock and tax ledger records.`,
    };
  }

  // Safe to delete permanently
  await db
    .delete(vendors)
    .where(
      and(eq(vendors.id, vendorId), eq(vendors.organizationId, organizationId))
    );

  return {
    success: true,
    canDelete: true,
    orderCount: 0,
    message: "Vendor deleted successfully.",
  };
}
