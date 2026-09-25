import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopsByOrganization, getShopById } from "@/services/shop.service";
import { getOrganizationCategories } from "@/services/category.service";
import { getVendorsByOrganization } from "@/services/vendor.service";
import { getInventoryByShop } from "@/services/inventory.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { BulkPurchaseImportClient } from "@/components/shop/BulkPurchaseImportClient";

export const metadata = {
  title: "Bulk Purchase CSV Inward | Optical Manager",
  description: "Inward stock purchases and supplier invoices in bulk using spreadsheet CSV files.",
};

export default async function BulkPurchaseImportPage() {
  const user = await getCurrentUser();

  if (!user || !user.organizationId) {
    redirect("/login");
  }

  if (!hasModulePermission(user, "inventory") && !hasModulePermission(user, "purchases")) {
    return (
      <AccessDenied
        moduleName="Bulk Purchase Import"
        userRole={user.customRoleName || user.role}
      />
    );
  }

  let shopId = user.shopId;
  let shopName = "Optical Shop";

  if (!shopId && user.role === "OWNER" && user.organizationId) {
    try {
      const orgShops = await getShopsByOrganization(user.organizationId);
      if (orgShops.length > 0) {
        shopId = orgShops[0].id;
        shopName = orgShops[0].name;
      }
    } catch {}
  } else if (shopId && user.organizationId) {
    try {
      const shop = await getShopById(shopId, user.organizationId);
      if (shop) {
        shopName = shop.name;
      }
    } catch {}
  }

  if (!shopId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-slate-500 font-semibold">
          No active shop associated with your session.
        </p>
      </div>
    );
  }

  // Fetch categories, vendors, and existing inventory for instant catalog check
  const [categories, vendors, existingInventory] = await Promise.all([
    getOrganizationCategories(user.organizationId),
    getVendorsByOrganization(user.organizationId),
    getInventoryByShop(shopId),
  ]);

  const mappedInventory = (existingInventory || []).map((item) => ({
    id: item.id,
    productCode: item.productCode || null,
    name: item.productName || item.name,
    category: item.category,
    price: item.price,
    costPrice: item.costPrice || null,
    quantity: item.quantity,
    brand: item.brand || null,
    model: item.model || null,
  }));

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <BulkPurchaseImportClient
        shopId={shopId}
        shopName={shopName}
        vendors={vendors}
        categories={categories}
        existingInventory={mappedInventory}
      />
    </div>
  );
}
