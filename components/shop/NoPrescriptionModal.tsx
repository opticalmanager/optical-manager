"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { EyeOff, X, User, FileText } from "lucide-react";

interface NoPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  customerName: string;
  customerId?: string | null;
  orderFormHref?: string | null;
}

/**
 * Clean inline modal displayed when clicking Prescription on an order without recorded Rx powers.
 */
export function NoPrescriptionModal({
  isOpen,
  onClose,
  orderNumber,
  customerName,
  customerId,
  orderFormHref,
}: NoPrescriptionModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="absolute top-3.5 right-3.5 h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-500 flex items-center justify-center shrink-0">
            <EyeOff className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              No Eye Prescription Available
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              {orderNumber} • {customerName}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-600 leading-relaxed">
          No refractive optical power measurements (<span className="font-bold text-slate-800">SPH, CYL, AXIS, ADD</span>) have been added for this customer or order yet.
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {orderFormHref && (
            <Link
              href={orderFormHref}
              onClick={onClose}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-[#0a52c3]" />
              <span>Order Form</span>
            </Link>
          )}
          {customerId && (
            <Link
              href={`/shop/customers/${customerId}`}
              onClick={onClose}
              className="h-9 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0a52c3] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              <span>Add Rx in Profile</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
