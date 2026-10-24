import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { getVendorsWithStats, getVendorKPIs } from "@/services/vendor.service";
import { VendorDirectoryClient } from "@/components/shop/VendorDirectoryClient";

export const metadata = {
  title: "Vendors & Suppliers | Optical Manager",
  description: "Manage optical product suppliers, contact books, payment terms, and vendor GSTINs.",
};

export default async function VendorsPage() {
  const user = await getCurrentUser();
  if (!user || !user.shopId || !user.organizationId) {
    redirect("/login");
  }

  if (!hasModulePermission(user, "purchases")) {
    return (
      <AccessDenied
        moduleName="Vendors & Suppliers"
        userRole={user.customRoleName || user.role}
      />
    );
  }

  const [{ vendors, totalCount }, kpis] = await Promise.all([
    getVendorsWithStats(user.shopId, user.organizationId, { limit: 25, offset: 0 }),
    getVendorKPIs(user.organizationId),
  ]);

  return (
    <VendorDirectoryClient
      initialVendors={vendors}
      initialTotalCount={totalCount}
      kpis={kpis}
      shopId={user.shopId}
    />
  );
}
