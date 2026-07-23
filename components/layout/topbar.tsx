"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Search, 
  Bell, 
  LogOut, 
  ChevronDown, 
  Loader2, 
  User, 
  ReceiptText, 
  Package, 
  ArrowRight,
  Sparkles,
  Menu
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  user?: {
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    role?: string;
  } | null;
  shopName: string;
  onMenuClick?: () => void;
}

export function Topbar({ user, shopName, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const pathname = usePathname();
  
  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Search autocomplete states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    inventory: any[];
    invoices: any[];
  }>({ customers: [], inventory: [], invoices: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults({ customers: [], inventory: [], invoices: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Autocomplete search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

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

  const humanReadableRole = user?.role === "SHOP_MANAGER" ? "Shop Manager" : "Owner";

  // Dynamic placeholder based on route
  const searchPlaceholder = pathname.startsWith("/shop/customers")
    ? "Search patient name, ID, or phone..."
    : "Search patients, invoices, or stock...";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 md:px-8 select-none z-20">
      
      {/* Autocomplete Search Bar */}
      <div className="relative flex-1 max-w-md flex items-center gap-2.5" ref={searchContainerRef}>
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl border border-slate-200/60 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer flex items-center justify-center bg-white"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/50 px-3.5 py-2 focus-within:ring-2 focus-within:ring-[#0a52c3]/20 focus-within:border-[#0a52c3] focus-within:bg-white transition-all">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className="w-full bg-transparent text-xs outline-none text-slate-800 placeholder:text-slate-400/80 font-medium"
          />
          {isSearching && (
            <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin shrink-0" />
          )}
        </div>

        {/* Autocomplete Dropdown floating results */}
        {searchFocused && (searchQuery.trim().length >= 2) && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto animate-fade-in">
            
            {/* Loading Indicator */}
            {isSearching && (
              <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-1.5 justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                Searching clinical databanks...
              </div>
            )}

            {/* Empty State */}
            {!isSearching && 
              searchResults.customers.length === 0 && 
              searchResults.inventory.length === 0 && 
              searchResults.invoices.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-slate-400">
                  No matching patients, invoices, or stock items.
                </div>
            )}

            {/* Customers Group */}
            {searchResults.customers.length > 0 && (
              <div className="p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  Patients
                </div>
                {searchResults.customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      router.push("/shop/customers");
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div>
                      <span className="font-semibold text-slate-700 block">{c.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Phone: {c.phone || "N/A"}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Inventory Group */}
            {searchResults.inventory.length > 0 && (
              <div className="p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Package className="h-3 w-3 text-slate-400" />
                  Stock & Assets
                </div>
                {searchResults.inventory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(`/shop/inventory/edit/${item.id}`);
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div>
                      <span className="font-semibold text-slate-700 block">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        SKU: {item.sku || "N/A"} • Category: {item.category}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Invoices Group */}
            {searchResults.invoices.length > 0 && (
              <div className="p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ReceiptText className="h-3 w-3 text-slate-400" />
                  Invoices Ledger
                </div>
                {searchResults.invoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      router.push(`/shop/invoices/${inv.id}`);
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div>
                      <span className="font-semibold text-slate-700 block">{inv.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Total Amount: ₹{inv.total}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header Buttons & Avatar Dropdown */}
      <div className="flex items-center gap-4 ml-auto">
        <button
          onClick={() => router.push("/shop/patients/new")}
          className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer hidden sm:block"
        >
          Add Patient
        </button>
        <button
          onClick={() => router.push("/shop/invoices/new")}
          className="h-10 w-10 md:w-auto md:px-4 rounded-xl bg-[#0a52c3] hover:bg-[#004bb5] text-xs font-bold text-white shadow-sm shadow-[#0a52c3]/15 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <ReceiptText className="h-4 w-4" />
          <span className="hidden md:inline">New Invoice</span>
        </button>
        
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
        
        <button className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
          <Bell className="h-4.5 w-4.5" />
        </button>
        
        {/* User Dropdown Menus */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer group"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={user.avatarUrl} 
                alt={user.fullName} 
                className="w-8 h-8 rounded-lg object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-[10px] font-extrabold text-indigo-650 shadow-inner group-hover:bg-indigo-100 transition-colors">
                {initials}
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 text-xs z-30 animate-fade-in divide-y divide-slate-100">
              {/* User Bio Details */}
              <div className="px-4 py-3 space-y-1">
                <span className="font-extrabold text-slate-800 block leading-tight truncate">
                  {user?.fullName || "User Profile"}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block truncate">
                  {user?.email || "manager@optics.com"}
                </span>
                <div className="flex items-center gap-1.5 pt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200/50 uppercase truncate max-w-[100px]">
                    {shopName}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-650 border border-indigo-100 uppercase">
                    {humanReadableRole}
                  </span>
                </div>
              </div>

              {/* Action Buttons Link */}
              <div className="py-1">
                <button
                  onClick={() => {
                    router.push("/shop/settings");
                    setDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2 text-slate-600 hover:bg-slate-50 transition-colors text-left font-semibold cursor-pointer"
                >
                  My Profile Settings
                </button>
              </div>

              {/* Log out */}
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Log out Profile</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
