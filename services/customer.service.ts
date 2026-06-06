"use server";

import { db } from "@/lib/drizzle";
import { customers, shops, invoices, prescriptions } from "@/db/schema";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import type { Customer, NewCustomer } from "@/types";

/**
 * Generate a sequential registration ID in the format OP-shopNum-YYYY-NNNN.
 */
export async function generateRegistrationId(shopId: string): Promise<string> {
  // Fetch current shop organizationId
  const [shop] = await db
    .select({
      organizationId: shops.organizationId,
    })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (!shop) {
    throw new Error(`Shop with ID ${shopId} not found.`);
  }

  // Determine shop sequence number within the organization
  const orgShops = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const currentYear = new Date().getFullYear().toString();
  const pattern = `OP-${shopNum}-${currentYear}-%`;

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
    // Format: OP-shopNum-year-serial (length 4)
    if (parts.length === 4) {
      const lastSerialStr = parts[3];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    } else {
      // Backward compatibility fallback for old format: OP-year-serial (length 3)
      const lastSerialStr = parts[2];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
  }

  const paddedSerial = nextSerial.toString().padStart(4, "0");
  return `OP-${shopNum}-${currentYear}-${paddedSerial}`;
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

/**
 * Get unified dashboard data for all customers in a shop.
 */
export async function getCustomersDashboard(shopId: string): Promise<any[]> {
  const lastInvoiceSubquery = db
    .select({
      customerId: invoices.customerId,
      maxInvoiceDate: sql`max(${invoices.createdAt})`.as("max_invoice_date"),
      latestFulfillmentStatus: sql`(array_agg(${invoices.fulfillmentStatus} order by ${invoices.createdAt} desc))[1]`.as("latest_fulfillment_status"),
      pendingDues: sql`sum(${invoices.balanceDue})`.as("pending_dues"),
    })
    .from(invoices)
    .groupBy(invoices.customerId)
    .as("inv_agg");

  const lastPrescriptionSubquery = db
    .select({
      customerId: prescriptions.customerId,
      maxPrescriptionDate: sql`max(${prescriptions.createdAt})`.as("max_prescription_date"),
    })
    .from(prescriptions)
    .groupBy(prescriptions.customerId)
    .as("rx_agg");

  const results = await db
    .select({
      id: customers.id,
      shopId: customers.shopId,
      organizationId: customers.organizationId,
      registrationId: customers.registrationId,
      fullName: customers.fullName,
      email: customers.email,
      phone: customers.phone,
      createdAt: customers.createdAt,
      maxInvoiceDate: lastInvoiceSubquery.maxInvoiceDate,
      latestFulfillmentStatus: lastInvoiceSubquery.latestFulfillmentStatus,
      pendingDues: lastInvoiceSubquery.pendingDues,
      maxPrescriptionDate: lastPrescriptionSubquery.maxPrescriptionDate,
    })
    .from(customers)
    .leftJoin(lastInvoiceSubquery, eq(customers.id, lastInvoiceSubquery.customerId))
    .leftJoin(lastPrescriptionSubquery, eq(customers.id, lastPrescriptionSubquery.customerId))
    .where(eq(customers.shopId, shopId))
    .orderBy(desc(customers.createdAt));

  return results.map((row) => {
    // Determine last visit date as MAX(invoice date, prescription date, customer creation date)
    const dates = [
      new Date(row.createdAt),
      row.maxInvoiceDate ? new Date(row.maxInvoiceDate as string) : null,
      row.maxPrescriptionDate ? new Date(row.maxPrescriptionDate as string) : null,
    ].filter((d): d is Date => d !== null);

    const lastVisitDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    return {
      id: row.id,
      shopId: row.shopId,
      organizationId: row.organizationId,
      registrationId: row.registrationId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      lastVisitDate,
      orderStatus: (row.latestFulfillmentStatus as string) || "DELIVERED",
      pendingDues: Number(row.pendingDues || 0),
    };
  });
}

/**
 * Get full profile details, prescriptions, invoices and stats for a customer.
 */
export async function getCustomerProfileData(
  customerId: string,
  organizationId: string
): Promise<any | null> {
  // Fetch customer, prescriptions, and invoices in parallel to minimize database latency
  const [customerResult, customerPrescriptions, customerInvoices] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, organizationId)
        )
      )
      .limit(1),
    db
      .select()
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.customerId, customerId),
          eq(prescriptions.organizationId, organizationId)
        )
      )
      .orderBy(desc(prescriptions.createdAt)),
    db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, customerId),
          eq(invoices.organizationId, organizationId)
        )
      )
      .orderBy(desc(invoices.createdAt)),
  ]);

  const customer = customerResult[0] || null;
  if (!customer) return null;

  // 4. Calculate aggregates
  const pendingDues = customerInvoices.reduce(
    (sum, inv) => sum + Number(inv.balanceDue || 0),
    0
  );

  const totalOrdersCount = customerInvoices.length;

  const dates = [
    new Date(customer.createdAt),
    ...customerInvoices.map((inv) => new Date(inv.createdAt)),
    ...customerPrescriptions.map((p) => new Date(p.createdAt)),
  ];
  const lastVisitDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const latestPrescription = customerPrescriptions[0] || null;
  const latestInvoice = customerInvoices[0] || null;

  return {
    customer,
    prescriptions: customerPrescriptions,
    invoices: customerInvoices,
    pendingDues,
    totalOrdersCount,
    lastVisitDate,
    latestPrescription,
    latestInvoice,
  };
}
