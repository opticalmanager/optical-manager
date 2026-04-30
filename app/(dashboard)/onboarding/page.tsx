import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { countShops } from "@/services/shop.service";
import { OnboardingForm } from "@/components/forms/onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/shop/dashboard");

  // If shops already exist, skip onboarding
  const shopCount = await countShops(user.organizationId);
  if (shopCount > 0) redirect("/owner/dashboard");

  return (
    <div className="min-h-screen bg-surface p-4 flex items-start justify-center">
      <OnboardingForm />
    </div>
  );
}
