import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import {
  customers,
  prescriptions,
  invoices,
  invoiceItems,
  orders,
  receipts,
  profiles,
} from "@/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { patientVisitSchema } from "@/utils/validators";
import { generateRegistrationId } from "@/services/customer.service";
import { generateInvoiceNumber } from "@/services/invoice.service";
import { generateReceiptNumber, generateOrderNumber } from "@/services/receipt.service";
import { decrementInventoryStock } from "@/services/inventory.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shopId, invoices: rawInvoices } = body;

    // Safety: ensure shopId matches user.shopId (or owner)
    const isOwner = user.role === "OWNER";
    const effectiveShopId = isOwner && shopId ? shopId : (user.shopId || shopId);
    if (!effectiveShopId) {
      return NextResponse.json(
        { error: "No active shop outlet associated with your session." },
        { status: 400 }
      );
    }
    const organizationId = user.organizationId;

    if (!Array.isArray(rawInvoices) || rawInvoices.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = [];

    for (const item of rawInvoices) {
      const { offlineQueueId, offlineInvoiceNumber, payload, createdAt: offlineCreatedAt } = item;

      if (!offlineQueueId) {
        results.push({
          offlineQueueId: offlineQueueId || "unknown",
          success: false,
          error: "Missing offlineQueueId",
        });
        continue;
      }

      try {
        // 1. Idempotency check: Look for existing invoice with this offlineQueueId
        const queueMarker = `[OFFLINE_QUEUE_ID:${offlineQueueId}]`;
        const [existingInvoice] = await db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.shopId, effectiveShopId),
              ilike(invoices.specialInstructions, `%${queueMarker}%`)
            )
          )
          .limit(1);

        if (existingInvoice) {
          results.push({
            offlineQueueId,
            success: true,
            serverInvoiceId: existingInvoice.id,
            serverInvoiceNumber: existingInvoice.invoiceNumber,
          });
          continue;
        }

        // 2. Validate payload using patientVisitSchema
        const validation = patientVisitSchema.safeParse(payload);
        if (!validation.success) {
          results.push({
            offlineQueueId,
            success: false,
            error: "Validation failed on payload",
          });
          continue;
        }

        const data = validation.data;

        // 3. Process inside database transaction
        const syncResult = await db.transaction(async (tx) => {
          let customerId = data.customer.id;

          // Resolve customer
          if (customerId) {
            const [existingCust] = await tx
              .select({ id: customers.id })
              .from(customers)
              .where(
                and(
                  eq(customers.id, customerId),
                  eq(customers.shopId, effectiveShopId)
                )
              )
              .limit(1);

            if (!existingCust) {
              customerId = undefined; // reset if ID not found in shop
            }
          }

          if (!customerId) {
            // Check by phone number in shop
            const [phoneCust] = await tx
              .select({ id: customers.id })
              .from(customers)
              .where(
                and(
                  eq(customers.shopId, effectiveShopId),
                  eq(customers.phone, data.customer.phone)
                )
              )
              .limit(1);

            if (phoneCust) {
              customerId = phoneCust.id;
            } else {
              // Create customer
              const registrationId = await generateRegistrationId(effectiveShopId);
              const [newCust] = await tx
                .insert(customers)
                .values({
                  shopId: effectiveShopId,
                  organizationId,
                  registrationId,
                  fullName: data.customer.fullName,
                  email: data.customer.email || null,
                  phone: data.customer.phone,
                  dateOfBirth: data.customer.dateOfBirth || null,
                  address: data.customer.address || null,
                  city: data.customer.city || null,
                  state: data.customer.state || null,
                  pincode: data.customer.pincode || null,
                  gender: (data.customer.gender as any) || null,
                  bloodGroup: (data.customer.bloodGroup as any) || null,
                  referredBy: data.customer.referredBy || null,
                  chiefComplaint: data.customer.chiefComplaint || null,
                  familyHistory: data.customer.familyHistory || null,
                  systemicIllness: data.customer.systemicIllness || null,
                  allergies: data.customer.allergies || null,
                  notes: data.customer.notes || null,
                })
                .returning();
              customerId = newCust.id;
            }
          }

          // Save Prescriptions if enabled
          if (data.prescriptionEnabled) {
            if (data.prescriptionType.distance && data.distancePrescription) {
              const dp = data.distancePrescription;
              await tx.insert(prescriptions).values({
                customerId: customerId!,
                shopId: effectiveShopId,
                organizationId,
                prescriptionType: "DISTANCE",
                rightSphere: dp.rightSphere || null,
                rightCylinder: dp.rightCylinder || null,
                rightAxis: dp.rightAxis || null,
                rightNv: dp.rightNv || null,
                rightAdd: dp.rightAdd || null,
                leftSphere: dp.leftSphere || null,
                leftCylinder: dp.leftCylinder || null,
                leftAxis: dp.leftAxis || null,
                leftNv: dp.leftNv || null,
                leftAdd: dp.leftAdd || null,
                doctorName: data.doctorName || null,
                notes: data.prescriptionNotes || null,
                prescribedAt: data.prescribedAt || null,
              });
            }

            if (data.prescriptionType.near && data.nearPrescription) {
              const np = data.nearPrescription;
              await tx.insert(prescriptions).values({
                customerId: customerId!,
                shopId: effectiveShopId,
                organizationId,
                prescriptionType: "NEAR",
                rightSphere: np.rightSphere || null,
                rightCylinder: np.rightCylinder || null,
                rightAxis: np.rightAxis || null,
                rightNv: np.rightNv || null,
                leftSphere: np.leftSphere || null,
                leftCylinder: np.leftCylinder || null,
                leftAxis: np.leftAxis || null,
                leftNv: np.leftNv || null,
                doctorName: data.doctorName || null,
                notes: data.prescriptionNotes || null,
                prescribedAt: data.prescribedAt || null,
              });
            }
          }

          // Generate official sequential invoice number
          const serverInvoiceNumber = await generateInvoiceNumber(effectiveShopId);

          // Calculate subtotal & tax
          let subtotal = 0;
          let totalTax = 0;
          let calculatedDiscount = 0;

          if (data.invoiceItems) {
            for (const item of data.invoiceItems) {
              subtotal += item.subtotal;
              calculatedDiscount += item.discountAmount || 0;
              totalTax += (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
            }
          }

          const taxableAmount = Math.max(0, subtotal - calculatedDiscount);
          const grandTotal = taxableAmount + totalTax;

          const amountPaid = typeof data.amountPaid === "number" ? data.amountPaid : grandTotal;
          const balanceDue = Math.max(0, grandTotal - amountPaid);
          const paymentStatus = balanceDue <= 0 ? "PAID" : "PENDING";

          // Calculate estimated delivery
          let deliveryDate = null;
          if (data.deliveryDays && data.deliveryDays > 0) {
            const d = new Date();
            d.setDate(d.getDate() + data.deliveryDays);
            deliveryDate = d.toISOString().split("T")[0];
          }

          const instructionsWithQueue = `${data.specialInstructions || ""} ${queueMarker} [TEMP_OFFLINE_NO:${offlineInvoiceNumber}]`.trim();

          const [invoice] = await tx
            .insert(invoices)
            .values({
              shopId: effectiveShopId,
              organizationId,
              customerId: customerId!,
              invoiceNumber: serverInvoiceNumber,
              subtotal: String(subtotal.toFixed(2)),
              discount: String(calculatedDiscount.toFixed(2)),
              discountPercent: String((data.discountPercent || 0).toFixed(2)),
              tax: String(totalTax.toFixed(2)),
              taxPercent: String((data.taxPercent || 0).toFixed(2)),
              total: String(grandTotal.toFixed(2)),
              status: paymentStatus,
              paymentMethod: (data.paymentMethod as any) || "CASH",
              amountPaid: String(amountPaid.toFixed(2)),
              creditApplied: "0.00",
              balanceDue: String(balanceDue.toFixed(2)),
              notes: data.notes || null,
              specialInstructions: instructionsWithQueue,
              soldBy: data.soldBy || null,
              estimatedDelivery: deliveryDate,
              createdAt: offlineCreatedAt ? new Date(offlineCreatedAt) : new Date(),
            })
            .returning();

          // Insert invoice items & decrement inventory
          if (data.invoiceItems && data.invoiceItems.length > 0) {
            for (const item of data.invoiceItems) {
              await tx.insert(invoiceItems).values({
                invoiceId: invoice.id,
                inventoryId: item.inventoryId || null,
                shopId: effectiveShopId,
                organizationId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: String(item.unitPrice.toFixed(2)),
                subtotal: String(item.subtotal.toFixed(2)),
                discountPercent: String((item.discountPercent || 0).toFixed(2)),
                discountAmount: String((item.discountAmount || 0).toFixed(2)),
                cgstPercent: String((item.cgstPercent || 0).toFixed(2)),
                cgstAmount: String((item.cgstAmount || 0).toFixed(2)),
                sgstPercent: String((item.sgstPercent || 0).toFixed(2)),
                sgstAmount: String((item.sgstAmount || 0).toFixed(2)),
                igstPercent: String((item.igstPercent || 0).toFixed(2)),
                igstAmount: String((item.igstAmount || 0).toFixed(2)),
              });

              if (item.inventoryId && item.quantity > 0) {
                await decrementInventoryStock(
                  item.inventoryId,
                  organizationId,
                  item.quantity,
                  tx,
                  "SALE",
                  serverInvoiceNumber
                );
              }
            }
          }

          // Generate Order Record
          const orderNumber = await generateOrderNumber(effectiveShopId, tx);
          await tx.insert(orders).values({
            shopId: effectiveShopId,
            organizationId,
            customerId: customerId!,
            invoiceId: invoice.id,
            orderNumber,
          });

          // Generate Receipt if payment was collected
          if (amountPaid > 0) {
            const receiptNumber = await generateReceiptNumber(effectiveShopId, tx);
            await tx.insert(receipts).values({
              shopId: effectiveShopId,
              organizationId,
              invoiceId: invoice.id,
              receiptNumber,
              amountPaid: String(amountPaid.toFixed(2)),
              balanceDue: String(balanceDue.toFixed(2)),
              paymentMethod: (data.paymentMethod as any) || "CASH",
            });
          }

          return {
            serverInvoiceId: invoice.id,
            serverInvoiceNumber: invoice.invoiceNumber,
          };
        });

        results.push({
          offlineQueueId,
          success: true,
          serverInvoiceId: syncResult.serverInvoiceId,
          serverInvoiceNumber: syncResult.serverInvoiceNumber,
        });
      } catch (invoiceErr: any) {
        console.error(`[Sync] Failed to process invoice ${offlineQueueId}:`, invoiceErr);
        results.push({
          offlineQueueId,
          success: false,
          error: invoiceErr.message || "Database sync failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("[Sync] Top-level sync route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process offline sync" },
      { status: 500 }
    );
  }
}
