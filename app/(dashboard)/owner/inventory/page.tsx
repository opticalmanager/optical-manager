import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { inventory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Package, Plus, Search, Eye, RefreshCw, AlertCircle } from "lucide-react";

export default async function OwnerInventoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const dbInventory = await db
    .select()
    .from(inventory)
    .where(eq(inventory.organizationId, user.organizationId));

  const hasRealInventory = dbInventory.length > 0;

  // Mock inventories if table is completely empty
  const displayInventory = hasRealInventory ? dbInventory : [
    {
      id: "mock-i1",
      name: "Ray-Ban Aviator Classic (Gold)",
      category: "FRAME",
      brand: "Ray-Ban",
      sku: "RB-AV-GLD-58",
      price: "8500.00",
      quantity: 2,
      minQuantity: 5,
    },
    {
      id: "mock-i2",
      name: "Crizal Prevencia Single Vision 1.56",
      category: "LENS",
      brand: "Essilor",
      sku: "ESS-CRZ-PRV-156",
      price: "3200.00",
      quantity: 1,
      minQuantity: 4,
    },
    {
      id: "mock-i3",
      name: "Acuvue Oasys 2-Week (6 lenses)",
      category: "CONTACT_LENS",
      brand: "Johnson & Johnson",
      sku: "JJ-AC-OAS-2W",
      price: "2400.00",
      quantity: 3,
      minQuantity: 8,
    },
    {
      id: "mock-i4",
      name: "Bausch & Lomb Biotrue Solution 300ml",
      category: "SOLUTION",
      brand: "Bausch & Lomb",
      sku: "BL-BT-SLN-300",
      price: "650.00",
      quantity: 0,
      minQuantity: 5,
    },
    {
      id: "mock-i5",
      name: "Oakley Holbrook Woodgrain",
      category: "FRAME",
      brand: "Oakley",
      sku: "OK-HL-WDG-57",
      price: "12500.00",
      quantity: 12,
      minQuantity: 3,
    },
    {
      id: "mock-i6",
      name: "Microfiber Lens Cleaning Cloth (Pack of 5)",
      category: "ACCESSORY",
      brand: "Generic",
      sku: "GEN-MF-CLT-P5",
      price: "150.00",
      quantity: 24,
      minQuantity: 10,
    }
  ];

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "FRAME": return "Frame";
      case "LENS": return "Lens";
      case "CONTACT_LENS": return "Contact Lens";
      case "ACCESSORY": return "Accessory";
      case "SOLUTION": return "Solution";
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "FRAME": return "bg-indigo-50 border-indigo-100 text-indigo-700";
      case "LENS": return "bg-emerald-50 border-emerald-100 text-emerald-700";
      case "CONTACT_LENS": return "bg-blue-50 border-blue-100 text-blue-700";
      case "SOLUTION": return "bg-amber-50 border-amber-100 text-amber-700";
      default: return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Inventory Management
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage frame types, optical prescription lenses, contact lenses, solutions, and accessories.
          </p>
        </div>
        
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm cursor-pointer shadow-md shadow-indigo-600/10 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Add Stock Item</span>
        </button>
      </div>

      {!hasRealInventory && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Showing Demo Stock Listings (Database Empty)
        </div>
      )}

      {/* Search & Stats Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog by name, brand, SKU..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            disabled
          />
        </div>
        
        <div className="text-xs text-slate-400 font-medium sm:ml-auto select-none">
          Total Unique Items: <span className="font-semibold text-slate-800">{displayInventory.length}</span>
        </div>
      </div>

      {/* Inventory Catalog Listing */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/30">
                <th className="px-6 py-4">Item Name / Brand</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">SKU Code</th>
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4">Quantity Available</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {displayInventory.map((item) => {
                const categoryColor = getCategoryColor(item.category);
                const priceNum = typeof item.price === "string" ? parseFloat(item.price) : item.price;
                const formattedPrice = new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(priceNum);

                const isLowStock = item.quantity < item.minQuantity;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-inner">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Brand: {item.brand || "Unspecified"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${categoryColor}`}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs font-semibold">
                      {item.sku || <span className="text-slate-300">N/A</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-bold font-mono">
                      {formattedPrice}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`font-bold ${isLowStock ? "text-red-600" : "text-slate-800"}`}>
                          {item.quantity} units
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Min limit: {item.minQuantity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.quantity === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Out of Stock</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span>In Stock</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
