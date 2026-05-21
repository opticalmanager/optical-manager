import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function ShopDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 1. Check if user is logged in
  if (!user) {
    redirect("/login");
  }

  // 2. Fetch profile and verify role is SHOP_MANAGER
  if (user.role !== "SHOP_MANAGER") {
    if (user.role === "OWNER") {
      redirect("/owner");
    }
    redirect("/login");
  }

  // 3. Check if account is active
  if (!user.isActive) {
    redirect("/login?error=deactivated");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-surface p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
