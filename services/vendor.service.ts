"use server";

import { db } from "@/lib/drizzle";
import { vendors } from "@/db/schema";
import { eq, and, or, ilike, desc, asc } from "drizzle-orm";
import type { Vendor, NewVendor } from "@/types";

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
 * Soft-delete / deactivate a vendor.
 */
export async function deactivateVendor(
  id: string,
  organizationId: string
): Promise<void> {
  await db
    .update(vendors)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(eq(vendors.id, id), eq(vendors.organizationId, organizationId))
    );
}
