"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { 
  Download, 
  Plus, 
  Image as ImageIcon, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Box, 
  Pencil, 
  TrendingUp, 
  AlertTriangle,
  MinusCircle,
  PiggyBank,
  Search,
  X
} from "lucide-react";

interface InventoryItem {
  id: string;
  shopId: string;
  organizationId: string;
  name: string;
  category: "FRAME" | "LENS" | "CONTACT_LENS" | "ACCESSORY" | "SOLUTION";
  brand: string | null;
  model: string | null;
  sku: string | null;
  price: string; // decimal is returned as string from drizzle
  costPrice: string | null;
  quantity: number;
  minQuantity: number;
  isActive: boolean;
  imageUrl: string | null;
  hsnCode: string | null;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
  vendorName: string | null;
  rackLocation: string | null;
  requiresExpiryTracking: boolean;
  batchNumber: string | null;
  expiryDate: string | null;
  purchaseInvoiceNo: string | null;
  inwardDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryDashboardClientProps {
  initialItems: InventoryItem[];
  initialCategory?: string;
  initialFilter?: string;
  initialSort?: string;
}

const ITEMS_PER_PAGE = 15;

export function InventoryDashboardClient({
  initialItems,
  initialCategory = "",
  initialFilter = "",
  initialSort = "SKU"
}: InventoryDashboardClientProps) {
  // Client states
  const [category, setCategory] = useState<string>(initialCategory.toUpperCase());
  const [filter, setFilter] = useState<string>(initialFilter.toLowerCase());
  const [sort, setSort] = useState<string>(initialSort.toUpperCase());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Synced URL parameters on interaction without Next.js page re-rendering lag
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category.toLowerCase());
    if (filter) params.set("filter", filter);
    if (sort && sort !== "SKU") params.set("sort", sort);
    if (searchQuery) params.set("q", searchQuery);

    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    
    // Using history.replaceState so that the URL is updated for bookmarks/shares 
    // but Next.js does not trigger a full Server Component execution roundtrip.
    window.history.replaceState(null, "", newUrl);
  }, [category, filter, sort, searchQuery]);

  // Reset pagination when filter/search/category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category, filter, searchQuery]);

  // Read search parameter query on initial mount (in case they entered through a shared URL with ?q=...)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, []);

  // Compute live KPIs based on selected category (All Items, Frames, Lenses, Contacts, Accessories)
  const kpis = useMemo(() => {
    const itemsToCompute = category 
      ? initialItems.filter((i) => i.category === category)
      : initialItems;

    const totalSkuCount = itemsToCompute.length;
    const lowStockCount = itemsToCompute.filter(
      (i) => i.quantity > 0 && i.quantity <= i.minQuantity
    ).length;
    const outOfStockCount = itemsToCompute.filter((i) => i.quantity === 0).length;
    
    const inventoryCostValue = itemsToCompute.reduce(
      (sum, i) => sum + Number(i.costPrice || 0) * i.quantity,
      0
    );
    
    const inventoryRetailValue = itemsToCompute.reduce(
      (sum, i) => sum + Number(i.price) * i.quantity,
      0
    );

    return {
      totalSkuCount,
      lowStockCount,
      outOfStockCount,
      inventoryCostValue,
      inventoryRetailValue
    };
  }, [initialItems, category]);

  // Filter, Search, and Sort Logic (In-Memory for 0ms lag)
  const filteredAndSortedItems = useMemo(() => {
    let result = [...initialItems];

    // 1. Category filter
    if (category) {
      result = result.filter((item) => item.category === category);
    }

    // 2. Stock levels filter
    if (filter === "low-stock") {
      result = result.filter((item) => item.quantity > 0 && item.quantity <= item.minQuantity);
    } else if (filter === "out-of-stock") {
      result = result.filter((item) => item.quantity === 0);
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) => 
          (item.name || "").toLowerCase().includes(q) ||
          (item.brand || "").toLowerCase().includes(q) ||
          (item.model || "").toLowerCase().includes(q) ||
          (item.sku || "").toLowerCase().includes(q)
      );
    }

    // 4. Sort
    if (sort === "PRICE") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === "STOCK") {
      result.sort((a, b) => b.quantity - a.quantity);
    } else {
      // Default: SKU
      result.sort((a, b) => (a.sku || "").localeCompare(b.sku || ""));
    }

    return result;
  }, [initialItems, category, filter, searchQuery, sort]);

  // Client-Side Pagination
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedItems, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / ITEMS_PER_PAGE));

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "SKU",
      "Item Name",
      "Brand",
      "Model",
      "Category",
      "Current Stock",
      "Min Stock Level",
      "Stock Status",
      "Cost Price",
      "Selling Price",
      "Stock Value (Cost)",
      "Stock Value (Retail)",
      "Vendor",
      "HSN Code",
      "CGST %",
      "SGST %",
      "Rack Location",
      "Purchase Invoice No.",
      "Purchase Date"
    ];

    const getStockStatus = (qty: number, minQty: number) => {
      if (qty === 0) return "Out of Stock";
      if (qty <= minQty) return "Low Stock";
      return "In Stock";
    };

    const formatCategory = (cat: string) => {
      switch (cat) {
        case "FRAME": return "Frame";
        case "LENS": return "Lens";
        case "CONTACT_LENS": return "Contact Lens";
        case "ACCESSORY": return "Accessory";
        case "SOLUTION": return "Solution";
        default: return cat;
      }
    };

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return "";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = String(d.getDate()).padStart(2, "0");
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      } catch {
        return dateStr;
      }
    };

    const rows = filteredAndSortedItems.map((item) => {
      const stockStatus = getStockStatus(item.quantity, item.minQuantity);
      const categoryText = formatCategory(item.category);
      const stockValueCost = (Number(item.costPrice || 0) * item.quantity).toFixed(2);
      const stockValueRetail = (Number(item.price) * item.quantity).toFixed(2);
      const formattedPurchaseDate = formatDate(item.inwardDate);

      return [
        item.sku || "",
        item.name || "",
        item.brand || "",
        item.model || "",
        categoryText,
        item.quantity,
        item.minQuantity,
        stockStatus,
        item.costPrice || "0.00",
        item.price,
        stockValueCost,
        stockValueRetail,
        item.vendorName || "",
        item.hsnCode || "",
        item.cgstPercent,
        item.sgstPercent,
        item.rackLocation || "",
        item.purchaseInvoiceNo || "",
        formattedPurchaseDate
      ];
    });

    // RFC 4180 escaping helper
    const escapeCSVField = (val: any) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSVField).join(","),
      ...rows.map((row) => row.map(escapeCSVField).join(","))
    ].join("\r\n");

    // Prepend UTF-8 BOM so MS Excel reads it with correct encoding (e.g. ₹ or special chars)
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    // Dynamic clean filename reflecting filter state
    const categoryPart = category ? category : "ALL";
    const filterPart = filter ? `_${filter.toUpperCase()}` : "";
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `optical_inventory_${categoryPart}${filterPart}_${dateStr}.csv`;

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Inventory Ledger
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your clinical supply chain with precision. High-fidelity tracking of frames, bespoke lenses, and optical accessories.
          </p>
        </div>

        <div className="flex gap-2.5 items-center">
          <Button 
            variant="outline" 
            className="font-semibold shadow-sm h-10 cursor-pointer"
            onClick={handleExportCSV}
            disabled={filteredAndSortedItems.length === 0}
          >
            <Download className="mr-2 h-4 w-4 text-slate-500" /> Export CSV
          </Button>
          <Link 
            href="/shop/inventory/add" 
            className="inline-flex items-center justify-center px-4 h-10 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Link>
        </div>
      </div>

      {/* Interactive KPIs Grid */}
      {(() => {
        const getCategoryPlural = (cat: string) => {
          switch (cat) {
            case "FRAME": return "frames";
            case "LENS": return "lenses";
            case "CONTACT_LENS": return "contact lenses";
            case "ACCESSORY": return "accessories";
            case "SOLUTION": return "solutions";
            default: return "catalog items";
          }
        };

        const getCategorySingular = (cat: string) => {
          switch (cat) {
            case "FRAME": return "Frame";
            case "LENS": return "Lens";
            case "CONTACT_LENS": return "Contact Lens";
            case "ACCESSORY": return "Accessory";
            case "SOLUTION": return "Solution";
            default: return "Inventory";
          }
        };

        const categoryPlural = getCategoryPlural(category);
        const categorySingular = getCategorySingular(category);

        return (
          <div className="grid gap-6 md:grid-cols-4">
            {/* KPI 1: Total SKU Count */}
            <div 
              onClick={() => setFilter("")} 
              className="block transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Card className={`shadow-sm transition-all border-slate-200 ${
                !filter 
                  ? "border-indigo-400 bg-indigo-50/10 shadow-md ring-1 ring-indigo-400/20" 
                  : "hover:border-indigo-300"
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    Total SKU Count
                    <TrendingUp className={`h-4 w-4 ${!filter ? "text-indigo-500" : "text-slate-400"}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1">
                    <div className="text-4xl font-bold text-indigo-650">
                      {kpis.totalSkuCount}
                    </div>
                    <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 uppercase tracking-wider">
                      📈 Active {categoryPlural}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI 2: Low Stock Alerts */}
            <div 
              onClick={() => setFilter("low-stock")} 
              className="block transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Card className={`shadow-sm transition-all border-slate-200 ${
                filter === "low-stock" 
                  ? "border-amber-400 bg-amber-50/10 shadow-md ring-1 ring-amber-400/20" 
                  : "hover:border-amber-300"
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    Low Stock Alerts
                    <AlertTriangle className={`h-4 w-4 ${filter === "low-stock" ? "text-amber-500" : "text-slate-400"}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1">
                    <div className="text-4xl font-bold text-amber-600">
                      {kpis.lowStockCount}
                    </div>
                    <span className={`text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider ${kpis.lowStockCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                      ⚠️ {kpis.lowStockCount > 0 ? `Alerts for ${categoryPlural}` : `${categoryPlural} stable`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI 3: Out of Order */}
            <div 
              onClick={() => setFilter("out-of-stock")} 
              className="block transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Card className={`shadow-sm transition-all border-slate-200 ${
                filter === "out-of-stock" 
                  ? "border-rose-400 bg-rose-50/10 shadow-md ring-1 ring-rose-400/20" 
                  : "hover:border-rose-300"
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    Out of Order
                    <MinusCircle className={`h-4 w-4 ${filter === "out-of-stock" ? "text-rose-550" : "text-slate-400"}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1">
                    <div className="text-4xl font-bold text-rose-650">
                      {kpis.outOfStockCount}
                    </div>
                    <span className={`text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider ${kpis.outOfStockCount > 0 ? "text-rose-550" : "text-slate-400"}`}>
                      🚫 {kpis.outOfStockCount > 0 ? `${categoryPlural} outages` : `No ${categoryPlural} outages`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI 4: Inventory Valuation */}
            <div className="block">
              <Card className="shadow-sm border-slate-200 bg-emerald-50/5 hover:border-emerald-300 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    {categorySingular} Value
                    <PiggyBank className="h-4 w-4 text-emerald-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1">
                    <div className="text-4xl font-bold text-emerald-650">
                      {formatCompactCurrency(kpis.inventoryCostValue)}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      💵 Est. Retail: {formatCompactCurrency(kpis.inventoryRetailValue)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      })()}

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60 shadow-sm">
        <div className="flex gap-1 w-full md:w-auto overflow-x-auto pb-1.5 md:pb-0">
          <Button
            variant={!category ? "default" : "ghost"}
            onClick={() => setCategory("")}
            className={`h-9 px-5 font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer ${
              !category
                ? "bg-indigo-600 text-white"
                : "text-slate-550 hover:bg-white hover:text-slate-800"
            }`}
          >
            All Items
          </Button>
          <Button
            variant={category === "FRAME" ? "default" : "ghost"}
            onClick={() => setCategory("FRAME")}
            className={`h-9 px-5 font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer ${
              category === "FRAME"
                ? "bg-indigo-600 text-white"
                : "text-slate-550 hover:bg-white hover:text-slate-800"
            }`}
          >
            Frames
          </Button>
          <Button
            variant={category === "LENS" ? "default" : "ghost"}
            onClick={() => setCategory("LENS")}
            className={`h-9 px-5 font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer ${
              category === "LENS"
                ? "bg-indigo-600 text-white"
                : "text-slate-550 hover:bg-white hover:text-slate-800"
            }`}
          >
            Lenses
          </Button>
          <Button
            variant={category === "CONTACT_LENS" ? "default" : "ghost"}
            onClick={() => setCategory("CONTACT_LENS")}
            className={`h-9 px-5 font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer ${
              category === "CONTACT_LENS"
                ? "bg-indigo-600 text-white"
                : "text-slate-550 hover:bg-white hover:text-slate-800"
            }`}
          >
            Contacts
          </Button>
          <Button
            variant={category === "ACCESSORY" ? "default" : "ghost"}
            onClick={() => setCategory("ACCESSORY")}
            className={`h-9 px-5 font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer ${
              category === "ACCESSORY"
                ? "bg-indigo-600 text-white"
                : "text-slate-550 hover:bg-white hover:text-slate-800"
            }`}
          >
            Accessories
          </Button>
        </div>

        {/* Live Search and Sorting */}
        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, brand, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-9 pr-8 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex w-full md:w-auto items-center gap-2 justify-end">
            {filter && (
              <Badge 
                variant="neutral" 
                onClick={() => setFilter("")}
                className="h-9 px-3 rounded-lg text-[10px] font-bold bg-slate-200 border-slate-300 text-slate-600 flex items-center gap-1.5 cursor-pointer uppercase select-none hover:bg-slate-300 transition-colors"
              >
                Filter: {filter} <span className="text-slate-400 font-normal">×</span>
              </Badge>
            )}
            
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 w-full md:w-auto px-3.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/25 cursor-pointer"
            >
              <option value="SKU">SORT BY: SKU</option>
              <option value="PRICE">SORT BY: PRICE</option>
              <option value="STOCK">SORT BY: STOCK</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">SKU</th>
                <th className="px-6 py-4 font-bold tracking-wider">Item Name</th>
                <th className="px-6 py-4 font-bold tracking-wider">Category</th>
                <th className="px-6 py-4 font-bold tracking-wider text-center">Stock Level</th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">Unit Price</th>
                <th className="px-6 py-4 font-bold tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-indigo-650 text-xs">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-white border border-slate-150 rounded-lg flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="object-cover h-full w-full"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-350" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-455 uppercase font-semibold tracking-wider">
                            {item.brand || "GENERIC"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="secondary"
                        className="font-bold uppercase tracking-wider text-[10px] bg-slate-100 text-slate-655"
                      >
                        {item.category.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge
                          variant={
                            item.quantity > item.minQuantity
                              ? "info"
                              : item.quantity > 0
                              ? "neutral"
                              : "danger"
                          }
                          className="text-[9px] font-bold py-0.5 px-2"
                        >
                          {item.quantity > item.minQuantity
                            ? "IN STOCK"
                            : item.quantity > 0
                            ? "LOW STOCK"
                            : "OUT OF STOCK"}
                        </Badge>
                        <span
                          className={`text-xs ${
                            item.quantity > item.minQuantity
                              ? "text-slate-400"
                              : "text-rose-500 font-bold"
                          }`}
                        >
                          {item.quantity} Units
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 text-right text-sm">
                      {formatCurrency(Number(item.price))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link 
                        href={`/shop/inventory/edit/${item.id}`}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                        title="Edit Item details"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="p-4 bg-slate-50 text-indigo-500 rounded-full border border-slate-100 shadow-inner">
                        <Box className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">
                          No Stock Items Found
                        </p>
                        <p className="text-xs text-slate-500 leading-normal">
                          {searchQuery
                            ? `No items found matching "${searchQuery}".`
                            : filter
                            ? `No items found matching the active "${filter}" stock level filter.`
                            : category
                            ? `You haven't cataloged any items under the "${category}" category yet.`
                            : "Get started by ingesting your first frames or optical stock items."}
                        </p>
                      </div>
                      <Link 
                        href="/shop/inventory/add" 
                        className="inline-flex items-center justify-center px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Stock Item
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredAndSortedItems.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-450 uppercase tracking-wider font-bold bg-slate-50/50">
            <p>
              Showing {Math.min(filteredAndSortedItems.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} to{" "}
              {Math.min(filteredAndSortedItems.length, currentPage * ITEMS_PER_PAGE)} of{" "}
              {filteredAndSortedItems.length} items
            </p>
            {totalPages > 1 && (
              <div className="flex gap-1 items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`h-8 w-8 rounded-lg cursor-pointer ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-slate-600 font-bold select-none">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`h-8 w-8 rounded-lg cursor-pointer ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
