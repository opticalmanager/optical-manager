"use client";

import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVendorAction, updateVendorAction, type VendorFormValues } from "@/actions/vendor.actions";
import { parseGSTINDetails, GSTIN_STATE_MAP } from "@/utils/gstin";
import { handleEnterKeyNavigation } from "@/utils/form-navigation";
import type { Vendor, VendorCategory } from "@/types";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorToEdit?: Vendor | null;
  initialName?: string;
  onSuccess: (savedVendor: Vendor) => void;
}

const CATEGORY_OPTIONS: { value: VendorCategory; label: string; description: string }[] = [
  { value: "FRAMES", label: "Frames & Eyewear", description: "Optical frames, sunglasses, reading glasses" },
  { value: "LENSES", label: "Ophthalmic Lenses", description: "Rx lenses, progressive, single vision, blue cut" },
  { value: "CONTACT_LENSES", label: "Contact Lenses", description: "Soft, toric, colored contact lenses & solutions" },
  { value: "ACCESSORIES", label: "Optical Accessories", description: "Cases, cleaning sprays, microfiber cloths, cords" },
  { value: "LAB_MACHINERY", label: "Machinery & Equipment", description: "Edgers, lensometers, pupilometers, tools" },
  { value: "GENERAL", label: "General & Miscellaneous", description: "Consumables, packaging, multi-line distributor" },
];

const CREDIT_DAYS_OPTIONS = [
  { value: 0, label: "None / Cash (Immediate / Advance / COD)" },
  { value: 15, label: "15 Days Net" },
  { value: 30, label: "30 Days Net" },
  { value: 45, label: "45 Days Net" },
  { value: 60, label: "60 Days Net" },
  { value: 90, label: "90 Days Net" },
];

export function VendorModal({
  isOpen,
  onClose,
  vendorToEdit,
  initialName,
  onSuccess,
}: VendorModalProps) {
  const isEditing = Boolean(vendorToEdit);

  const [formData, setFormData] = useState<VendorFormValues>({
    name: "",
    category: "GENERAL",
    contactPerson: "",
    phone: "",
    email: "",
    gstin: "",
    panNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    creditPeriodDays: 0,
    notes: "",
    isActive: true,
  });

  const [gstinFeedback, setGstinFeedback] = useState<{
    stateName?: string;
    pan?: string;
    isValidFormat?: boolean;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form data when opening or editing
  useEffect(() => {
    if (vendorToEdit) {
      setFormData({
        name: vendorToEdit.name || "",
        category: (vendorToEdit.category as VendorCategory) || "GENERAL",
        contactPerson: vendorToEdit.contactPerson || "",
        phone: vendorToEdit.phone || "",
        email: vendorToEdit.email || "",
        gstin: vendorToEdit.gstin || "",
        panNumber: vendorToEdit.panNumber || "",
        address: vendorToEdit.address || "",
        city: vendorToEdit.city || "",
        state: vendorToEdit.state || "",
        pincode: vendorToEdit.pincode || "",
        creditPeriodDays: vendorToEdit.creditPeriodDays ?? 0,
        notes: vendorToEdit.notes || "",
        isActive: vendorToEdit.isActive ?? true,
      });

      if (vendorToEdit.gstin) {
        const details = parseGSTINDetails(vendorToEdit.gstin);
        setGstinFeedback({
          stateName: details.stateName ?? undefined,
          pan: details.pan ?? undefined,
          isValidFormat: details.isValidFormat,
        });
      } else {
        setGstinFeedback({});
      }
    } else {
      setFormData({
        name: initialName ? initialName.trim() : "",
        category: "GENERAL",
        contactPerson: "",
        phone: "",
        email: "",
        gstin: "",
        panNumber: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        creditPeriodDays: 0,
        notes: "",
        isActive: true,
      });
      setGstinFeedback({});
    }
    setErrorMsg(null);
  }, [vendorToEdit, isOpen, initialName]);

  // Handle GSTIN changes with automatic state & PAN derivation
  const handleGSTINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    const details = parseGSTINDetails(rawVal);

    setGstinFeedback({
      stateName: details.stateName ?? undefined,
      pan: details.pan ?? undefined,
      isValidFormat: details.isValidFormat,
    });

    setFormData((prev) => ({
      ...prev,
      gstin: rawVal,
      // Auto-fill state if determined from GSTIN and not already entered
      state: details.stateName || prev.state,
      // Auto-fill PAN if determined from GSTIN
      panNumber: details.pan || prev.panNumber,
    }));
  };

  // Handle numeric-only phone input restricted to 10 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numeric = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: numeric }));
  };

  // Handle pincode restricted to 6 digits
  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numeric = e.target.value.replace(/\D/g, "").slice(0, 6);
    setFormData((prev) => ({ ...prev, pincode: numeric }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name.trim()) {
      setErrorMsg("Vendor business name is required.");
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    if (formData.gstin && formData.gstin.length !== 15) {
      setErrorMsg("GSTIN must be exactly 15 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && vendorToEdit) {
        const res = await updateVendorAction(vendorToEdit.id, formData);
        if (res.success && res.vendor) {
          toast.success(res.message);
          onSuccess(res.vendor);
          onClose();
        } else {
          setErrorMsg(res.message || "Failed to update vendor.");
        }
      } else {
        const res = await createVendorAction(formData);
        if (res.success && res.vendor) {
          toast.success(res.message);
          onSuccess(res.vendor);
          onClose();
        } else {
          setErrorMsg(res.message || "Failed to register vendor.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#2563eb] flex items-center justify-center shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Vendor: ${vendorToEdit?.name}` : "Register New Optical Vendor"}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                {isEditing
                  ? "Update supplier details, categories, tax information, and credit terms."
                  : "Add frame manufacturers, lens labs, contact lens distributors, or accessories suppliers."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} onKeyDown={handleEnterKeyNavigation} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Business Identity & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business / Company Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Luxottica India, Essilor Lens Lab, Ray-Ban Dist."
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="h-9 text-xs font-medium rounded-xl border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier Specialization
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as VendorCategory }))}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Credit Period (Payment Terms)
              </label>
              <select
                value={formData.creditPeriodDays ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, creditPeriodDays: Number(e.target.value) }))}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {CREDIT_DAYS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Contact Person & Communication */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              Contact &amp; Representatives
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Contact Person Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Amit Sharma (Area Sales)"
                  value={formData.contactPerson || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mobile Number (10 Digits)
                </label>
                <div className="relative">
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.phone || ""}
                    onChange={handlePhoneChange}
                    className="h-9 text-xs rounded-xl pr-7 font-mono"
                  />
                  {formData.phone && formData.phone.length === 10 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="orders@supplier.com"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Indian Tax & GSTIN Intelligence */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                GSTIN &amp; Tax Information
              </h3>
              {gstinFeedback.stateName && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  Detected State: {gstinFeedback.stateName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  15-Digit GSTIN
                </label>
                <Input
                  type="text"
                  maxLength={15}
                  placeholder="07AAAAA0000A1Z5"
                  value={formData.gstin || ""}
                  onChange={handleGSTINChange}
                  className="h-9 text-xs uppercase font-mono tracking-wider rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  PAN Number (10 Chars)
                </label>
                <Input
                  type="text"
                  maxLength={10}
                  placeholder="AAAAA0000A"
                  value={formData.panNumber || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                  className="h-9 text-xs uppercase font-mono tracking-wider rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Address Details */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              Address &amp; Dispatch Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-3">
                <Input
                  type="text"
                  placeholder="Building No, Street, Industrial Area / Hub"
                  value={formData.address || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Input
                  type="text"
                  placeholder="City (e.g. New Delhi)"
                  value={formData.city || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Input
                  type="text"
                  placeholder="State (e.g. Delhi)"
                  value={formData.state || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Pincode (e.g. 110001)"
                  value={formData.pincode || ""}
                  onChange={handlePincodeChange}
                  className="h-9 text-xs font-mono rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Notes & Status Toggle */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Internal Notes / Catalog Details
              </label>
              <Input
                type="text"
                placeholder="e.g. Minimum order ₹15,000 for free shipping, account manager details"
                value={formData.notes || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pb-1.5">
              <label className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Active Vendor</span>
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 text-xs font-bold rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Register Vendor"}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
