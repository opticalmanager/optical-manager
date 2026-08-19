"use server";

import { db } from "@/lib/drizzle";
import {
  salesReturns,
  salesReturnItems,
  invoices,
  invoiceItems,
  inventory,
  stockMovements,
} from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/services/auth.service";
import { generateReturnNumber } from "@/services/return.service";
import { revalidatePath } from "next/cache";

export interface ReturnItemPayload {
  invoiceItemId: string;
  inventoryId?: string | null;
  description: string;
  quantityReturned: number;
  unitPrice: number;
  refundAmount: number;
  inspectionReason:
    | "LOOKS_NEW"
    | "MINOR_WEAR"
    | "DAMAGED"
    | "WRONG_PRODUCT"
    | "MANUFACTURING_DEFECT"
    | "WARRANTY_CLAIM";
  finalAction:
    | "RESTOCK_INVENTORY"
    | "REPAIR_AT_STORE"
    | "SEND_TO_VENDOR"
    | "SCRAP_DAMAGE"
    | "HOLD_FOR_INSPECTION";
}

export interface SubmitReturnPayload {
  invoiceId: string;
  returnType: "SELECTED_PRODUCTS" | "ENTIRE_INVOICE";
  items: ReturnItemPayload[];
  notes?: string;
  isDraft?: boolean;
}

export async function submitReturnAction(payload: SubmitReturnPayload) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId || !user.shopId) {
      return { success: false, error: "Unauthorized session. Please log in." };
    }

    const organizationId: string = user.organizationId;
    const shopId: string = user.shopId;
    const userId: string = user.id;

    if (!payload.invoiceId) {
      return { success: false, error: "Invoice is required to process return." };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: "Please select at least one item to return." };
    }

    // Run within a transactional context for atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Fetch and lock invoice
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, payload.invoiceId),
            eq(invoices.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new Error("Invoice not found or access denied.");
      }

      if (invoice.status === "CANCELLED") {
        throw new Error("Cannot return items from a cancelled invoice.");
      }

      // 2. Fetch original invoice items to validate quantities
      const dbInvoiceItems = await tx
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, payload.invoiceId));

      // 3. Fetch previous returns on this invoice
      const prevReturns = await tx
        .select({
          invoiceItemId: salesReturnItems.invoiceItemId,
          quantityReturned: salesReturnItems.quantityReturned,
        })
        .from(salesReturnItems)
        .innerJoin(salesReturns, eq(salesReturnItems.returnId, salesReturns.id))
        .where(
          and(
            eq(salesReturns.invoiceId, payload.invoiceId),
            eq(salesReturns.status, "COMPLETED")
          )
        );

      const returnedMap: Record<string, number> = {};
      prevReturns.forEach((pr) => {
        returnedMap[pr.invoiceItemId] =
          (returnedMap[pr.invoiceItemId] || 0) + pr.quantityReturned;
      });

      // 4. Validate return item quantities
      let totalRefund = 0;
      for (const item of payload.items) {
        const originalItem = dbInvoiceItems.find((oi) => oi.id === item.invoiceItemId);
        if (!originalItem) {
          throw new Error(`Item ${item.description} is not part of this invoice.`);
        }

        const alreadyReturned = returnedMap[item.invoiceItemId] || 0;
        const maxReturnable = originalItem.quantity - alreadyReturned;

        if (item.quantityReturned <= 0) {
          throw new Error(`Quantity returned for ${item.description} must be at least 1.`);
        }

        if (item.quantityReturned > maxReturnable) {
          throw new Error(
            `Cannot return ${item.quantityReturned} units of ${item.description}. Max returnable quantity is ${maxReturnable}.`
          );
        }

        totalRefund += item.refundAmount;
      }

      // 5. Generate sequential return number
      const returnNumber = await generateReturnNumber(shopId);
      const isDraft = payload.isDraft === true;
      const returnStatus = isDraft ? "DRAFT" : "COMPLETED";

      // 6. Insert sales_returns record
      const [newReturn] = await tx
        .insert(salesReturns)
        .values({
          shopId,
          organizationId,
          invoiceId: payload.invoiceId,
          customerId: invoice.customerId,
          returnNumber,
          returnType: payload.returnType,
          status: returnStatus,
          totalRefundAmount: totalRefund.toFixed(2),
          notes: payload.notes || null,
          processedBy: userId,
        })
        .returning();

      // 7. Insert return items and handle inventory & stock movements
      for (const item of payload.items) {
        await tx.insert(salesReturnItems).values({
          returnId: newReturn.id,
          invoiceItemId: item.invoiceItemId,
          inventoryId: item.inventoryId || null,
          shopId,
          organizationId,
          description: item.description,
          quantityReturned: item.quantityReturned,
          unitPrice: item.unitPrice.toFixed(2),
          refundAmount: item.refundAmount.toFixed(2),
          inspectionReason: item.inspectionReason,
          finalAction: item.finalAction,
        });

        // Only adjust inventory and log movements if NOT a draft
        if (!isDraft && item.inventoryId) {
          if (item.finalAction === "RESTOCK_INVENTORY") {
            // Increment inventory stock
            const [updatedInv] = await tx
              .update(inventory)
              .set({
                quantity: sql`${inventory.quantity} + ${item.quantityReturned}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(inventory.id, item.inventoryId),
                  eq(inventory.organizationId, organizationId)
                )
              )
              .returning();

            // Record stock movement
            if (updatedInv) {
              await tx.insert(stockMovements).values({
                inventoryId: updatedInv.id,
                shopId,
                organizationId,
                movementType: "RETURN",
                quantityChange: item.quantityReturned,
                balanceAfter: updatedInv.quantity,
                referenceType: "SALES_RETURN",
                referenceNumber: returnNumber,
                vendorParty: "Customer Return",
                costPriceAtTime: updatedInv.costPrice || "0.00",
                notes: `Restocked ${item.quantityReturned} unit(s) via return ${returnNumber} (${item.inspectionReason})`,
                performedBy: userId,
              });
            }
          } else {
            // Non-restock action (Scrap / Repair / Vendor / Hold) - record audit movement
            const [curInv] = await tx
              .select({ quantity: inventory.quantity, costPrice: inventory.costPrice })
              .from(inventory)
              .where(eq(inventory.id, item.inventoryId))
              .limit(1);

            if (curInv) {
              await tx.insert(stockMovements).values({
                inventoryId: item.inventoryId,
                shopId,
                organizationId,
                movementType: "RETURN",
                quantityChange: 0, // Not added to salable stock
                balanceAfter: curInv.quantity,
                referenceType: "SALES_RETURN_NON_RESTOCK",
                referenceNumber: returnNumber,
                vendorParty: "Customer Return",
                costPriceAtTime: curInv.costPrice || "0.00",
                notes: `Action: ${item.finalAction} | Reason: ${item.inspectionReason} (Not added to salable inventory)`,
                performedBy: userId,
              });
            }
          }
        }
      }

      // 8. If completed, adjust invoice financials
      if (!isDraft) {
        const currentTotal = parseFloat(invoice.total || "0");
        const currentAmountPaid = parseFloat(invoice.amountPaid || "0");
        const newTotal = Math.max(0, currentTotal - totalRefund);
        const newBalanceDue = Math.max(0, newTotal - currentAmountPaid);

        await tx
          .update(invoices)
          .set({
            total: newTotal.toFixed(2),
            balanceDue: newBalanceDue.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoice.id));
      }

      return {
        success: true,
        returnId: newReturn.id,
        returnNumber: newReturn.returnNumber,
        isDraft,
      };
    });

    revalidatePath("/shop/returns");
    revalidatePath("/shop/orders");
    revalidatePath("/shop/invoices");
    revalidatePath("/shop/inventory");

    return result;
  } catch (error: any) {
    console.error("Error submitting return:", error);
    return { success: false, error: error.message || "Failed to process return." };
  }
}

export async function cancelReturnDraftAction(returnId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized." };
    }

    const organizationId: string = user.organizationId;

    const [ret] = await db
      .select()
      .from(salesReturns)
      .where(
        and(
          eq(salesReturns.id, returnId),
          eq(salesReturns.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!ret) {
      return { success: false, error: "Return record not found." };
    }

    if (ret.status !== "DRAFT") {
      return { success: false, error: "Only draft returns can be cancelled." };
    }

    await db
      .update(salesReturns)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(eq(salesReturns.id, returnId));

    revalidatePath("/shop/returns");
    return { success: true };
  } catch (error: any) {
    console.error("Error cancelling return draft:", error);
    return { success: false, error: error.message || "Failed to cancel draft." };
  }
}

