"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  Package, 
  Settings, 
  LogOut, 
  Glasses 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

  const navItems = [
    { name: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { name: "Shops", href: "/owner/shops", icon: Store },
    { name: "Customers", href: "/owner/customers", icon: Users },
    { name: "Inventory", href: "/owner/inventory", icon: Package },
    { name: "Settings", href: "/owner/settings", icon: Settings },
  ];

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OW";

  return (
    <aside className="w-[240px] bg-white border-r border-slate-200 text-slate-500 flex flex-col justify-between h-full select-none shadow-sm">
      {/* Top Brand Logo Area */}
      <div>
        <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/10 border border-indigo-500/10">
            <Glasses className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-950">
            Optical Manager
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            // Match exact path or sub-routes
            const isActive = 
              item.href === "/owner" 
                ? pathname === "/owner" 
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
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

      {/* User Information Block at bottom */}
      <div className="p-4 border-t border-slate-100 space-y-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.fullName} 
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-inner">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate leading-none">
              {user.fullName || "Owner Profile"}
            </p>
            <p className="text-xs text-slate-400 truncate mt-1">
              {user.email}
            </p>
          </div>
        </div>

        {/* Logout Button */}
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
