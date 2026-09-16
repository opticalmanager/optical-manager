import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopsByOrganization, getShopById } from "@/services/shop.service";
import { BulkCustomerImportClient } from "@/components/shop/BulkCustomerImportClient";

export const metadata = {
  title: "Bulk Customer Import | Optical Manager",
  description: "Import customer profiles and contact directories in bulk via CSV files.",
};

export default async function BulkCustomerImportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
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

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <BulkCustomerImportClient shopId={shopId} shopName={shopName} />
    </div>
  );
}
