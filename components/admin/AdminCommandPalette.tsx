"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Building2, 
  Store, 
  CreditCard, 
  Users, 
  ArrowRight, 
  ExternalLink,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: "PAGES" | "STORES" | "LEADS";
  badge?: string;
}

interface AdminCommandPaletteProps {
  organizations?: any[];
}

export default function AdminCommandPalette({ organizations = [] }: AdminCommandPaletteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const staticItems: CommandItem[] = [
    {
      id: "page-overview",
      title: "Platform Overview",
      subtitle: "Executive SaaS Cockpit & Telemetry",
      href: "/admin",
      category: "PAGES",
      badge: "Cockpit",
    },
    {
      id: "page-stores",
      title: "Tenant Stores Directory",
      subtitle: "Manage optical retail chains and physical branches",
      href: "/admin/organizations",
      category: "PAGES",
      badge: "Stores",
    },
    {
      id: "page-subs",
      title: "Subscriptions & Billing",
      subtitle: "Plan tiers, validity dates, license extensions",
      href: "/admin/organizations?tab=subscriptions",
      category: "PAGES",
      badge: "Billing",
    },
    {
      id: "page-addons",
      title: "Add-on Services & API Hub",
      subtitle: "GSTIN verification, WhatsApp dispatches, and rate cards",
      href: "/admin/addons",
      category: "PAGES",
      badge: "Add-ons",
    },
    {
      id: "page-leads",
      title: "Demo Requests (Leads CRM)",
      subtitle: "Inbound landing requests & WhatsApp demo pipeline",
      href: "/admin/leads",
      category: "PAGES",
      badge: "Leads",
    },
    {
      id: "page-pos",
      title: "Launch Store POS Billing",
      subtitle: "Direct optical dispensary register",
      href: "/shop/dashboard",
      category: "PAGES",
      badge: "POS",
    },
    {
      id: "page-owner",
      title: "Launch Owner Console",
      subtitle: "Optical retail headquarter settings",
      href: "/owner",
      category: "PAGES",
      badge: "Owner",
    },
  ];

  const storeItems: CommandItem[] = organizations.map((org) => ({
    id: `store-${org.id}`,
    title: org.name,
    subtitle: `Slug: ${org.slug} • Owner: ${org.ownerName || "Unassigned"} (${org.ownerEmail || "N/A"})`,
    href: `/admin/organizations/${org.id}`,
    category: "STORES",
    badge: org.plan || "PRO",
  }));

  const allItems = [...staticItems, ...storeItems];

  const filteredItems = query.trim()
    ? allItems.filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          (i.subtitle && i.subtitle.toLowerCase().includes(query.toLowerCase())) ||
          (i.badge && i.badge.toLowerCase().includes(query.toLowerCase()))
      )
    : allItems.slice(0, 8);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-[#111827]">
          <Search className="h-4 w-4 text-blue-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, store name, slug, or owner email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-slate-400 hover:text-white p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No matching pages or stores found for "{query}".
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item.href)}
                className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700/80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-blue-600/20 text-slate-400 group-hover:text-blue-400 transition-colors shrink-0">
                    {item.category === "STORES" ? (
                      <Store className="h-4 w-4" />
                    ) : item.category === "LEADS" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <Building2 className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 group-hover:border-blue-500/30 group-hover:text-blue-300">
                      {item.badge}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#0b0f17] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate with mouse or arrow keys</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
