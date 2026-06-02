"use client";

import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Search, Package, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProductLineItemsProps {
  control: any;
  register: any;
  setValue: any;
  watch: any;
}

export function ProductLineItems({
  control,
  register,
  setValue,
  watch,
}: ProductLineItemsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "invoiceItems",
  });

  const [suggestions, setSuggestions] = useState<Record<number, any[]>>({});
  const [activeSearch, setActiveSearch] = useState<number | null>(null);

  const watchedItems = watch("invoiceItems") || [];

  const handleSearch = async (index: number, query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    try {
      const res = await fetch(
        `/api/inventory/search?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions((prev) => ({ ...prev, [index]: data }));
      }
    } catch (err) {
      console.error("Autocomplete fetch failed:", err);
    }
  };

  const selectProduct = (index: number, product: any) => {
    setValue(`invoiceItems.${index}.inventoryId`, product.id);
    setValue(`invoiceItems.${index}.description`, product.name);
    setValue(`invoiceItems.${index}.unitPrice`, parseFloat(product.price));
    setValue(
      `invoiceItems.${index}.subtotal`,
      parseFloat(product.price) * (watchedItems[index]?.quantity || 1)
    );

    // Clear suggestions
    setSuggestions((prev) => ({ ...prev, [index]: [] }));
    setActiveSearch(null);
  };

  const updateSubtotal = (index: number) => {
    const qty = parseFloat(watchedItems[index]?.quantity) || 0;
    const price = parseFloat(watchedItems[index]?.unitPrice) || 0;
    setValue(`invoiceItems.${index}.subtotal`, qty * price);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Package className="h-4 w-4 text-indigo-500" />
            Billing Products & Services
          </h3>
          <p className="text-xs text-slate-400">
            Search items from stock to autofill prices and track inventory levels.
          </p>
        </div>

        <Button
          type="button"
          onClick={() =>
            append({
              inventoryId: null,
              description: "",
              quantity: 1,
              unitPrice: 0,
              subtotal: 0,
            })
          }
          variant="outline"
          size="sm"
          className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50/50"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Item
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
          <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No items added to billing</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Click "Add Item" to add frames, lenses, solutions, or custom jobs.
          </p>
          <Button
            type="button"
            onClick={() =>
              append({
                inventoryId: null,
                description: "",
                quantity: 1,
                unitPrice: 0,
                subtotal: 0,
              })
            }
            variant="ghost"
            size="sm"
            className="mt-3 text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 text-xs font-semibold"
          >
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const rowSuggestions = suggestions[index] || [];
            const isAutocompleteOpen =
              activeSearch === index && rowSuggestions.length > 0;

            return (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/30 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all relative"
              >
                {/* Product Name Autocomplete Field */}
                <div className="md:col-span-5 relative">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Product Description
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Type product name to search stock..."
                      className="pr-8 bg-white h-9"
                      {...register(`invoiceItems.${index}.description`)}
                      onChange={(e) => {
                        register(`invoiceItems.${index}.description`).onChange(e);
                        setActiveSearch(index);
                        handleSearch(index, e.target.value);
                      }}
                      onFocus={() => setActiveSearch(index)}
                      onBlur={() => {
                        // Delay clearing so clicks are registered
                        setTimeout(() => setActiveSearch(null), 250);
                      }}
                    />
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  </div>

                  {/* Autocomplete Dropdown suggestions list */}
                  {isAutocompleteOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {rowSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/40 transition-colors flex items-center justify-between text-xs"
                          onClick={() => selectProduct(index, item)}
                        >
                          <div>
                            <span className="font-semibold text-slate-700 block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              SKU: {item.sku || "N/A"} • Brand: {item.brand || "N/A"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800">
                              {formatCurrency(item.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                              Qty: {item.quantity} in stock
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unit Price Field */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Unit Price (₹)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="bg-white h-9"
                    {...register(`invoiceItems.${index}.unitPrice`, {
                      valueAsNumber: true,
                    })}
                    onChange={(e) => {
                      register(`invoiceItems.${index}.unitPrice`, {
                        valueAsNumber: true,
                      }).onChange(e);
                      updateSubtotal(index);
                    }}
                  />
                </div>

                {/* Quantity Field */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Qty
                  </label>
                  <Input
                    type="number"
                    placeholder="1"
                    className="bg-white h-9"
                    {...register(`invoiceItems.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                    onChange={(e) => {
                      register(`invoiceItems.${index}.quantity`, {
                        valueAsNumber: true,
                      }).onChange(e);
                      updateSubtotal(index);
                    }}
                  />
                </div>

                {/* Subtotal View & Actions */}
                <div className="md:col-span-2 flex items-end justify-between gap-2">
                  <div className="flex-1 pb-2">
                    <span className="block text-[10px] font-medium text-slate-400 leading-none mb-1">
                      Subtotal
                    </span>
                    <span className="text-sm font-bold text-slate-700 block">
                      {formatCurrency(watchedItems[index]?.subtotal || 0)}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mb-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
