import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationCategories } from "@/services/category.service";
import { getVendorsByOrganization } from "@/services/vendor.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { PurchaseAddForm } from "@/components/shop/PurchaseAddForm";

export const metadata = {
  title: "Add Purchase | Optical Manager",
  description: "Record new stock purchase details, inward supplies, and supplier invoices.",
};

export default async function NewPurchasePage() {
  const user = await getCurrentUser();

  if (!user || !user.shopId || !user.organizationId) {
    redirect("/login");
  }

  // Check RBAC permission for purchases
  if (!hasModulePermission(user, "purchases")) {
    return (
      <AccessDenied
        moduleName="Add Purchase"
        userRole={user.customRoleName || user.role}
      />
    );
  }

  // Fetch product categories with organization GST rates & existing vendors
  const [categories, vendors] = await Promise.all([
    getOrganizationCategories(user.organizationId),
    getVendorsByOrganization(user.organizationId),
  ]);

  return (
    <PurchaseAddForm
      categories={categories}
      vendors={vendors}
      shopId={user.shopId}
    />
  );
}
