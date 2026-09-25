"use server";

import { db } from "@/lib/drizzle";
import { customers, shops, invoices, prescriptions, customerCreditLedger, orders, invoiceItems, inventory, receipts } from "@/db/schema";
import { eq, and, ilike, or, sql, desc, inArray, isNull } from "drizzle-orm";
import type { Customer, NewCustomer } from "@/types";
import type { OrderItem, SKUDetail, ReceiptItem } from "@/services/order.service";
import {
  DEFAULT_DOCUMENT_SERIES,
  buildSeriesPrefix,
  formatDocumentNumber,
  extractTrailingSerial,
} from "@/utils/document-series";

/**
 * Generate a sequential registration ID supporting custom series or standard OP-shopNum-YYYY-NNNN.
 */
export async function generateRegistrationId(shopId: string): Promise<string> {
  // Fetch current shop organizationId and custom settings
  const [shop] = await db
    .select({
      organizationId: shops.organizationId,
      settings: shops.settings,
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

  // Retrieve custom configuration or fall back to standard default
  const customConfig = (shop.settings as any)?.documentSeries?.customer;
  const config = customConfig
    ? { ...DEFAULT_DOCUMENT_SERIES.customer, ...customConfig }
    : DEFAULT_DOCUMENT_SERIES.customer;

  const now = new Date();
  const seriesPrefix = buildSeriesPrefix(config, shopNum, now);

  // Query most recent customer matching this series prefix
  const [lastCustomer] = await db
    .select({
      registrationId: customers.registrationId,
    })
    .from(customers)
    .where(
      and(
        eq(customers.shopId, shopId),
        ilike(customers.registrationId, `${seriesPrefix}%`)
      )
    )
    .orderBy(desc(customers.createdAt), desc(customers.registrationId))
    .limit(1);

  // Extract last serial from DB if exists
  let lastDbSerial: number | null = null;
  if (lastCustomer?.registrationId) {
    lastDbSerial = extractTrailingSerial(lastCustomer.registrationId, seriesPrefix);
  }

  // Anti-collision safeguard: ensure next number is at least lastDbSerial + 1
  const configuredNext =
    typeof config.nextNumber === "number" && config.nextNumber > 0
      ? config.nextNumber
      : 1;

  const nextSerial =
    lastDbSerial !== null
      ? Math.max(configuredNext, lastDbSerial + 1)
      : configuredNext;

  return formatDocumentNumber(config, nextSerial, shopNum, now);
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
      latestDoctorName: sql`(array_agg(${prescriptions.doctorName} order by ${prescriptions.createdAt} desc))[1]`.as("latest_doctor_name"),
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
      referredBy: customers.referredBy,
      createdAt: customers.createdAt,
      maxInvoiceDate: lastInvoiceSubquery.maxInvoiceDate,
      latestFulfillmentStatus: lastInvoiceSubquery.latestFulfillmentStatus,
      pendingDues: lastInvoiceSubquery.pendingDues,
      maxPrescriptionDate: lastPrescriptionSubquery.maxPrescriptionDate,
      latestDoctorName: lastPrescriptionSubquery.latestDoctorName,
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
      referredBy: row.referredBy || null,
      doctorName: (row.latestDoctorName as string) || null,
      lastVisitDate,
      orderStatus: (row.latestFulfillmentStatus as string) || "DELIVERED",
      pendingDues: Number(row.pendingDues || 0),
    };
  });
}

/**
 * Fetch distinct Referred By and Doctor Name values for autocomplete suggestions.
 */
export async function getClinicalSuggestions(organizationId: string): Promise<{
  referredByList: string[];
  doctorNameList: string[];
}> {
  const [referredRows, doctorRows] = await Promise.all([
    db
      .selectDistinct({ name: customers.referredBy })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          sql`${customers.referredBy} IS NOT NULL AND ${customers.referredBy} != ''`
        )
      ),
    db
      .selectDistinct({ name: prescriptions.doctorName })
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.organizationId, organizationId),
          sql`${prescriptions.doctorName} IS NOT NULL AND ${prescriptions.doctorName} != ''`
        )
      ),
  ]);

  const referredByList = referredRows
    .map((r) => r.name)
    .filter((n): n is string => Boolean(n));
  const doctorNameList = doctorRows
    .map((r) => r.name)
    .filter((n): n is string => Boolean(n));

  return { referredByList, doctorNameList };
}

/**
 * Fetch all orders for a specific customer with full item details and receipts.
 */
export async function getCustomerOrders(
  customerId: string,
  organizationId: string
): Promise<OrderItem[]> {
  const ordersListRaw = await db
    .select({
      id: invoices.id,
      orderId: sql<string>`COALESCE(${orders.id}, ${invoices.id})`,
      orderNumber: sql<string>`COALESCE(${orders.orderNumber}, ${invoices.invoiceNumber})`,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      createdAt: sql<Date>`COALESCE(${orders.createdAt}, ${invoices.createdAt})`,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      paymentMethod: invoices.paymentMethod,
      fulfillmentStatus: invoices.fulfillmentStatus,
      estimatedDelivery: invoices.estimatedDelivery,
      isRescheduled: invoices.isRescheduled,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      receiptId: orders.receiptId,
      notes: invoices.notes,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(orders, eq(orders.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.customerId, customerId),
        eq(invoices.organizationId, organizationId),
        isNull(invoices.deletedAt),
        sql`(${orders.deletedAt} IS NULL OR ${orders.id} IS NULL)`
      )
    )
    .orderBy(desc(sql`COALESCE(${orders.createdAt}, ${invoices.createdAt})`));

  if (ordersListRaw.length === 0) return [];

  const invoiceIds = ordersListRaw.map((o) => o.invoiceId);

  const [itemsRaw, receiptsRaw] = await Promise.all([
    db
      .select({
        invoiceId: invoiceItems.invoiceId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        category: inventory.category,
        sku: inventory.sku,
      })
      .from(invoiceItems)
      .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
      .where(inArray(invoiceItems.invoiceId, invoiceIds)),

    db
      .select({
        id: receipts.id,
        invoiceId: receipts.invoiceId,
        receiptNumber: receipts.receiptNumber,
        amountPaid: receipts.amountPaid,
        balanceDue: receipts.balanceDue,
        paymentMethod: receipts.paymentMethod,
        createdAt: receipts.createdAt,
      })
      .from(receipts)
      .where(inArray(receipts.invoiceId, invoiceIds))
      .orderBy(receipts.createdAt),
  ]);

  // Group items by invoiceId
  const itemsByInvoice = new Map<string, SKUDetail[]>();
  itemsRaw.forEach((item) => {
    const list = itemsByInvoice.get(item.invoiceId) || [];
    list.push({
      description: item.description || "Optical Item",
      quantity: item.quantity,
      category: item.category,
      sku: item.sku,
    });
    itemsByInvoice.set(item.invoiceId, list);
  });

  // Group receipts by invoiceId
  const receiptsByInvoice = new Map<string, ReceiptItem[]>();
  receiptsRaw.forEach((rcp) => {
    const list = receiptsByInvoice.get(rcp.invoiceId) || [];
    list.push({
      id: rcp.id,
      receiptNumber: rcp.receiptNumber,
      amountPaid: rcp.amountPaid,
      balanceDue: rcp.balanceDue,
      paymentMethod: rcp.paymentMethod,
      createdAt: rcp.createdAt,
    });
    receiptsByInvoice.set(rcp.invoiceId, list);
  });

  return ordersListRaw.map((ord) => {
    const skus = itemsByInvoice.get(ord.invoiceId) || [];
    const ordReceipts = receiptsByInvoice.get(ord.invoiceId) || [];

    // Derive category description
    let categoryText = "Optical Order";
    const categories = Array.from(new Set(skus.map((s) => s.category).filter(Boolean)));
    if (categories.includes("FRAME") && categories.includes("LENS")) {
      categoryText = "Spectacles Order";
    } else if (categories.includes("FRAME")) {
      categoryText = "Eyeglass Frame";
    } else if (categories.includes("LENS")) {
      categoryText = "Prescription Lenses";
    } else if (categories.includes("CONTACT_LENS")) {
      categoryText = "Contact Lenses";
    } else if (categories.includes("SUNGLASSES")) {
      categoryText = "Designer Sunglasses";
    } else if (categories.includes("ACCESSORY")) {
      categoryText = "Optical Accessories";
    }

    return {
      id: ord.orderId,
      orderNumber: ord.orderNumber,
      invoiceId: ord.invoiceId,
      invoiceNumber: ord.invoiceNumber,
      createdAt: ord.createdAt,
      total: ord.total,
      amountPaid: ord.amountPaid,
      balanceDue: ord.balanceDue,
      paymentMethod: ord.paymentMethod,
      fulfillmentStatus: ord.fulfillmentStatus,
      estimatedDelivery: ord.estimatedDelivery,
      isRescheduled: ord.isRescheduled,
      customerId: ord.customerId,
      customerName: ord.customerName,
      customerPhone: ord.customerPhone,
      customerEmail: ord.customerEmail,
      skus,
      categoryText,
      receiptId: ord.receiptId,
      receipts: ordReceipts,
    };
  });
}

/**
 * Get full profile details, prescriptions, invoices, orders and stats for a customer.
 */
export async function getCustomerProfileData(
  customerId: string,
  organizationId: string
): Promise<any | null> {
  // Fetch customer, prescriptions, invoices, orders, and credit ledger in parallel to minimize database latency
  const [customerResult, customerPrescriptions, customerInvoices, customerOrders, creditLedgerResult] = await Promise.all([
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
          eq(invoices.organizationId, organizationId),
          isNull(invoices.deletedAt)
        )
      )
      .orderBy(desc(invoices.createdAt)),
    getCustomerOrders(customerId, organizationId).catch((err) => {
      console.warn("[getCustomerProfileData] Failed to fetch customer orders:", err);
      return [] as OrderItem[];
    }),
    db
      .select()
      .from(customerCreditLedger)
      .where(
        and(
          eq(customerCreditLedger.customerId, customerId),
          eq(customerCreditLedger.organizationId, organizationId)
        )
      )
      .orderBy(desc(customerCreditLedger.createdAt)),
  ]);

  const customer = customerResult[0] || null;
  if (!customer) return null;

  // 4. Calculate aggregates (strictly excluding deleted or cancelled invoices)
  const activeInvoices = customerInvoices.filter(
    (inv) => !inv.deletedAt && inv.status !== "CANCELLED"
  );

  const pendingDues = customerOrders.length > 0
    ? customerOrders.reduce((sum, ord) => sum + (parseFloat(ord.balanceDue) || 0), 0)
    : activeInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);

  const totalOrderValue = customerOrders.length > 0
    ? customerOrders.reduce((sum, ord) => sum + (parseFloat(ord.total) || 0), 0)
    : activeInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

  const totalOrdersCount = customerOrders.length || activeInvoices.length;

  const dates = [
    new Date(customer.createdAt),
    ...activeInvoices.map((inv) => new Date(inv.createdAt)),
    ...customerPrescriptions.map((p) => new Date(p.createdAt)),
  ];
  const lastVisitDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const latestPrescription = customerPrescriptions[0] || null;
  const latestInvoice = customerOrders.length > 0
    ? {
        id: customerOrders[0].invoiceId,
        invoiceNumber: customerOrders[0].invoiceNumber,
        total: customerOrders[0].total,
        balanceDue: customerOrders[0].balanceDue,
        status: (parseFloat(customerOrders[0].balanceDue) === 0 ? "PAID" : "PENDING") as "DRAFT" | "PENDING" | "PAID" | "CANCELLED",
        fulfillmentStatus: (customerOrders[0].fulfillmentStatus as any) || "PROCESSING",
        createdAt: customerOrders[0].createdAt,
        notes: null,
      }
    : (activeInvoices[0] || null);

  return {
    customer,
    prescriptions: customerPrescriptions,
    invoices: activeInvoices,
    orders: customerOrders,
    creditLedger: creditLedgerResult,
    pendingDues,
    totalOrderValue,
    totalOrdersCount,
    lastVisitDate,
    latestPrescription,
    latestInvoice,
  };
}

/**
 * Generate sequential registration IDs in batch for a shop.
 */
export async function generateBatchRegistrationIds(
  shopId: string,
  count: number,
  dbInstance: any = db
): Promise<string[]> {
  if (count <= 0) return [];

  // Fetch current shop organizationId
  const [shop] = await dbInstance
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
  const orgShops = await dbInstance
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s: any) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const currentYear = new Date().getFullYear().toString();
  const pattern = `OP-${shopNum}-${currentYear}-%`;

  const [lastCustomer] = await dbInstance
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
    if (parts.length === 4) {
      const lastSerialStr = parts[3];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    } else {
      const lastSerialStr = parts[2];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
  }

  const generatedIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const paddedSerial = (nextSerial + i).toString().padStart(4, "0");
    generatedIds.push(`OP-${shopNum}-${currentYear}-${paddedSerial}`);
  }

  return generatedIds;
}

export interface BulkCustomerInput {
  fullName: string;
  phone: string;
  email?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  referredBy?: string | null;
  notes?: string | null;
}

/**
 * High-performance batch insertion for bulk customers import.
 */
export async function bulkCreateCustomers(
  shopId: string,
  organizationId: string,
  records: BulkCustomerInput[]
): Promise<{ count: number; firstRegId: string; lastRegId: string }> {
  if (!records || records.length === 0) {
    return { count: 0, firstRegId: "", lastRegId: "" };
  }

  return await db.transaction(async (tx) => {
    // 1. Generate sequential batch registration IDs
    const regIds = await generateBatchRegistrationIds(shopId, records.length, tx);

    // 2. Prepare customer insert rows
    const insertData = records.map((rec, idx) => ({
      shopId,
      organizationId,
      registrationId: regIds[idx],
      fullName: rec.fullName.trim(),
      phone: rec.phone.trim().replace(/[\s-]/g, ""),
      email: rec.email?.trim() || null,
      gender: rec.gender || null,
      dateOfBirth: rec.dateOfBirth || null,
      address: rec.address?.trim() || null,
      city: rec.city?.trim() || null,
      state: rec.state?.trim() || null,
      pincode: rec.pincode?.trim() || null,
      referredBy: rec.referredBy?.trim() || null,
      notes: rec.notes?.trim() || null,
      storeCredit: "0.00",
    }));

    // 3. Batch insert
    await tx.insert(customers).values(insertData);

    return {
      count: records.length,
      firstRegId: regIds[0] || "",
      lastRegId: regIds[regIds.length - 1] || "",
    };
  });
}

