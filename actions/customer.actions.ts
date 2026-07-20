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
  if (!user || !user.organizationId) return { success: false, message: "Unauthorized." };

  const shopId = user.shopId || (formData.get("shopId") as string);
  if (!shopId) return { success: false, message: "Shop ID is required." };

  const validatedFields = customerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    gender: formData.get("gender"),
    bloodGroup: formData.get("bloodGroup"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const { gender, bloodGroup, ...customerData } = validatedFields.data;
    await createCustomer({
      ...customerData,
      gender: gender === "" ? null : gender,
      bloodGroup: bloodGroup === "" ? null : bloodGroup,
      city: customerData.city === "" ? null : customerData.city,
      state: customerData.state === "" ? null : customerData.state,
      pincode: customerData.pincode === "" ? null : customerData.pincode,
      email: customerData.email === "" ? null : customerData.email,
      address: customerData.address === "" ? null : customerData.address,
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
 * Server Action: Update an existing customer.
 */
export async function updateCustomerAction(
  customerId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { success: false, message: "Unauthorized." };

  const validatedFields = customerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    gender: formData.get("gender"),
    bloodGroup: formData.get("bloodGroup"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const { gender, bloodGroup, ...customerData } = validatedFields.data;
    await updateCustomer(
      customerId,
      user.organizationId,
      {
        ...customerData,
        gender: gender === "" ? null : gender,
        bloodGroup: bloodGroup === "" ? null : bloodGroup,
        city: customerData.city === "" ? null : customerData.city,
        state: customerData.state === "" ? null : customerData.state,
        pincode: customerData.pincode === "" ? null : customerData.pincode,
        email: customerData.email === "" ? null : customerData.email,
        address: customerData.address === "" ? null : customerData.address,
      }
    );

    revalidatePath("/shop/customers");
    return { success: true, message: "Customer updated successfully." };
  } catch (error) {
    return { success: false, message: "Failed to update customer." };
  }
}

/**
 * Server Action: Quick update customer's phone number.
 */
export async function updateCustomerPhoneAction(
  customerId: string,
  phone: string
): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { success: false, message: "Unauthorized." };

  try {
    await updateCustomer(customerId, user.organizationId, { phone });
    revalidatePath("/shop/customers");
    return { success: true, message: "Customer phone number updated successfully." };
  } catch (error) {
    return { success: false, message: "Failed to update customer phone number." };
  }
}
