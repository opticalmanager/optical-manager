import { getCurrentUser } from "@/services/auth.service";
import { getShopById, getShopsByOrganization } from "@/services/shop.service";
import { getShopAppointmentsData } from "@/services/appointment.service";
import AppointmentsWorkspaceClient from "@/components/shop/AppointmentsWorkspaceClient";

export const metadata = {
  title: "Appointments | Optical Manager",
  description: "View and manage all store appointments and patient schedules.",
};

export default async function ShopAppointmentsPage() {
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

  let data: any = {
    appointments: [],
    summary: { total: 0, pending: 0, confirmed: 0, completed: 0 },
  };
  let shop: any = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Appointments DB query timeout")), 1200)
    );
    const results = await Promise.race([
      Promise.all([
        getShopAppointmentsData(shopId),
        getShopById(shopId, user.organizationId),
      ]),
      timeoutPromise,
    ]);
    data = results[0];
    shop = results[1];
  } catch (err) {
    console.warn("[ShopAppointmentsPage] Failed to fetch appointments from database (offline/timeout fallback):", err);
  }

  return <AppointmentsWorkspaceClient data={data} shopName={shop?.name} />;
}
