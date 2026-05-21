"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { updateOrganization } from "@/services/organization.service";
import { createShop } from "@/services/shop.service";
import type { FormState } from "@/utils/validators";

export async function completeOnboardingAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return { success: false, message: "Unauthorized. Only owners can onboard." };
  }

  // Extract organization data
  const orgName = formData.get("orgName") as string;
  const orgEmail = formData.get("orgEmail") as string;
  const orgPhone = formData.get("orgPhone") as string;
  const orgAddress = formData.get("orgAddress") as string;

  // Extract shop data
  const shopName = formData.get("shopName") as string;
  const shopEmail = formData.get("shopEmail") as string;
  const shopPhone = formData.get("shopPhone") as string;
  const shopAddress = formData.get("shopAddress") as string;

  if (!orgName || orgName.trim() === "") {
    return { success: false, message: "Organization name is required." };
  }

  if (!shopName || shopName.trim() === "") {
    return { success: false, message: "Shop name is required." };
  }

  try {
    // 1. Update the organization
    await updateOrganization(user.organizationId, {
      name: orgName,
      email: orgEmail || undefined,
      phone: orgPhone || undefined,
      address: orgAddress || undefined,
    });

    // 2. Create the first shop
    await createShop({
      organizationId: user.organizationId,
      name: shopName,
      email: shopEmail || undefined,
      phone: shopPhone || undefined,
      address: shopAddress || undefined,
      isActive: true,
    });

  } catch (error) {
    console.error("Onboarding error:", error);
    return { success: false, message: "Failed to complete onboarding. Please try again." };
  }

  // 3. Redirect to dashboard
  redirect("/owner");
}
