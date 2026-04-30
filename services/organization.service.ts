"use server";

import { db } from "@/lib/drizzle";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Organization, NewOrganization } from "@/types";

/**
 * Get an organization by ID.
 */
export async function getOrganizationById(
  id: string
): Promise<Organization | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  return org ?? null;
}

/**
 * Update an organization.
 */
export async function updateOrganization(
  id: string,
  data: Partial<NewOrganization>
): Promise<Organization> {
  const [org] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();

  return org;
}
