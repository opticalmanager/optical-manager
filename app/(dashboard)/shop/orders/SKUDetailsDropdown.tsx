"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface SKUDetail {
  description: string;
  quantity: number;
  category: string | null;
  sku: string | null;
}

interface SKUDetailsDropdownProps {
  label: string;
  skus: SKUDetail[];
}

export function SKUDetailsDropdown({ label, skus }: SKUDetailsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-white hover:text-[#0a52c3] hover:border-[#0a52c3]/30 group-hover:bg-white group-hover:text-[#0a52c3] group-hover:border-[#0a52c3]/30 border border-slate-200/60 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm select-none"
      >
        <span>{label}</span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0a52c3] transition-colors" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0a52c3] transition-colors" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-56 rounded-xl border border-slate-200/80 bg-white p-3 shadow-lg z-30 space-y-2.5 text-xs leading-tight select-none">
          <h4 className="font-black uppercase text-slate-600 tracking-wider border-b border-slate-100 pb-1.5">
            Billed SKU items
          </h4>
          <div className="space-y-2 max-h-36 overflow-y-auto divide-y divide-slate-50 pr-0.5">
            {skus.map((item, index) => (
              <div key={index} className="flex justify-between items-start gap-2 pt-1.5 first:pt-0">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-slate-800 break-words">{item.description}</p>
                  {item.sku && <p className="font-semibold text-slate-400">SKU: {item.sku}</p>}
                </div>
                <span className="font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
