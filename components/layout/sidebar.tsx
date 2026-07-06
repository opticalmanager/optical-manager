"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Archive, 
  ReceiptText, 
  History, 
  Settings, 
  HelpCircle,
  Eye as EyeLogo,
  X
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "DASHBOARD",
    href: "/shop/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "STOCK MANAGEMENT",
    href: "/shop/inventory",
    icon: Archive,
  },
  {
    title: "ORDERS",
    href: "/shop/orders",
    icon: ReceiptText,
  },
  {
    title: "CUSTOMER RECORDS",
    href: "/shop/customers",
    icon: History,
  },
];

interface SidebarProps {
  shopName?: string;
  shopAddress?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export function Sidebar({ shopName, shopAddress, showCloseButton, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Shorten shop address to display cleanly inside widget
  const formattedAddress = shopAddress
    ? shopAddress.split(",")[0].trim().toUpperCase()
    : "PRECISION EYE CARE";

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200/80 bg-slate-50 select-none">
      {/* Top Logo / Software Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 text-[#0a52c3] font-bold text-xl tracking-tight">
        <span>Software Manager</span>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors border-none cursor-pointer flex items-center justify-center bg-transparent"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Dynamic Shop Profile Card Widget */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm border border-slate-200/40">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0a52c3] text-white shadow-sm shadow-[#0a52c3]/20">
            <EyeLogo className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-slate-800 leading-tight truncate" title={shopName || "Clinical Curator"}>
              {shopName || "Clinical Curator"}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5" title={formattedAddress}>
              {formattedAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation links */}
      <nav className="flex-1 space-y-1 px-4 py-2 overflow-y-auto">
        {navItems.map((item) => {
          // Dashboard exact match, others check starting paths
          const isActive = item.href === "/shop/dashboard" 
            ? pathname === item.href 
            : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200",
                isActive
                  ? "bg-white text-[#0a52c3] shadow-sm border border-slate-200/30 scale-[1.01]"
                  : "text-slate-500 hover:bg-white/40 hover:text-slate-800"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5 transition-colors", isActive ? "text-[#0a52c3]" : "text-slate-400")} />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Settings & Support Actions */}
      <div className="border-t border-slate-200/80 p-4 space-y-1 bg-slate-50">
        <Link
          href="/shop/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200",
            pathname.startsWith("/shop/settings")
              ? "bg-white text-[#0a52c3] shadow-sm border border-slate-200/30"
              : "text-slate-500 hover:bg-white/40 hover:text-slate-800"
          )}
        >
          <Settings className="h-4.5 w-4.5 text-slate-400" />
          SETTINGS
        </Link>
        <Link
          href="/shop/support"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200",
            pathname.startsWith("/shop/support")
              ? "bg-white text-[#0a52c3] shadow-sm border border-slate-200/30"
              : "text-slate-500 hover:bg-white/40 hover:text-slate-800"
          )}
        >
          <HelpCircle className="h-4.5 w-4.5 text-slate-400" />
          SUPPORT
        </Link>
      </div>
    </div>
  );
}
