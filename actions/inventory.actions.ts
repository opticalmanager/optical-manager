"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import {
  createInventoryItem,
  updateInventoryItem,
} from "@/services/inventory.service";
import { inventorySchema, type FormState } from "@/utils/validators";

/**
 * Server Action: Create a new inventory item.
 */
export async function createInventoryAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized." };

  const shopId = user.role === "SHOP_MANAGER" ? user.shopId! : (formData.get("shopId") as string);
  if (!shopId) return { success: false, message: "Shop ID is required." };

  const validatedFields = inventorySchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    costPrice: formData.get("costPrice"),
    quantity: formData.get("quantity"),
    minQuantity: formData.get("minQuantity"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createInventoryItem({
      ...validatedFields.data,
      shopId,
      organizationId: user.organizationId,
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Item added to inventory." };
  } catch (error) {
    return { success: false, message: "Failed to add inventory item." };
  }
}

/**
 * Server Action: Update an inventory item.
 */
export async function updateInventoryAction(
  itemId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized." };

  const validatedFields = inventorySchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    costPrice: formData.get("costPrice"),
    quantity: formData.get("quantity"),
    minQuantity: formData.get("minQuantity"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await updateInventoryItem(
      itemId,
      user.organizationId,
      validatedFields.data
    );

    revalidatePath("/shop/inventory");
    return { success: true, message: "Inventory item updated." };
  } catch (error) {
    return { success: false, message: "Failed to update inventory item." };
  }
}
