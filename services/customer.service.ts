"use server";

import { db } from "@/lib/drizzle";
import { customers } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import type { Customer, NewCustomer } from "@/types";

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
