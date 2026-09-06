"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  ArchiveRestore, 
  X, 
  Search, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Phone,
  Calendar,
  Package,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { restoreOrderAction } from "@/actions/order.actions";
import type { DeletedOrderItem } from "@/services/order.service";

interface DeletedRecordsModalProps {
  deletedOrders: DeletedOrderItem[];
}

export function DeletedRecordsModal({ deletedOrders: initialDeletedOrders }: DeletedRecordsModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deletedOrdersList, setDeletedOrdersList] = useState<DeletedOrderItem[]>(initialDeletedOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [orderToRetrieve, setOrderToRetrieve] = useState<DeletedOrderItem | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDeletedOrdersList(initialDeletedOrders);
  }, [initialDeletedOrders]);

  const filteredOrders = deletedOrdersList.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.invoiceNumber.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      (order.customerPhone && order.customerPhone.includes(q))
    );
  });

  const handleConfirmRestore = (order: DeletedOrderItem) => {
    setRestoringId(order.id);
    startTransition(async () => {
      try {
        const res = await restoreOrderAction(order.orderId || order.invoiceId);
        if (res.success) {
          toast.success(res.message);
          setDeletedOrdersList((prev) => prev.filter((o) => o.id !== order.id));
          setOrderToRetrieve(null);
          router.refresh();
        } else {
          toast.error(res.message || "Failed to retrieve order record.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred while restoring the record.");
      } finally {
        setRestoringId(null);
      }
    });
  };

  return (
    <>
      {/* Trigger Button - Neutral slate SaaS styling (NOT RED as strictly requested) */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all"
      >
        <ArchiveRestore className="h-4 w-4 text-slate-500" />
        <span>Deleted Records</span>
        {deletedOrdersList.length > 0 && (
          <span className="ml-0.5 px-2 py-0.5 text-[10px] font-extrabold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            {deletedOrdersList.length}
          </span>
        )}
      </Button>

      {/* Modal Dialog rendered via Portal */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => {
              if (!isPending) {
                setIsOpen(false);
                setOrderToRetrieve(null);
              }
            }}
          />

          {/* Modal Content Container */}
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-4xl overflow-hidden relative z-10 flex flex-col scale-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80">
                  <ArchiveRestore className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Deleted Records
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-black border-slate-200 text-slate-600 bg-white px-2 py-0.5 rounded-full">
                      {deletedOrdersList.length} Record{deletedOrdersList.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    View soft-deleted orders and retrieve records to resynchronize inventory stock and active revenue.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isPending) {
                    setIsOpen(false);
                    setOrderToRetrieve(null);
                  }
                }}
                disabled={isPending}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by order #, invoice #, patient name, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9 bg-slate-50/60 border-slate-200/90 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            {/* List / Table Area */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white space-y-3">
              {filteredOrders.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  {filteredOrders.map((order) => {
                    const deletedDateStr = new Date(order.deletedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const isBeingRestored = restoringId === order.id;

                    return (
                      <div
                        key={order.id}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Order & Customer Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">
                              {order.orderNumber}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-slate-50 border-slate-200">
                              Inv: {order.invoiceNumber}
                            </Badge>
                            <span className="text-[11px] text-slate-400 font-semibold">
                              • {order.itemsCount} item{order.itemsCount !== 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" />
                              {order.customerName}
                            </span>
                            {order.customerPhone && (
                              <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {order.customerPhone}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 pt-0.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>Deleted on {deletedDateStr}</span>
                            {order.deletedByName && (
                              <span>by <strong className="text-slate-600 font-bold">{order.deletedByName}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Financials & Action */}
                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <div className="text-xs font-black text-slate-900">
                              {formatCurrency(parseFloat(order.total || "0"))}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500">
                              Paid: {formatCurrency(parseFloat(order.amountPaid || "0"))}
                            </div>
                          </div>

                          {/* Retrieve Button */}
                          <Button
                            type="button"
                            size="sm"
                            disabled={isPending}
                            onClick={() => setOrderToRetrieve(order)}
                            className="bg-blue-50 hover:bg-blue-100 text-[#0a52c3] border border-blue-200/80 font-bold text-xs h-8 px-3 rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                          >
                            {isBeingRestored ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Restoring...</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Retrieve</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {searchQuery ? "No matching deleted records found" : "No Deleted Records"}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {searchQuery
                      ? `No deleted orders match "${searchQuery}". Clear your search query to see all deleted records.`
                      : "All orders in your clinic are currently active. Deleted orders will appear here if removed."}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Authorized for Owners and Administrators</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setOrderToRetrieve(null);
                }}
                className="text-xs font-bold rounded-lg h-7"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Sub-Confirmation Dialog for Retrieval */}
          {orderToRetrieve && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-2xs"
                onClick={() => {
                  if (!isPending) setOrderToRetrieve(null);
                }}
              />
              <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md p-5 relative z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-[#0a52c3] border border-blue-100 shrink-0">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Retrieve & Restore Order?
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Restore order <strong className="text-slate-800">{orderToRetrieve.orderNumber}</strong> for patient <strong className="text-slate-800">{orderToRetrieve.customerName}</strong>.
                    </p>
                  </div>
                </div>

                {/* Information Callout */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-[11px]">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    <span>Inventory & Sales Reconciliation:</span>
                  </div>
                  <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
                    <li>Items will be deducted from current stock inventory.</li>
                    <li>Invoice will be restored to active status (Paid/Pending).</li>
                    <li>Audit trail will record restoration timestamp and author.</li>
                  </ul>
                </div>

                {/* Dialog Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setOrderToRetrieve(null)}
                    className="text-xs font-bold rounded-xl h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleConfirmRestore(orderToRetrieve)}
                    className="bg-[#0a52c3] hover:bg-[#08429e] text-white text-xs font-bold rounded-xl h-9 px-4 flex items-center gap-1.5 shadow-xs"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Retrieving Record...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Confirm Retrieval</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
