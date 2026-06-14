"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Calendar } from "lucide-react";

interface TimeframeDropdownProps {
  currentTimeframe: string;
}

export function TimeframeDropdown({ currentTimeframe }: TimeframeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    { value: "24h", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "12m", label: "Last 12 Months" },
    { value: "ytd", label: "Year to Date" },
    { value: "all", label: "All Time" },
  ];

  const currentLabel = options.find((opt) => opt.value === currentTimeframe)?.label || "Last 30 Days";

  const handleSelect = (val: string) => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("timeframe", val);
    params.set("page", "1");
    router.push(`/shop/orders?${params.toString()}`);
  };

  return (
    <div className="relative inline-block text-left select-none" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all cursor-pointer"
      >
        <span>{currentLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dropdownFadeIn {
              from { opacity: 0; transform: scale(0.96) translateX(-50%) translateY(-6px); }
              to { opacity: 1; transform: scale(1) translateX(-50%) translateY(0); }
            }
            .dropdown-animate {
              animation: dropdownFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}} />
          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-40 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg z-30 space-y-0.5 text-xs select-none origin-top dropdown-animate">
            {options.map((opt) => {
              const isActive = opt.value === currentTimeframe;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#0a52c3]/5 text-[#0a52c3]"
                      : "text-slate-650 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
