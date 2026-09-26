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
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Vendor } from "@/types";
import { createVendorAction } from "@/actions/purchase.actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { handleEnterKeyNavigation } from "@/utils/form-navigation";

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

  // New Vendor Form State
  const [newVendorData, setNewVendorData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    gstin: "",
    panNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);

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

  // Handle inline vendor creation
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorData.name.trim()) {
      toast.error("Vendor name is required.");
      return;
    }

    setIsSubmittingVendor(true);
    try {
      const res = await createVendorAction(newVendorData as any);
      if (res.success && res.vendor) {
        toast.success(res.message);
        setVendorsList((prev) => [res.vendor, ...prev]);
        onSelectVendor(res.vendor);
        setIsModalOpen(false);
        setIsOpen(false);
        setNewVendorData({
          name: "",
          contactPerson: "",
          phone: "",
          email: "",
          gstin: "",
          panNumber: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
        });
      } else {
        toast.error(res.message || "Failed to create vendor.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create vendor.");
    } finally {
      setIsSubmittingVendor(false);
    }
  };

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
                  ({selectedVendor.gstin})
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
                        {vendor.state && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500">
                            {vendor.state}
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
              onClick={() => {
                setNewVendorData((prev) => ({
                  ...prev,
                  name: searchQuery.trim() || prev.name,
                }));
                setIsModalOpen(true);
              }}
              className="w-full h-8 px-3 rounded-lg text-xs font-bold text-[#2563eb] bg-blue-50 hover:bg-blue-100/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add New Vendor</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Modal to Register New Vendor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-up">
            {/* Modal Header */}
            <div className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Add New Vendor / Supplier
                  </h2>
                  <p className="text-[10px] font-semibold text-slate-400">
                    Register supplier details and GST compliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateVendor} onKeyDown={(e) => handleEnterKeyNavigation(e)} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Vendor / Supplier Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={newVendorData.name}
                    onChange={(e) =>
                      setNewVendorData({ ...newVendorData, name: e.target.value })
                    }
                    className="h-9 border-slate-200 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Contact Person
                  </label>
                  <Input
                    type="text"
                    value={newVendorData.contactPerson}
                    onChange={(e) =>
                      setNewVendorData({
                        ...newVendorData,
                        contactPerson: e.target.value,
                      })
                    }
                    className="h-9 border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Phone (10 Digits)
                  </label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={newVendorData.phone}
                    onChange={(e) =>
                      setNewVendorData({
                        ...newVendorData,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    className="h-9 border-slate-200 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    GSTIN Number
                  </label>
                  <Input
                    type="text"
                    maxLength={15}
                    value={newVendorData.gstin}
                    onChange={(e) =>
                      setNewVendorData({
                        ...newVendorData,
                        gstin: e.target.value.toUpperCase().trim(),
                      })
                    }
                    className="h-9 border-slate-200 text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={newVendorData.email}
                    onChange={(e) =>
                      setNewVendorData({
                        ...newVendorData,
                        email: e.target.value,
                      })
                    }
                    className="h-9 border-slate-200 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Address / Premises
                  </label>
                  <Input
                    type="text"
                    value={newVendorData.address}
                    onChange={(e) =>
                      setNewVendorData({
                        ...newVendorData,
                        address: e.target.value,
                      })
                    }
                    className="h-9 border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    City
                  </label>
                  <Input
                    type="text"
                    value={newVendorData.city}
                    onChange={(e) =>
                      setNewVendorData({ ...newVendorData, city: e.target.value })
                    }
                    className="h-9 border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    State / Province
                  </label>
                  <Input
                    type="text"
                    value={newVendorData.state}
                    onChange={(e) =>
                      setNewVendorData({ ...newVendorData, state: e.target.value })
                    }
                    className="h-9 border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3.5 font-bold rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isSubmittingVendor}
                  className="h-8 px-4 font-bold rounded-lg text-xs bg-[#2563eb] hover:bg-blue-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingVendor ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Save Vendor
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
