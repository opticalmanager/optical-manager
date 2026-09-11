import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import {
  customers,
  appointments,
  profiles,
  invoices,
  receipts,
  orders,
  inventory,
  frameDetails,
  lensDetails,
  contactLensDetails,
  accessoryDetails,
  prescriptions,
  salesReturns,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateRegistrationId } from "@/services/customer.service";
import { generateReceiptNumber } from "@/services/receipt.service";
import { getNextSkuSequence } from "@/services/sku.service";
import { generateSKU } from "@/lib/utils";
import { recordStockMovement } from "@/services/inventory.service";
import { submitReturnAction } from "@/actions/return.actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shopId, mutations } = body;

    const isOwner = user.role === "OWNER";
    const effectiveShopId = isOwner && shopId ? shopId : (user.shopId || shopId);
    if (!effectiveShopId) {
      return NextResponse.json(
        { error: "No active shop outlet associated with your session." },
        { status: 400 }
      );
    }
    const organizationId = user.organizationId;

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = [];

    for (const mutation of mutations) {
      const { id, type, payload } = mutation;

      try {
        if (type === "PATIENT_CREATE") {
          // Check if customer with phone already exists in this shop
          const [existingCust] = await db
            .select({ id: customers.id, registrationId: customers.registrationId })
            .from(customers)
            .where(
              and(
                eq(customers.shopId, effectiveShopId),
                eq(customers.phone, payload.customer?.phone || payload.phone)
              )
            )
            .limit(1);

          if (existingCust) {
            results.push({
              id,
              type,
              success: true,
              serverResultId: existingCust.id,
              registrationId: existingCust.registrationId,
            });
            continue;
          }

          const registrationId = await generateRegistrationId(effectiveShopId);
          const c = payload.customer || payload;
          const [newCust] = await db
            .insert(customers)
            .values({
              shopId: effectiveShopId,
              organizationId,
              registrationId,
              fullName: c.fullName || "Patient",
              email: c.email || null,
              phone: c.phone,
              dateOfBirth: c.dateOfBirth || null,
              gender: c.gender || null,
              bloodGroup: c.bloodGroup || null,
              referredBy: c.referredBy || null,
              address: c.address || null,
              city: c.city || null,
              state: c.state || null,
              pincode: c.pincode || null,
            })
            .returning();

          results.push({
            id,
            type,
            success: true,
            serverResultId: newCust.id,
            registrationId: newCust.registrationId,
          });
        } else if (type === "APPOINTMENT_CREATE") {
          const visitDate = payload.visitTime ? new Date(payload.visitTime) : new Date();

          const [newApp] = await db
            .insert(appointments)
            .values({
              shopId: effectiveShopId,
              organizationId,
              customerName: payload.customerName || "Walk-in Patient",
              customerPhone: payload.customerPhone || "N/A",
              visitTime: isNaN(visitDate.getTime()) ? new Date() : visitDate,
              purposeOfVisit: payload.purposeOfVisit || "Routine Eye Exam",
              additionalNotes: payload.additionalNotes || null,
              status: "CONFIRMED",
            })
            .returning();

          results.push({
            id,
            type,
            success: true,
            serverResultId: newApp.id,
          });
        } else if (type === "APPOINTMENT_STATUS") {
          if (payload.appointmentId && !payload.appointmentId.startsWith("off-")) {
            await db
              .update(appointments)
              .set({
                status: payload.status,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(appointments.id, payload.appointmentId),
                  eq(appointments.shopId, effectiveShopId)
                )
              );
          }
          results.push({
            id,
            type,
            success: true,
          });
        } else if (type === "ORDER_STATUS_UPDATE") {
          const { invoiceId, fulfillmentStatus, estimatedDelivery } = payload;
          if (invoiceId && !invoiceId.startsWith("off-")) {
            await db
              .update(invoices)
              .set({
                fulfillmentStatus,
                estimatedDelivery: estimatedDelivery || null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(invoices.id, invoiceId),
                  eq(invoices.organizationId, organizationId)
                )
              );
          }
          results.push({ id, type, success: true });
        } else if (type === "ORDER_PAYMENT_RECORD") {
          const { invoiceId, amountPaid, paymentMethod, transactionId } = payload;
          if (invoiceId && !invoiceId.startsWith("off-")) {
            const [invoice] = await db
              .select()
              .from(invoices)
              .where(
                and(
                  eq(invoices.id, invoiceId),
                  eq(invoices.organizationId, organizationId)
                )
              )
              .limit(1);

            if (invoice) {
              const currentBalance = parseFloat(invoice.balanceDue);
              const payMethod = paymentMethod || invoice.paymentMethod || "CASH";
              const currentPaid = parseFloat(invoice.amountPaid || "0");
              const newAmountPaid = currentPaid + amountPaid;
              const newBalanceDue = Math.max(0, currentBalance - amountPaid);
              const newStatus = newBalanceDue <= 0 ? "PAID" : "PENDING";

              await db.transaction(async (tx) => {
                await tx
                  .update(invoices)
                  .set({
                    status: newStatus as any,
                    amountPaid: newAmountPaid.toFixed(2),
                    balanceDue: newBalanceDue.toFixed(2),
                    paymentMethod: payMethod,
                    updatedAt: new Date(),
                  })
                  .where(eq(invoices.id, invoiceId));

                const receiptNumber = await generateReceiptNumber(invoice.shopId, tx);
                const [receipt] = await tx
                  .insert(receipts)
                  .values({
                    shopId: invoice.shopId,
                    organizationId,
                    invoiceId: invoice.id,
                    receiptNumber,
                    amountPaid: amountPaid.toFixed(2),
                    balanceDue: newBalanceDue.toFixed(2),
                    paymentMethod: payMethod,
                    transactionId: transactionId || null,
                  })
                  .returning();

                await tx
                  .update(orders)
                  .set({ receiptId: receipt.id, updatedAt: new Date() })
                  .where(eq(orders.invoiceId, invoiceId));
              });
            }
          }
          results.push({ id, type, success: true });
        } else if (type === "ORDER_SETTLE_DUES") {
          const { invoiceId, amountReceived, discountAmount, paymentMethod, transactionId } = payload;
          if (invoiceId && !invoiceId.startsWith("off-")) {
            const [invoice] = await db
              .select()
              .from(invoices)
              .where(
                and(
                  eq(invoices.id, invoiceId),
                  eq(invoices.organizationId, organizationId)
                )
              )
              .limit(1);

            if (invoice) {
              const currentBalance = parseFloat(invoice.balanceDue);
              const amountRec = Math.max(0, amountReceived || 0);
              const discAmt = Math.max(0, discountAmount || 0);
              const payMethod = paymentMethod || invoice.paymentMethod || "CASH";
              const currentPaid = parseFloat(invoice.amountPaid || "0");
              const currentDiscount = parseFloat(invoice.discount || "0");
              const currentTotal = parseFloat(invoice.total || "0");

              const newDiscount = currentDiscount + discAmt;
              const newTotal = Math.max(0, currentTotal - discAmt);
              const newAmountPaid = currentPaid + amountRec;

              await db.transaction(async (tx) => {
                await tx
                  .update(invoices)
                  .set({
                    status: "PAID",
                    discount: newDiscount.toFixed(2),
                    total: newTotal.toFixed(2),
                    amountPaid: newAmountPaid.toFixed(2),
                    balanceDue: "0.00",
                    paymentMethod: payMethod,
                    updatedAt: new Date(),
                  })
                  .where(eq(invoices.id, invoiceId));

                const receiptNumber = await generateReceiptNumber(invoice.shopId, tx);
                const [receipt] = await tx
                  .insert(receipts)
                  .values({
                    shopId: invoice.shopId,
                    organizationId,
                    invoiceId: invoice.id,
                    receiptNumber,
                    amountPaid: amountRec.toFixed(2),
                    balanceDue: "0.00",
                    paymentMethod: payMethod,
                    transactionId: transactionId || null,
                  })
                  .returning();

                await tx
                  .update(orders)
                  .set({ receiptId: receipt.id, updatedAt: new Date() })
                  .where(eq(orders.invoiceId, invoiceId));
              });
            }
          }
          results.push({ id, type, success: true });
        } else if (type === "INVENTORY_CREATE") {
          const cat = payload.category || "FRAME";
          const brand = payload.brand || null;
          const modelNumber = payload.modelNumber || null;

          let skuCode = payload.sku;
          try {
            const seq = await getNextSkuSequence(effectiveShopId);
            skuCode = generateSKU({
              category: cat,
              brand: brand,
              modelNumber: modelNumber,
              sequentialNumber: seq,
            });
          } catch (e) {
            // Keep client SKU if error
          }

          let createdInvId = "";

          await db.transaction(async (tx) => {
            const [newInv] = await tx
              .insert(inventory)
              .values({
                shopId: effectiveShopId,
                organizationId,
                name: payload.name,
                category: cat,
                brand: brand,
                model: modelNumber,
                sku: skuCode,
                price: (payload.price || 0).toString(),
                costPrice: (payload.costPrice || 0).toString(),
                quantity: payload.quantity || 0,
                minQuantity: payload.minQuantity || 5,
                isActive: true,
                cgstPercent: (payload.cgstPercent || 6).toString(),
                sgstPercent: (payload.sgstPercent || 6).toString(),
                igstPercent: (payload.igstPercent || 12).toString(),
                requiresExpiryTracking: Boolean(payload.requiresExpiryTracking),
              })
              .returning();

            createdInvId = newInv.id;

            if (cat === "FRAME") {
              await tx.insert(frameDetails).values({
                inventoryId: newInv.id,
                modelNumber: modelNumber,
                colorCode: payload.colorCode || null,
                size: payload.size || null,
                material: payload.material || null,
                frameShape: payload.frameShape || null,
                targetDemographic: payload.targetDemographic || null,
              });
            } else if (cat === "LENS") {
              await tx.insert(lensDetails).values({
                inventoryId: newInv.id,
                design: payload.design || payload.lensType || null,
                material: payload.material || null,
                refractiveIndex: payload.refractiveIndex || null,
                blankDiameter: payload.blankDiameter || null,
                stockPower: payload.stockPower || null,
              });
            } else if (cat === "CONTACT_LENS") {
              await tx.insert(contactLensDetails).values({
                inventoryId: newInv.id,
                modality: payload.modality || payload.disposability || null,
                boxQuantity: payload.boxQuantity || payload.packSize || null,
                baseCurve: payload.baseCurve || null,
                diameter: payload.diameter || null,
                color: payload.color || null,
                sphere: payload.sphere || null,
              });
            } else if (cat === "ACCESSORY" || cat === "SOLUTION") {
              await tx.insert(accessoryDetails).values({
                inventoryId: newInv.id,
                type: payload.type || payload.accessoryType || "General",
                sizeVolume: payload.sizeVolume || null,
                colorPattern: payload.colorPattern || null,
              });
            }

            if ((payload.quantity || 0) > 0) {
              await recordStockMovement(
                {
                  inventoryId: newInv.id,
                  shopId: effectiveShopId,
                  organizationId,
                  movementType: "INITIAL",
                  quantityChange: payload.quantity,
                  balanceAfter: payload.quantity,
                  referenceType: "INITIAL_STOCK",
                  referenceNumber: "Offline Ingest",
                  vendorParty: null,
                  costPriceAtTime: (payload.costPrice || 0).toString(),
                  notes: "Cataloged via offline sync",
                  performedBy: user.id,
                },
                tx
              );
            }
          });

          results.push({
            id,
            type,
            success: true,
            serverResultId: createdInvId,
            sku: skuCode,
          });
        } else if (type === "STOCK_ADJUST") {
          const { inventoryId, quantityChange, movementType, notes } = payload;
          if (inventoryId && !inventoryId.startsWith("off-")) {
            const [item] = await db
              .select()
              .from(inventory)
              .where(
                and(
                  eq(inventory.id, inventoryId),
                  eq(inventory.shopId, effectiveShopId)
                )
              )
              .limit(1);

            if (item) {
              const newQty = Math.max(0, item.quantity + (quantityChange || 0));
              await db.transaction(async (tx) => {
                await tx
                  .update(inventory)
                  .set({ quantity: newQty, updatedAt: new Date() })
                  .where(eq(inventory.id, inventoryId));

                await recordStockMovement(
                  {
                    inventoryId,
                    shopId: effectiveShopId,
                    organizationId,
                    movementType: movementType || "ADJUSTMENT",
                    quantityChange: quantityChange || 0,
                    balanceAfter: newQty,
                    referenceType: "STOCK_ADJUSTMENT",
                    referenceNumber: `ADJ-${Date.now()}`,
                    costPriceAtTime: item.costPrice || "0.00",
                    notes: notes || "Offline stock adjustment",
                    performedBy: user.id,
                  },
                  tx
                );
              });
            }
          }
          results.push({ id, type, success: true });
        } else if (type === "PATIENT_UPDATE") {
          const targetId = payload.patientId || payload.customerId;
          const patientData = payload.data || payload;
          if (targetId && !targetId.startsWith("pat_off_")) {
            const cust = patientData.customer || patientData;
            await db
              .update(customers)
              .set({
                fullName: cust.fullName,
                email: cust.email || null,
                phone: cust.phone,
                dateOfBirth: cust.dateOfBirth || null,
                address: cust.address || null,
                city: cust.city || null,
                state: cust.state || null,
                pincode: cust.pincode || null,
                gender: cust.gender || null,
                bloodGroup: cust.bloodGroup || null,
                referredBy: cust.referredBy || null,
                chiefComplaint: cust.chiefComplaint || null,
                familyHistory: cust.familyHistory || null,
                systemicIllness: cust.systemicIllness || null,
                allergies: cust.allergies || null,
                notes: cust.notes || null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(customers.id, targetId),
                  eq(customers.organizationId, organizationId)
                )
              );
          }
          results.push({ id, type, success: true });
        } else if (type === "INVENTORY_UPDATE") {
          const { itemId, name, brand, model, price, costPrice, minQuantity } = payload;
          if (itemId && !itemId.startsWith("off-") && !itemId.startsWith("inv-")) {
            const updateFields: any = { updatedAt: new Date() };
            if (name !== undefined) updateFields.name = name;
            if (brand !== undefined) updateFields.brand = brand || null;
            if (model !== undefined) updateFields.model = model || null;
            if (price !== undefined) updateFields.price = Number(price).toFixed(2);
            if (costPrice !== undefined) updateFields.costPrice = Number(costPrice).toFixed(2);
            if (minQuantity !== undefined) updateFields.minQuantity = Math.max(0, Math.floor(Number(minQuantity)));

            await db
              .update(inventory)
              .set(updateFields)
              .where(
                and(
                  eq(inventory.id, itemId),
                  eq(inventory.organizationId, organizationId)
                )
              );
          }
          results.push({ id, type, success: true });
        } else if (type === "PRESCRIPTION_CREATE") {
          const {
            customerId,
            distanceEnabled,
            nearEnabled,
            distancePrescription,
            nearPrescription,
            doctorName,
            prescribedAt,
            prescriptionNotes,
            partyName,
            frameName,
          } = payload;

          if (customerId) {
            const pDate = prescribedAt || new Date().toISOString().split("T")[0];
            let createdRxId = "";

            await db.transaction(async (tx) => {
              if (distanceEnabled && distancePrescription) {
                const dp = distancePrescription;
                const [dRx] = await tx
                  .insert(prescriptions)
                  .values({
                    customerId,
                    shopId: effectiveShopId,
                    organizationId,
                    prescriptionType: "DISTANCE",
                    rightSphere: dp.rightSphere || null,
                    rightCylinder: dp.rightCylinder || null,
                    rightAxis: dp.rightAxis || null,
                    rightAdd: dp.rightAdd || null,
                    rightNv: dp.rightNv || null,
                    leftSphere: dp.leftSphere || null,
                    leftCylinder: dp.leftCylinder || null,
                    leftAxis: dp.leftAxis || null,
                    leftAdd: dp.leftAdd || null,
                    leftNv: dp.leftNv || null,
                    pd: dp.pd || null,
                    doctorName: doctorName || null,
                    partyName: partyName || null,
                    frameName: frameName || null,
                    notes: prescriptionNotes || null,
                    prescribedAt: pDate,
                  })
                  .returning();
                createdRxId = dRx.id;
              }

              if (nearEnabled && nearPrescription) {
                const np = nearPrescription;
                const [nRx] = await tx
                  .insert(prescriptions)
                  .values({
                    customerId,
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
                    pd: np.pd || null,
                    doctorName: doctorName || null,
                    partyName: partyName || null,
                    frameName: frameName || null,
                    notes: prescriptionNotes || null,
                    prescribedAt: pDate,
                  })
                  .returning();
                if (!createdRxId) createdRxId = nRx.id;
              }
            });

            results.push({
              id,
              type,
              success: true,
              serverResultId: createdRxId,
            });
          } else {
            results.push({ id, type, success: false, error: "Missing customerId" });
          }
        } else if (type === "RETURN_CREATE") {
          if (payload.returnNumber) {
            const [existing] = await db
              .select({ id: salesReturns.id, returnNumber: salesReturns.returnNumber })
              .from(salesReturns)
              .where(
                and(
                  eq(salesReturns.shopId, effectiveShopId),
                  eq(salesReturns.returnNumber, payload.returnNumber)
                )
              )
              .limit(1);

            if (existing) {
              results.push({
                id,
                type,
                success: true,
                serverResultId: existing.id,
                returnNumber: existing.returnNumber,
              });
              continue;
            }
          }

          const retRes = await submitReturnAction({
            invoiceId: payload.invoiceId,
            returnType: payload.returnType || "SELECTED_PRODUCTS",
            refundMethod: payload.refundMethod || "STORE_CREDIT",
            customRefundAmount:
              typeof payload.customRefundAmount === "string"
                ? parseFloat(payload.customRefundAmount)
                : payload.customRefundAmount || parseFloat(payload.totalRefundAmount || "0"),
            items: (payload.items || []).map((it: any) => ({
              invoiceItemId: it.invoiceItemId,
              inventoryId: it.inventoryId || null,
              description: it.description,
              quantityReturned: Number(it.quantityReturned),
              unitPrice: Number(it.unitPrice),
              refundAmount: Number(it.refundAmount),
              inspectionReason: it.inspectionReason || "LOOKS_NEW",
              finalAction: it.finalAction || "RESTOCK_INVENTORY",
            })),
            notes: payload.notes,
            isDraft: Boolean(payload.isDraft),
          });

          if (retRes.success && "returnNumber" in retRes) {
            results.push({
              id,
              type,
              success: true,
              serverResultId: retRes.returnId,
              returnNumber: retRes.returnNumber,
            });
          } else {
            results.push({
              id,
              type,
              success: false,
              error: (retRes as any).error || "Failed to process return sync",
            });
          }
        } else {
          results.push({
            id,
            type,
            success: false,
            error: `Unknown mutation type: ${type}`,
          });
        }
      } catch (err: any) {
        console.error(`[SyncMutations] Failed mutation ${id}:`, err);
        results.push({
          id,
          type,
          success: false,
          error: err.message || "Mutation execution failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("[SyncMutations] Route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process offline mutations" },
      { status: 500 }
    );
  }
}
