"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

interface OrdersSearchInputProps {
  defaultValue?: string;
  placeholder?: string;
}

export function OrdersSearchInput({
  defaultValue = "",
  placeholder = "Search order #, invoice #, customer, mobile, SKU...",
}: OrdersSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  // Keep search term synchronized when URL changes externally
  useEffect(() => {
    setSearchTerm(defaultValue);
  }, [defaultValue]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParam = searchParams.get("search") || "";
      if (searchTerm.trim() !== currentParam.trim()) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
          params.set("page", "1"); // Reset to page 1 on new search
        } else {
          params.delete("search");
          params.set("page", "1");
        }
        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, pathname, router]);

  const handleClear = () => {
    setSearchTerm("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative flex-1">
      <div className="absolute left-3 top-2.5 pointer-events-none text-slate-400">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#0a52c3]" />
        ) : (
          <Search className="h-4 w-4 text-slate-400" />
        )}
      </div>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const params = new URLSearchParams(searchParams.toString());
            if (searchTerm.trim()) {
              params.set("search", searchTerm.trim());
              params.set("page", "1");
            } else {
              params.delete("search");
              params.set("page", "1");
            }
            startTransition(() => {
              router.push(`${pathname}?${params.toString()}`);
            });
          }
        }}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/15 focus:border-[#0a52c3] text-slate-800 placeholder:text-slate-400 transition-all shadow-xs"
      />

      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
