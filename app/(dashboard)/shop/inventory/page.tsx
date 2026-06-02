import Link from "next/link";
import { getCurrentUser } from "@/services/auth.service";
import { getInventoryByShop } from "@/services/inventory.service";
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
  AlertCircle, 
  Pencil, 
  TrendingUp, 
  AlertTriangle,
  MinusCircle,
  PiggyBank
} from "lucide-react";
import { InventorySortSelect } from "@/components/shop/InventorySortSelect";

interface PageProps {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    filter?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white border rounded-2xl shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
        <h3 className="text-lg font-bold text-slate-800">No Associated Shop</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Please contact your administrator to associate your profile with an active shop outlet.
        </p>
      </div>
    );
  }

  // Await search parameters for category, sorting, and filters
  const params = await searchParams;
  const activeCategory = params.category ? params.category.toUpperCase() : "";
  const activeSort = params.sort || "SKU";
  const activeFilter = params.filter ? params.filter.toLowerCase() : "";

  // Fetch real items from database
  const allInventory = await getInventoryByShop(shopId);

  // Compute live KPIs based on all items in stock
  const totalSkuCount = allInventory.length;
  const lowStockCount = allInventory.filter(
    (i) => i.quantity > 0 && i.quantity <= i.minQuantity
  ).length;
  const outOfStockCount = allInventory.filter((i) => i.quantity === 0).length;
  
  // Real Ingestion valuation (Acquisition cost basis: costPrice * quantity)
  const inventoryCostValue = allInventory.reduce(
    (sum, i) => sum + Number(i.costPrice || 0) * i.quantity,
    0
  );
  
  // Real Selling valuation (Retail price basis: price * quantity)
  const inventoryRetailValue = allInventory.reduce(
    (sum, i) => sum + Number(i.price) * i.quantity,
    0
  );

  // Apply category filtering
  let displayInventory = allInventory;
  if (activeCategory) {
    displayInventory = allInventory.filter((i) => i.category === activeCategory);
  }

  // Apply stock level filtering (low-stock or out-of-stock)
  if (activeFilter === "low-stock") {
    displayInventory = displayInventory.filter(
      (i) => i.quantity > 0 && i.quantity <= i.minQuantity
    );
  } else if (activeFilter === "out-of-stock") {
    displayInventory = displayInventory.filter((i) => i.quantity === 0);
  }

  // Apply sorting
  if (activeSort === "PRICE") {
    displayInventory.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (activeSort === "STOCK") {
    displayInventory.sort((a, b) => b.quantity - a.quantity);
  } else {
    displayInventory.sort((a, b) => (a.sku || "").localeCompare(b.sku || ""));
  }

  // Helper urls preserving category query
  const getFilterUrl = (filterType: string) => {
    const queryParts = [];
    if (params.category) queryParts.push(`category=${params.category.toLowerCase()}`);
    if (filterType) queryParts.push(`filter=${filterType}`);
    if (params.sort) queryParts.push(`sort=${params.sort}`);
    return queryParts.length > 0 ? `/shop/inventory?${queryParts.join("&")}` : "/shop/inventory";
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
          <Button variant="outline" className="font-semibold shadow-sm h-10">
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
      <div className="grid gap-6 md:grid-cols-4">
        {/* KPI 1: Total SKU Count */}
        <Link href={getFilterUrl("")} className="block transition-all hover:-translate-y-0.5">
          <Card className={`shadow-sm transition-all border-slate-200 cursor-pointer ${
            !activeFilter 
              ? "border-indigo-400 bg-indigo-50/10 shadow-md ring-1 ring-indigo-400/20" 
              : "hover:border-indigo-300"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                Total SKU Count
                <TrendingUp className={`h-4 w-4 ${!activeFilter ? "text-indigo-500" : "text-slate-400"}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-4xl font-bold text-indigo-650">
                  {totalSkuCount}
                </div>
                <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                  📈 Active catalog items
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 2: Low Stock Alerts */}
        <Link href={getFilterUrl("low-stock")} className="block transition-all hover:-translate-y-0.5">
          <Card className={`shadow-sm transition-all border-slate-200 cursor-pointer ${
            activeFilter === "low-stock" 
              ? "border-amber-400 bg-amber-50/10 shadow-md ring-1 ring-amber-400/20" 
              : "hover:border-amber-300"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                Low Stock Alerts
                <AlertTriangle className={`h-4 w-4 ${activeFilter === "low-stock" ? "text-amber-500" : "text-slate-400"}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-4xl font-bold text-amber-600">
                  {lowStockCount}
                </div>
                <span className={`text-[10px] font-bold flex items-center gap-1 ${lowStockCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                  ⚠️ Needs attention
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 3: Out of Order */}
        <Link href={getFilterUrl("out-of-stock")} className="block transition-all hover:-translate-y-0.5">
          <Card className={`shadow-sm transition-all border-slate-200 cursor-pointer ${
            activeFilter === "out-of-stock" 
              ? "border-rose-400 bg-rose-50/10 shadow-md ring-1 ring-rose-400/20" 
              : "hover:border-rose-300"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                Out of Order
                <MinusCircle className={`h-4 w-4 ${activeFilter === "out-of-stock" ? "text-rose-550" : "text-slate-400"}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-4xl font-bold text-rose-650">
                  {outOfStockCount}
                </div>
                <span className={`text-[10px] font-bold flex items-center gap-1 ${outOfStockCount > 0 ? "text-rose-550" : "text-slate-400"}`}>
                  🚫 Crucial outages
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 4: Inventory Valuation (Non-clickable stat card) */}
        <div className="block">
          <Card className="shadow-sm border-slate-200 bg-emerald-50/5 hover:border-emerald-300 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                Inventory Value
                <PiggyBank className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-4xl font-bold text-emerald-650">
                  {formatCompactCurrency(inventoryCostValue)}
                </div>
                <span className="text-[10px] font-bold text-emerald-600">
                  💵 Est. Retail {formatCompactCurrency(inventoryRetailValue)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60 shadow-sm">
        <div className="flex gap-1 w-full md:w-auto overflow-x-auto pb-1.5 md:pb-0">
          <Link href={getFilterUrl("")} className="w-auto">
            <Button
              variant={!activeCategory ? "default" : "ghost"}
              className={`h-9 px-5 font-bold rounded-lg text-xs uppercase tracking-wider ${
                !activeCategory
                  ? "bg-indigo-600 text-white"
                  : "text-slate-550 hover:bg-white hover:text-slate-800"
              }`}
            >
              All Items
            </Button>
          </Link>
          <Link href={`/shop/inventory?category=frame${activeFilter ? `&filter=${activeFilter}` : ""}`} className="w-auto">
            <Button
              variant={activeCategory === "FRAME" ? "default" : "ghost"}
              className={`h-9 px-5 font-bold rounded-lg text-xs uppercase tracking-wider ${
                activeCategory === "FRAME"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-550 hover:bg-white hover:text-slate-800"
              }`}
            >
              Frames
            </Button>
          </Link>
          <button
            disabled
            className="h-9 px-5 font-bold text-slate-350 bg-transparent rounded-lg text-xs uppercase tracking-wider flex items-center gap-1 opacity-50 cursor-not-allowed"
            title="Lenses module coming soon"
          >
            Lenses
          </button>
          <button
            disabled
            className="h-9 px-5 font-bold text-slate-350 bg-transparent rounded-lg text-xs uppercase tracking-wider flex items-center gap-1 opacity-50 cursor-not-allowed"
            title="Contact lenses module coming soon"
          >
            Contacts
          </button>
          <button
            disabled
            className="h-9 px-5 font-bold text-slate-355 bg-transparent rounded-lg text-xs uppercase tracking-wider flex items-center gap-1 opacity-50 cursor-not-allowed"
            title="Accessories module coming soon"
          >
            Accessories
          </button>
        </div>

        <div className="w-full md:w-auto flex items-center gap-2">
          {activeFilter && (
            <Link href={getFilterUrl("")}>
              <Badge variant="neutral" className="h-8 px-3 rounded-lg text-[10px] font-bold bg-slate-200 border-slate-300 text-slate-600 flex items-center gap-1.5 cursor-pointer uppercase">
                Filter: {activeFilter} <span className="text-slate-400 font-normal">×</span>
              </Badge>
            </Link>
          )}
          <InventorySortSelect currentSort={activeSort} />
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
              {displayInventory.length > 0 ? (
                displayInventory.map((item) => (
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
                          <p className="text-[10px] text-slate-450 uppercase font-semibold tracking-wider">
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
                        {item.category}
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
                          {activeFilter
                            ? `No items found matching the active "${activeFilter}" stock level filter.`
                            : activeCategory
                            ? `You haven't cataloged any items under the "${activeCategory}" category yet.`
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

        {displayInventory.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-450 uppercase tracking-wider font-bold bg-slate-50/50">
            <p>
              Showing 1 to {displayInventory.length} of {displayInventory.length} items
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled
                className="h-8 w-8 rounded-lg cursor-not-allowed opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8 rounded-lg bg-indigo-600 text-white"
              >
                1
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled
                className="h-8 w-8 rounded-lg cursor-not-allowed opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
