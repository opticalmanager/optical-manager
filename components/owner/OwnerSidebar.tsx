"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Store, 
  BarChart3, 
  TrendingUp, 
  Megaphone,
  Radio,
  Settings, 
  HelpCircle,
  LogOut, 
  Glasses,
  ChevronDown 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateBroadcastSsoUrl } from "@/actions/sso.actions";
import { toast } from "sonner";

interface OwnerSidebarProps {
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  onCloseMobile?: () => void;
}

export function OwnerSidebar({ user, onCloseMobile }: OwnerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isLaunchingBroadcast, setIsLaunchingBroadcast] = React.useState(false);
  const [isPromoHovered, setIsPromoHovered] = React.useState(false);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message || "Failed to log out");
    }
  };

  const handleLaunchBroadcast = async () => {
    try {
      setIsLaunchingBroadcast(true);
      toast.loading("Authenticating Broadcast Engine...", { id: "sso-launch" });
      const res = await generateBroadcastSsoUrl();
      if (res.success && res.url) {
        toast.success("Redirecting to OpticalManager Broadcast...", { id: "sso-launch" });
        window.location.href = res.url;
      } else {
        toast.error(res.error || "Failed to authenticate Broadcast session", { id: "sso-launch" });
      }
    } catch (err: any) {
      console.error("SSO launch error:", err);
      toast.error("Error launching Broadcast engine", { id: "sso-launch" });
    } finally {
      setIsLaunchingBroadcast(false);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { name: "Shops", href: "/owner/shops", icon: Store },
    { name: "Reports", href: "/owner/reports", icon: TrendingUp },
    { name: "Analytics", href: "/owner/analytics", icon: BarChart3 },
    { name: "Promotion", href: "/owner/promotions", icon: Megaphone, hasDropdown: true },
    { name: "Settings", href: "/owner/settings", icon: Settings },
  ];

  return (
    <aside className="w-[240px] bg-white border-r border-slate-200 text-slate-500 flex flex-col justify-between h-full select-none shadow-sm">
      {/* Top Brand Logo Area & Primary Navigation */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/10 border border-indigo-500/10">
            <Glasses className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-950">
            Optical Manager
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.map((item) => {
            if (item.hasDropdown) {
              const isPromoActive = pathname.startsWith("/owner/promotions");
              const showPromoSub = isPromoHovered || isPromoActive;

              return (
                <div
                  key={item.name}
                  className="space-y-1"
                  onMouseEnter={() => setIsPromoHovered(true)}
                  onMouseLeave={() => setIsPromoHovered(false)}
                >
                  <Link
                    href={item.href!}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group duration-150 border
                      ${isPromoActive 
                        ? "bg-indigo-50/70 text-indigo-600 border-indigo-100/50 font-semibold" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-transparent"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors
                        ${isPromoActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"}
                      `} />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showPromoSub ? "rotate-180 text-indigo-600" : ""}`} />
                  </Link>

                  {/* Dropdown Sub-item: Broadcast Engine */}
                  {showPromoSub && (
                    <div className="pl-4 pr-1 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        type="button"
                        onClick={handleLaunchBroadcast}
                        disabled={isLaunchingBroadcast}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all group duration-150 border border-emerald-200/80 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 cursor-pointer shadow-2xs text-left"
                      >
                        <Radio className="w-3.5 h-3.5 shrink-0 text-emerald-600 group-hover:text-emerald-800 animate-pulse" />
                        <span className="flex-1 font-bold">Broadcast Engine</span>
                        <span className="text-[9px] uppercase tracking-wider font-black bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">
                          NEW
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            const isActive = 
              item.href === "/owner" 
                ? pathname === "/owner" 
                : pathname.startsWith(item.href!);

            return (
              <Link
                key={item.name}
                href={item.href!}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group duration-150 border
                  ${isActive 
                    ? "bg-indigo-50/70 text-indigo-600 border-indigo-100/50 font-semibold" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-transparent"
                  }
                `}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors
                  ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"}
                `} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>


      {/* Bottom Action Links (Support & Logout) */}
      <div className="p-4 border-t border-slate-100 space-y-1 bg-slate-50/50 shrink-0">
        <Link
          href="/owner/support"
          onClick={onCloseMobile}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group duration-150 border
            ${pathname.startsWith("/owner/support") 
              ? "bg-indigo-50/70 text-indigo-600 border-indigo-100/50 font-semibold" 
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-transparent"
            }
          `}
        >
          <HelpCircle className={`w-[18px] h-[18px] shrink-0 transition-colors
            ${pathname.startsWith("/owner/support") ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"}
          `} />
          <span>Support</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100/50 group text-left cursor-pointer text-slate-500"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0 text-slate-400 group-hover:text-red-500" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
