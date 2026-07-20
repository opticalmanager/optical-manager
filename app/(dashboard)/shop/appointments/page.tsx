import { getCurrentUser } from "@/services/auth.service";
import { getShopById } from "@/services/shop.service";
import { getShopAppointmentsData } from "@/services/appointment.service";
import AppointmentsWorkspaceClient from "@/components/shop/AppointmentsWorkspaceClient";

export const metadata = {
  title: "Appointments | Optical Manager",
  description: "View and manage all store appointments and patient schedules.",
};

export default async function ShopAppointmentsPage() {
  const user = await getCurrentUser();
  const shopId = user?.shopId;

  if (!shopId || !user || !user.organizationId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800">No shop assigned</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Please contact your system administrator to assign a shop.
          </p>
        </div>
      </div>
    );
  }

  const [data, shop] = await Promise.all([
    getShopAppointmentsData(shopId),
    getShopById(shopId, user.organizationId),
  ]);

  return <AppointmentsWorkspaceClient data={data} shopName={shop?.name} />;
}
