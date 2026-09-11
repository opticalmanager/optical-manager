"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Package, Check, Save, Plus, Minus, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quickUpdateInventoryAction, type QuickUpdateInventoryPayload } from "@/actions/inventory.actions";
import { offlineDB } from "@/lib/offline/db";
import { enqueueOfflineMutation } from "@/lib/offline/mutation-queue";

export interface InventoryItemForEdit {
  id: string;
  shopId: string;
  organizationId: string;
  name: string;
  category: "FRAME" | "LENS" | "CONTACT_LENS" | "ACCESSORY" | "SOLUTION";
  brand: string | null;
  model: string | null;
  sku: string | null;
  price: string;
  costPrice: string | null;
  quantity: number;
  minQuantity: number;
  isActive: boolean;
  imageUrl: string | null;
  cgstPercent?: string;
  sgstPercent?: string;
  igstPercent?: string;
}

interface QuickEditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItemForEdit | null;
  onUpdated: (updatedItem: InventoryItemForEdit) => void;
}

export function QuickEditStockModal({
  isOpen,
  onClose,
  item,
  onUpdated,
}: QuickEditStockModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [minQuantity, setMinQuantity] = useState("5");

  // Stock adjustments
  const [adjustMode, setAdjustMode] = useState<"NONE" | "ADD" | "SUBTRACT" | "SET">("NONE");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("AUDIT_CORRECTION");

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setBrand(item.brand || "");
      setModel(item.model || "");
      setPrice(item.price || "0.00");
      setCostPrice(item.costPrice || "0.00");
      setMinQuantity(item.minQuantity?.toString() || "5");
      setAdjustMode("NONE");
      setAdjustQty("");
      setAdjustReason("AUDIT_CORRECTION");
    }
  }, [item]);

  if (!isOpen || !item) return null;

  // Compute preview quantity
  const currentQty = Number(item.quantity) || 0;
  const parsedAdjustVal = Math.max(0, parseInt(adjustQty || "0", 10) || 0);

  let previewQty = currentQty;
  let deltaQuantity = 0;

  if (adjustMode === "ADD") {
    previewQty = currentQty + parsedAdjustVal;
    deltaQuantity = parsedAdjustVal;
  } else if (adjustMode === "SUBTRACT") {
    previewQty = Math.max(0, currentQty - parsedAdjustVal);
    deltaQuantity = -Math.min(currentQty, parsedAdjustVal);
  } else if (adjustMode === "SET" && adjustQty !== "") {
    previewQty = parsedAdjustVal;
    deltaQuantity = parsedAdjustVal - currentQty;
  }

  // Strict numeric input handler (Rule 13)
  const handleNumericInput = (
    e: React.KeyboardEvent<HTMLInputElement>,
    allowDecimal: boolean = false
  ) => {
    const validKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "Enter",
    ];
    if (validKeys.includes(e.key)) return;
    if (allowDecimal && e.key === "." && !e.currentTarget.value.includes(".")) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Item name is required.");
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error("Please enter a valid selling price.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Saving inventory updates...");

    const payload: QuickUpdateInventoryPayload = {
      itemId: item.id,
      name: name.trim(),
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      price: numPrice.toFixed(2),
      costPrice: costPrice ? Math.max(0, parseFloat(costPrice)).toFixed(2) : "0.00",
      minQuantity: Math.max(0, parseInt(minQuantity, 10) || 0),
      quantityAdjustment: deltaQuantity !== 0 ? deltaQuantity : undefined,
      adjustmentReason: deltaQuantity !== 0 ? adjustReason : undefined,
    };

    const updatedItemRecord: InventoryItemForEdit = {
      ...item,
      name: payload.name || item.name,
      brand: payload.brand !== undefined ? payload.brand : item.brand,
      model: payload.model !== undefined ? payload.model : item.model,
      price: payload.price?.toString() || item.price,
      costPrice: payload.costPrice?.toString() || item.costPrice,
      minQuantity: payload.minQuantity ?? item.minQuantity,
      quantity: previewQty,
    };

    const saveOfflineFallback = async () => {
      try {
        const shopId = (await offlineDB.getCurrentShopId()) || item.shopId || "";

        // 1. Update IndexedDB cached_inventory
        await offlineDB.cached_inventory.update(item.id, {
          name: updatedItemRecord.name,
          brand: updatedItemRecord.brand,
          model: updatedItemRecord.model,
          price: updatedItemRecord.price,
          quantity: updatedItemRecord.quantity,
          updatedAt: new Date().toISOString(),
        });

        // 2. Queue mutation
        await enqueueOfflineMutation(shopId, "INVENTORY_UPDATE", {
          itemId: item.id,
          name: updatedItemRecord.name,
          brand: updatedItemRecord.brand,
          model: updatedItemRecord.model,
          price: updatedItemRecord.price,
          costPrice: updatedItemRecord.costPrice,
          minQuantity: updatedItemRecord.minQuantity,
        });

        if (deltaQuantity !== 0) {
          await enqueueOfflineMutation(shopId, "STOCK_ADJUST", {
            inventoryId: item.id,
            quantityChange: deltaQuantity,
            movementType: deltaQuantity > 0 ? "STOCK_IN" : "STOCK_OUT",
            notes: adjustReason || "Offline stock adjustment",
          });
        }

        window.dispatchEvent(new CustomEvent("offline-databank-updated"));
        onUpdated(updatedItemRecord);
        toast.success("Stock updated locally! Will sync automatically when back online.", {
          id: loadingToast,
        });
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to save stock update locally.", { id: loadingToast });
      }
    };

    // If browser is offline, save directly
    if (!navigator.onLine) {
      await saveOfflineFallback();
      setIsSubmitting(false);
      return;
    }

    // Otherwise try online server action with timeout race
    try {
      const actionPromise = quickUpdateInventoryAction(payload);
      const timeoutPromise = new Promise<{ success: boolean; message: string }>((_, reject) =>
        setTimeout(() => reject(new Error("Network timeout")), 2500)
      );

      const res = await Promise.race([actionPromise, timeoutPromise]);
      if (res.success) {
        // Also update local cached_inventory
        await offlineDB.cached_inventory.update(item.id, {
          name: updatedItemRecord.name,
          brand: updatedItemRecord.brand,
          model: updatedItemRecord.model,
          price: updatedItemRecord.price,
          quantity: updatedItemRecord.quantity,
          updatedAt: new Date().toISOString(),
        });

        window.dispatchEvent(new CustomEvent("offline-databank-updated"));
        onUpdated(updatedItemRecord);
        toast.success(res.message || "Stock updated successfully!", { id: loadingToast });
        onClose();
      } else {
        toast.error(res.message || "Failed to update item.", { id: loadingToast });
      }
    } catch (err: any) {
      console.warn("[QuickEditStockModal] Online update failed or timed out, saving offline:", err);
      await saveOfflineFallback();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in-50">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#2563eb]/10 text-[#2563eb]">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Quick Edit Stock & Details
              </h2>
              <p className="text-[10px] font-semibold text-slate-400">
                SKU: <span className="font-mono text-[#2563eb]">{item.sku || "N/A"}</span> • Category:{" "}
                <span className="uppercase text-slate-600 font-bold">{item.category}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product Name"
              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Ray-Ban"
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Model / Code
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. RB3025"
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          {/* Pricing & Min Qty */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Selling Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onKeyDown={(e) => handleNumericInput(e, true)}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Cost Price (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={costPrice}
                onKeyDown={(e) => handleNumericInput(e, true)}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Min Stock Alert
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={minQuantity}
                onKeyDown={(e) => handleNumericInput(e, false)}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="5"
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          {/* Stock Level Adjustment Section */}
          <div className="border border-slate-200/80 rounded-xl p-3 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Current Stock Level
                </span>
                <p className="text-base font-extrabold text-slate-900 leading-tight">
                  {currentQty} <span className="text-xs font-normal text-slate-500">Units</span>
                </p>
              </div>

              {/* Live Preview */}
              {deltaQuantity !== 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    New Balance
                  </span>
                  <div className="flex items-center gap-1 justify-end font-extrabold text-xs">
                    <span
                      className={
                        previewQty > currentQty
                          ? "text-emerald-600 flex items-center"
                          : "text-rose-600 flex items-center"
                      }
                    >
                      {previewQty > currentQty ? (
                        <ArrowUpRight className="h-3.5 w-3.5 inline" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 inline" />
                      )}
                      {previewQty} Units
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      ({deltaQuantity > 0 ? `+${deltaQuantity}` : deltaQuantity})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Adjustment Mode Selection */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdjustMode(adjustMode === "ADD" ? "NONE" : "ADD")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  adjustMode === "ADD"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Plus className="h-3 w-3" /> Add Stock
              </button>

              <button
                type="button"
                onClick={() => setAdjustMode(adjustMode === "SUBTRACT" ? "NONE" : "SUBTRACT")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  adjustMode === "SUBTRACT"
                    ? "bg-rose-50 border-rose-500 text-rose-700 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Minus className="h-3 w-3" /> Remove Stock
              </button>

              <button
                type="button"
                onClick={() => setAdjustMode(adjustMode === "SET" ? "NONE" : "SET")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  adjustMode === "SET"
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Set Exact Qty
              </button>
            </div>

            {/* Adjustment Controls when active */}
            {adjustMode !== "NONE" && (
              <div className="pt-2 border-t border-slate-200/70 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1">
                      {adjustMode === "SET" ? "New Total Units" : "Units to Adjust"}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={adjustQty}
                      onKeyDown={(e) => handleNumericInput(e, false)}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      placeholder="0"
                      className="w-full h-7 px-2 bg-white border border-slate-200 rounded text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1">
                      Adjustment Reason
                    </label>
                    <select
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full h-7 px-2 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2563eb]"
                    >
                      <option value="AUDIT_CORRECTION">Physical Count Audit</option>
                      <option value="RESTOCK">Quick Restock</option>
                      <option value="DAMAGED">Damaged / Broken</option>
                      <option value="CUSTOMER_EXCHANGE">Customer Exchange</option>
                      <option value="INTERNAL_USE">Internal Store Sample</option>
                    </select>
                  </div>
                </div>

                {/* Quick Increment buttons */}
                {adjustMode !== "SET" && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[9px] font-bold text-slate-400">Quick:</span>
                    {[1, 5, 10, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAdjustQty(num.toString())}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 text-xs font-bold px-3 rounded-lg border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-8 text-xs font-bold px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
