"use server";

import { db } from "@/lib/drizzle";
import { customers } from "@/db/schema";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import type { Customer, NewCustomer } from "@/types";

/**
 * Generate a sequential registration ID in the format OP-YYYY-NNNN.
 */
export async function generateRegistrationId(shopId: string): Promise<string> {
  const currentYear = new Date().getFullYear().toString();
  const pattern = `OP-${currentYear}-%`;

  const [lastCustomer] = await db
    .select({
      registrationId: customers.registrationId,
    })
    .from(customers)
    .where(
      and(
        eq(customers.shopId, shopId),
        ilike(customers.registrationId, pattern)
      )
    )
    .orderBy(sql`registration_id DESC`)
    .limit(1);

  let nextSerial = 1;
  if (lastCustomer?.registrationId) {
    const parts = lastCustomer.registrationId.split("-");
    const lastSerialStr = parts[2];
    const lastSerial = parseInt(lastSerialStr, 10);
    if (!isNaN(lastSerial)) {
      nextSerial = lastSerial + 1;
    }
  }

  const paddedSerial = nextSerial.toString().padStart(4, "0");
  return `OP-${currentYear}-${paddedSerial}`;
}

/**
 * Get all customers for a shop.
 */
export async function getCustomersByShop(shopId: string): Promise<Customer[]> {
  return db
    .select()
    .from(customers)
    .where(eq(customers.shopId, shopId))
    .orderBy(customers.createdAt);
}

/**
 * Get all customers for an organization (OWNER access).
 */
export async function getCustomersByOrganization(
  organizationId: string
): Promise<Customer[]> {
  return db
    .select()
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .orderBy(customers.createdAt);
}

/**
 * Get a single customer by ID.
 */
export async function getCustomerById(
  id: string,
  organizationId: string
): Promise<Customer | null> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(eq(customers.id, id), eq(customers.organizationId, organizationId))
    )
    .limit(1);

  return customer ?? null;
}

/**
 * Create a new customer.
 */
export async function createCustomer(data: NewCustomer): Promise<Customer> {
  const [customer] = await db.insert(customers).values(data).returning();
  return customer;
}

/**
 * Update a customer.
 */
export async function updateCustomer(
  id: string,
  organizationId: string,
  data: Partial<NewCustomer>
): Promise<Customer> {
  const [customer] = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(customers.id, id), eq(customers.organizationId, organizationId))
    )
    .returning();

  return customer;
}

/**
 * Search customers by name or phone.
 */
export async function searchCustomers(
  organizationId: string,
  query: string
): Promise<Customer[]> {
  return db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        or(
          ilike(customers.fullName, `%${query}%`),
          ilike(customers.phone, `%${query}%`)
        )
      )
    )
    .limit(20);
}
