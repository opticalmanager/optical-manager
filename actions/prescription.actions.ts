"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import {
  createPrescription,
  updatePrescription,
} from "@/services/prescription.service";
import { prescriptionSchema, type FormState } from "@/utils/validators";

/**
 * Server Action: Create a new prescription.
 */
export async function createPrescriptionAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { success: false, message: "Unauthorized." };

  const shopId = user.shopId || (formData.get("shopId") as string);
  if (!shopId) return { success: false, message: "Shop ID is required." };

  const validatedFields = prescriptionSchema.safeParse({
    customerId: formData.get("customerId"),
    rightSphere: formData.get("rightSphere"),
    rightCylinder: formData.get("rightCylinder"),
    rightAxis: formData.get("rightAxis"),
    rightAdd: formData.get("rightAdd"),
    leftSphere: formData.get("leftSphere"),
    leftCylinder: formData.get("leftCylinder"),
    leftAxis: formData.get("leftAxis"),
    leftAdd: formData.get("leftAdd"),
    pd: formData.get("pd"),
    notes: formData.get("notes"),
    prescribedBy: formData.get("prescribedBy"),
    prescribedAt: formData.get("prescribedAt"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createPrescription({
      ...validatedFields.data,
      shopId,
      organizationId: user.organizationId,
    });

    revalidatePath("/shop/prescriptions");
    return { success: true, message: "Prescription created successfully." };
  } catch (error) {
    return { success: false, message: "Failed to create prescription." };
  }
}
