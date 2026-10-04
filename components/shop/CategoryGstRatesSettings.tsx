"use client";

import React, { useState, useEffect } from "react";
import { 
  Percent, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Tag, 
  X, 
  Layers, 
  Sparkles,
  Pencil,
  Boxes,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  PackageX
} from "lucide-react";
import { toast } from "sonner";
import { 
  getOrganizationCategoriesAction, 
  saveCategoryGstRatesAction, 
  createCategoryAction, 
  updateCategoryAction,
  deleteCategoryAction 
} from "@/actions/category.actions";
import { CategoryItem } from "@/services/category.service";
import { offlineDB } from "@/lib/offline/db";

interface CategoryGstRatesSettingsProps {
  initialCategories?: CategoryItem[];
  className?: string;
  onSaved?: () => void;
}

interface EditableCategory {
  id: string;
  name: string;
  printName: string;
  code: string;
  hsnCode: string;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
  isStockable: boolean;
  defaultSaleDiscount: string;
  defaultPurchaseDiscount: string;
  allowNegativeStock: boolean;
  isSystem: boolean;
  displayOrder: number;
}

const TAX_PRESETS = [
  { label: "0% (Exempt)", value: "0" },
  { label: "5% GST", value: "5" },
  { label: "12% GST", value: "12" },
  { label: "18% GST", value: "18" },
  { label: "28% GST", value: "28" },
];

export function CategoryGstRatesSettings({
  initialCategories,
  className = "",
  onSaved,
}: CategoryGstRatesSettingsProps) {
  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [isLoading, setIsLoading] = useState(!initialCategories);
  const [isSaving, setIsSaving] = useState(false);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

  // Dual-Purpose Add/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);

  // Modal Form Inputs
  const [formName, setFormName] = useState("");
  const [formPrintName, setFormPrintName] = useState("");
  const [isPrintNameCustom, setIsPrintNameCustom] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formHsn, setFormHsn] = useState("");
  const [formIgst, setFormIgst] = useState("18");
  const [formCgst, setFormCgst] = useState("9");
  const [formSgst, setFormSgst] = useState("9");
  const [formIsStockable, setFormIsStockable] = useState(true);
  const [formSaleDiscount, setFormSaleDiscount] = useState("0");
  const [formPurchaseDiscount, setFormPurchaseDiscount] = useState("0");
  const [formAllowNegativeStock, setFormAllowNegativeStock] = useState(true);
  const [formApplyToExisting, setFormApplyToExisting] = useState(false);

  // Load categories on mount or populate initial
  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(
        initialCategories.map((c) => ({
          id: c.id,
          name: c.name,
          printName: c.printName || c.name,
          code: c.code,
          hsnCode: c.hsnCode || "",
          cgstPercent: String(c.cgstPercent ?? "6.00"),
          sgstPercent: String(c.sgstPercent ?? "6.00"),
          igstPercent: String(c.igstPercent ?? "12.00"),
          isStockable: c.isStockable ?? true,
          defaultSaleDiscount: String(c.defaultSaleDiscount ?? "0.00"),
          defaultPurchaseDiscount: String(c.defaultPurchaseDiscount ?? "0.00"),
          allowNegativeStock: c.allowNegativeStock ?? true,
          isSystem: c.isSystem,
          displayOrder: c.displayOrder,
        }))
      );
      setIsLoading(false);
    } else {
      loadCategories();
    }
  }, [initialCategories]);

  async function loadCategories() {
    setIsLoading(true);
    try {
      const res = await getOrganizationCategoriesAction();
      if (res.success && res.categories) {
        const mapped = res.categories.map((c) => ({
          id: c.id,
          name: c.name,
          printName: c.printName || c.name,
          code: c.code,
          hsnCode: c.hsnCode || "",
          cgstPercent: String(c.cgstPercent ?? "6.00"),
          sgstPercent: String(c.sgstPercent ?? "6.00"),
          igstPercent: String(c.igstPercent ?? "12.00"),
          isStockable: c.isStockable ?? true,
          defaultSaleDiscount: String(c.defaultSaleDiscount ?? "0.00"),
          defaultPurchaseDiscount: String(c.defaultPurchaseDiscount ?? "0.00"),
          allowNegativeStock: c.allowNegativeStock ?? true,
          isSystem: c.isSystem,
          displayOrder: c.displayOrder,
        }));
        setCategories(mapped);

        // Update Dexie offline cache
        try {
          if (offlineDB.cached_product_categories) {
            await offlineDB.cached_product_categories.bulkPut(
              res.categories.map((c) => ({
                id: c.id,
                organizationId: c.organizationId,
                name: c.name,
                printName: c.printName || c.name,
                code: c.code,
                hsnCode: c.hsnCode,
                cgstPercent: c.cgstPercent,
                sgstPercent: c.sgstPercent,
                igstPercent: c.igstPercent,
                isStockable: c.isStockable ?? true,
                defaultSaleDiscount: c.defaultSaleDiscount ?? "0.00",
                defaultPurchaseDiscount: c.defaultPurchaseDiscount ?? "0.00",
                allowNegativeStock: c.allowNegativeStock ?? true,
                isSystem: c.isSystem,
                isActive: c.isActive,
                displayOrder: c.displayOrder,
                updatedAt: new Date().toISOString(),
              }))
            );
          }
        } catch {
          // Non-blocking cache error
        }
      } else {
        toast.error(res.error || "Failed to load categories.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle IGST change in main matrix -> auto splits CGST and SGST
  const handleIgstChange = (id: string, val: string) => {
    const num = parseFloat(val);
    const half = isNaN(num) ? "" : (num / 2).toFixed(2);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              igstPercent: val,
              cgstPercent: half,
              sgstPercent: half,
            }
          : c
      )
    );
  };

  // Handle direct CGST change
  const handleCgstChange = (id: string, val: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const cgstNum = parseFloat(val) || 0;
        const sgstNum = parseFloat(c.sgstPercent) || 0;
        return {
          ...c,
          cgstPercent: val,
          igstPercent: (cgstNum + sgstNum).toFixed(2),
        };
      })
    );
  };

  // Handle direct SGST change
  const handleSgstChange = (id: string, val: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const sgstNum = parseFloat(val) || 0;
        const cgstNum = parseFloat(c.cgstPercent) || 0;
        return {
          ...c,
          sgstPercent: val,
          igstPercent: (cgstNum + sgstNum).toFixed(2),
        };
      })
    );
  };

  // Handle HSN change in matrix
  const handleHsnChange = (id: string, val: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hsnCode: val } : c))
    );
  };

  // Handle Name change for custom categories
  const handleNameChange = (id: string, val: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: val } : c))
    );
  };

  // Toggle negative stock permission per category
  const handleToggleNegativeStock = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, allowNegativeStock: !c.allowNegativeStock } : c))
    );
  };

  // Save all modified GST rates and HSN codes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload = categories.map((c) => ({
        id: c.id,
        name: c.name,
        printName: c.printName || c.name,
        hsnCode: c.hsnCode.trim() || null,
        cgstPercent: parseFloat(c.cgstPercent) || 0,
        sgstPercent: parseFloat(c.sgstPercent) || 0,
        igstPercent: parseFloat(c.igstPercent) || 0,
        isStockable: c.isStockable,
        defaultSaleDiscount: parseFloat(c.defaultSaleDiscount) || 0,
        defaultPurchaseDiscount: parseFloat(c.defaultPurchaseDiscount) || 0,
        allowNegativeStock: c.allowNegativeStock,
      }));

      const res = await saveCategoryGstRatesAction(payload);
      if (res.success) {
        toast.success(res.message || "GST rates and HSN codes updated successfully!");
        onSaved?.();
        await loadCategories();
      } else {
        toast.error(res.message || "Failed to save GST rates.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  // Modal open handlers
  const openCreateModal = () => {
    setModalMode("create");
    setEditingCatId(null);
    setFormName("");
    setFormPrintName("");
    setIsPrintNameCustom(false);
    setFormCode("");
    setFormHsn("");
    setFormIgst("18");
    setFormCgst("9");
    setFormSgst("9");
    setFormIsStockable(true);
    setFormSaleDiscount("0");
    setFormPurchaseDiscount("0");
    setFormAllowNegativeStock(true);
    setFormApplyToExisting(false);
    setIsAdvancedOpen(true);
    setShowModal(true);
  };

  const openEditModal = (cat: EditableCategory) => {
    setModalMode("edit");
    setEditingCatId(cat.id);
    setFormName(cat.name);
    setFormPrintName(cat.printName || cat.name);
    setIsPrintNameCustom(true);
    setFormCode(cat.code);
    setFormHsn(cat.hsnCode);
    setFormIgst(cat.igstPercent);
    setFormCgst(cat.cgstPercent);
    setFormSgst(cat.sgstPercent);
    setFormIsStockable(cat.isStockable);
    setFormSaleDiscount(cat.defaultSaleDiscount);
    setFormPurchaseDiscount(cat.defaultPurchaseDiscount);
    setFormAllowNegativeStock(cat.allowNegativeStock);
    setFormApplyToExisting(false);
    setIsAdvancedOpen(true);
    setShowModal(true);
  };

  // Auto-fill Print Name and Code while typing Name in create mode
  const handleNameInputChange = (name: string) => {
    setFormName(name);
    if (modalMode === "create") {
      if (!isPrintNameCustom) {
        setFormPrintName(name);
      }
      const suggestedCode = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 30);
      setFormCode(suggestedCode);
    }
  };

  // Handle Tax Preset selection
  const handleTaxPresetClick = (val: string) => {
    setFormIgst(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setFormCgst((num / 2).toFixed(2));
      setFormSgst((num / 2).toFixed(2));
    }
  };

  // Handle Modal IGST change
  const handleModalIgstChange = (val: string) => {
    setFormIgst(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setFormCgst((num / 2).toFixed(2));
      setFormSgst((num / 2).toFixed(2));
    }
  };

  // Modal Submit (Handles Create and Edit)
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const res = await createCategoryAction(null, {
          name: formName.trim(),
          printName: formPrintName.trim() || formName.trim(),
          code: formCode.trim() || undefined,
          hsnCode: formHsn.trim() || undefined,
          cgstPercent: parseFloat(formCgst) || 0,
          sgstPercent: parseFloat(formSgst) || 0,
          igstPercent: parseFloat(formIgst) || 0,
          isStockable: formIsStockable,
          defaultSaleDiscount: parseFloat(formSaleDiscount) || 0,
          defaultPurchaseDiscount: parseFloat(formPurchaseDiscount) || 0,
          allowNegativeStock: formAllowNegativeStock,
          applyToExistingProducts: formApplyToExisting,
        });

        if (res.success) {
          toast.success(res.message || `Category "${formName}" created!`);
          setShowModal(false);
          await loadCategories();
        } else {
          toast.error(res.message || "Failed to create category.");
        }
      } else if (modalMode === "edit" && editingCatId) {
        const res = await updateCategoryAction(editingCatId, {
          name: formName.trim(),
          printName: formPrintName.trim() || formName.trim(),
          code: formCode.trim() || undefined,
          hsnCode: formHsn.trim() || undefined,
          cgstPercent: parseFloat(formCgst) || 0,
          sgstPercent: parseFloat(formSgst) || 0,
          igstPercent: parseFloat(formIgst) || 0,
          isStockable: formIsStockable,
          defaultSaleDiscount: parseFloat(formSaleDiscount) || 0,
          defaultPurchaseDiscount: parseFloat(formPurchaseDiscount) || 0,
          allowNegativeStock: formAllowNegativeStock,
          applyToExistingProducts: formApplyToExisting,
        });

        if (res.success) {
          toast.success(res.message || `Category updated successfully!`);
          setShowModal(false);
          await loadCategories();
        } else {
          toast.error(res.message || "Failed to update category.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the custom category "${name}"?`)) {
      return;
    }

    setDeletePendingId(id);
    try {
      const res = await deleteCategoryAction(id);
      if (res.success) {
        toast.success(res.message || `Category "${name}" removed.`);
        await loadCategories();
      } else {
        toast.error(res.message || "Failed to delete category.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category.");
    } finally {
      setDeletePendingId(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                Category GST Rates &amp; HSN Master
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60">
                  {categories.length} Categories
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Configure default GST percentages, commercial discounts, and inventory rules for each optical category.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 rounded-xl border border-slate-300/80 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
            <span>New Category</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || isLoading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 stroke-[2.2]" />
            )}
            <span>{isSaving ? "Saving Rates..." : "Save GST Rates"}</span>
          </button>
        </div>
      </div>

      {/* Smart Hint Bar */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50/70 border border-blue-200/60 text-blue-800 text-[11px] font-medium">
        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>
          <strong>Smart Category Management:</strong> Click the <strong>Pencil (Edit)</strong> button on any category to modify its Print Name, stock tracking type, default commercial discounts, and sync rates across existing catalog products.
        </span>
      </div>

      {/* High-Density Category Rates Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-450">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading Categories...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3 min-w-[170px]">Product Category</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Code</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Default HSN</th>
                  <th className="py-2.5 px-3 w-20 text-center">CGST (%)</th>
                  <th className="py-2.5 px-3 w-20 text-center">SGST (%)</th>
                  <th className="py-2.5 px-3 w-24 text-center bg-blue-50/40">IGST (%)</th>
                  <th className="py-2.5 px-3 w-24 text-center">Tax Slabs</th>
                  <th className="py-2.5 px-3 min-w-[120px] text-center">Discounts (S / P)</th>
                  <th className="py-2.5 px-3 w-32 text-center">Negative Stock</th>
                  <th className="py-2.5 px-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {categories.map((cat, idx) => {
                  const igstNum = parseFloat(cat.igstPercent) || 0;
                  const saleDiscNum = parseFloat(cat.defaultSaleDiscount) || 0;
                  const purchDiscNum = parseFloat(cat.defaultPurchaseDiscount) || 0;

                  return (
                    <tr 
                      key={cat.id} 
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Name & Attributes */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-800 tracking-tight">
                              {cat.name}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded tracking-wider shrink-0 ${
                                cat.isSystem
                                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {cat.isSystem ? "System" : "Custom"}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded tracking-wide shrink-0 ${
                                cat.isStockable
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {cat.isStockable ? "Stocked" : "Service"}
                            </span>
                          </div>
                          {cat.printName && cat.printName !== cat.name && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              Print: <span className="text-slate-600 font-semibold">{cat.printName}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-2.5 px-3">
                        <code className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {cat.code}
                        </code>
                      </td>

                      {/* Default HSN */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={cat.hsnCode}
                          onChange={(e) => handleHsnChange(cat.id, e.target.value)}
                          placeholder="e.g. 90049000"
                          maxLength={15}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </td>

                      {/* CGST */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="relative inline-flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={cat.cgstPercent}
                            onChange={(e) => handleCgstChange(cat.id, e.target.value)}
                            className="w-14 text-center px-1 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                          />
                          <span className="text-[9px] text-slate-400 font-bold ml-0.5">%</span>
                        </div>
                      </td>

                      {/* SGST */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="relative inline-flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={cat.sgstPercent}
                            onChange={(e) => handleSgstChange(cat.id, e.target.value)}
                            className="w-14 text-center px-1 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                          />
                          <span className="text-[9px] text-slate-400 font-bold ml-0.5">%</span>
                        </div>
                      </td>

                      {/* IGST (Primary Driver) */}
                      <td className="py-2.5 px-3 text-center bg-blue-50/20">
                        <div className="relative inline-flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={cat.igstPercent}
                            onChange={(e) => handleIgstChange(cat.id, e.target.value)}
                            className="w-16 text-center px-1 py-1 bg-blue-50/60 border border-blue-300 rounded-lg text-xs font-extrabold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white"
                          />
                          <span className="text-[9px] text-blue-500 font-bold ml-0.5">%</span>
                        </div>
                      </td>

                      {/* Total Tax Pill */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-blue-50 text-blue-700 border border-blue-200/60">
                          {igstNum.toFixed(1)}% GST
                        </span>
                      </td>

                      {/* Discounts */}
                      <td className="py-2.5 px-3 text-center">
                        {saleDiscNum > 0 || purchDiscNum > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {saleDiscNum}% S / {purchDiscNum}% P
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">0% / 0%</span>
                        )}
                      </td>

                      {/* Allow Negative Stock Toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleNegativeStock(cat.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border cursor-pointer ${
                            cat.allowNegativeStock
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                          title={cat.allowNegativeStock ? "Negative stock allowed: users can bill when stock <= 0" : "Blocked: invoice creation rejected when stock reaches 0"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.allowNegativeStock ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {cat.allowNegativeStock ? "Allowed" : "Blocked"}
                        </button>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(cat)}
                            title="Edit full category settings"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!cat.isSystem && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              disabled={deletePendingId === cat.id}
                              title="Delete custom category"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              {deletePendingId === cat.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODERN MEDIUM-SIZED ADD / EDIT CATEGORY MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                    {modalMode === "create" ? "Add New Product Category" : `Edit Category: ${formName || "Details"}`}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {modalMode === "create" ? "Define names, tax rates, and stock rules" : "Update category attributes & tax configuration"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* CARD 1: GENERAL INFORMATION (2x2 Grid) */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>General Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                      Category Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunglasses, Reading Glasses"
                      value={formName}
                      onChange={(e) => handleNameInputChange(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide flex items-center justify-between">
                      <span>Print Name</span>
                      <span className="text-[9px] text-slate-400 font-normal lowercase">(on invoices/slips)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sunglass / SG"
                      value={formPrintName}
                      onChange={(e) => {
                        setFormPrintName(e.target.value);
                        setIsPrintNameCustom(true);
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                      Category Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SUNGLASSES"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                      Default HSN Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 90041000"
                      value={formHsn}
                      onChange={(e) => setFormHsn(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: DEFAULT GST TAX PERCENTAGES */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                    <Percent className="w-3.5 h-3.5 text-blue-600" />
                    <span>Default GST Tax Structure</span>
                  </div>
                  <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                    Smart 50/50 Division
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">Presets:</span>
                  {TAX_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleTaxPresetClick(preset.value)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        formIgst === preset.value
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* 3-Column Inline Inputs */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wide block text-center">
                      IGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formIgst}
                      onChange={(e) => handleModalIgstChange(e.target.value)}
                      className="w-full text-center px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-extrabold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block text-center">
                      CGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formCgst}
                      onChange={(e) => setFormCgst(e.target.value)}
                      className="w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block text-center">
                      SGST (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formSgst}
                      onChange={(e) => setFormSgst(e.target.value)}
                      className="w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: COMMERCIAL & INVENTORY DEFAULTS (COLLAPSIBLE / COMPACT) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span>Commercial Defaults &amp; Inventory Rules</span>
                  </div>
                  {isAdvancedOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {isAdvancedOpen && (
                  <div className="p-3.5 bg-white space-y-3 border-t border-slate-100">
                    {/* Discounts 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                          Default Sale Discount (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={formSaleDiscount}
                          onChange={(e) => setFormSaleDiscount(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                          Default Purchase Discount (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={formPurchaseDiscount}
                          onChange={(e) => setFormPurchaseDiscount(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Stockable Toggle Row */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">
                            Set as Stockable (Inventory Tracking)
                          </span>
                        </div>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          Track physical stock units on hand (disable for repair/service fees)
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formIsStockable}
                          onChange={(e) => setFormIsStockable(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Allow Negative Stock Toggle Row */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="space-y-0.5">
                        <span className="block text-xs font-bold text-slate-800">
                          Allow Negative Inventory
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          Permit billing and booking when on-hand quantity is 0 or less
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formAllowNegativeStock}
                          onChange={(e) => setFormAllowNegativeStock(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 4: RETROACTIVE SYNC OPTION */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formApplyToExisting}
                    onChange={(e) => setFormApplyToExisting(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-amber-900">
                      Apply HSN, GST &amp; discounts to all existing products
                    </span>
                    <span className="block text-[10px] text-amber-700/80 font-medium leading-tight">
                      When checked, updates default tax percentages and HSN code across all active inventory items matching this category.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : modalMode === "create" ? (
                    <Plus className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isSubmitting
                      ? modalMode === "create"
                        ? "Creating..."
                        : "Saving..."
                      : modalMode === "create"
                      ? "Create Category"
                      : "Save Changes"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
