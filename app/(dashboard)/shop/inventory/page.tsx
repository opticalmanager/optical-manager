import { getCurrentUser } from "@/services/auth.service";
import { getInventoryByShop } from "@/services/inventory.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { AlertCircle } from "lucide-react";
import { InventoryDashboardClient } from "@/components/shop/InventoryDashboardClient";

interface PageProps {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    filter?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  let shopId = user?.shopId;

  if (!shopId && user?.role === "OWNER" && user?.organizationId) {
    try {
      const orgShops = await getShopsByOrganization(user.organizationId);
      if (orgShops.length > 0) {
        shopId = orgShops[0].id;
      }
    } catch {}
  }

  if (!shopId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white border rounded-2xl shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
        <h3 className="text-lg font-bold text-slate-800">No Associated Shop</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Please contact your administrator to associate your profile with an active shop outlet.
        </p>
      </div>
    );
  }

  // Await search parameters for initial state setup
  const params = await searchParams;
  const initialCategory = params.category || "";
  const initialSort = params.sort || "SKU";
  const initialFilter = params.filter || "";

  // Fetch real items from database (fast-fail timeout for offline resilience)
  let allInventory: any[] = [];
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Inventory DB query timeout")), 8000)
    );
    allInventory = await Promise.race([
      getInventoryByShop(shopId),
      timeoutPromise,
    ]);
  } catch (err) {
    console.warn("[InventoryPage] Failed to fetch inventory from database (offline/timeout fallback):", err);
    allInventory = [];
  }

  return (
    <InventoryDashboardClient
      initialItems={allInventory}
      initialCategory={initialCategory}
      initialFilter={initialFilter}
      initialSort={initialSort}
    />
  );
}
