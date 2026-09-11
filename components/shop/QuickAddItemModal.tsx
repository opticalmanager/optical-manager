"use client";

import React, { useState, useTransition } from "react";
import { X, Package, Tag, DollarSign, Layers, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { offlineDB } from "@/lib/offline/db";
import { enqueueOfflineMutation } from "@/lib/offline/mutation-queue";
import {
  createFrameItemAction,
  createLensItemAction,
  createContactLensItemAction,
  createAccessoryItemAction,
} from "@/actions/inventory.actions";

interface QuickAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (item: any) => void;
}

const CATEGORIES = [
  { id: "FRAME", label: "Frame / Sunglass" },
  { id: "LENS", label: "Ophthalmic Lens" },
  { id: "CONTACT_LENS", label: "Contact Lens" },
  { id: "ACCESSORY", label: "Accessory / Solution" },
];

export function QuickAddItemModal({ isOpen, onClose, onCreated }: QuickAddItemModalProps) {
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState<"FRAME" | "LENS" | "CONTACT_LENS" | "ACCESSORY">("FRAME");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [minQuantity, setMinQuantity] = useState("5");
  const [gstRate, setGstRate] = useState("12");

  if (!isOpen) return null;

  const handleReset = () => {
    setName("");
    setBrand("");
    setModel("");
    setCostPrice("");
    setPrice("");
    setQuantity("1");
    setMinQuantity("5");
    setGstRate("12");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter an item name.");
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Please enter a valid retail price.");
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      toast.error("Please enter a valid stock quantity (0 or more).");
      return;
    }

    const parsedMinQty = parseInt(minQuantity, 10) || 5;
    const parsedCostPrice = parseFloat(costPrice) || 0;
    const halfGst = (parseFloat(gstRate) / 2 || 6).toString();

    startTransition(async () => {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const activeShopId =
        typeof window !== "undefined"
          ? localStorage.getItem("om_active_shop_id") || "active_shop"
          : "active_shop";
      const activeOrgId =
        typeof window !== "undefined"
          ? localStorage.getItem("om_active_org_id") || "active_org"
          : "active_org";

      const prefix =
        category === "FRAME"
          ? "FRM"
          : category === "LENS"
          ? "LNS"
          : category === "CONTACT_LENS"
          ? "CNT"
          : "ACC";
      const brandCode = (brand || "GEN")
        .replace(/[^A-Za-z]/g, "")
        .substring(0, 3)
        .toUpperCase()
        .padEnd(3, "X");
      const modelCode = (model || "000")
        .replace(/[^A-Za-z0-9]/g, "")
        .substring(0, 4)
        .toUpperCase();
      const generatedSku = `${prefix}-${brandCode}${modelCode}-${Math.floor(
        100 + Math.random() * 900
      )}`;
      const offlineItemId = `off-inv-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 6)}`;

      const offlineRecord = {
        id: offlineItemId,
        shopId: activeShopId,
        organizationId: activeOrgId,
        name: name.trim(),
        category,
        brand: brand.trim() || null,
        model: model.trim() || null,
        sku: generatedSku,
        price: parsedPrice.toFixed(2),
        quantity: parsedQty,
        isActive: true,
        cgstPercent: halfGst,
        sgstPercent: halfGst,
        igstPercent: (parseFloat(gstRate) || 12).toString(),
        updatedAt: new Date().toISOString(),
      };

      const tableItem = {
        ...offlineRecord,
        costPrice: parsedCostPrice.toFixed(2),
        minQuantity: parsedMinQty,
        imageUrl: null,
        hsnCode: category === "FRAME" ? "90049000" : "90015000",
        vendorName: null,
        rackLocation: null,
        requiresExpiryTracking: false,
        batchNumber: null,
        expiryDate: null,
        purchaseInvoiceNo: null,
        inwardDate: new Date().toISOString().split("T")[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const payload = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        modelNumber: model.trim() || undefined,
        price: parsedPrice,
        costPrice: parsedCostPrice,
        quantity: parsedQty,
        minQuantity: parsedMinQty,
        cgstPercent: parseFloat(halfGst),
        sgstPercent: parseFloat(halfGst),
        igstPercent: parseFloat(gstRate) || 12,
        requiresExpiryTracking: false,
      };

      if (isOffline) {
        try {
          await offlineDB.cached_inventory.put(offlineRecord);
          await enqueueOfflineMutation(activeShopId, "INVENTORY_CREATE", {
            category,
            ...payload,
            sku: generatedSku,
            offlineItemId,
          });

          toast.success("Stock item saved locally (will sync automatically when online).");
          onCreated?.(tableItem);
          handleReset();
          onClose();
        } catch (err: any) {
          console.error("Failed to save offline inventory:", err);
          toast.error("Failed to save stock locally.");
        }
        return;
      }

      // Online execution
      try {
        let res: any;
        if (category === "FRAME") {
          res = await createFrameItemAction(undefined, payload);
        } else if (category === "LENS") {
          res = await createLensItemAction(undefined, {
            ...payload,
            lensType: "Single Vision",
            material: "CR-39 Standard Plastic",
          });
        } else if (category === "CONTACT_LENS") {
          res = await createContactLensItemAction(undefined, {
            ...payload,
            lensType: "Soft Spherical",
            disposability: "Monthly",
            packSize: 6,
          });
        } else {
          res = await createAccessoryItemAction(undefined, payload);
        }

        if (res?.success) {
          toast.success(res.message || "Stock item cataloged successfully.");
          try {
            await offlineDB.cached_inventory.put(offlineRecord);
          } catch {}
          onCreated?.(tableItem);
          handleReset();
          onClose();
        } else {
          toast.error(res?.message || "Failed to catalog stock item.");
        }
      } catch (err) {
        // Fallback to offline on connection drop
        try {
          await offlineDB.cached_inventory.put(offlineRecord);
          await enqueueOfflineMutation(activeShopId, "INVENTORY_CREATE", {
            category,
            ...payload,
            sku: generatedSku,
            offlineItemId,
          });
          toast.success("Connection interrupted: Stock item safely saved offline.");
          onCreated?.(tableItem);
          handleReset();
          onClose();
        } catch (localErr) {
          toast.error("An unexpected error occurred while saving.");
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-xl shadow-xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Quick Add Stock Item</h3>
              <p className="text-xs text-slate-500">Fast inventory entry (100% offline-ready)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Category Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100/70 rounded-xl">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id as any)}
                  className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all cursor-pointer truncate ${
                    category === c.id
                      ? "bg-white text-[#2563eb] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item / Product Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aviator Classic Gunmetal"
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
              />
            </div>
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Ray-Ban"
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model / Code</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. RB3025"
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
              />
            </div>
          </div>

          {/* Price & Cost Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Retail Price (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={price}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d*$/.test(val)) setPrice(val);
                  }}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost (₹)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  value={costPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d*$/.test(val)) setCostPrice(val);
                  }}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Quantity & Min Alert Quantity */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stock Qty <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val)) setQuantity(val);
                  }}
                  placeholder="1"
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Alert Qty</label>
              <input
                type="text"
                inputMode="numeric"
                value={minQuantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) setMinQuantity(val);
                }}
                placeholder="5"
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full px-2 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
              >
                <option value="0">0% (Nil)</option>
                <option value="5">5%</option>
                <option value="12">12% (Standard)</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <a
              href={`/shop/inventory/add?category=${category.toLowerCase()}`}
              className="text-xs font-semibold text-slate-500 hover:text-[#2563eb] transition-colors"
            >
              Advanced Form →
            </a>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="text-xs h-9 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="text-xs h-9 font-bold bg-[#2563eb] hover:bg-blue-700 text-white shadow-sm cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Save Item
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}