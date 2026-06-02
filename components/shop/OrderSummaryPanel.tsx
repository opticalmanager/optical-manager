"use client";

import { useFormContext } from "react-hook-form";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  Percent,
  Receipt,
  Sparkles,
  Wallet,
  Coins,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrderSummaryPanelProps {
  watch: any;
  register: any;
  setValue: any;
}

export function OrderSummaryPanel({
  watch,
  register,
  setValue,
}: OrderSummaryPanelProps) {
  const watchedItems = watch("invoiceItems") || [];
  const discountPercent = watch("discountPercent") || 0;
  const taxPercent = watch("taxPercent") || 0;
  const paymentMethod = watch("paymentMethod") || "CASH";

  // Calculate totals
  const subtotal = watchedItems.reduce(
    (sum: number, item: any) => sum + (parseFloat(item.subtotal) || 0),
    0
  );
  const discount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discount;
  const tax = (taxableAmount * taxPercent) / 100;
  const total = taxableAmount + tax;

  const paymentMethods = [
    { value: "CASH", label: "Cash", icon: Coins },
    { value: "CARD", label: "Card", icon: CreditCard },
    { value: "UPI", label: "UPI", icon: Wallet },
    { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Send },
  ];

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6 lg:sticky lg:top-6 transition-all hover:border-indigo-500/30">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-bold tracking-tight text-white">Order Invoice Summary</h3>
        </div>
        <Badge
          variant="outline"
          className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 text-[10px]"
        >
          <Sparkles className="h-3 w-3 mr-1 text-indigo-400" /> Live Receipt
        </Badge>
      </div>

      {/* Items Breakdown list */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
          Billing Items
        </span>
        {watchedItems.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No products added yet.</p>
        ) : (
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/50 pr-1 space-y-2">
            {watchedItems.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1.5 first:pt-0"
              >
                <div className="truncate max-w-[160px]">
                  <span className="text-slate-200 font-medium block truncate">
                    {item.description || `Item #${idx + 1}`}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Qty: {item.quantity || 1} • {formatCurrency(item.unitPrice || 0)}
                  </span>
                </div>
                <span className="font-semibold text-slate-200">
                  {formatCurrency(item.subtotal || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discount & Tax Sliders/Inputs */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
          Adjustment Config
        </span>
        <div className="grid grid-cols-2 gap-4">
          {/* Discount Field */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
              Discount (%)
              <span className="text-indigo-400 font-bold">-{formatCurrency(discount)}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="0"
                {...register("discountPercent", { valueAsNumber: true })}
              />
              <Percent className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          {/* Tax Field */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
              GST / Tax (%)
              <span className="text-indigo-400 font-bold">+{formatCurrency(tax)}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="0"
                {...register("taxPercent", { valueAsNumber: true })}
              />
              <Percent className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
          Payment Method
        </span>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map((pm) => {
            const Icon = pm.icon;
            const isSelected = paymentMethod === pm.value;
            return (
              <button
                key={pm.value}
                type="button"
                className={`py-2 px-3 rounded-lg border text-left flex items-center gap-2 transition-all duration-200 ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                    : "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                }`}
                onClick={() => setValue("paymentMethod", pm.value)}
              >
                <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                <span className="text-[11px] font-semibold">{pm.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial Breakdown Table */}
      <div className="space-y-2 pt-4 border-t border-slate-800 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex items-center justify-between text-rose-400">
            <span>Discount ({discountPercent}%)</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        {tax > 0 && (
          <div className="flex items-center justify-between text-emerald-400">
            <span>GST / Tax ({taxPercent}%)</span>
            <span>+{formatCurrency(tax)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
          <span>Grand Total</span>
          <span className="text-xl text-indigo-400 font-extrabold tracking-tight">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
