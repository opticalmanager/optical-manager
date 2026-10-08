"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileDown, ChevronLeft, ChevronRight, Receipt, FileCheck, ChevronDown, ExternalLink, Pencil, Lock, Search, FileText, UploadCloud, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SKUDetailsDropdown } from "./SKUDetailsDropdown";
import { QuickEditModal } from "./QuickEditModal";
import { OrdersWhatsAppAction } from "@/components/shop/OrdersWhatsAppAction";
import { OrderItem } from "@/services/order.service";
import { offlineDB } from "@/lib/offline/db";
import { syncOfflineInvoices } from "@/lib/offline/invoice-queue";
import { useOffline } from "@/components/providers/OfflineProvider";
import { toast } from "sonner";

interface OrdersTableClientProps {
  orders: OrderItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  tab: string;
  search: string;
  timeframe: string;
  filter: string;
  paymentMethod?: string;
  hasDues?: boolean;
  limit: number;
  canEditOrders?: boolean;
}

function OrderDocumentsAction({
  order,
  isFullyPaid,
}: {
  order: OrderItem;
  isFullyPaid: boolean;
}) {
  const [showMoreReceipts, setShowMoreReceipts] = useState(false);
  const receiptsList = order.receipts || [];

  // Sort receipts chronologically (oldest first -> Order Form, Receipt 2, etc.)
  const chronologicalReceipts = [...receiptsList].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const primaryReceipt = chronologicalReceipts[0] || (order.receiptId ? { id: order.receiptId } : null);

  // URLs for documents with offline support
  const invoiceTargetUrl = order.invoiceId.startsWith("off-")
    ? `/shop/invoices/offline/${order.invoiceId}`
    : `/shop/invoices/${order.invoiceId}`;

  const orderFormUrl = primaryReceipt ? `/shop/receipts/${primaryReceipt.id}` : invoiceTargetUrl;

  const extraReceipts = chronologicalReceipts.slice(1);

  return (
    <div className="relative inline-flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {/* 1. Direct Order Form Icon */}
      <Link
        href={orderFormUrl}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-[#0a52c3] bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/60 shadow-xs transition-all hover:scale-105"
        title="View Order Form (Rx & Booking)"
      >
        <Receipt className="h-3.5 w-3.5" />
      </Link>

      {/* 2. Direct Tax Invoice Icon - Rendered ONLY when invoice is generated (upon full payment / settlement) */}
      {isFullyPaid && (
        <Link
          href={invoiceTargetUrl}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200/60 shadow-xs transition-all hover:scale-105"
          title="View Tax Invoice (Paid in Full)"
        >
          <FileCheck className="h-3.5 w-3.5" />
        </Link>
      )}

      {/* 3. Multi-installment Receipts Trigger (if extra payment installments exist) */}
      {extraReceipts.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoreReceipts(!showMoreReceipts);
            }}
            className="h-6 px-1.5 rounded-md text-[9px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 transition-all cursor-pointer"
            title={`${extraReceipts.length} additional installment receipt(s)`}
          >
            +{extraReceipts.length}
          </button>

          {showMoreReceipts && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreReceipts(false);
                }}
              />
              <div
                className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pb-1 border-b border-slate-100 mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Installment Receipts</span>
                  <span>{order.orderNumber}</span>
                </div>
                <div className="space-y-1">
                  {extraReceipts.map((r, idx) => (
                    <Link
                      key={r.id}
                      href={`/shop/receipts/${r.id}`}
                      className="block p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0a52c3] text-xs font-semibold transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span>Receipt #{idx + 2}</span>
                        <span className="font-extrabold">{formatCurrency(parseFloat(r.amountPaid))}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 flex items-center justify-between">
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                        <span className="uppercase">{r.paymentMethod}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function OrdersTableClient({
  orders,
  page,
  totalPages,
  totalCount,
  tab,
  search,
  timeframe,
  filter,
  paymentMethod,
  hasDues,
  limit,
  canEditOrders = false,
}: OrdersTableClientProps) {
  const { shopId } = useOffline();
  const [ordersList, setOrdersList] = useState<OrderItem[]>(orders);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncingQueueId, setSyncingQueueId] = useState<string | null>(null);

  // Dual-source hydration: ALWAYS inspect local IndexedDB for un-synced offline bills
  useEffect(() => {
    let isCancelled = false;

    async function hydrateOrders() {
      try {
        const isDeviceOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

        // 1. Load any pending/failed/syncing invoices from IndexedDB queue
        const queuedInvoices = await offlineDB.offline_invoices_queue.toArray();
        const pendingQueue = queuedInvoices.filter((inv) => inv.syncStatus !== "SYNCED");

        const mappedOffline: OrderItem[] = pendingQueue.map((inv) => {
          const p = inv.payload;
          const items = p?.invoiceItems || p?.items || [];
          let subtotal = 0;
          let calculatedDiscount = 0;
          let totalTax = 0;
          for (const it of items) {
            subtotal += (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1);
            calculatedDiscount += Number(it.discountAmount) || 0;
            totalTax += (Number(it.cgstAmount) || 0) + (Number(it.sgstAmount) || 0) + (Number(it.igstAmount) || 0);
          }
          const grandTotal = Math.max(0, subtotal - calculatedDiscount) + totalTax;
          const total = p?.total !== undefined ? String(p.total) : String(grandTotal.toFixed(2));
          const amountPaid = p?.amountPaid !== undefined ? String(p.amountPaid) : (p?.paidAmount !== undefined ? String(p.paidAmount) : total);
          const balanceDue = p?.balanceDue !== undefined ? String(p.balanceDue) : String(Math.max(0, Number(total) - Number(amountPaid)).toFixed(2));

          return {
            id: inv.id,
            orderNumber: inv.offlineInvoiceNumber,
            invoiceId: inv.id,
            invoiceNumber: inv.offlineInvoiceNumber,
            createdAt: new Date(inv.createdAt),
            total,
            amountPaid,
            balanceDue,
            paymentMethod: p?.paymentMethod || "CASH",
            fulfillmentStatus: "PROCESSING",
            estimatedDelivery: p?.estimatedDelivery || null,
            isRescheduled: false,
            customerId: p?.customerId || p?.customer?.id || "",
            customerName: p?.customer?.fullName || "Walk-in Patient",
            customerPhone: p?.customer?.phone || null,
            customerEmail: p?.customer?.email || null,
            skus: items.map((it: any) => ({
              description: it.description || it.inventoryItemName || it.name || "Optical Item",
              quantity: it.quantity || 1,
              category: it.category || "FRAME",
              sku: it.sku || "OFF-SKU",
            })),
            categoryText: "Stored on Device",
            isOfflinePending: true,
            syncStatus: inv.syncStatus,
            syncError: inv.syncError,
            queueId: inv.id,
          };
        });

        if (isDeviceOnline) {
          // ONLINE MODE: Prepend pending offline bills at top of cloud orders
          const serverInvNumbers = new Set((orders || []).map((o) => o.invoiceNumber));
          const unpropagated = mappedOffline.filter((o) => !serverInvNumbers.has(o.invoiceNumber));

          if (!isCancelled) {
            setOrdersList([...unpropagated, ...(orders || [])]);
          }
        } else {
          // OFFLINE MODE: Merge cached orders + queued offline invoices
          const cachedOrders = await offlineDB.cached_orders.toArray();
          const mappedCached: OrderItem[] = cachedOrders.map((o) => ({
            id: o.id,
            orderNumber: (o as any).orderNumber || o.invoiceNumber,
            invoiceId: o.invoiceId,
            invoiceNumber: o.invoiceNumber,
            createdAt: new Date(o.createdAt),
            total: o.totalAmount,
            amountPaid: o.paidAmount,
            balanceDue: o.dueAmount,
            paymentMethod: (o as any).paymentMethod || "CASH",
            fulfillmentStatus: o.status,
            estimatedDelivery: o.deliveryDate || null,
            isRescheduled: false,
            customerId: o.customerId || "",
            customerName: o.customerName,
            customerPhone: o.customerPhone || null,
            customerEmail: null,
            skus: [{ description: "Optical Item", quantity: o.itemsCount || 1, category: "FRAME", sku: "OFFLINE" }],
            categoryText: "Prescription Order",
          }));

          const orderMap = new Map<string, OrderItem>();
          for (const ord of mappedOffline) {
            orderMap.set(ord.invoiceNumber || ord.id, ord);
          }
          for (const ord of mappedCached) {
            const key = ord.invoiceNumber || ord.id;
            if (!orderMap.has(key)) {
              orderMap.set(key, ord);
            }
          }

          if (!isCancelled) {
            setOrdersList(Array.from(orderMap.values()));
          }
        }
      } catch (err) {
        console.warn("[OrdersTableClient] Failed to hydrate orders:", err);
      }
    }

    hydrateOrders();

    const handleUpdate = () => {
      hydrateOrders();
    };

    window.addEventListener("offline-databank-updated", handleUpdate);
    window.addEventListener("online", handleUpdate);
    window.addEventListener("offline", handleUpdate);

    return () => {
      isCancelled = true;
      window.removeEventListener("offline-databank-updated", handleUpdate);
      window.removeEventListener("online", handleUpdate);
      window.removeEventListener("offline", handleUpdate);
    };
  }, [orders]);

  const handleSyncSingleInvoice = async (e: React.MouseEvent, queueId: string) => {
    e.stopPropagation();
    if (syncingQueueId) return;

    setSyncingQueueId(queueId);
    toast.loading("Syncing bill to cloud...", { id: `sync-${queueId}` });
    try {
      const res = await syncOfflineInvoices(shopId || "", queueId);
      if (res.syncedCount > 0) {
        toast.success("Bill successfully pushed to cloud!", { id: `sync-${queueId}` });
      } else {
        toast.error("Sync failed. Check device network or error details.", { id: `sync-${queueId}` });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync", { id: `sync-${queueId}` });
    } finally {
      setSyncingQueueId(null);
    }
  };

  const offset = (page - 1) * limit;

  const handleRowClick = (order: OrderItem) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50/70 border-b border-slate-100 tracking-wider">
              <th className="px-4 py-2.5">Order ID</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">SKU Details</th>
              <th className="px-4 py-2.5">Amount</th>
              <th className="px-4 py-2.5 text-center">Payment Status</th>
              <th className="px-4 py-2.5 text-center">Delivery Status</th>
              <th className="px-4 py-2.5 text-center">Documents</th>
              <th className="px-4 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 bg-white">
            {ordersList.length > 0 ? (
              ordersList.map((order) => {
                const itemsCount = order.skus.reduce((sum, s) => sum + s.quantity, 0);
                const isDelayed =
                  order.fulfillmentStatus !== "DELIVERED" &&
                  order.estimatedDelivery &&
                  order.estimatedDelivery < new Date().toISOString().split("T")[0];

                const isFullyPaid = parseFloat(order.balanceDue || "0") <= 0;
                const isPartiallyPaid = !isFullyPaid && parseFloat(order.amountPaid || "0") > 0;
                const paymentLabel = isFullyPaid ? "PAID" : isPartiallyPaid ? "PARTIALLY PAID" : "UNPAID";
                const paymentBadgeClass = isFullyPaid
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                  : isPartiallyPaid
                  ? "bg-amber-50 text-amber-700 border-amber-200/60"
                  : "bg-rose-50 text-rose-700 border-rose-200/60";

                return (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order)}
                    className="group hover:bg-slate-50/60 transition-colors align-middle cursor-pointer"
                  >
                    {/* Order ID */}
                    <td className="px-4 py-2.5 font-bold text-slate-800 text-xs group-hover:text-[#0a52c3] transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>{order.orderNumber}</span>
                        {order.isOfflinePending && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-[#0a52c3] border border-blue-200 shrink-0">
                            Device
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer Info */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {/* Circle Avatar badge */}
                        <div className="h-7 w-7 rounded-full bg-blue-50 text-[#0a52c3] border border-blue-100 flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                          {order.customerName.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs leading-tight truncate">
                            {order.customerName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                            {order.categoryText}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2.5 font-medium text-slate-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* SKU Details Hover dropdown */}
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <SKUDetailsDropdown
                        label={`${itemsCount} SKU${itemsCount !== 1 ? "s" : ""}`}
                        skus={order.skus}
                      />
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-2.5 font-extrabold text-slate-900 text-xs">
                      {formatCurrency(parseFloat(order.total))}
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${paymentBadgeClass}`}>
                        {paymentLabel}
                      </span>
                    </td>

                    {/* Delivery Status */}
                    <td className="px-4 py-2.5 text-center space-y-0.5">
                      {order.isOfflinePending ? (
                        order.syncStatus === "SYNCING" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-50 text-amber-700 border-amber-200">
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Syncing...
                          </span>
                        ) : order.syncStatus === "FAILED" ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-rose-50 text-rose-700 border-rose-200 cursor-help"
                            title={order.syncError || "Sync failed. Click Sync button in Actions to retry."}
                          >
                            <AlertCircle className="h-2.5 w-2.5 text-rose-600" /> Sync Paused
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-blue-50 text-[#0a52c3] border-blue-200">
                            <Clock className="h-2.5 w-2.5" /> Stored in Device
                          </span>
                        )
                      ) : (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          order.fulfillmentStatus === "DELIVERED"
                            ? "bg-slate-50 text-slate-600 border-slate-200/70"
                            : order.isRescheduled
                            ? "bg-amber-50 text-amber-700 border-amber-200/60"
                            : "bg-blue-50 text-[#0a52c3] border-blue-200/60"
                        }`}>
                          {order.fulfillmentStatus === "DELIVERED"
                            ? "DELIVERED"
                            : order.fulfillmentStatus === "PROCESSING"
                            ? (order.isRescheduled ? "Processing (Delayed)" : "PROCESSING")
                            : order.fulfillmentStatus.replace("_", " ")}
                        </span>
                      )}
                      {isDelayed && (
                        <div className="block">
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200/60">
                            DELAYED
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Documents: Direct Order Form & Tax Invoice Icons */}
                    <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      {order.isOfflinePending ? (
                        <Link
                          href={`/shop/invoices/offline/${order.id}`}
                          className="h-7 px-2 rounded-lg inline-flex items-center justify-center gap-1 text-[#0a52c3] bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-xs text-[10px] font-bold transition-all hover:scale-105"
                          title="View and Print Offline Bill"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>View Bill</span>
                        </Link>
                      ) : (
                        <OrderDocumentsAction order={order} isFullyPaid={isFullyPaid} />
                      )}
                    </td>

                    {/* Action: Direct WhatsApp & Edit Icons */}
                    <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-center gap-1.5">
                        {order.isOfflinePending ? (
                          <button
                            type="button"
                            onClick={(e) => handleSyncSingleInvoice(e, order.id)}
                            disabled={syncingQueueId === order.id}
                            className="h-7 px-2.5 rounded-lg text-xs font-bold bg-[#0a52c3] hover:bg-[#004bb5] text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            title="Push to Cloud Database Now"
                          >
                            {syncingQueueId === order.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <UploadCloud className="h-3 w-3" />
                            )}
                            <span>Sync</span>
                          </button>
                        ) : (
                          <>
                            {/* WhatsApp Multi-Message Popover Trigger */}
                            <OrdersWhatsAppAction order={order} />

                            {/* Quick Edit Icon */}
                            {canEditOrders ? (
                              <Link
                                href={`/shop/orders/${order.id}/edit`}
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-amber-700 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-900 border border-amber-200/70 shadow-xs transition-all hover:scale-105"
                                title="Edit Order, Products & Billing"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            ) : (
                              <span
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-350 bg-slate-50 border border-slate-200/60 cursor-not-allowed select-none"
                                title="Permission required to edit orders"
                              >
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {search ? `No orders found matching "${search}"` : "No orders found"}
                    </p>
                    <p className="text-xs text-slate-450 mt-1 mb-4 text-center">
                      {search
                        ? "Try searching by customer name, 10-digit phone number, order number, or product SKU."
                        : "No orders match the selected status tab or date range."}
                    </p>
                    {search && (
                      <Link
                        href={`/shop/orders?tab=${tab}&timeframe=${timeframe}&filter=${filter}${paymentMethod && paymentMethod !== "ALL" ? `&paymentMethod=${paymentMethod}` : ""}${hasDues ? "&hasDues=true" : ""}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0a52c3] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shadow-xs"
                      >
                        Clear Search
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination controls */}
      {ordersList.length > 0 && totalCount > 0 && (
        <div className="py-4 px-6 border-t border-slate-200/80 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white text-center sm:text-left">
          <p className="text-xs font-semibold text-slate-500">
            Showing <span className="font-extrabold text-slate-900">{offset + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(offset + limit, Math.max(totalCount, ordersList.length))}</span> of{" "}
            <span className="font-extrabold text-slate-900">{Math.max(totalCount, ordersList.length).toLocaleString()}</span> orders
          </p>
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link
                href={`/shop/orders?tab=${tab}&search=${encodeURIComponent(search)}&page=${page - 1}&timeframe=${timeframe}&filter=${filter}${paymentMethod && paymentMethod !== "ALL" ? `&paymentMethod=${paymentMethod}` : ""}${hasDues ? "&hasDues=true" : ""}`}
                className="h-8 w-8 bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 text-slate-600 rounded-lg flex items-center justify-center transition-all shadow-sm cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span className="h-8 w-8 bg-slate-50 border border-slate-200/40 text-slate-300 rounded-lg flex items-center justify-center cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/shop/orders?tab=${tab}&search=${encodeURIComponent(search)}&page=${p}&timeframe=${timeframe}&filter=${filter}${paymentMethod && paymentMethod !== "ALL" ? `&paymentMethod=${paymentMethod}` : ""}${hasDues ? "&hasDues=true" : ""}`}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold shadow-sm ${
                  p === page
                    ? "bg-[#0a52c3] text-white border border-[#0a52c3] shadow-md shadow-[#0a52c3]/15 font-black cursor-default"
                    : "bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-655 hover:text-slate-900 cursor-pointer"
                }`}
              >
                {p}
              </Link>
            ))}

            {page < totalPages ? (
              <Link
                href={`/shop/orders?tab=${tab}&search=${encodeURIComponent(search)}&page=${page + 1}&timeframe=${timeframe}&filter=${filter}${paymentMethod && paymentMethod !== "ALL" ? `&paymentMethod=${paymentMethod}` : ""}${hasDues ? "&hasDues=true" : ""}`}
                className="h-8 w-8 bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 text-slate-655 rounded-lg flex items-center justify-center transition-all shadow-sm cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="h-8 w-8 bg-slate-50 border border-slate-200/40 text-slate-300 rounded-lg flex items-center justify-center cursor-not-allowed">
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      )}

      {selectedOrder && (
        <QuickEditModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </>
  );
}
