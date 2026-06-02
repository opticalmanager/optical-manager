import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopById } from "@/services/shop.service";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

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
    <div className="flex h-screen overflow-hidden bg-slate-50">
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
  );
}
