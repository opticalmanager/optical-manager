"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { createCustomer, updateCustomer } from "@/services/customer.service";
import { customerSchema, type FormState } from "@/utils/validators";

/**
 * Server Action: Create a new customer.
 */
export async function createCustomerAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized." };

  const shopId = user.role === "SHOP_MANAGER" ? user.shopId! : (formData.get("shopId") as string);
  if (!shopId) return { success: false, message: "Shop ID is required." };

  const validatedFields = customerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createCustomer({
      ...validatedFields.data,
      shopId,
      organizationId: user.organizationId,
    });

    revalidatePath("/shop/customers");
    return { success: true, message: "Customer created successfully." };
  } catch (error) {
    return { success: false, message: "Failed to create customer." };
  }
}

/**
 * Server Action: Update a customer.
 */
export async function updateCustomerAction(
  customerId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized." };

  const validatedFields = customerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await updateCustomer(
      customerId,
      user.organizationId,
      validatedFields.data
    );

    revalidatePath("/shop/customers");
    return { success: true, message: "Customer updated successfully." };
  } catch (error) {
    return { success: false, message: "Failed to update customer." };
  }
}
