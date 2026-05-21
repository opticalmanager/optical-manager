"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  user?: {
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export function Topbar({ user }: TopbarProps) {
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

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SM";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-8 select-none">
      {/* Search */}
      <div className="flex max-w-md flex-1 items-center gap-2 rounded-md bg-surface px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Search className="h-4 w-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search patients, invoices, or stock..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 ml-auto">
        <Button variant="outline" className="font-semibold text-text-main">
          Add Patient
        </Button>
        <Button className="font-semibold">
          New Invoice
        </Button>
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <button className="text-text-muted hover:text-text-main transition-colors cursor-pointer">
          <Bell className="h-5 w-5" />
        </button>
        
        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer group"
          >
            {user?.avatarUrl ? (
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
                <span className="font-semibold text-slate-800 truncate block mt-0.5">{user?.email || "Manager"}</span>
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
