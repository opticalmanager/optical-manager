"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Package,
  ShoppingBag,
  Receipt,
  Truck,
  Users,
  Calendar,
  BarChart3,
  SlidersHorizontal,
  ChevronRight,
  Search,
  Check,
  RotateCcw,
  Save,
  Building2,
  Store,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { saveCustomizationSettingsAction } from "@/actions/customization.actions";
import type {
  CustomizationConfig,
  ModuleConfig,
  ModuleCustomizationItem,
} from "@/services/customization.service";

interface ShopOption {
  id: string;
  name: string;
}

interface CustomizationSettingsClientProps {
  initialConfig: CustomizationConfig;
  organizationName: string;
  shops: ShopOption[];
}

interface ModuleMeta {
  key: keyof CustomizationConfig;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
  badge: string;
  color: string;
}

const MODULES_META: ModuleMeta[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    shortDesc: "KPI cards, overview analytics, and quick action shortcuts",
    icon: LayoutGrid,
    badge: "Analytics",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    key: "inventory",
    title: "Inventory",
    shortDesc: "Catalog fields, barcode scanners, dimensions, and low-stock rules",
    icon: Package,
    badge: "Catalog",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    key: "sales",
    title: "Sales & Orders",
    shortDesc: "Order stages, lab fitting steps, salesperson attribution, and deposits",
    icon: ShoppingBag,
    badge: "Counter",
    color: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    key: "invoices",
    title: "Invoices",
    shortDesc: "Invoice layout, GST tax columns, UPI QR code, and warranty terms",
    icon: Receipt,
    badge: "Billing",
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    key: "vendors",
    title: "Vendors & Purchases",
    shortDesc: "Supplier profiles, PO prefixes, stock inwarding, and credit terms",
    icon: Truck,
    badge: "Purchases",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "customers",
    title: "Customers & Clinical",
    shortDesc: "Patient registration, eye refraction matrix, and medical history tags",
    icon: Users,
    badge: "Clinical",
    color: "bg-sky-50 text-sky-600 border-sky-200",
  },
  {
    key: "appointments",
    title: "Appointments",
    shortDesc: "Consultation durations, SMS confirmations, and counter calendar strip",
    icon: Calendar,
    badge: "Bookings",
    color: "bg-teal-50 text-teal-600 border-teal-200",
  },
  {
    key: "reports",
    title: "Reports & Analytics",
    shortDesc: "GST filing exports, register closing, and accounting download formats",
    icon: BarChart3,
    badge: "Exports",
    color: "bg-rose-50 text-rose-600 border-rose-200",
  },
];

export function CustomizationSettingsClient({
  initialConfig,
  organizationName,
  shops,
}: CustomizationSettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");

  const initialTab: keyof CustomizationConfig =
    rawTab && MODULES_META.some((m) => m.key === rawTab)
      ? (rawTab as keyof CustomizationConfig)
      : "dashboard";

  const [activeTab, setActiveTab] = useState<keyof CustomizationConfig>(initialTab);
  const [selectedShopId, setSelectedShopId] = useState<string>("org"); // "org" or shopId
  const [config, setConfig] = useState<CustomizationConfig>(initialConfig);
  const [initialSavedState, setInitialSavedState] = useState<string>(
    JSON.stringify(initialConfig)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const isDirty = JSON.stringify(config) !== initialSavedState;

  const handleTabChange = (newTab: keyof CustomizationConfig) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleToggleItem = (moduleKey: keyof CustomizationConfig, itemId: string) => {
    setConfig((prev) => {
      const targetModule = prev[moduleKey];
      const updatedItems = targetModule.items.map((item) =>
        item.id === itemId ? { ...item, enabled: !item.enabled } : item
      );
      return {
        ...prev,
        [moduleKey]: {
          ...targetModule,
          items: updatedItems,
        },
      };
    });
  };

  const handleUpdateItemValue = (
    moduleKey: keyof CustomizationConfig,
    itemId: string,
    value: any
  ) => {
    setConfig((prev) => {
      const targetModule = prev[moduleKey];
      const updatedItems = targetModule.items.map((item) =>
        item.id === itemId ? { ...item, defaultValue: value } : item
      );
      return {
        ...prev,
        [moduleKey]: {
          ...targetModule,
          items: updatedItems,
        },
      };
    });
  };

  const handleResetCurrentModule = () => {
    const defaultModule = initialConfig[activeTab];
    setConfig((prev) => ({
      ...prev,
      [activeTab]: JSON.parse(JSON.stringify(defaultModule)),
    }));
    toast.info(`Reset ${MODULES_META.find((m) => m.key === activeTab)?.title} to initial values.`);
  };

  const handleSaveAll = () => {
    startTransition(async () => {
      try {
        const targetShopId = selectedShopId === "org" ? null : selectedShopId;
        const res = await saveCustomizationSettingsAction({
          shopId: targetShopId,
          config,
        });

        if (res.success) {
          setInitialSavedState(JSON.stringify(config));
          toast.success(res.message || "Customization settings saved successfully!");
        } else {
          toast.error(res.message || "Failed to save settings.");
        }
      } catch (err: any) {
        toast.error(err?.message || "An unexpected error occurred while saving.");
      }
    });
  };

  const activeMeta = MODULES_META.find((m) => m.key === activeTab)!;
  const currentModuleConfig: ModuleConfig = config[activeTab] || {
    id: activeTab,
    title: activeMeta.title,
    subtitle: activeMeta.shortDesc,
    items: [],
  };

  // Filter items by search query
  const filteredItems = currentModuleConfig.items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Group items by category
  const categories = [
    { id: "fields", label: "Fields & Attributes", count: filteredItems.filter((i) => i.category === "fields").length },
    { id: "display", label: "Display & Table Columns", count: filteredItems.filter((i) => i.category === "display").length },
    { id: "workflow", label: "Workflow & Automation Rules", count: filteredItems.filter((i) => i.category === "workflow").length },
    { id: "printing", label: "Print & Export Formats", count: filteredItems.filter((i) => i.category === "printing").length },
  ].filter((c) => c.count > 0);

  return (
    <div className="space-y-4 pb-20 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link
                href="/owner/settings"
                className="hover:text-[#2563eb] flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Settings
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-800 font-bold">Customization</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-[#2563eb] font-bold">{activeMeta.title}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              Store & Module Customization
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Configure customizable fields, table columns, checkout workflows, and printing rules across all optical modules.
            </p>
          </div>

          {/* Scope Selector: Organization Default vs Specific Shop Override */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="relative">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                TARGET SCOPE
              </label>
              <div className="relative">
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="h-9 pl-8 pr-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all cursor-pointer shadow-2xs appearance-none"
                >
                  <option value="org">🏢 All Shops ({organizationName} Default)</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      🏬 {shop.name} (Shop Override)
                    </option>
                  ))}
                </select>
                <Building2 className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Master Sidebar (List of 8 Modules) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                CUSTOMIZABLE MODULES ({MODULES_META.length})
              </span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Live Suite
              </span>
            </div>

            <div className="space-y-1.5">
              {MODULES_META.map((mod, index) => {
                const Icon = mod.icon;
                const isActive = activeTab === mod.key;
                const totalItems = config[mod.key]?.items?.length || 0;
                const activeItemsCount =
                  config[mod.key]?.items?.filter((i) => i.enabled).length || 0;

                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => handleTabChange(mod.key)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer group ${
                      isActive
                        ? "bg-blue-50/70 border-2 border-[#2563eb] shadow-sm scale-[1.01]"
                        : "bg-slate-50/50 hover:bg-slate-100/70 border border-slate-200/60"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? "bg-[#2563eb] text-white shadow-xs" : mod.color
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400">
                            #{index + 1}
                          </span>
                          <h3
                            className={`text-xs font-bold truncate ${
                              isActive ? "text-[#2563eb]" : "text-slate-900"
                            }`}
                          >
                            {mod.title}
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                          {activeItemsCount}/{totalItems} active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {mod.shortDesc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Detail Workspace */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
            {/* Active Module Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${activeMeta.color}`}
                >
                  <activeMeta.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      {currentModuleConfig.title}
                    </h2>
                    <span className="text-[10px] font-extrabold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      {activeMeta.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentModuleConfig.subtitle}
                  </p>
                </div>
              </div>

              {/* Reset to Module Defaults */}
              <button
                type="button"
                onClick={handleResetCurrentModule}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Reset Section
              </button>
            </div>

            {/* Quick Search Filter for this module */}
            <div className="relative">
              <input
                type="text"
                placeholder={`Search customizable attributes in ${activeMeta.title}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Categorized Configuration Cards */}
            {categories.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6">
                <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">No customizable items match search</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try clearing the search query to see all available options.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((cat) => {
                  const itemsInCat = filteredItems.filter((i) => i.category === cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                          {cat.label}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          {itemsInCat.length} options
                        </span>
                      </div>

                      <div className="space-y-2">
                        {itemsInCat.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              item.enabled
                                ? "bg-white border-slate-200/90 shadow-2xs"
                                : "bg-slate-100/50 border-slate-200/50 opacity-75"
                            }`}
                          >
                            <div className="space-y-0.5 flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {item.name}
                                </span>
                                {item.enabled ? (
                                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {item.description}
                              </p>
                            </div>

                            {/* Control Widget */}
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                              {item.type === "select" && item.options && (
                                <select
                                  value={String(item.defaultValue || item.options[0])}
                                  onChange={(e) =>
                                    handleUpdateItemValue(activeTab, item.id, e.target.value)
                                  }
                                  disabled={!item.enabled}
                                  className="h-7.5 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] disabled:opacity-50 cursor-pointer shadow-2xs"
                                >
                                  {item.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {item.type === "number" && (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={Number(item.defaultValue ?? 0)}
                                    onChange={(e) =>
                                      handleUpdateItemValue(
                                        activeTab,
                                        item.id,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    disabled={!item.enabled}
                                    className="w-16 h-7.5 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] disabled:opacity-50 shadow-2xs"
                                  />
                                </div>
                              )}

                              {item.type === "text" && (
                                <input
                                  type="text"
                                  value={String(item.defaultValue ?? "")}
                                  onChange={(e) =>
                                    handleUpdateItemValue(activeTab, item.id, e.target.value)
                                  }
                                  disabled={!item.enabled}
                                  className="w-24 h-7.5 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] disabled:opacity-50 shadow-2xs"
                                />
                              )}

                              {/* Toggle Switch */}
                              <button
                                type="button"
                                role="switch"
                                aria-checked={item.enabled}
                                onClick={() => handleToggleItem(activeTab, item.id)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 ${
                                  item.enabled ? "bg-[#2563eb]" : "bg-slate-300"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    item.enabled ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Action Bar */}
      {isDirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-2 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold">Unsaved customization changes</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfig(JSON.parse(initialSavedState));
                toast.info("Discarded unsaved customization changes.");
              }}
              className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isPending}
              className="h-8 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? "Saving..." : "Save Customization"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
