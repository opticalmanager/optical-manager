"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface OwnerHeaderProps {
  organizationName: string;
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  onOpenMobileSidebar: () => void;
  hasLowStockAlerts?: boolean;
}

export function OwnerHeader({ 
  organizationName, 
  user, 
  onOpenMobileSidebar, 
  hasLowStockAlerts = false 
}: OwnerHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Calculate dynamic page title
  const getPageTitle = () => {
    if (pathname === "/owner") return "Dashboard";
    if (pathname.startsWith("/owner/shops")) return "Shops";
    if (pathname.startsWith("/owner/customers")) return "Customers";
    if (pathname.startsWith("/owner/inventory")) return "Inventory";
    if (pathname.startsWith("/owner/settings")) return "Settings";
    return "Optical Manager";
  };

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OW";

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      
      {/* Page Title & Hamburger & Org Badge */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Title */}
        <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
          {getPageTitle()}
        </h1>

        {/* Org badge */}
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/50">
          {organizationName}
        </span>
      </div>

      {/* Actions: Notifications & Avatar Dropdown */}
      <div className="flex items-center gap-4">
        
        {/* Notification Bell */}
        <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 transition-colors relative cursor-pointer">
          <Bell className="w-5 h-5" />
          {hasLowStockAlerts && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* Avatar and Dropdown Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer group"
          >
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.fullName} 
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-inner group-hover:bg-indigo-200/70 transition-colors">
                {initials}
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-sm z-30 animate-fade-in divide-y divide-slate-100">
              <div className="px-4 py-2 text-slate-500 text-xs">
                Logged in as <br/>
                <span className="font-semibold text-slate-800 truncate block mt-0.5">{user.email}</span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/owner/settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile Settings</span>
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/owner/settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Org Settings</span>
                </button>
              </div>
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
