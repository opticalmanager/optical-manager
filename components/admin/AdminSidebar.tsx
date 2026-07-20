"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";

const adminNavItems = [
  {
    title: "Platform Overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Demo Requests (Leads)",
    href: "/admin/leads",
    icon: Users,
  },
  {
    title: "Tenant Stores",
    href: "/admin/organizations",
    icon: Building2,
  },
  {
    title: "Subscriptions & Billing",
    href: "/admin/organizations",
    icon: CreditCard,
  },
];

export default function AdminSidebar({ adminName = "Super Admin" }: { adminName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex h-screen w-60 flex-col border-r border-slate-800/80 bg-[#0d1424] text-slate-300 select-none shrink-0">
      {/* Header Branding */}
      <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs font-bold tracking-tight text-white truncate">
            Optical Manager
          </h1>
          <span className="text-[10px] font-medium text-slate-400 block truncate">
            Platform Control
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2.5 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive = item.href === "/admin" 
            ? pathname === "/admin" 
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer & Logout */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#090d16]">
        <div className="px-3 py-2 bg-[#0d1424] rounded-xl border border-slate-800/80 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
            {adminName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block leading-none">
              SUPER ADMIN
            </span>
            <span className="text-xs font-semibold text-white truncate block mt-0.5 leading-none">
              {adminName}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdminLogout}
          className="w-full group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer bg-transparent border-none"
        >
          <LogOut className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-rose-400" />
          <span>Exit Admin Panel</span>
        </button>
      </div>
    </div>
  );
}
