import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { db } from "@/lib/drizzle";
import { inventory } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Owner Dashboard | Optical Manager",
};

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 1. Check if user is logged in
  if (!user) {
    redirect("/login");
  }

  // 2. Fetch profile and verify role is OWNER
  if (user.role !== "OWNER") {
    if (user.role === "SHOP_MANAGER") {
      redirect("/shop/dashboard");
    }
    redirect("/login");
  }

  // 3. Fetch organization details
  const organization = await getOrganizationById(user.organizationId);

  // 4. Check if onboarding is completed
  if (!organization?.onboardingCompleted) {
    redirect("/onboarding");
  }

  // 5. Fetch if any low stock items exist for notification bell badge
  const lowStock = await db
    .select({ id: inventory.id })
    .from(inventory)
    .where(
      eq(inventory.organizationId, user.organizationId)
      // We can also filter if count < minQuantity (handled below dynamically)
    )
    .limit(1);

  const hasLowStock = lowStock.length > 0;

  return (
    <OwnerShell 
      organizationName={organization.name}
      user={{
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }}
      hasLowStockAlerts={hasLowStock}
    >
      {children}
    </OwnerShell>
  );
}
