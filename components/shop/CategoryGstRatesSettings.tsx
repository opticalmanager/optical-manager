"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Percent, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Tag, 
  Hash, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  X,
  Layers,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { 
  getOrganizationCategoriesAction, 
  saveCategoryGstRatesAction, 
  createCategoryAction, 
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
  code: string;
  hsnCode: string;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
  isSystem: boolean;
  displayOrder: number;
}

export function CategoryGstRatesSettings({
  initialCategories,
  className = "",
  onSaved,
}: CategoryGstRatesSettingsProps) {
  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [isLoading, setIsLoading] = useState(!initialCategories);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

  // New Category Modal Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatHsn, setNewCatHsn] = useState("");
  const [newCatIgst, setNewCatIgst] = useState("18");
  const [newCatCgst, setNewCatCgst] = useState("9");
  const [newCatSgst, setNewCatSgst] = useState("9");

  // Load categories on mount or populate initial
  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(
        initialCategories.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          hsnCode: c.hsnCode || "",
          cgstPercent: String(c.cgstPercent ?? "6.00"),
          sgstPercent: String(c.sgstPercent ?? "6.00"),
          igstPercent: String(c.igstPercent ?? "12.00"),
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
          code: c.code,
          hsnCode: c.hsnCode || "",
          cgstPercent: String(c.cgstPercent ?? "6.00"),
          sgstPercent: String(c.sgstPercent ?? "6.00"),
          igstPercent: String(c.igstPercent ?? "12.00"),
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
                code: c.code,
                hsnCode: c.hsnCode,
                cgstPercent: c.cgstPercent,
                sgstPercent: c.sgstPercent,
                igstPercent: c.igstPercent,
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

  // Handle CGST change -> auto syncs SGST and IGST
  const handleCgstChange = (id: string, val: string) => {
    const num = parseFloat(val);
    const double = isNaN(num) ? "" : (num * 2).toFixed(2);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              cgstPercent: val,
              sgstPercent: val,
              igstPercent: double,
            }
          : c
      )
    );
  };

  // Handle SGST change -> auto syncs CGST and IGST
  const handleSgstChange = (id: string, val: string) => {
    const num = parseFloat(val);
    const double = isNaN(num) ? "" : (num * 2).toFixed(2);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              sgstPercent: val,
              cgstPercent: val,
              igstPercent: double,
            }
          : c
      )
    );
  };

  // Handle HSN Code change
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

  // Save all modified GST rates and HSN codes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload = categories.map((c) => ({
        id: c.id,
        name: c.name,
        hsnCode: c.hsnCode.trim() || null,
        cgstPercent: parseFloat(c.cgstPercent) || 0,
        sgstPercent: parseFloat(c.sgstPercent) || 0,
        igstPercent: parseFloat(c.igstPercent) || 0,
      }));

      const res = await saveCategoryGstRatesAction(payload);
      if (res.success) {
        toast.success(res.message || "GST rates and HSN codes updated successfully!");
        onSaved?.();
        // Refresh categories
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

  // Auto-generate code when new category name is typed
  const handleNewNameChange = (name: string) => {
    setNewCatName(name);
    const suggestedCode = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 30);
    setNewCatCode(suggestedCode);
  };

  // Handle IGST change in modal
  const handleModalIgstChange = (val: string) => {
    setNewCatIgst(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setNewCatCgst((num / 2).toFixed(2));
      setNewCatSgst((num / 2).toFixed(2));
    }
  };

  // Create new category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await createCategoryAction(null, {
        name: newCatName.trim(),
        code: newCatCode.trim() || undefined,
        hsnCode: newCatHsn.trim() || undefined,
        cgstPercent: parseFloat(newCatCgst) || 0,
        sgstPercent: parseFloat(newCatSgst) || 0,
        igstPercent: parseFloat(newCatIgst) || 0,
      });

      if (res.success) {
        toast.success(res.message || `Category "${newCatName}" created!`);
        setShowAddModal(false);
        setNewCatName("");
        setNewCatCode("");
        setNewCatHsn("");
        setNewCatIgst("18");
        setNewCatCgst("9");
        setNewCatSgst("9");
        await loadCategories();
      } else {
        toast.error(res.message || "Failed to create category.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create category.");
    } finally {
      setIsCreating(false);
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
                Configure default GST percentages and HSN codes for each product category. These rates auto-fill when adding new items.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
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
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-800 text-[11px] font-medium">
        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>
          <strong>Smart GST Sync:</strong> Editing <strong>IGST (%)</strong> will automatically divide 50/50 into CGST and SGST (e.g. 18% &rarr; 9% CGST + 9% SGST). You can also edit individual columns directly.
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
                  <th className="py-2.5 px-4 w-8">#</th>
                  <th className="py-2.5 px-4 min-w-[160px]">Product Category</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Category Code</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Default HSN</th>
                  <th className="py-2.5 px-3 w-24 text-center">CGST (%)</th>
                  <th className="py-2.5 px-3 w-24 text-center">SGST (%)</th>
                  <th className="py-2.5 px-3 w-28 text-center bg-blue-50/40">IGST (%)</th>
                  <th className="py-2.5 px-3 w-28 text-center">Total Tax</th>
                  <th className="py-2.5 px-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {categories.map((cat, idx) => {
                  const igstNum = parseFloat(cat.igstPercent) || 0;
                  return (
                    <tr 
                      key={cat.id} 
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          {cat.isSystem ? (
                            <span className="font-extrabold text-slate-800 tracking-tight">
                              {cat.name}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={cat.name}
                              onChange={(e) => handleNameChange(cat.id, e.target.value)}
                              className="w-full max-w-[160px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                              placeholder="Category Name"
                            />
                          )}
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0 ${
                              cat.isSystem
                                ? "bg-slate-100 text-slate-500 border border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {cat.isSystem ? "Default" : "Custom"}
                          </span>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-2.5 px-3">
                        <code className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {cat.code}
                        </code>
                      </td>

                      {/* Default HSN */}
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={cat.hsnCode}
                            onChange={(e) => handleHsnChange(cat.id, e.target.value)}
                            placeholder="e.g. 90049000"
                            maxLength={15}
                            className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                          />
                        </div>
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
                            className="w-16 text-center px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                          />
                          <span className="text-[10px] text-slate-400 font-bold ml-1">%</span>
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
                            className="w-16 text-center px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                          />
                          <span className="text-[10px] text-slate-400 font-bold ml-1">%</span>
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
                            className="w-18 text-center px-1.5 py-1 bg-blue-50/60 border border-blue-300 rounded-lg text-xs font-extrabold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white"
                          />
                          <span className="text-[10px] text-blue-500 font-bold ml-1">%</span>
                        </div>
                      </td>

                      {/* Total Tax Pill */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-blue-50 text-blue-700 border border-blue-200/60">
                          {igstNum.toFixed(1)}% GST
                        </span>
                      </td>

                      {/* Delete Action */}
                      <td className="py-2.5 px-3 text-center">
                        {cat.isSystem ? (
                          <span className="text-[10px] text-slate-350 font-bold select-none">&mdash;</span>
                        ) : (
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD CATEGORY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                    Add New Product Category
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Define category name &amp; default GST rates
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunglasses, Reading Glasses, Solutions"
                  value={newCatName}
                  onChange={(e) => handleNewNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Category Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SUNGLASSES"
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Default HSN Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 90041000"
                    value={newCatHsn}
                    onChange={(e) => setNewCatHsn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* GST Rate Inputs */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Default GST Tax Percentages
                  </span>
                  <span className="text-[9px] text-blue-600 font-bold">Smart 50/50 Split</span>
                </div>

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
                      value={newCatIgst}
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
                      value={newCatCgst}
                      onChange={(e) => setNewCatCgst(e.target.value)}
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
                      value={newCatSgst}
                      onChange={(e) => setNewCatSgst(e.target.value)}
                      className="w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isCreating ? "Creating..." : "Create Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
