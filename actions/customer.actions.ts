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
    const { id, gender, bloodGroup, ...customerData } = validatedFields.data;
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
    const { id, gender, bloodGroup, ...customerData } = validatedFields.data;
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

/**
 * Server Action: Batch import customers from CSV data.
 */
export async function bulkImportCustomersAction(
  shopId: string,
  records: Array<{
    fullName: string;
    phone: string;
    email?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    referredBy?: string | null;
    notes?: string | null;
  }>
): Promise<{
  success: boolean;
  message: string;
  count?: number;
  firstRegId?: string;
  lastRegId?: string;
  errors?: string[];
}> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, message: "Unauthorized. Please log in again." };
  }

  const targetShopId = user.shopId || shopId;
  if (!targetShopId) {
    return { success: false, message: "No active shop selected." };
  }

  if (!records || records.length === 0) {
    return { success: false, message: "No customer records provided for import." };
  }

  const validRecords: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const rowNum = i + 1;

    const fullName = (r.fullName || "").trim();
    if (!fullName || fullName.length < 2) {
      errors.push(`Row ${rowNum}: Name is required and must be at least 2 characters.`);
      continue;
    }

    const cleanPhone = (r.phone || "").replace(/[\s-]/g, "").replace(/^\+91/, "").replace(/^0/, "");
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      errors.push(`Row ${rowNum} (${fullName}): Invalid phone number. Must be a 10-digit number.`);
      continue;
    }

    let cleanEmail: string | null = null;
    if (r.email && r.email.trim()) {
      const emailCandidate = r.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate)) {
        errors.push(`Row ${rowNum} (${fullName}): Invalid email address format.`);
        continue;
      }
      cleanEmail = emailCandidate;
    }

    let cleanGender: "MALE" | "FEMALE" | "OTHER" | null = null;
    if (r.gender) {
      const g = r.gender.trim().toUpperCase();
      if (g === "MALE" || g === "M") cleanGender = "MALE";
      else if (g === "FEMALE" || g === "F") cleanGender = "FEMALE";
      else if (g === "OTHER" || g === "O") cleanGender = "OTHER";
    }

    validRecords.push({
      fullName,
      phone: cleanPhone,
      email: cleanEmail,
      gender: cleanGender,
      dateOfBirth: r.dateOfBirth?.trim() || null,
      address: r.address?.trim() || null,
      city: r.city?.trim() || null,
      state: r.state?.trim() || null,
      pincode: r.pincode?.trim() || null,
      referredBy: r.referredBy?.trim() || null,
      notes: r.notes?.trim() || null,
    });
  }

  if (validRecords.length === 0) {
    return {
      success: false,
      message: "No valid records to import. Please review row validation errors.",
      errors,
    };
  }

  try {
    const { bulkCreateCustomers } = await import("@/services/customer.service");
    const result = await bulkCreateCustomers(
      targetShopId,
      user.organizationId,
      validRecords
    );

    revalidatePath("/shop/customers");

    return {
      success: true,
      message: `Successfully imported ${result.count} customers (${result.firstRegId} to ${result.lastRegId}).`,
      count: result.count,
      firstRegId: result.firstRegId,
      lastRegId: result.lastRegId,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error("[bulkImportCustomersAction] Error during batch insertion:", err);
    return {
      success: false,
      message: err.message || "Failed to batch import customer records. Please try again.",
    };
  }
}

