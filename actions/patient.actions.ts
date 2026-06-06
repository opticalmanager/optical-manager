"use server";

import { db } from "@/lib/drizzle";
import { eq, and, sql } from "drizzle-orm";
import { customers, prescriptions, invoices, invoiceItems } from "@/db/schema";
import { getCurrentUser } from "@/services/auth.service";
import { generateRegistrationId } from "@/services/customer.service";
import { decrementInventoryStock } from "@/services/inventory.service";
import { generateInvoiceNumber } from "@/services/invoice.service";
import { patientVisitSchema } from "@/utils/validators";
import { revalidatePath } from "next/cache";

export type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
  errors?: Record<string, string[]>;
};

/**
 * Server Action to register a patient (includes basic info + medical history + prescriptions).
 */
export async function registerPatientAction(
  rawData: unknown
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized. Please log in again." };
    }

    const shopId = user.shopId;
    if (!shopId) {
      return { success: false, message: "No active shop associated with your session." };
    }

    // Parse data
    const validation = patientVisitSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const data = validation.data;

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // 1. Generate sequential Registration ID
      const registrationId = await generateRegistrationId(shopId);

      // 2. Insert Customer
      const [customer] = await tx
        .insert(customers)
        .values({
          shopId,
          organizationId: user.organizationId,
          registrationId,
          fullName: data.customer.fullName,
          email: data.customer.email || null,
          phone: data.customer.phone,
          dateOfBirth: data.customer.dateOfBirth || null,
          address: data.customer.address || null,
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

      // 3. Save Prescriptions if enabled
      if (data.prescriptionEnabled) {
        // Distance prescription
        if (data.prescriptionType.distance && data.distancePrescription) {
          const dp = data.distancePrescription;
          await tx.insert(prescriptions).values({
            customerId: customer.id,
            shopId,
            organizationId: user.organizationId,
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
            pdRight: dp.pdRight || null,
            pdLeft: dp.pdLeft || null,
            pd: dp.pd || null,
            doctorName: data.doctorName || null,
            partyName: data.partyName || null,
            frameName: data.frameName || null,
            estimatedDelivery: data.estimatedDelivery || null,
            specialInstructions: data.specialInstructions || null,
            notes: data.prescriptionNotes || null,
            prescribedBy: data.doctorName || null,
            prescribedAt: new Date().toISOString().split("T")[0],
          });
        }

        // Near prescription
        if (data.prescriptionType.near && data.nearPrescription) {
          const np = data.nearPrescription;
          await tx.insert(prescriptions).values({
            customerId: customer.id,
            shopId,
            organizationId: user.organizationId,
            prescriptionType: "NEAR",
            rightSphere: np.rightSphere || null,
            rightCylinder: np.rightCylinder || null,
            rightAxis: np.rightAxis || null,
            rightAdd: np.rightAdd || null,
            rightNv: np.rightNv || null,
            leftSphere: np.leftSphere || null,
            leftCylinder: np.leftCylinder || null,
            leftAxis: np.leftAxis || null,
            leftAdd: np.leftAdd || null,
            leftNv: np.leftNv || null,
            pdRight: np.pdRight || null,
            pdLeft: np.pdLeft || null,
            pd: np.pd || null,
            doctorName: data.doctorName || null,
            partyName: data.partyName || null,
            frameName: data.frameName || null,
            estimatedDelivery: data.estimatedDelivery || null,
            specialInstructions: data.specialInstructions || null,
            notes: data.prescriptionNotes || null,
            prescribedBy: data.doctorName || null,
            prescribedAt: new Date().toISOString().split("T")[0],
          });
        }
      }

      return customer;
    });

    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/customers");

    return {
      success: true,
      message: "Patient registered successfully.",
      data: result,
    };
  } catch (error: any) {
    console.error("Error registering patient:", error);
    return {
      success: false,
      message: error.message || "An error occurred while registering patient.",
    };
  }
}

/**
 * Server Action to register patient AND generate invoice (atoms: customer + prescriptions + invoice + stock decrement).
 */
export async function registerPatientAndInvoiceAction(
  rawData: unknown
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized. Please log in again." };
    }

    const shopId = user.shopId;
    if (!shopId) {
      return { success: false, message: "No active shop associated with your session." };
    }

    // Parse data
    const validation = patientVisitSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const data = validation.data;
    if (!data.invoiceEnabled || !data.invoiceItems || data.invoiceItems.length === 0) {
      return {
        success: false,
        message: "Invoice billing information is required for this action.",
      };
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      let customerId = data.customer.id;
      let customerRecord: any;

      if (customerId) {
        // Upsert: Update existing Customer details
        const [updatedCustomer] = await tx
          .update(customers)
          .set({
            fullName: data.customer.fullName,
            email: data.customer.email || null,
            phone: data.customer.phone,
            dateOfBirth: data.customer.dateOfBirth || null,
            address: data.customer.address || null,
            gender: (data.customer.gender as any) || null,
            bloodGroup: (data.customer.bloodGroup as any) || null,
            referredBy: data.customer.referredBy || null,
            chiefComplaint: data.customer.chiefComplaint || null,
            familyHistory: data.customer.familyHistory || null,
            systemicIllness: data.customer.systemicIllness || null,
            allergies: data.customer.allergies || null,
            notes: data.customer.notes || null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(customers.id, customerId),
              eq(customers.organizationId, user.organizationId)
            )
          )
          .returning();

        if (!updatedCustomer) {
          throw new Error("Failed to update existing customer record.");
        }
        customerRecord = updatedCustomer;
      } else {
        // Insert: Generate sequential Registration ID and insert new Customer
        const registrationId = await generateRegistrationId(shopId);
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            shopId,
            organizationId: user.organizationId,
            registrationId,
            fullName: data.customer.fullName,
            email: data.customer.email || null,
            phone: data.customer.phone,
            dateOfBirth: data.customer.dateOfBirth || null,
            address: data.customer.address || null,
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
        customerRecord = newCustomer;
        customerId = newCustomer.id;
      }

      // 3. Save Prescriptions if enabled
      if (data.prescriptionEnabled) {
        if (data.prescriptionType.distance && data.distancePrescription) {
          const dp = data.distancePrescription;
          await tx.insert(prescriptions).values({
            customerId: customerRecord.id,
            shopId,
            organizationId: user.organizationId,
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
            pdRight: dp.pdRight || null,
            pdLeft: dp.pdLeft || null,
            pd: dp.pd || null,
            doctorName: data.doctorName || null,
            partyName: data.partyName || null,
            frameName: data.frameName || null,
            estimatedDelivery: data.estimatedDelivery || null,
            specialInstructions: data.specialInstructions || null,
            notes: data.prescriptionNotes || null,
            prescribedBy: data.doctorName || null,
            prescribedAt: new Date().toISOString().split("T")[0],
          });
        }

        if (data.prescriptionType.near && data.nearPrescription) {
          const np = data.nearPrescription;
          await tx.insert(prescriptions).values({
            customerId: customerRecord.id,
            shopId,
            organizationId: user.organizationId,
            prescriptionType: "NEAR",
            rightSphere: np.rightSphere || null,
            rightCylinder: np.rightCylinder || null,
            rightAxis: np.rightAxis || null,
            rightAdd: np.rightAdd || null,
            rightNv: np.rightNv || null,
            leftSphere: np.leftSphere || null,
            leftCylinder: np.leftCylinder || null,
            leftAxis: np.leftAxis || null,
            leftAdd: np.leftAdd || null,
            leftNv: np.leftNv || null,
            pdRight: np.pdRight || null,
            pdLeft: np.pdLeft || null,
            pd: np.pd || null,
            doctorName: data.doctorName || null,
            partyName: data.partyName || null,
            frameName: data.frameName || null,
            estimatedDelivery: data.estimatedDelivery || null,
            specialInstructions: data.specialInstructions || null,
            notes: data.prescriptionNotes || null,
            prescribedBy: data.doctorName || null,
            prescribedAt: new Date().toISOString().split("T")[0],
          });
        }
      }

      // 4. Calculate Invoice Totals
      const subtotalVal = data.invoiceItems!.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const discountVal = data.invoiceItems!.reduce(
        (sum, item) => sum + (item.discountAmount || 0),
        0
      );
      const taxVal = data.invoiceItems!.reduce(
        (sum, item) => sum + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0),
        0
      );
      const totalVal = subtotalVal - discountVal + taxVal;

      const invoiceNumber = await generateInvoiceNumber(shopId);

      // 5. Create Invoice
      const [invoice] = await tx
        .insert(invoices)
        .values({
          shopId,
          organizationId: user.organizationId,
          customerId: customerRecord.id,
          invoiceNumber,
          subtotal: subtotalVal.toString(),
          discount: discountVal.toString(),
          discountPercent: subtotalVal > 0 ? ((discountVal / subtotalVal) * 100).toFixed(2) : "0.00",
          tax: taxVal.toString(),
          taxPercent: (subtotalVal - discountVal) > 0 ? ((taxVal / (subtotalVal - discountVal)) * 100).toFixed(2) : "0.00",
          total: totalVal.toString(),
          status: (data.balanceDue || 0) > 0 ? "PENDING" : "PAID",
          paymentMethod: data.paymentMethod,
          amountPaid: (data.amountPaid || 0).toString(),
          balanceDue: (data.balanceDue || 0).toString(),
          notes: data.notes || null,
          specialInstructions: data.specialInstructions || null,
        })
        .returning();

      // 6. Create Invoice Line Items and Decrement Inventory Stock
      for (const item of data.invoiceItems!) {
        const itemSubtotal = item.quantity * item.unitPrice;
        await tx.insert(invoiceItems).values({
          invoiceId: invoice.id,
          inventoryId: item.inventoryId || null,
          shopId,
          organizationId: user.organizationId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          subtotal: itemSubtotal.toString(),
          discountPercent: (item.discountPercent || 0).toString(),
          discountAmount: (item.discountAmount || 0).toString(),
          cgstPercent: (item.cgstPercent || 0).toString(),
          cgstAmount: (item.cgstAmount || 0).toString(),
          sgstPercent: (item.sgstPercent || 0).toString(),
          sgstAmount: (item.sgstAmount || 0).toString(),
          igstPercent: (item.igstPercent || 0).toString(),
          igstAmount: (item.igstAmount || 0).toString(),
        });

        // Decrement stock atomically if it corresponds to an inventory product
        if (item.inventoryId) {
          await decrementInventoryStock(
            item.inventoryId,
            user.organizationId,
            item.quantity,
            tx,
            "SALE_INVOICE",
            invoice.invoiceNumber,
            customerRecord.fullName,
            user.id
          );
        }
      }

      return { customer: customerRecord, invoice };
    });

    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/customers");
    revalidatePath("/shop/invoices");
    revalidatePath("/shop/inventory");

    return {
      success: true,
      message: "Patient registered and invoice generated successfully.",
      data: result,
    };
  } catch (error: any) {
    console.error("Error registering patient with invoice:", error);
    return {
      success: false,
      message: error.message || "An error occurred during transaction.",
    };
  }
}

/**
 * Server Action: Get the complete patient profile details (basic info + prescriptions) by customer ID.
 */
export async function getPatientDetailsAction(
  customerId: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Unauthorized." };

    // Fetch customer basic details
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!customer) return { success: false, message: "Patient not found." };

    // Fetch patient prescriptions
    const patientPrescriptions = await db
      .select()
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.customerId, customerId),
          eq(prescriptions.organizationId, user.organizationId)
        )
      )
      .orderBy(sql`created_at DESC`);

    // Extract distance and near prescriptions
    const distancePrescription =
      patientPrescriptions.find((p) => p.prescriptionType === "DISTANCE") ||
      null;
    const nearPrescription =
      patientPrescriptions.find((p) => p.prescriptionType === "NEAR") ||
      null;

    return {
      success: true,
      message: "Success",
      data: {
        customer,
        distancePrescription,
        nearPrescription,
      },
    };
  } catch (error: any) {
    console.error("Error in getPatientDetailsAction:", error);
    return {
      success: false,
      message: error.message || "Failed to load patient details.",
    };
  }
}

/**
 * Server Action: Get the next available Registration ID for real-time preview on load.
 */
export async function getNextRegistrationIdAction(): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized." };
    }
    const shopId = user.shopId;
    if (!shopId) {
      return { success: false, message: "No active shop associated with your session." };
    }
    const nextId = await generateRegistrationId(shopId);
    return { success: true, message: "Success", data: nextId };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to generate Registration ID." };
  }
}

