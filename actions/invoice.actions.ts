"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { createInvoice, updateInvoice } from "@/services/invoice.service";
import { invoiceSchema, type FormState } from "@/utils/validators";
import { generateInvoiceNumber } from "@/services/invoice.service";

/**
 * Server Action: Create a new invoice.
 */
export async function createInvoiceAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { success: false, message: "Unauthorized." };

  const shopId = user.shopId || (formData.get("shopId") as string);
  if (!shopId) return { success: false, message: "Shop ID is required." };

  const validatedFields = invoiceSchema.safeParse({
    customerId: formData.get("customerId"),
    subtotal: formData.get("subtotal"),
    discount: formData.get("discount"),
    tax: formData.get("tax"),
    total: formData.get("total"),
    status: formData.get("status"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createInvoice({
      ...validatedFields.data,
      invoiceNumber: await generateInvoiceNumber(shopId),
      shopId,
      organizationId: user.organizationId,
    });

    revalidatePath("/shop/invoices");
    return { success: true, message: "Invoice created successfully." };
  } catch (error) {
    return { success: false, message: "Failed to create invoice." };
  }
}

/**
 * Server Action: Update an invoice status.
 */
export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: "DRAFT" | "PENDING" | "PAID" | "CANCELLED",
  paymentMethod?: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER"
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { success: false, message: "Unauthorized." };

  try {
    await updateInvoice(invoiceId, user.organizationId, {
      status,
      paymentMethod: paymentMethod ?? undefined,
    });

    revalidatePath("/shop/invoices");
    return { success: true, message: "Invoice updated." };
  } catch (error) {
    return { success: false, message: "Failed to update invoice." };
  }
}

export interface BulkInvoiceItemInput {
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  soldBy?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerGender?: "MALE" | "FEMALE" | "OTHER" | null;
  customerCity?: string | null;
  customerAddress?: string | null;
  itemDescription: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  totalAmount: number;
  amountPaid?: number;
  paymentMethod?: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | null;
  paymentStatus?: "PAID" | "PARTIALLY_PAID" | "PENDING" | null;
  fulfillmentStatus?: "DELIVERED" | "READY" | "PROCESSING" | "ON_HOLD" | null;
  notes?: string | null;
}

export interface BulkInvoiceImportPayload {
  shopId: string;
  records: BulkInvoiceItemInput[];
  defaultDate?: string;
  defaultPaymentMethod?: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";
  defaultFulfillmentStatus?: "DELIVERED" | "READY" | "PROCESSING";
  autoCreateCustomers?: boolean;
}

/**
 * Server Action: Batch import historical invoices and auto-register customers.
 */
export async function bulkImportInvoicesAction(
  shopId: string,
  payload: BulkInvoiceImportPayload
): Promise<{
  success: boolean;
  message: string;
  invoicesCount?: number;
  itemsCount?: number;
  newCustomersCount?: number;
  existingCustomersCount?: number;
  totalRevenue?: number;
  firstInvoiceNum?: string;
  lastInvoiceNum?: string;
  errors?: string[];
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized. Please log in again." };
    }

    const organizationId = user.organizationId;
    const targetShopId = user.shopId || shopId;
    const userId = user.id;

    if (!targetShopId) {
      return { success: false, message: "No active store outlet selected." };
    }

    if (!payload.records || payload.records.length === 0) {
      return { success: false, message: "No invoice records provided for import." };
    }

    const { db } = await import("@/lib/drizzle");
    const { invoices, invoiceItems, orders, receipts, customers } = await import("@/db/schema");
    const { eq, and, inArray } = await import("drizzle-orm");
    const { generateBatchRegistrationIds } = await import("@/services/customer.service");
    const { generateBatchInvoiceNumbers } = await import("@/services/invoice.service");
    const { generateReceiptNumber, generateOrderNumber } = await import("@/services/receipt.service");

    const errors: string[] = [];

    // Pre-validate rows and extract clean customer phones
    const cleanedRows: Array<BulkInvoiceItemInput & { cleanPhone: string; rowNum: number }> = [];

    payload.records.forEach((row, idx) => {
      const rowNum = idx + 1;
      const custName = (row.customerName || "").trim();
      if (!custName || custName.length < 2) {
        errors.push(`Row ${rowNum}: Customer Name is required (minimum 2 characters).`);
        return;
      }

      const rawPhone = (row.customerPhone || "").trim();
      const cleanPhone = rawPhone.replace(/[\s-]/g, "").replace(/^\+91/, "").replace(/^0/, "");
      if (!/^[0-9]{10}$/.test(cleanPhone)) {
        errors.push(`Row ${rowNum} (${custName}): Valid 10-digit mobile number is required.`);
        return;
      }

      const itemDesc = (row.itemDescription || "").trim();
      if (!itemDesc) {
        errors.push(`Row ${rowNum} (${custName}): Item Description is required.`);
        return;
      }

      const totalVal = Number(row.totalAmount);
      if (isNaN(totalVal) || totalVal < 0) {
        errors.push(`Row ${rowNum} (${custName}): Total Amount must be a valid non-negative number.`);
        return;
      }

      cleanedRows.push({
        ...row,
        cleanPhone,
        rowNum,
      });
    });

    if (cleanedRows.length === 0) {
      return {
        success: false,
        message: "No valid rows found to import. Please resolve validation errors.",
        errors,
      };
    }

    const result = await db.transaction(async (tx) => {
      // 1. Resolve Customers (Existing vs New)
      const uniquePhones = Array.from(new Set(cleanedRows.map((r) => r.cleanPhone)));

      const existingCusts = await tx
        .select({
          id: customers.id,
          phone: customers.phone,
          fullName: customers.fullName,
        })
        .from(customers)
        .where(
          and(
            eq(customers.shopId, targetShopId),
            inArray(customers.phone, uniquePhones)
          )
        );

      const customerMap = new Map<string, { id: string; fullName: string }>();
      existingCusts.forEach((c) => {
        customerMap.set(c.phone, { id: c.id, fullName: c.fullName });
      });

      const missingPhones = uniquePhones.filter((phone) => !customerMap.has(phone));
      let newCustomersCreated = 0;

      if (missingPhones.length > 0 && payload.autoCreateCustomers !== false) {
        const batchRegIds = await generateBatchRegistrationIds(targetShopId, missingPhones.length, tx);
        const customersToInsert = missingPhones.map((phone, i) => {
          // Find first record matching this phone to get profile info
          const rowMatch = cleanedRows.find((r) => r.cleanPhone === phone)!;
          let cleanGender: "MALE" | "FEMALE" | "OTHER" | null = null;
          if (rowMatch.customerGender) {
            const g = rowMatch.customerGender.toUpperCase();
            if (g === "MALE" || g === "M") cleanGender = "MALE";
            else if (g === "FEMALE" || g === "F") cleanGender = "FEMALE";
            else if (g === "OTHER" || g === "O") cleanGender = "OTHER";
          }

          return {
            shopId: targetShopId,
            organizationId,
            registrationId: batchRegIds[i],
            fullName: rowMatch.customerName.trim(),
            phone,
            email: rowMatch.customerEmail?.trim() || null,
            gender: cleanGender,
            city: rowMatch.customerCity?.trim() || null,
            address: rowMatch.customerAddress?.trim() || null,
            storeCredit: "0.00",
          };
        });

        const insertedCustomers = await tx
          .insert(customers)
          .values(customersToInsert)
          .returning({ id: customers.id, phone: customers.phone, fullName: customers.fullName });

        insertedCustomers.forEach((c) => {
          customerMap.set(c.phone, { id: c.id, fullName: c.fullName });
        });
        newCustomersCreated = insertedCustomers.length;
      }

      // 2. Group items into Invoices
      // Group key: if row.invoiceNumber provided -> use that; else synthesize key by phone + date
      interface InvoiceGroup {
        invoiceNumber?: string;
        invoiceDateStr: string;
        phone: string;
        customerName: string;
        soldBy: string | null;
        paymentMethod: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";
        fulfillmentStatus: "DELIVERED" | "READY" | "PROCESSING" | "ON_HOLD";
        notes: string | null;
        items: Array<BulkInvoiceItemInput & { cleanPhone: string }>;
        explicitPaid?: number;
      }

      const groups = new Map<string, InvoiceGroup>();

      cleanedRows.forEach((row) => {
        const rowDateStr = (row.invoiceDate && row.invoiceDate.trim())
          ? row.invoiceDate.trim()
          : (payload.defaultDate || new Date().toISOString().split("T")[0]);

        const rawInvNum = (row.invoiceNumber || "").trim();
        const groupKey = rawInvNum
          ? `NUM:${rawInvNum.toLowerCase()}`
          : `AUTO:${row.cleanPhone}:${rowDateStr}`;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            invoiceNumber: rawInvNum || undefined,
            invoiceDateStr: rowDateStr,
            phone: row.cleanPhone,
            customerName: row.customerName.trim(),
            soldBy: row.soldBy?.trim() || null,
            paymentMethod: row.paymentMethod || payload.defaultPaymentMethod || "CASH",
            fulfillmentStatus: row.fulfillmentStatus || payload.defaultFulfillmentStatus || "DELIVERED",
            notes: row.notes?.trim() || null,
            items: [],
            explicitPaid: row.amountPaid !== undefined && !isNaN(Number(row.amountPaid)) ? Number(row.amountPaid) : undefined,
          });
        }

        const grp = groups.get(groupKey)!;
        grp.items.push(row);
      });

      // 3. Resolve Missing Invoice Numbers in Batch
      const groupsWithoutNum = Array.from(groups.values()).filter((g) => !g.invoiceNumber);
      if (groupsWithoutNum.length > 0) {
        const autoNums = await generateBatchInvoiceNumbers(targetShopId, groupsWithoutNum.length, tx);
        groupsWithoutNum.forEach((grp, idx) => {
          grp.invoiceNumber = autoNums[idx];
        });
      }

      // 4. Insert Invoices, Items, Orders, and Receipts
      let invoicesCreated = 0;
      let totalItemsCreated = 0;
      let totalRevenueImported = 0;
      let firstInvoiceNumber = "";
      let lastInvoiceNumber = "";

      for (const grp of Array.from(groups.values())) {
        const cust = customerMap.get(grp.phone);
        if (!cust) continue;

        const invNum = grp.invoiceNumber!;
        if (!firstInvoiceNumber) firstInvoiceNumber = invNum;
        lastInvoiceNumber = invNum;

        // Calculate Totals across items in this invoice
        let subtotal = 0;
        let discount = 0;
        let tax = 0;
        let total = 0;
        let itemsPaidSum = 0;

        grp.items.forEach((item) => {
          const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
          const lineTotal = Number(item.totalAmount) || 0;
          const disc = Number(item.discountAmount) || 0;
          const taxPct = Number(item.taxPercent) || 0;
          let lineTax = Number(item.taxAmount) || 0;

          if (lineTax === 0 && taxPct > 0) {
            lineTax = Number(((lineTotal * taxPct) / (100 + taxPct)).toFixed(2));
          }

          const lineUnitPrice = Number(item.unitPrice) > 0 ? Number(item.unitPrice) : lineTotal / qty;

          subtotal += lineUnitPrice * qty;
          discount += disc;
          tax += lineTax;
          total += lineTotal;

          if (item.amountPaid !== undefined && !isNaN(Number(item.amountPaid))) {
            itemsPaidSum += Number(item.amountPaid);
          }
        });

        // Determine final amountPaid & balanceDue
        let finalAmountPaid = total;
        if (grp.explicitPaid !== undefined) {
          finalAmountPaid = grp.explicitPaid;
        } else if (itemsPaidSum > 0) {
          finalAmountPaid = itemsPaidSum;
        } else if (grp.items[0]?.paymentStatus === "PENDING") {
          finalAmountPaid = 0;
        } else if (grp.items[0]?.paymentStatus === "PARTIALLY_PAID") {
          finalAmountPaid = Number((total * 0.5).toFixed(2));
        }

        finalAmountPaid = Math.min(finalAmountPaid, total);
        const balanceDue = Math.max(0, Number((total - finalAmountPaid).toFixed(2)));
        const invStatus = balanceDue <= 0 ? "PAID" : "PENDING";

        // Historical creation timestamp
        let invoiceTimestamp: Date;
        try {
          const parsed = new Date(grp.invoiceDateStr);
          invoiceTimestamp = isNaN(parsed.getTime()) ? new Date() : parsed;
        } catch {
          invoiceTimestamp = new Date();
        }

        const [invoiceRecord] = await tx
          .insert(invoices)
          .values({
            shopId: targetShopId,
            organizationId,
            customerId: cust.id,
            invoiceNumber: invNum,
            subtotal: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            discountPercent: subtotal > 0 ? ((discount / subtotal) * 100).toFixed(2) : "0.00",
            tax: tax.toFixed(2),
            taxPercent: subtotal > 0 ? ((tax / subtotal) * 100).toFixed(2) : "0.00",
            total: total.toFixed(2),
            status: invStatus,
            paymentMethod: grp.paymentMethod,
            fulfillmentStatus: grp.fulfillmentStatus,
            amountPaid: finalAmountPaid.toFixed(2),
            creditApplied: "0.00",
            balanceDue: balanceDue.toFixed(2),
            notes: grp.notes || "Imported via CSV Bulk Invoice Ingestion",
            soldBy: grp.soldBy,
            createdAt: invoiceTimestamp,
            updatedAt: invoiceTimestamp,
          })
          .returning();

        invoicesCreated++;
        totalRevenueImported += total;

        // Insert Line Items
        for (const item of grp.items) {
          const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
          const lineTotal = Number(item.totalAmount) || 0;
          const lineUnitPrice = Number(item.unitPrice) > 0 ? Number(item.unitPrice) : lineTotal / qty;
          const disc = Number(item.discountAmount) || 0;
          const taxPct = Number(item.taxPercent) || 0;
          const lineTax = Number(item.taxAmount) || 0;

          await tx.insert(invoiceItems).values({
            invoiceId: invoiceRecord.id,
            shopId: targetShopId,
            organizationId,
            description: item.itemDescription.trim(),
            quantity: qty,
            unitPrice: lineUnitPrice.toFixed(2),
            subtotal: (lineUnitPrice * qty).toFixed(2),
            discountPercent: "0.00",
            discountAmount: disc.toFixed(2),
            cgstPercent: (taxPct / 2).toFixed(2),
            cgstAmount: (lineTax / 2).toFixed(2),
            sgstPercent: (taxPct / 2).toFixed(2),
            sgstAmount: (lineTax / 2).toFixed(2),
            igstPercent: "0.00",
            igstAmount: "0.00",
            createdAt: invoiceTimestamp,
          });
          totalItemsCreated++;
        }

        // Create Payment Receipt if amountPaid > 0
        let receiptId: string | null = null;
        if (finalAmountPaid > 0) {
          const receiptNumber = await generateReceiptNumber(targetShopId, tx);
          const [receiptRecord] = await tx
            .insert(receipts)
            .values({
              shopId: targetShopId,
              organizationId,
              invoiceId: invoiceRecord.id,
              receiptNumber,
              amountPaid: finalAmountPaid.toFixed(2),
              balanceDue: balanceDue.toFixed(2),
              paymentMethod: grp.paymentMethod,
              createdAt: invoiceTimestamp,
              updatedAt: invoiceTimestamp,
            })
            .returning();
          receiptId = receiptRecord.id;
        }

        // Create Order linking invoice and customer
        const orderNumber = await generateOrderNumber(targetShopId, tx, invNum);
        await tx.insert(orders).values({
          shopId: targetShopId,
          organizationId,
          customerId: cust.id,
          invoiceId: invoiceRecord.id,
          receiptId,
          orderNumber,
          createdAt: invoiceTimestamp,
          updatedAt: invoiceTimestamp,
        });
      }

      return {
        invoicesCreated,
        totalItemsCreated,
        newCustomersCreated,
        existingCustomersCount: customerMap.size - newCustomersCreated,
        totalRevenueImported,
        firstInvoiceNumber,
        lastInvoiceNumber,
      };
    });

    revalidatePath("/shop/orders");
    revalidatePath("/shop/customers");
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/analytics");
    revalidatePath("/shop/invoices");

    return {
      success: true,
      message: `Successfully imported ${result.invoicesCreated} invoices (${result.totalItemsCreated} items) totaling ₹${result.totalRevenueImported.toFixed(2)}. Auto-registered ${result.newCustomersCreated} new patients and mapped ${result.existingCustomersCount} existing profiles.`,
      invoicesCount: result.invoicesCreated,
      itemsCount: result.totalItemsCreated,
      newCustomersCount: result.newCustomersCreated,
      existingCustomersCount: result.existingCustomersCount,
      totalRevenue: result.totalRevenueImported,
      firstInvoiceNum: result.firstInvoiceNumber,
      lastInvoiceNum: result.lastInvoiceNumber,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error("[bulkImportInvoicesAction] Error:", error);
    return {
      success: false,
      message: error?.message || "Failed to batch import invoices from CSV.",
    };
  }
}
