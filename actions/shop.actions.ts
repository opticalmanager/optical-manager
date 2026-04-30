"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { createShop, updateShop } from "@/services/shop.service";
import { createShopSchema, type FormState } from "@/utils/validators";

/**
 * Server Action: Create a new shop.
 */
export async function createShopAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return { success: false, message: "Unauthorized." };
  }

  const validatedFields = createShopSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    gstNumber: formData.get("gstNumber"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createShop({
      ...validatedFields.data,
      organizationId: user.organizationId,
    });

    revalidatePath("/owner/shops");
    return { success: true, message: "Shop created successfully." };
  } catch (error) {
    return { success: false, message: "Failed to create shop." };
  }
}

/**
 * Server Action: Update an existing shop.
 */
export async function updateShopAction(
  shopId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return { success: false, message: "Unauthorized." };
  }

  const validatedFields = createShopSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    gstNumber: formData.get("gstNumber"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await updateShop(shopId, user.organizationId, validatedFields.data);
    revalidatePath("/owner/shops");
    return { success: true, message: "Shop updated successfully." };
  } catch (error) {
    return { success: false, message: "Failed to update shop." };
  }
}
