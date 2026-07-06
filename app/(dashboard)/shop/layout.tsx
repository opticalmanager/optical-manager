import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopById } from "@/services/shop.service";
import { ShopLayoutClient } from "@/components/layout/ShopLayoutClient";
import { exitShopConsoleAction } from "@/actions/auth.actions";
import { Sparkles, ArrowLeft } from "lucide-react";

export default async function ShopDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }
  
  // Allow both Shop Managers and Owners with an active shop context
  if (user.role !== "SHOP_MANAGER" && user.role !== "OWNER") {
    redirect("/login");
  }

  if (user.role === "OWNER" && !user.shopId) {
    redirect("/owner");
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
        <div className="bg-indigo-900 text-white px-6 py-2.5 flex items-center justify-between gap-4 border-b border-indigo-950 shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-200 shrink-0 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase">
              Owner Console <span className="mx-2 text-indigo-400">•</span> Managing Branch: <strong className="font-extrabold text-white text-sm normal-case">{shop?.name || "Corporate Outlet"}</strong>
            </span>
          </div>
          <form action={exitShopConsoleAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-white text-indigo-900 px-4 py-1.5 rounded-lg text-xs font-extrabold hover:bg-indigo-50 active:bg-indigo-100 transition-all shadow-sm cursor-pointer border-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Owner Portal</span>
            </button>
          </form>
        </div>
      )}
      <ShopLayoutClient user={user} shop={shop}>
        {children}
      </ShopLayoutClient>
    </div>
  );
}
