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
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
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

  // Modal Form Inputs (Clean & Minimal: Printable Name removed)
  const [formName, setFormName] = useState("");
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

  // Handle IGST change in table -> auto splits CGST and SGST
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

  // Handle HSN change in table
  const handleHsnChange = (id: string, val: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hsnCode: val } : c))
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
        printName: c.name, // Keep printName synchronized with name
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
    setShowModal(true);
  };

  const openEditModal = (cat: EditableCategory) => {
    setModalMode("edit");
    setEditingCatId(cat.id);
    setFormName(cat.name);
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
    setShowModal(true);
  };

  // Auto-fill Code while typing Name in create mode
  const handleNameInputChange = (name: string) => {
    setFormName(name);
    if (modalMode === "create") {
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
      const cleanName = formName.trim();
      const payload = {
        name: cleanName,
        printName: cleanName, // Seamless 1-to-1 parity: printName equals category name
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
      };

      if (modalMode === "create") {
        const res = await createCategoryAction(null, payload);
        if (res.success) {
          toast.success(res.message || `Category "${cleanName}" created!`);
          setShowModal(false);
          await loadCategories();
        } else {
          toast.error(res.message || "Failed to create category.");
        }
      } else if (modalMode === "edit" && editingCatId) {
        const res = await updateCategoryAction(editingCatId, payload);
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
    <div className={`space-y-3.5 ${className}`}>
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              Category GST Rates &amp; HSN Master
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60">
                {categories.length} Categories
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Configure default GST percentages, commercial discounts, and inventory rules for each optical category.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
            <span>New Category</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 stroke-[2.2]" />
            )}
            <span>{isSaving ? "Saving..." : "Save GST Rates"}</span>
          </button>
        </div>
      </div>

      {/* Zero Horizontal Scroll Category Rates Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Loading Categories...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3">Category &amp; Identifier</th>
                <th className="py-2.5 px-3 w-28 text-center">HSN Code</th>
                <th className="py-2.5 px-3 w-32 text-center bg-blue-50/30">GST Rate (%)</th>
                <th className="py-2.5 px-3 w-28 text-center">Discounts (S/P)</th>
                <th className="py-2.5 px-3 w-28 text-center">Negative Stock</th>
                <th className="py-2.5 px-3 w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {categories.map((cat, idx) => {
                const igstNum = parseFloat(cat.igstPercent) || 0;
                const halfTax = (igstNum / 2).toFixed(1);
                const saleDiscNum = parseFloat(cat.defaultSaleDiscount) || 0;
                const purchDiscNum = parseFloat(cat.defaultPurchaseDiscount) || 0;

                return (
                  <tr 
                    key={cat.id} 
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px] text-center">
                      {idx + 1}
                    </td>

                    {/* Category Name & Tags */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-800 tracking-tight text-xs">
                          {cat.name}
                        </span>
                        <code className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                          {cat.code}
                        </code>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded tracking-wide shrink-0 ${
                            cat.isSystem
                              ? "bg-slate-100 text-slate-500"
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
                    </td>

                    {/* Default HSN */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="text"
                        value={cat.hsnCode}
                        onChange={(e) => handleHsnChange(cat.id, e.target.value)}
                        placeholder="90049000"
                        maxLength={15}
                        className="w-24 px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </td>

                    {/* GST Rate (IGST Driver with Half split note) */}
                    <td className="py-2 px-3 text-center bg-blue-50/15">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <div className="inline-flex items-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={cat.igstPercent}
                            onChange={(e) => handleIgstChange(cat.id, e.target.value)}
                            className="w-14 text-center px-1 py-0.5 bg-blue-50/60 border border-blue-300 rounded-md text-xs font-black text-blue-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600 focus:bg-white"
                          />
                          <span className="text-[10px] text-blue-600 font-extrabold ml-1">%</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium">
                          ({halfTax}% + {halfTax}%)
                        </span>
                      </div>
                    </td>

                    {/* Discounts */}
                    <td className="py-2 px-3 text-center">
                      {saleDiscNum > 0 || purchDiscNum > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {saleDiscNum}% S / {purchDiscNum}% P
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">0% / 0%</span>
                      )}
                    </td>

                    {/* Allow Negative Stock Toggle */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleNegativeStock(cat.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border cursor-pointer ${
                          cat.allowNegativeStock
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                        }`}
                        title={cat.allowNegativeStock ? "Allowed: billing permitted when stock <= 0" : "Blocked: billing rejected when stock is 0"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.allowNegativeStock ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {cat.allowNegativeStock ? "Allowed" : "Blocked"}
                      </button>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          title="Edit category settings"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!cat.isSystem && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            disabled={deletePendingId === cat.id}
                            title="Delete custom category"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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
        )}
      </div>

      {/* COMPACT & ZERO VERTICAL SCROLL ADD / EDIT CATEGORY MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header (Compact) */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">
                    {modalMode === "create" ? "Add Product Category" : `Edit Category: ${formName || "Details"}`}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Configure category name, default tax slab, and stock behavior
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form — Fits Completely On-Screen without Vertical Scroll */}
            <form onSubmit={handleModalSubmit} className="p-4 sm:p-5 space-y-3">
              {/* ROW 1: CATEGORY NAME & CODE (2-Col) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunglasses, Blue Cut"
                    value={formName}
                    onChange={(e) => handleNameInputChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    autoFocus
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
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* ROW 2: DEFAULT HSN CODE & GST RATE PRESETS (2-Col) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/70 border border-slate-200 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                    Default HSN Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 90041000"
                    value={formHsn}
                    onChange={(e) => setFormHsn(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                  />
                  <span className="text-[9px] text-slate-400 block">Standard HSN for tax compliance</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                      GST Rate (IGST)
                    </label>
                    <span className="text-[9px] font-bold text-blue-600">
                      {formCgst}% CGST + {formSgst}% SGST
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={formIgst}
                      onChange={(e) => handleModalIgstChange(e.target.value)}
                      className="w-16 px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-black text-blue-700 text-center outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-1 flex-wrap flex-1">
                      {TAX_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handleTaxPresetClick(preset.value)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                            formIgst === preset.value
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          {preset.label.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 3: COMMERCIAL DISCOUNTS & STOCK TOGGLES (2-Col) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Default Discounts */}
                <div className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-600 tracking-wide">
                    <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                    <span>Default Discounts (%)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 block mb-0.5">Sale Disc %</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={formSaleDiscount}
                        onChange={(e) => setFormSaleDiscount(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 block mb-0.5">Purch Disc %</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={formPurchaseDiscount}
                        onChange={(e) => setFormPurchaseDiscount(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Stockable Item</span>
                      <span className="text-[9px] text-slate-400 font-medium">Track physical inventory</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formIsStockable}
                        onChange={(e) => setFormIsStockable(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Allow Negative Stock</span>
                      <span className="text-[9px] text-slate-400 font-medium">Bill when quantity &le; 0</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formAllowNegativeStock}
                        onChange={(e) => setFormAllowNegativeStock(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* ROW 4: RETROACTIVE SYNC OPTION (Clean Inline) */}
              <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formApplyToExisting}
                    onChange={(e) => setFormApplyToExisting(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-amber-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-amber-900">
                    Apply default HSN, GST &amp; discounts to all existing products in this category
                  </span>
                </label>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
