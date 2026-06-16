import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopById } from "@/services/shop.service";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { stopImpersonatingShopAction } from "@/actions/auth.actions";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default async function ShopDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }
  
  if (user.role !== "SHOP_MANAGER") {
    if (user.role === "OWNER") {
      redirect("/owner");
    }
    redirect("/login");
  }
  
  if (!user.isActive) {
    redirect("/login?error=deactivated");
  }

  // Fetch shop metadata on the server to display in layout widgets
  const shop = user.shopId 
    ? await getShopById(user.shopId, user.organizationId) 
    : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {user.isImpersonating && (
        <div className="bg-amber-600 text-white px-6 py-2.5 flex items-center justify-between gap-4 border-b border-amber-700 shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-100 shrink-0" />
            <span className="text-sm font-semibold tracking-wide">
              Viewing <strong className="font-extrabold">{shop?.name || "Corporate Outlet"}</strong> as Owner (Impersonation Mode)
            </span>
          </div>
          <form action={stopImpersonatingShopAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-white text-amber-700 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-50 active:bg-amber-150 transition-all shadow-sm cursor-pointer border-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Impersonation</span>
            </button>
          </form>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          shopName={shop?.name || undefined} 
          shopAddress={shop?.address || undefined} 
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar 
            user={user} 
            shopName={shop?.name || "Corporate Outlet"} 
          />
          <main className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
