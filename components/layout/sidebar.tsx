"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
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
  PanelLeftOpen,
  ChevronDown,
  RotateCcw,
  ShoppingBag
} from "lucide-react";

import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth.actions";
import type { ModulePermissions } from "@/db/schema/profiles";

interface SidebarProps {
  shopName?: string;
  shopAddress?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  permissions?: ModulePermissions | null;
  role?: string;
}

interface SubNavItem {
  title: string;
  href: string;
  icon: any;
}

interface NavItem {
  title: string;
  href: string;
  icon: any;
  permissionKey?: keyof ModulePermissions;
  subItems?: SubNavItem[];
}

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/shop/dashboard",
    icon: LayoutGrid,
    permissionKey: "dashboard",
  },
  {
    title: "Inventory",
    href: "/shop/inventory",
    icon: Store,
    permissionKey: "inventory",
  },
  {
    title: "Sales",
    href: "/shop/orders",
    icon: ShoppingCart,
    subItems: [
      {
        title: "Orders",
        href: "/shop/orders",
        icon: ShoppingBag,
      },
      {
        title: "Returns",
        href: "/shop/returns",
        icon: RotateCcw,
      },
    ],
  },
  {
    title: "Customers",
    href: "/shop/customers",
    icon: Users,
    permissionKey: "customers",
  },
  {
    title: "Appointments",
    href: "/shop/appointments",
    icon: CalendarDays,
    permissionKey: "appointments",
  },
  {
    title: "Analytics",
    href: "/shop/analytics",
    icon: BarChart2,
    permissionKey: "analytics",
  },
  {
    title: "Reports",
    href: "/shop/reports",
    icon: TrendingUp,
    permissionKey: "reports",
  },
  {
    title: "Settings",
    href: "/shop/settings",
    icon: Settings,
    permissionKey: "settings",
  },
];

export function Sidebar({ 
  shopName, 
  shopAddress, 
  showCloseButton, 
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  permissions,
  role,
}: SidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const isModuleAllowed = (key: keyof ModulePermissions) => {
    if (role === "OWNER" || role === "SUPER_ADMIN" || !permissions) return true;
    return permissions[key] !== false;
  };

  // Filter visible items according to permissions
  const visibleNavItems = mainNavItems
    .map((item) => {
      if (item.title === "Sales" && item.subItems) {
        const allowedSubItems = item.subItems.filter((sub) => {
          if (sub.title === "Orders") return isModuleAllowed("sales");
          if (sub.title === "Returns") return isModuleAllowed("returns");
          return true;
        });

        if (allowedSubItems.length === 0) return null;
        return { ...item, subItems: allowedSubItems };
      }

      if (item.permissionKey && !isModuleAllowed(item.permissionKey)) {
        return null;
      }

      return item;
    })
    .filter(Boolean) as NavItem[];

  const isSalesRoute =
    pathname.startsWith("/shop/orders") ||
    pathname.startsWith("/shop/invoices") ||
    pathname.startsWith("/shop/returns");

  const [salesDropdownOpen, setSalesDropdownOpen] = useState(isSalesRoute);

  useEffect(() => {
    if (isSalesRoute) {
      setSalesDropdownOpen(true);
    }
  }, [isSalesRoute]);

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
      "flex h-full flex-col border-r border-slate-200/80 bg-[#f8fafc] select-none transition-all duration-300",
      isCollapsed ? "w-16" : "w-60"
    )}>
      {/* Clinic/Brand Header Banner */}
      <div className={cn(
        "flex h-16 items-center border-b border-slate-200/80 bg-white transition-all duration-300",
        isCollapsed ? "justify-center px-0" : "justify-between px-4"
      )}>
        {!isCollapsed ? (
          <div className="flex flex-col min-w-0 pr-2">
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
        "flex-1 space-y-1.5 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        isCollapsed ? "px-2" : "px-3"
      )}>
        {visibleNavItems.map((item) => {
          if (item.subItems) {
            const hasActiveChild = item.subItems.some((sub) =>
              sub.href === "/shop/orders"
                ? pathname.startsWith("/shop/orders") || pathname.startsWith("/shop/invoices")
                : pathname.startsWith(sub.href)
            );

            if (isCollapsed) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  className={cn(
                    "group flex items-center rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 justify-center px-0",
                    hasActiveChild
                      ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/20 font-bold"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("h-4.5 w-4.5 shrink-0 transition-colors", hasActiveChild ? "text-white" : "text-slate-400 group-hover:text-slate-700")} />
                </Link>
              );
            }

            return (
              <div key={item.title} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSalesDropdownOpen((prev) => !prev)}
                  className={cn(
                    "w-full group flex items-center justify-between rounded-xl py-2.5 px-3.5 text-sm font-semibold transition-all duration-150 cursor-pointer border-none bg-transparent",
                    hasActiveChild && !salesDropdownOpen
                      ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/20 font-bold"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-colors",
                        hasActiveChild && !salesDropdownOpen
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-700"
                      )}
                    />
                    <span>{item.title}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform duration-200",
                      salesDropdownOpen ? "rotate-180 text-slate-600" : ""
                    )}
                  />
                </button>

                {/* Sub-items dropdown */}
                {salesDropdownOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1 animate-in slide-in-from-top-1 duration-150">
                    {item.subItems.map((sub) => {
                      const isSubActive =
                        sub.href === "/shop/orders"
                          ? pathname.startsWith("/shop/orders") || pathname.startsWith("/shop/invoices")
                          : pathname.startsWith(sub.href);

                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150",
                            isSubActive
                              ? "bg-blue-50 text-[#2563eb] font-extrabold border border-blue-100 shadow-2xs"
                              : "text-slate-500 hover:bg-slate-200/40 hover:text-slate-800"
                          )}
                        >
                          <sub.icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isSubActive ? "text-[#2563eb]" : "text-slate-400"
                            )}
                          />
                          <span>{sub.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          let isActive = false;
          if (item.href === "/shop/dashboard") {
            isActive = pathname === item.href;
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
        {isModuleAllowed("support") && (
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
        )}

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
