"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Check, 
  Truck, 
  CreditCard, 
  Calendar, 
  Clock, 
  AlertCircle 
} from "lucide-react";

interface OrdersFilterPopoverProps {
  currentFilter: string;
  currentTab: string;
  currentTimeframe: string;
  currentPaymentMethod?: string;
  currentHasDues?: boolean;
  search: string;
}

const FULFILLMENT_OPTIONS = [
  { id: "ALL", label: "All Delivery" },
  { id: "PENDING", label: "Pending" },
  { id: "READY", label: "Ready for Pickup" },
  { id: "PROCESSING", label: "In Lab / Fitting" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "DELAYED", label: "Overdue / Delayed" },
  { id: "ON_HOLD", label: "On Hold" },
];

const PAYMENT_STATUS_OPTIONS = [
  { id: "ALL", label: "All Payment" },
  { id: "PAID", label: "Paid in Full" },
  { id: "PARTIALLY_PAID", label: "Partially Paid" },
  { id: "UNPAID", label: "Unpaid (Zero Paid)" },
];

const PAYMENT_METHOD_OPTIONS = [
  { id: "ALL", label: "All Modes" },
  { id: "CASH", label: "Cash" },
  { id: "UPI", label: "UPI / QR" },
  { id: "CARD", label: "Card" },
  { id: "BANK_TRANSFER", label: "Bank Transfer" },
];

const TIMEFRAME_OPTIONS = [
  { id: "24h", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days (Default)" },
  { id: "90d", label: "Last 90 Days" },
  { id: "12m", label: "Last 12 Months" },
  { id: "ytd", label: "Year to Date" },
  { id: "all", label: "All Time" },
];

export function OrdersFilterPopover({
  currentFilter,
  currentTab,
  currentTimeframe,
  currentPaymentMethod = "ALL",
  currentHasDues = false,
  search,
}: OrdersFilterPopoverProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Local draft state for the popover
  const [selectedFilter, setSelectedFilter] = useState(currentFilter || "ALL");
  const [selectedTab, setSelectedTab] = useState(currentTab || "ALL");
  const [selectedTimeframe, setSelectedTimeframe] = useState(currentTimeframe || "30d");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(currentPaymentMethod || "ALL");
  const [selectedHasDues, setSelectedHasDues] = useState(currentHasDues);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync draft state whenever url props change
  useEffect(() => {
    setSelectedFilter(currentFilter || "ALL");
    setSelectedTab(currentTab || "ALL");
    setSelectedTimeframe(currentTimeframe || "30d");
    setSelectedPaymentMethod(currentPaymentMethod || "ALL");
    setSelectedHasDues(currentHasDues);
  }, [currentFilter, currentTab, currentTimeframe, currentPaymentMethod, currentHasDues]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Calculate active filter count (excluding defaults)
  let activeFilterCount = 0;
  if (currentFilter && currentFilter !== "ALL") activeFilterCount++;
  if (currentTab && currentTab !== "ALL") activeFilterCount++;
  if (currentTimeframe && currentTimeframe !== "30d") activeFilterCount++;
  if (currentPaymentMethod && currentPaymentMethod !== "ALL") activeFilterCount++;
  if (currentHasDues) activeFilterCount++;

  function handleResetDraft() {
    setSelectedFilter("ALL");
    setSelectedTab("ALL");
    setSelectedTimeframe("30d");
    setSelectedPaymentMethod("ALL");
    setSelectedHasDues(false);
  }

  function handleApply() {
    const params = new URLSearchParams(searchParams?.toString() || "");
    
    // Always reset page to 1 on filter application
    params.set("page", "1");

    if (selectedFilter && selectedFilter !== "ALL") {
      params.set("filter", selectedFilter);
    } else {
      params.delete("filter");
    }

    if (selectedTab && selectedTab !== "ALL") {
      params.set("tab", selectedTab);
    } else {
      params.delete("tab");
    }

    if (selectedTimeframe && selectedTimeframe !== "30d") {
      params.set("timeframe", selectedTimeframe);
    } else {
      params.delete("timeframe");
    }

    if (selectedPaymentMethod && selectedPaymentMethod !== "ALL") {
      params.set("paymentMethod", selectedPaymentMethod);
    } else {
      params.delete("paymentMethod");
    }

    if (selectedHasDues) {
      params.set("hasDues", "true");
    } else {
      params.delete("hasDues");
    }

    if (search) {
      params.set("search", search);
    }

    setIsOpen(false);
    router.push(`/shop/orders?${params.toString()}`);
  }

  function handleQuickClearAll() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    setIsOpen(false);
    router.push(`/shop/orders${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* ─── Main Industrial Filter Button ─── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs select-none ${
          activeFilterCount > 0
            ? "border-[#2563eb] text-[#2563eb] bg-blue-50/70 hover:bg-blue-100/70 shadow-xs ring-1 ring-[#2563eb]/20"
            : "border-slate-200 hover:bg-slate-50 text-slate-800 bg-white hover:border-slate-300"
        }`}
        aria-expanded={isOpen}
        title="Open Industrial Orders Filter"
      >
        <SlidersHorizontal className={`h-4 w-4 ${activeFilterCount > 0 ? "text-[#2563eb]" : "text-slate-600"}`} />
        <span>Filter</span>
        {activeFilterCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#2563eb] text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* ─── Popover Modal Backdrop & Dropdown ─── */}
      {isOpen && (
        <>
          {/* Backdrop Click Dismissal */}
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
            onClick={() => setIsOpen(false)}
          />

          {/* Filter Panel */}
          <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden text-left flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-blue-100/60 text-[#2563eb]">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 leading-none">
                    Filter Orders
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Multi-criteria industrial query engine
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 px-2 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  title="Reset filters to default"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Filter Body */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs">
              {/* 1. Fulfillment & Delivery Status */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-2">
                  <Truck className="h-3 w-3 text-slate-500" />
                  <span>Fulfillment & Delivery</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {FULFILLMENT_OPTIONS.map((opt) => {
                    const isSelected = selectedFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedFilter(opt.id)}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all text-left truncate cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#2563eb] text-white shadow-xs font-black"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="h-3 w-3 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Payment & Settlement Status */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-2">
                  <CreditCard className="h-3 w-3 text-slate-500" />
                  <span>Payment Status</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAYMENT_STATUS_OPTIONS.map((opt) => {
                    const isSelected = selectedTab === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedTab(opt.id)}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all text-left truncate cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#2563eb] text-white shadow-xs font-black"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="h-3 w-3 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Payment Method */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-2">
                  <CreditCard className="h-3 w-3 text-slate-500" />
                  <span>Payment Mode</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHOD_OPTIONS.map((opt) => {
                    const isSelected = selectedPaymentMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(opt.id)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#2563eb] text-white shadow-xs font-black"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Timeframe / Date Range */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-2">
                  <Calendar className="h-3 w-3 text-slate-500" />
                  <span>Timeframe / Period</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {TIMEFRAME_OPTIONS.map((opt) => {
                    const isSelected = selectedTimeframe === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedTimeframe(opt.id)}
                        className={`px-2 py-1.5 text-[10.5px] font-bold rounded-lg transition-all text-center truncate cursor-pointer ${
                          isSelected
                            ? "bg-[#2563eb] text-white shadow-xs font-black"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                        }`}
                      >
                        {opt.label.split(" (")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Special Dues Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-amber-50/60 border border-amber-200/60 cursor-pointer hover:bg-amber-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedHasDues}
                    onChange={(e) => setSelectedHasDues(e.target.checked)}
                    className="h-4 w-4 rounded text-[#2563eb] focus:ring-[#2563eb] border-slate-300 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-amber-950">
                      Pending Balance Due Only
                    </span>
                    <span className="text-[10px] text-amber-700">
                      Show only orders with unpaid balance dues (&gt; ₹0.00)
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleQuickClearAll}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Apply Filters</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * High-Density Active Filter Chips Bar
 * Renders removable filter tags directly above the table when any filter is active.
 */
export function ActiveOrderFilterChips({
  currentFilter,
  currentTab,
  currentTimeframe,
  currentPaymentMethod,
  currentHasDues,
  search,
}: {
  currentFilter: string;
  currentTab: string;
  currentTimeframe: string;
  currentPaymentMethod?: string;
  currentHasDues?: boolean;
  search: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isFilterActive = currentFilter && currentFilter !== "ALL";
  const isTabActive = currentTab && currentTab !== "ALL";
  const isTimeframeActive = currentTimeframe && currentTimeframe !== "30d";
  const isMethodActive = currentPaymentMethod && currentPaymentMethod !== "ALL";
  const isDuesActive = !!currentHasDues;

  const hasAnyActive = isFilterActive || isTabActive || isTimeframeActive || isMethodActive || isDuesActive;

  if (!hasAnyActive) return null;

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete(key);
    params.set("page", "1");
    router.push(`/shop/orders?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    router.push(`/shop/orders${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const fulfillmentLabel = FULFILLMENT_OPTIONS.find((o) => o.id === currentFilter)?.label || currentFilter;
  const paymentLabel = PAYMENT_STATUS_OPTIONS.find((o) => o.id === currentTab)?.label || currentTab;
  const methodLabel = PAYMENT_METHOD_OPTIONS.find((o) => o.id === currentPaymentMethod)?.label || currentPaymentMethod;
  const timeframeLabel = TIMEFRAME_OPTIONS.find((o) => o.id === currentTimeframe)?.label?.split(" (")[0] || currentTimeframe;

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
        <span>Active Filters:</span>
      </span>

      {/* Fulfillment Chip */}
      {isFilterActive && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2563eb] border border-blue-200/80 shadow-2xs">
          <span>Delivery: {fulfillmentLabel}</span>
          <button
            type="button"
            onClick={() => removeFilter("filter")}
            className="hover:text-blue-900 cursor-pointer p-0.5 rounded-full hover:bg-blue-100"
            title="Remove filter"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {/* Payment Tab Chip */}
      {isTabActive && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
          <span>Payment: {paymentLabel}</span>
          <button
            type="button"
            onClick={() => removeFilter("tab")}
            className="hover:text-emerald-900 cursor-pointer p-0.5 rounded-full hover:bg-emerald-100"
            title="Remove filter"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {/* Payment Method Chip */}
      {isMethodActive && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
          <span>Mode: {methodLabel}</span>
          <button
            type="button"
            onClick={() => removeFilter("paymentMethod")}
            className="hover:text-indigo-900 cursor-pointer p-0.5 rounded-full hover:bg-indigo-100"
            title="Remove filter"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {/* Timeframe Chip */}
      {isTimeframeActive && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
          <span>Period: {timeframeLabel}</span>
          <button
            type="button"
            onClick={() => removeFilter("timeframe")}
            className="hover:text-slate-900 cursor-pointer p-0.5 rounded-full hover:bg-slate-200"
            title="Remove filter"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {/* Pending Dues Chip */}
      {isDuesActive && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
          <span>Pending Dues Only</span>
          <button
            type="button"
            onClick={() => removeFilter("hasDues")}
            className="hover:text-amber-950 cursor-pointer p-0.5 rounded-full hover:bg-amber-100"
            title="Remove filter"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {/* Clear All Button */}
      <button
        type="button"
        onClick={clearAll}
        className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline ml-1 cursor-pointer transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}
