import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getCustomersDashboard } from "@/services/customer.service";
import { CustomerRecordsClient } from "@/components/shop/CustomerRecordsClient";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const shopId = user.shopId;
  if (!shopId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-slate-500 font-semibold">No active shop associated with your session.</p>
      </div>
    );
  }

  // Fetch customer metrics from database
  const customers = await getCustomersDashboard(shopId);

  return <CustomerRecordsClient initialCustomers={customers} />;
}
