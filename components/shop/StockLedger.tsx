"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { History, Filter, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StockMovement {
  id: string;
  inventoryId: string;
  shopId: string;
  organizationId: string;
  movementType: "STOCK_IN" | "SOLD" | "ADJUSTMENT" | "RETURN" | "INITIAL";
  quantityChange: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceNumber: string | null;
  vendorParty: string | null;
  costPriceAtTime: string;
  notes: string | null;
  performedBy: string | null;
  performedByName: string | null;
  createdAt: string | Date;
}

interface StockLedgerProps {
  movements: StockMovement[];
  inventoryItem: {
    id: string;
    shopId: string;
    organizationId: string;
    quantity: number;
    purchaseInvoiceNo?: string | null;
    vendorName?: string | null;
    costPrice?: string | null;
    createdAt: string | Date;
    inwardDate?: string | Date | null;
  };
}

export function StockLedger({ movements, inventoryItem }: StockLedgerProps) {
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Synthesize initial stock movement if not present in the DB movements log
  const computedMovements = useMemo(() => {
    const hasInitial = movements.some((m) => m.movementType === "INITIAL");

    if (hasInitial) {
      return movements;
    }

    // Trace back what the quantity was before the first logged movement
    let initialQty = inventoryItem.quantity;
    if (movements.length > 0) {
      // Since movements are sorted DESC (newest first), the last element is the oldest
      const oldestMovement = movements[movements.length - 1];
      initialQty = oldestMovement.balanceAfter - oldestMovement.quantityChange;
    }

    // Prepend a synthetic INITIAL stock movement at the bottom of the list
    if (initialQty > 0 || movements.length === 0) {
      const syntheticInitial: StockMovement = {
        id: "synthetic-initial",
        inventoryId: inventoryItem.id,
        shopId: inventoryItem.shopId,
        organizationId: inventoryItem.organizationId,
        movementType: "INITIAL",
        quantityChange: initialQty,
        balanceAfter: initialQty,
        referenceType: "INITIAL_STOCK",
        referenceNumber: inventoryItem.purchaseInvoiceNo || "Opening Stock",
        vendorParty: inventoryItem.vendorName || null,
        costPriceAtTime: inventoryItem.costPrice || "0.00",
        notes: "Stock balance prior to ledger activation.",
        performedBy: null,
        performedByName: "System",
        createdAt: inventoryItem.inwardDate || inventoryItem.createdAt,
      };

      return [...movements, syntheticInitial];
    }

    return movements;
  }, [movements, inventoryItem]);

  // Filter movements on the client side instantly
  const filteredMovements = useMemo(() => {
    if (selectedType === "ALL") {
      return computedMovements;
    }
    return computedMovements.filter((m) => m.movementType === selectedType);
  }, [computedMovements, selectedType]);

  // Statistics for the filtered view
  const stats = useMemo(() => {
    let totalAdded = 0;
    let totalRemoved = 0;
    computedMovements.forEach((m) => {
      if (m.quantityChange > 0) {
        totalAdded += m.quantityChange;
      } else {
        totalRemoved += Math.abs(m.quantityChange);
      }
    });
    return { totalAdded, totalRemoved };
  }, [computedMovements]);

  // Get human-friendly label for references
  const formatReference = (type: string | null, number: string | null) => {
    if (!type) return number || "N/A";

    const formattedType = type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    if (!number) return formattedType;
    return `${formattedType}: ${number}`;
  };

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:bg-slate-900/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg dark:bg-indigo-950/40 dark:text-indigo-400">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100">
              Stock Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chronological audit trail of all quantity changes
            </p>
          </div>
          <Badge 
            variant="secondary" 
            className="ml-2 bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-slate-800 dark:text-indigo-300 dark:border-slate-700 text-[10px] px-2 py-0.5 uppercase font-bold"
          >
            {filteredMovements.length} {filteredMovements.length === 1 ? "record" : "records"}
          </Badge>
        </div>

        {/* Dropdown filter on the right side of the header */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-bold uppercase tracking-wider select-none">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filter:
          </span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 px-3.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/25 cursor-pointer dark:border-slate-850 dark:bg-slate-900 dark:text-slate-250"
          >
            <option value="ALL">ALL MOVEMENTS</option>
            <option value="STOCK_IN">STOCK IN</option>
            <option value="INITIAL">INITIAL STOCK</option>
            <option value="SOLD">SOLD</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
            <option value="RETURN">RETURN</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Compact stats bar */}
        {computedMovements.length > 0 && (
          <div className="flex gap-6 px-6 py-3 bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-100 dark:border-slate-900 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Inward: <span className="text-slate-700 dark:text-slate-300 font-extrabold">+{stats.totalAdded} units</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Outward: <span className="text-slate-700 dark:text-slate-300 font-extrabold">-{stats.totalRemoved} units</span>
            </span>
          </div>
        )}

        {filteredMovements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3 border border-slate-100 dark:border-slate-800">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No matching records found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Try selecting another type filter to locate movements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 border-b border-slate-200 dark:bg-slate-900/10 dark:border-slate-900">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Qty Change</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Balance</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Reference</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Vendor / Party</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-900 dark:bg-slate-950">
                {filteredMovements.map((movement) => {
                  const isPositive = movement.quantityChange > 0;
                  return (
                    <tr
                      key={movement.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-350 whitespace-nowrap">
                        {formatDate(movement.createdAt)}
                      </td>

                      {/* Qty Change */}
                      <td className="px-6 py-4 text-sm font-extrabold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                          }`}
                        >
                          {isPositive ? (
                            <>
                              <ArrowUpRight className="h-3 w-3 stroke-[2.5px]" />
                              +{movement.quantityChange}
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="h-3 w-3 stroke-[2.5px]" />
                              {movement.quantityChange}
                            </>
                          )}
                        </span>
                      </td>

                      {/* Balance */}
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {movement.balanceAfter} units
                      </td>

                      {/* Reference */}
                      <td className="px-6 py-4 text-sm text-slate-650 dark:text-slate-400 max-w-[200px] truncate whitespace-nowrap font-medium" title={formatReference(movement.referenceType, movement.referenceNumber)}>
                        {formatReference(movement.referenceType, movement.referenceNumber)}
                      </td>

                      {/* Vendor / Party */}
                      <td className="px-6 py-4 text-sm text-slate-650 dark:text-slate-400 max-w-[200px] truncate whitespace-nowrap font-medium" title={movement.vendorParty || ""}>
                        {movement.vendorParty || <span className="text-slate-300 dark:text-slate-700">—</span>}
                      </td>

                      {/* Recorded By */}
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold uppercase tracking-wider">
                        {movement.performedByName || <span className="text-slate-400 dark:text-slate-600">System</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
