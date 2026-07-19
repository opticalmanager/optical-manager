"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { 
  LayoutGrid, 
  Store, 
  ShoppingCart, 
  Users, 
  CalendarDays,
  BarChart2,
  TrendingUp,
  Settings, 
  HelpCircle,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth.actions";

interface SidebarProps {
  shopName?: string;
  shopAddress?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/shop/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Inventory",
    href: "/shop/inventory",
    icon: Store,
  },
  {
    title: "Sales",
    href: "/shop/orders",
    icon: ShoppingCart,
  },
  {
    title: "Customers",
    href: "/shop/customers",
    icon: Users,
  },
  {
    title: "Appointments",
    href: "/shop/appointments",
    icon: CalendarDays,
  },
  {
    title: "Analytics",
    href: "/shop/analytics",
    icon: BarChart2,
  },
  {
    title: "Reports",
    href: "/shop/reports",
    icon: TrendingUp,
  },
  {
    title: "Settings",
    href: "/shop/settings",
    icon: Settings,
  },
];

export function Sidebar({ 
  shopName, 
  shopAddress, 
  showCloseButton, 
  onClose,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const formattedAddress = shopAddress
    ? shopAddress.split(",")[0].trim().toUpperCase()
    : "PRECISION EYE CARE";

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logout();
      } catch (error) {
        console.error("Logout error:", error);
      }
    });
  };

  return (
    <div className={cn(
      "flex h-screen flex-col border-r border-slate-200/80 bg-[#f8fafc] select-none transition-all duration-300",
      isCollapsed ? "w-[72px]" : "w-64"
    )}>
      {/* Top Software Branding Header */}
      <div className={cn(
        "pt-5 pb-3 flex items-center justify-between transition-all",
        isCollapsed ? "px-3.5 flex-col gap-3" : "px-6"
      )}>
        {!isCollapsed ? (
          <div className="space-y-0.5 min-w-0 pr-1">
            <h1 className="text-[#2563eb] font-extrabold text-lg tracking-tight leading-tight truncate">
              Optical Manager
            </h1>
            <h2 className="text-[12px] font-black text-slate-800 tracking-wider uppercase leading-snug truncate">
              {shopName ? shopName.toUpperCase() : "CLINICAL CURATOR"}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase truncate max-w-[170px]" title={formattedAddress}>
              {formattedAddress}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] font-black text-sm shadow-2xs">
              OM
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
              className="hidden lg:flex p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-[#2563eb] transition-colors border-none cursor-pointer items-center justify-center bg-transparent"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4.5 w-4.5" />
              ) : (
                <PanelLeftClose className="h-4.5 w-4.5" />
              )}
            </button>
          )}

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
      </div>

      {/* Main Navigation Links */}
      <nav className={cn(
        "flex-1 space-y-1.5 py-3 overflow-y-auto",
        isCollapsed ? "px-2" : "px-3"
      )}>
        {mainNavItems.map((item) => {
          let isActive = false;
          if (item.href === "/shop/dashboard") {
            isActive = pathname === item.href;
          } else if (item.href === "/shop/orders") {
            isActive = pathname.startsWith("/shop/orders") || pathname.startsWith("/shop/invoices");
          } else if (item.href === "/shop/customers") {
            isActive = pathname.startsWith("/shop/customers") || pathname.startsWith("/shop/patients");
          } else {
            isActive = pathname.startsWith(item.href);
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.title : undefined}
              className={cn(
                "group flex items-center rounded-xl py-2.5 text-sm font-semibold transition-all duration-150",
                isCollapsed ? "justify-center px-0" : "gap-3.5 px-3.5",
                isActive
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/20 font-bold"
                  : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700")} />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Divider & Action Links */}
      <div className={cn(
        "py-3 border-t border-slate-200/70 space-y-1 bg-[#f8fafc]",
        isCollapsed ? "px-2" : "px-3"
      )}>
        <Link
          href="/shop/support"
          title={isCollapsed ? "Support" : undefined}
          className={cn(
            "group flex items-center rounded-xl py-2.5 text-sm font-semibold transition-all duration-150",
            isCollapsed ? "justify-center px-0" : "gap-3.5 px-3.5",
            pathname.startsWith("/shop/support")
              ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/20 font-bold"
              : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
          )}
        >
          <HelpCircle className={cn("h-4.5 w-4.5 shrink-0 transition-colors", pathname.startsWith("/shop/support") ? "text-white" : "text-slate-400 group-hover:text-slate-700")} />
          {!isCollapsed && <span>Support</span>}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          title={isCollapsed ? "Log Out" : undefined}
          className={cn(
            "w-full group flex items-center rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all duration-150 cursor-pointer bg-transparent border-none",
            isCollapsed ? "justify-center px-0" : "gap-3.5 px-3.5"
          )}
        >
          <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-400 group-hover:text-rose-500 transition-colors" />
          {!isCollapsed && <span>{isPending ? "Logging Out..." : "Log Out"}</span>}
        </button>
      </div>
    </div>
  );
}
