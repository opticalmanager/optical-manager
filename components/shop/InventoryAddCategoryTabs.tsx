"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { CategoryItem } from "@/services/category.service";

interface InventoryAddCategoryTabsProps {
  categories: CategoryItem[];
  activeCategoryCode: string;
}

export function InventoryAddCategoryTabs({
  categories,
  activeCategoryCode,
}: InventoryAddCategoryTabsProps) {
  const router = useRouter();
  const normalizedActive = activeCategoryCode.trim().toUpperCase();

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 w-full overflow-x-auto">
      {categories.map((cat) => {
        const isActive =
          normalizedActive === cat.code.toUpperCase() ||
          (normalizedActive === "FRAME" && cat.code === "FRAME") ||
          (normalizedActive === "LENS" && cat.code === "LENS") ||
          (normalizedActive === "CONTACT_LENS" && cat.code === "CONTACT_LENS") ||
          (normalizedActive === "ACCESSORY" && cat.code === "ACCESSORY");

        return (
          <button
            key={cat.id || cat.code}
            type="button"
            onClick={() => router.push(`/shop/inventory/add?category=${cat.code.toLowerCase()}`)}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/70 bg-transparent hover:text-slate-900"
            }`}
          >
            {cat.name}
          </button>
        );
      })}

      <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

      <Link
        href="/shop/settings?view=gst-rates"
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200/60 rounded-lg transition-colors ml-auto cursor-pointer whitespace-nowrap"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Manage Categories &amp; Rates</span>
      </Link>
    </div>
  );
}
