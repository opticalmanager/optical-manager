"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { UserCheck, Stethoscope, ChevronDown } from "lucide-react";

interface ClinicalAutocompleteInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  options: string[];
  iconType?: "doctor" | "referrer";
  onSelectOption?: (val: string) => void;
}

export function ClinicalAutocompleteInput({
  options = [],
  iconType = "doctor",
  onSelectOption,
  value,
  onChange,
  className,
  placeholder,
  ...props
}: ClinicalAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(String(value || ""));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(String(value || ""));
  }, [value]);

  // Filter options based on input value in memory (0 network calls)
  const filteredOptions = options.filter((item) =>
    item.toLowerCase().includes(inputValue.toLowerCase().trim())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    setInputValue(val);
    if (onSelectOption) onSelectOption(val);
    if (onChange) {
      const syntheticEvent = {
        target: { value: val },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (onChange) onChange(e);
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          {...props}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={className}
        />
        {options.length > 0 && (
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1">
          <div className="p-1.5 space-y-0.5">
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#0a52c3]/5 hover:text-[#0a52c3] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                {iconType === "doctor" ? (
                  <Stethoscope className="h-3.5 w-3.5 text-[#0a52c3] shrink-0" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                )}
                <span className="truncate">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
