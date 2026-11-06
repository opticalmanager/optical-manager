"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  LogOut,
  ExternalLink,
  ChevronRight,
  Activity,
  Sparkles,
  Search,
  Megaphone,
  Download,
  AlertTriangle,
  Cpu,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminCommandPalette from "./AdminCommandPalette";
import AdminBroadcastModal from "./AdminBroadcastModal";
import { exportSaaSTelemetryAction } from "@/services/admin.service";
import { toast } from "sonner";

interface AdminSidebarProps {
  adminName?: string;
  pendingLeadsCount?: number;
  expiringCount?: number;
  organizations?: any[];
}

interface NavSection {
  heading: string;
  items: {
    title: string;
    href: string;
    exact?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number | null;
    badgeVariant?: "amber" | "blue" | "emerald" | "rose";
  }[];
}

export default function AdminSidebar({ 
  adminName = "Super Admin", 
  pendingLeadsCount = 0,
  expiringCount = 0,
  organizations = []
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleAdminLogout = async () => {
    const { performLogout } = await import("@/utils/auth-logout");
    await performLogout("/admin/login");
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await exportSaaSTelemetryAction();
      if (res?.success && res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename || "optical_manager_telemetry.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("SaaS telemetry CSV exported successfully!");
      } else {
        toast.error("Failed to export telemetry data.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to export CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  const navSections: NavSection[] = [
    {
      heading: "PLATFORM CONTROL",
      items: [
        {
          title: "Platform Overview",
          href: "/admin",
          exact: true,
          icon: LayoutDashboard,
        },
        {
          title: "Renewals & Churn Radar",
          href: "/admin?view=renewals",
          icon: AlertTriangle,
          badge: expiringCount > 0 ? expiringCount : null,
          badgeVariant: "amber",
        },
      ],
    },
    {
      heading: "TENANT MANAGEMENT",
      items: [
        {
          title: "Tenant Store Chains",
          href: "/admin/organizations",
          exact: true,
          icon: Building2,
        },
        {
          title: "Subscriptions & Billing",
          href: "/admin/organizations?tab=subscriptions",
          icon: CreditCard,
        },
        {
          title: "Add-on Services & APIs",
          href: "/admin/addons",
          icon: Cpu,
        },
      ],
    },
    {
      heading: "GROWTH & PIPELINE",
      items: [
        {
          title: "Demo Requests (Leads)",
          href: "/admin/leads",
          icon: Users,
          badge: pendingLeadsCount > 0 ? pendingLeadsCount : null,
          badgeVariant: "amber",
        },
      ],
    },
    {
      heading: "STORE SHORTCUTS",
      items: [
        {
          title: "Launch Store POS",
          href: "/shop/dashboard",
          icon: ExternalLink,
        },
        {
          title: "Launch Owner Console",
          href: "/owner",
          icon: ExternalLink,
        },
      ],
    },
  ];

  return (
    <>
      <aside className="flex h-screen w-64 flex-col border-r border-slate-800/80 bg-[#0f172a] text-slate-300 select-none shrink-0 shadow-2xl">
        {/* Header Branding */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#0d1527]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/30 shrink-0 shadow-inner">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold tracking-tight text-white truncate flex items-center gap-1.5">
                <span>Optical Manager</span>
              </h1>
              <span className="text-[10px] font-semibold text-slate-400 block truncate tracking-wide">
                Super Admin Cockpit
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0" title="Super Admin System Live">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-400 tracking-wider">LIVE</span>
          </div>
        </div>

        {/* Global Command Search Quick Bar */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
              window.dispatchEvent(event);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#111c33] border border-slate-800/90 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[11px] font-medium">Quick Jump...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-4 p-3 overflow-y-auto custom-scrollbar">
          {navSections.map((section) => (
            <div key={section.heading} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400/90 flex items-center justify-between">
                <span>{section.heading}</span>
              </div>

              <div className="space-y-0.5 pt-0.5">
                {section.items.map((item) => {
                  let isActive = false;
                  if (item.exact) {
                    isActive = pathname === item.href;
                  } else if (item.href.includes("?")) {
                    const [baseHref, queryPart] = item.href.split("?");
                    isActive = pathname === baseHref && typeof window !== "undefined" && window.location.search.includes(queryPart);
                  } else {
                    isActive = pathname.startsWith(item.href);
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150",
                        isActive
                          ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold shadow-xs"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </div>

                      {item.badge !== undefined && item.badge !== null && (
                        <span
                          className={cn(
                            "ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0",
                            item.badgeVariant === "amber" &&
                              "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse",
                            item.badgeVariant === "rose" &&
                              "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                            item.badgeVariant === "emerald" &&
                              "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                            (!item.badgeVariant || item.badgeVariant === "blue") &&
                              "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Platform Actions Tier */}
          <div className="space-y-1 pt-1">
            <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400/90 flex items-center justify-between">
              <span>ADMIN CONTROLS</span>
            </div>
            <div className="space-y-1 pt-0.5">
              <button
                type="button"
                onClick={() => setIsBroadcastOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all border border-transparent cursor-pointer"
              >
                <Megaphone className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="truncate">Broadcast Notice</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all border border-transparent cursor-pointer"
              >
                <Download className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="truncate">{isExporting ? "Exporting..." : "Export SaaS CSV"}</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Bottom Footer: Super Admin Profile Card & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#0d1527]">
          <div className="px-3 py-2.5 bg-[#111c33] rounded-xl border border-slate-800/80 flex items-center gap-2.5 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
              {adminName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-extrabold tracking-wider text-blue-400 uppercase bg-blue-500/10 px-1 py-0.2 rounded border border-blue-500/20 leading-none">
                  SUPER ADMIN
                </span>
              </div>
              <span className="text-xs font-bold text-white truncate block mt-1 leading-none" title={adminName}>
                {adminName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="w-full group flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-transparent transition-all cursor-pointer bg-transparent"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-rose-400 transition-colors" />
            <span>Exit Admin Panel</span>
          </button>
        </div>
      </aside>

      {/* Global Command Palette & Broadcast Modal */}
      <AdminCommandPalette organizations={organizations} />
      <AdminBroadcastModal isOpen={isBroadcastOpen} onClose={() => setIsBroadcastOpen(false)} />
    </>
  );
}
