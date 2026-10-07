import { notFound } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { getPurchaseOrderById } from "@/services/purchase.service";
import { getOrganizationCategories } from "@/services/category.service";
import { getVendorsByOrganization } from "@/services/vendor.service";
import { PurchaseDetailClient } from "@/components/shop/PurchaseDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Purchase Transaction #${id.slice(0, 8)} | Optical Manager`,
    description: "Detailed view of inward supplier invoice, itemized tax rates, and barcode printing.",
  };
}

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !user.shopId || !user.organizationId) {
    return (
      <AccessDenied
        moduleName="Purchases & Inward Supply"
        userRole={user?.customRoleName || user?.role}
      />
    );
  }

  if (!hasModulePermission(user, "purchases")) {
    return (
      <AccessDenied
        moduleName="Purchases & Inward Supply"
        userRole={user?.customRoleName || user?.role}
      />
    );
  }

  const [purchaseData, categories, vendors] = await Promise.all([
    getPurchaseOrderById(id, user.organizationId),
    getOrganizationCategories(user.organizationId),
    getVendorsByOrganization(user.organizationId),
  ]);

  if (!purchaseData || !purchaseData.order) {
    notFound();
  }

  return (
    <PurchaseDetailClient
      order={purchaseData.order}
      items={purchaseData.items}
      vendor={purchaseData.vendor}
      categories={categories}
      vendors={vendors}
      shopId={user.shopId}
    />
  );
}
