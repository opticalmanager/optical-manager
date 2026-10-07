import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { getPurchaseOrders, getPurchaseLedgerKPIs } from "@/services/purchase.service";
import { getVendorsByOrganization } from "@/services/vendor.service";
import { PurchaseLedgerClient } from "@/components/shop/PurchaseLedgerClient";

export const metadata = {
  title: "Purchase Ledger | Optical Manager",
  description: "Track supplier purchase orders, tax invoices, inward inventory, and vendor ledger.",
};

export default async function PurchasesPage() {
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

  // Fetch initial purchase ledger data server-side
  const [{ orders, totalCount }, kpis, vendors] = await Promise.all([
    getPurchaseOrders(user.shopId, { limit: 20, offset: 0 }),
    getPurchaseLedgerKPIs(user.shopId),
    getVendorsByOrganization(user.organizationId),
  ]);

  return (
    <PurchaseLedgerClient
      initialOrders={orders}
      initialTotalCount={totalCount}
      kpis={kpis}
      vendors={vendors.map((v) => ({ id: v.id, name: v.name, gstin: v.gstin }))}
      shopId={user.shopId}
    />
  );
}
