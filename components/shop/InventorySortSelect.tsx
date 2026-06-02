"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface InventorySortSelectProps {
  currentSort: string;
}

export function InventorySortSelect({ currentSort }: InventorySortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={currentSort}
      onChange={(e) => handleSortChange(e.target.value)}
      className="h-9 w-full md:w-auto px-3.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/25 cursor-pointer"
    >
      <option value="SKU">SORT BY: SKU</option>
      <option value="PRICE">SORT BY: PRICE</option>
      <option value="STOCK">SORT BY: STOCK</option>
    </select>
  );
}
