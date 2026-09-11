import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { db } from "@/lib/drizzle";
import { inventory } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
  if (user.role !== "OWNER" || !user.organizationId) {
    if (user.role === "SHOP_MANAGER") {
      redirect("/shop/dashboard");
    }
    redirect("/login");
  }

  // 3. Fetch organization details with offline timeout resilience
  let organization: any = null;
  let hasLowStock = false;
  let primaryShopId = user.shopId || null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Owner layout query timeout")), 1200)
    );

    const [orgData, lowStock] = await Promise.race([
      Promise.all([
        getOrganizationById(user.organizationId),
        db
          .select({ id: inventory.id })
          .from(inventory)
          .where(eq(inventory.organizationId, user.organizationId))
          .limit(1)
          .catch(() => []),
      ]),
      timeoutPromise,
    ]);

    organization = orgData;
    hasLowStock = (lowStock || []).length > 0;
  } catch (err) {
    organization = {
      id: user.organizationId,
      name: "Optical Store",
      onboardingCompleted: true,
    };
  }

  // 4. Check if onboarding is completed only when strictly uncompleted
  if (organization && organization.onboardingCompleted === false) {
    redirect("/onboarding");
  }

  if (!primaryShopId) {
    try {
      const { shops } = await import("@/db/schema");
      const shopTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Shop query timeout")), 800)
      );
      const [firstShop] = await Promise.race([
        db
          .select({ id: shops.id })
          .from(shops)
          .where(eq(shops.organizationId, user.organizationId))
          .limit(1),
        shopTimeout,
      ]);
      primaryShopId = firstShop?.id || null;
    } catch {}
  }

  return (
    <OwnerShell 
      organizationName={organization.name}
      shopId={primaryShopId}
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
