"use server";

import { db } from "@/lib/drizzle";
import { prescriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Prescription, NewPrescription } from "@/types";

/**
 * Get all prescriptions for a customer.
 */
export async function getPrescriptionsByCustomer(
  customerId: string
): Promise<Prescription[]> {
  return db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.customerId, customerId))
    .orderBy(prescriptions.createdAt);
}

/**
 * Get all prescriptions for a shop.
 */
export async function getPrescriptionsByShop(
  shopId: string
): Promise<Prescription[]> {
  return db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.shopId, shopId))
    .orderBy(prescriptions.createdAt);
}

/**
 * Get a single prescription by ID.
 */
export async function getPrescriptionById(
  id: string,
  organizationId: string
): Promise<Prescription | null> {
  const [prescription] = await db
    .select()
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.id, id),
        eq(prescriptions.organizationId, organizationId)
      )
    )
    .limit(1);

  return prescription ?? null;
}

/**
 * Create a new prescription.
 */
export async function createPrescription(
  data: NewPrescription
): Promise<Prescription> {
  const [prescription] = await db
    .insert(prescriptions)
    .values(data)
    .returning();
  return prescription;
}

/**
 * Update a prescription.
 */
export async function updatePrescription(
  id: string,
  organizationId: string,
  data: Partial<NewPrescription>
): Promise<Prescription> {
  const [prescription] = await db
    .update(prescriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(prescriptions.id, id),
        eq(prescriptions.organizationId, organizationId)
      )
    )
    .returning();

  return prescription;
}
