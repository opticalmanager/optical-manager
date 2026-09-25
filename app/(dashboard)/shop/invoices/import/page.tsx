import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopsByOrganization, getShopById } from "@/services/shop.service";
import { getCustomersByShop } from "@/services/customer.service";
import { db } from "@/lib/drizzle";
import { invoices } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { BulkInvoiceImportClient } from "@/components/shop/BulkInvoiceImportClient";

export const dynamic = "force-dynamic";

export default async function BulkInvoiceImportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasModulePermission(user, "sales")) {
    return (
      <AccessDenied
        moduleName="Sales & Invoices"
        userRole={user.customRoleName || user.role}
      />
    );
  }

  let shopId = user.shopId;
  let organizationId = user.organizationId;

  if (!shopId && user.role === "OWNER" && organizationId) {
    try {
      const orgShops = await getShopsByOrganization(organizationId);
      if (orgShops.length > 0) {
        shopId = orgShops[0].id;
      }
    } catch {}
  }

  if (!shopId || !organizationId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-slate-500 font-semibold">No active store outlet associated with your session.</p>
      </div>
    );
  }

  // Fetch shop metadata
  let shopName = "Store Outlet";
  try {
    const shop = await getShopById(shopId, organizationId);
    if (shop?.name) {
      shopName = shop.name;
    }
  } catch {}

  // Fetch existing customers in this shop for 0ms client-side matching
  let existingCustomers: Array<{
    id: string;
    fullName: string;
    phone: string;
    registrationId: string | null;
  }> = [];

  try {
    const custs = await getCustomersByShop(shopId);
    existingCustomers = custs.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      registrationId: c.registrationId,
    }));
  } catch (err) {
    console.warn("[BulkInvoiceImportPage] Failed to fetch existing customers:", err);
  }

  // Fetch existing invoice numbers to warn of duplicates
  let existingInvoiceNumbers: string[] = [];
  try {
    const invRows = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(and(eq(invoices.shopId, shopId), isNull(invoices.deletedAt)))
      .limit(5000);

    existingInvoiceNumbers = invRows.map((r) => r.invoiceNumber);
  } catch (err) {
    console.warn("[BulkInvoiceImportPage] Failed to fetch invoice numbers:", err);
  }

  return (
    <BulkInvoiceImportClient
      shopId={shopId}
      shopName={shopName}
      existingCustomers={existingCustomers}
      existingInvoiceNumbers={existingInvoiceNumbers}
    />
  );
}
