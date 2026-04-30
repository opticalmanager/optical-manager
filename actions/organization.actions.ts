"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { updateOrganization } from "@/services/organization.service";
import type { FormState } from "@/utils/validators";

/**
 * Server Action: Update organization settings.
 */
export async function updateOrganizationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return { success: false, message: "Unauthorized." };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;

  try {
    await updateOrganization(user.organizationId, {
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
    });

    revalidatePath("/owner/settings");
    return { success: true, message: "Organization updated successfully." };
  } catch (error) {
    return { success: false, message: "Failed to update organization." };
  }
}
