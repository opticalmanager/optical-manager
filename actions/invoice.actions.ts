"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { createInvoice, updateInvoice } from "@/services/invoice.service";
import { invoiceSchema, type FormState } from "@/utils/validators";
import { generateInvoiceNumber } from "@/lib/utils";

/**
 * Server Action: Create a new invoice.
 */
export async function createInvoiceAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized." };

  const shopId = user.role === "SHOP_MANAGER" ? user.shopId! : (formData.get("shopId") as string);
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
      invoiceNumber: generateInvoiceNumber(),
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
  if (!user) return { success: false, message: "Unauthorized." };

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
