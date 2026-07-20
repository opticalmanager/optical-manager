import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import OnboardingClient from "./_components/OnboardingClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Onboarding | Optical Manager",
  description: "Complete your post-signup organization and first shop setup.",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  // 1. If not logged in, go to login
  if (!user) {
    redirect("/login");
  }

  // 2. Only OWNERs go through this specific onboarding flow
  if (user.role !== "OWNER" || !user.organizationId) {
    redirect("/"); // Or suitable fallback route
  }

  const organization = await getOrganizationById(user.organizationId);

  // 3. Check if onboarding is already complete
  if (organization?.onboardingCompleted) {
    redirect("/owner");
  }

  const defaultOrgName = organization?.name ?? `${user.fullName}'s Organization`;

  return (
    <OnboardingClient
      userEmail={user.email}
      userFullName={user.fullName}
      defaultOrgName={defaultOrgName}
    />
  );
}
