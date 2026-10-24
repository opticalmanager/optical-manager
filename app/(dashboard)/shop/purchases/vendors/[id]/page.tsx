import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { getVendorDetailWithAnalytics } from "@/services/vendor.service";
import { VendorDetailClient } from "@/components/shop/VendorDetailClient";
import { db } from "@/lib/drizzle";
import { shops } from "@/db/schema";
import { eq } from "drizzle-orm";

interface VendorDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VendorDetailPageProps) {
  const { id } = await params;
  return {
    title: `Vendor Profile | Optical Manager`,
    description: `Supplier details, purchase history, procurement analytics, and ledger tracking.`,
  };
}

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
  const user = await getCurrentUser();
  if (!user || !user.shopId || !user.organizationId) {
    redirect("/login");
  }

  if (!hasModulePermission(user, "purchases")) {
    return (
      <AccessDenied
        moduleName="Vendor Profile"
        userRole={user.customRoleName || user.role}
      />
    );
  }

  const { id } = await params;
  const [data, [shop]] = await Promise.all([
    getVendorDetailWithAnalytics(id, user.organizationId),
    db.select({ name: shops.name }).from(shops).where(eq(shops.id, user.shopId)).limit(1),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <VendorDetailClient
      vendor={data.vendor}
      analytics={data.analytics}
      initialOrders={data.orders}
      shopId={user.shopId}
      shopName={shop?.name || "Our Optical Store"}
    />
  );
}
