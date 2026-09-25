"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, Receipt, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OrderHeaderActions() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative"
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-4 font-bold shadow-sm rounded-xl cursor-pointer text-xs uppercase tracking-wider flex items-center gap-2 bg-[#0a52c3] hover:bg-[#004bb5] text-white shadow-[#0a52c3]/20"
      >
        <Plus className="h-4 w-4" />
        <span>Invoices & Sales</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full pt-1.5 w-60 z-40 animate-fade-in"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 divide-y divide-slate-100">
            <div className="px-3.5 py-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Billing Actions
              </p>
            </div>
            <div className="p-1.5 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/shop/invoices/new");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3 text-xs font-bold text-slate-700 hover:text-[#0a52c3] group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-blue-50 text-[#0a52c3] group-hover:bg-[#0a52c3] group-hover:text-white transition-colors">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <span className="block font-bold text-slate-800 group-hover:text-[#0a52c3]">
                    New Invoice
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium">
                    Create POS sale or bill
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/shop/invoices/import");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3 text-xs font-bold text-slate-700 hover:text-[#0a52c3] group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <span className="block font-bold text-slate-800 group-hover:text-emerald-700">
                    Import Invoices (CSV)
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium">
                    Batch import historical bills
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
