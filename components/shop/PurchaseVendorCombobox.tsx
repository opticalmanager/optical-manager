"use client";

import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Plus,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { Vendor } from "@/types";
import { getStateFromGSTIN } from "@/utils/gstin";
import { VendorModal } from "@/components/shop/VendorModal";

interface PurchaseVendorComboboxProps {
  vendors: Vendor[];
  selectedVendorId?: string | null;
  selectedVendorName: string;
  onSelectVendor: (vendor: Vendor | null, nameFallback?: string) => void;
  shopState?: string;
  onStateChange?: (state: string) => void;
}

export function PurchaseVendorCombobox({
  vendors: initialVendors,
  selectedVendorId,
  selectedVendorName,
  onSelectVendor,
}: PurchaseVendorComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vendorsList, setVendorsList] = useState<Vendor[]>(initialVendors);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter vendors or search API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setVendorsList(initialVendors);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/vendors/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setVendorsList(data);
        }
      } catch (err) {
        console.error("Vendor search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, initialVendors]);

  const selectedVendor = vendorsList.find((v) => v.id === selectedVendorId);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Combobox Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3.5 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between text-left hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#2563eb]/20 transition-all text-xs cursor-pointer shadow-2xs"
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
          {selectedVendor ? (
            <div className="truncate">
              <span className="font-bold text-slate-800">
                {selectedVendor.name}
              </span>
              {selectedVendor.gstin && (
                <span className="ml-2 text-[10px] font-mono text-slate-400">
                  ({selectedVendor.gstin}
                  {getStateFromGSTIN(selectedVendor.gstin) ? ` • ${getStateFromGSTIN(selectedVendor.gstin)}` : ""}
                  )
                </span>
              )}
            </div>
          ) : selectedVendorName ? (
            <span className="font-bold text-slate-800 truncate">
              {selectedVendorName}
            </span>
          ) : (
            <span className="text-slate-400 font-medium">Select Supplier...</span>
          )}
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 slide-in-from-top-1">
          {/* Search box inside dropdown */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Search vendor name, phone, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent border-none focus:outline-hidden text-slate-800 placeholder-slate-400"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Vendors list */}
          <div className="max-h-60 overflow-y-auto p-1 text-xs">
            {vendorsList.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                <p className="font-medium text-xs">No vendors found.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Click below to create this supplier now.
                </p>
              </div>
            ) : (
              vendorsList.map((vendor) => {
                const isSelected = vendor.id === selectedVendorId;
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => {
                      onSelectVendor(vendor);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-[#2563eb] font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>{vendor.name}</span>
                        {(vendor.state || getStateFromGSTIN(vendor.gstin)) && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 font-medium">
                            {vendor.state || getStateFromGSTIN(vendor.gstin)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                        {vendor.gstin && <span>GST: {vendor.gstin}</span>}
                        {vendor.phone && <span>Ph: {vendor.phone}</span>}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[#2563eb]" />}
                  </button>
                );
              })
            )}
          </div>

          {/* "+ Add New Vendor" CTA at bottom */}
          <div className="p-1.5 border-t border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full h-8 px-3 rounded-lg text-xs font-bold text-[#2563eb] bg-blue-50 hover:bg-blue-100/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Vendor</span>
            </button>
          </div>
        </div>
      )}

      {/* Reusable Enterprise Vendor Modal */}
      <VendorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialName={searchQuery.trim()}
        onSuccess={(savedVendor) => {
          setVendorsList((prev) => [
            savedVendor,
            ...prev.filter((v) => v.id !== savedVendor.id),
          ]);
          onSelectVendor(savedVendor);
          setIsModalOpen(false);
          setIsOpen(false);
        }}
      />
    </div>
  );
}
