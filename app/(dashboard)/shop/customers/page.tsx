import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getCustomersDashboard } from "@/services/customer.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { CustomerRecordsClient } from "@/components/shop/CustomerRecordsClient";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  let shopId = user.shopId;
  if (!shopId && user.role === "OWNER" && user.organizationId) {
    try {
      const orgShops = await getShopsByOrganization(user.organizationId);
      if (orgShops.length > 0) {
        shopId = orgShops[0].id;
      }
    } catch {}
  }

  if (!shopId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-slate-500 font-semibold">No active shop associated with your session.</p>
      </div>
    );
  }

  // Fetch customer metrics from database with fast-fail timeout for offline resilience
  let customers: any[] = [];
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Customer DB query timeout")), 1200)
    );
    customers = await Promise.race([
      getCustomersDashboard(shopId),
      timeoutPromise,
    ]);
  } catch (err) {
    console.warn("[CustomersPage] Failed to fetch customer metrics (offline/timeout fallback):", err);
    customers = [];
  }

  return <CustomerRecordsClient initialCustomers={customers} />;
}
