"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, ChevronLeft, ChevronRight, Receipt, FileCheck, ChevronDown, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SKUDetailsDropdown } from "./SKUDetailsDropdown";
import { QuickEditModal } from "./QuickEditModal";
import { OrderItem } from "@/services/order.service";

interface OrdersTableClientProps {
  orders: OrderItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  tab: "ALL" | "PAID" | "PARTIALLY_PAID";
  search: string;
  timeframe: string;
  filter: string;
  limit: number;
}

function ReceiptsDropdown({
  order,
  isFullyPaid,
}: {
  order: OrderItem;
  isFullyPaid: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const receiptsList = order.receipts || [];

  // Sort receipts chronologically (oldest first -> Receipt 1, Receipt 2)
  const chronologicalReceipts = [...receiptsList].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const latestReceipt = receiptsList[0] || null;

  // Primary URL for single click
  const primaryUrl = isFullyPaid
    ? `/shop/invoices/${order.invoiceId}`
    : latestReceipt
    ? `/shop/receipts/${latestReceipt.id}`
    : order.receiptId
    ? `/shop/receipts/${order.receiptId}`
    : `/shop/invoices/${order.invoiceId}`;

  const hasDocuments = isFullyPaid || receiptsList.length > 0;

  return (
    <div className="relative inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {/* Primary Icon Link */}
      <Link
        href={primaryUrl}
        className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
          isFullyPaid
            ? "text-emerald-600 hover:bg-emerald-50"
            : "text-[#0a52c3] hover:bg-blue-50"
        }`}
        title={isFullyPaid ? "View Final Tax Invoice" : "View Payment Receipt"}
      >
        {isFullyPaid ? (
          <FileCheck className="h-4 w-4 shrink-0" />
        ) : (
          <Receipt className="h-4 w-4 shrink-0" />
        )}
      </Link>

      {/* Dropdown Toggle Button (Only for partially paid orders with receipts) */}
      {!isFullyPaid && receiptsList.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className={`p-1 rounded-md transition-all cursor-pointer border ${
              isOpen
                ? "bg-[#0a52c3] text-white border-[#0a52c3]"
                : "bg-slate-50 text-slate-500 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
            }`}
            title="View invoice & payment receipts list"
          >
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* Popover Menu */}
          {isOpen && (
            <>
              {/* Invisible overlay backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              />

              <div
                className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl border border-slate-200/90 shadow-xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Receipt className="h-3 w-3 text-[#0a52c3]" />
                    Order Documents
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {order.orderNumber}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {/* Tax Invoice Item (if Fully Paid) */}
                  {isFullyPaid && (
                    <Link
                      href={`/shop/invoices/${order.invoiceId}`}
                      className="block p-2 rounded-lg bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-150 transition-all group/inv"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-800 flex items-center gap-1 group-hover/inv:underline">
                          <FileCheck className="h-3.5 w-3.5 text-emerald-600" /> Tax Invoice
                        </span>
                        <span className="font-extrabold text-xs text-emerald-700">
                          {formatCurrency(parseFloat(order.total))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-semibold text-emerald-600/80 mt-1">
                        <span>
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="uppercase font-bold text-emerald-700">PAID IN FULL</span>
                      </div>
                    </Link>
                  )}

                  {/* Receipt Items (Receipt 1, Receipt 2, etc.) */}
                  {chronologicalReceipts.map((r, idx) => (
                    <Link
                      key={r.id}
                      href={`/shop/receipts/${r.id}`}
                      className="block p-2 rounded-lg bg-slate-50/70 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-150 transition-all group/rcp"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#0a52c3] group-hover/rcp:underline flex items-center gap-1">
                          <Receipt className="h-3.5 w-3.5 text-[#0a52c3]" />
                          Receipt {idx + 1}
                        </span>
                        <span className="font-extrabold text-xs text-slate-900">
                          {formatCurrency(parseFloat(r.amountPaid))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 mt-1">
                        <span>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="uppercase text-slate-500 font-bold">{r.paymentMethod}</span>
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
  limit,
}: OrdersTableClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            <tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100 tracking-wider">
              <th className="px-4 py-2.5">Order ID</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">SKU Details</th>
              <th className="px-4 py-2.5">Amount</th>
              <th className="px-4 py-2.5 text-center">Payment Status</th>
              <th className="px-4 py-2.5 text-center">Delivery Status</th>
              <th className="px-4 py-2.5 text-center">Invoice / Receipts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.length > 0 ? (
              orders.map((order) => {
                const itemsCount = order.skus.reduce((sum, s) => sum + s.quantity, 0);
                const isDelayed =
                  order.fulfillmentStatus !== "DELIVERED" &&
                  order.estimatedDelivery &&
                  order.estimatedDelivery < new Date().toISOString().split("T")[0];

                const isFullyPaid = parseFloat(order.balanceDue) === 0;

                return (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order)}
                    className="group hover:bg-blue-50/30 transition-colors align-middle cursor-pointer"
                  >
                    {/* Order ID */}
                    <td className="px-4 py-2.5 font-bold text-slate-900 text-xs">
                      {order.orderNumber}
                    </td>

                    {/* Customer Info */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {/* Circle Avatar badge */}
                        <div className="h-7 w-7 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                          {order.customerName.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs leading-tight">
                            {order.customerName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {order.categoryText}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2.5 font-semibold text-slate-600 text-xs">
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
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        isFullyPaid
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : parseFloat(order.amountPaid) > 0
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {isFullyPaid ? "PAID" : "PARTIALLY PAID"}
                      </span>
                    </td>

                    {/* Delivery Status */}
                    <td className="px-4 py-2.5 text-center space-y-0.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        order.fulfillmentStatus === "DELIVERED"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : order.isRescheduled
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-blue-50 text-[#2563eb] border-blue-100"
                      }`}>
                        {order.fulfillmentStatus === "DELIVERED"
                          ? "DELIVERED"
                          : order.fulfillmentStatus === "PROCESSING"
                          ? (order.isRescheduled ? "In Processing (Delayed)" : "UNDER PROCESSING")
                          : order.fulfillmentStatus.replace("_", " ")}
                      </span>
                      {isDelayed && (
                        <div className="block">
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-100">
                            DELAYED
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Invoice/Receipt Download/Print link with Dropdown */}
                    <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <ReceiptsDropdown order={order} isFullyPaid={isFullyPaid} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center font-bold text-slate-450">
                  No orders matching your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination controls */}
      {totalCount > 0 && (
        <div className="py-4 px-6 border-t border-slate-200/80 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white text-center sm:text-left">
          <p className="text-xs font-semibold text-slate-500">
            Showing <span className="font-extrabold text-slate-900">{offset + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(offset + limit, totalCount)}</span> of{" "}
            <span className="font-extrabold text-slate-900">{totalCount.toLocaleString()}</span> orders
          </p>
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link
                href={`/shop/orders?tab=${tab}&search=${search}&page=${page - 1}&timeframe=${timeframe}&filter=${filter}`}
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
                href={`/shop/orders?tab=${tab}&search=${search}&page=${p}&timeframe=${timeframe}&filter=${filter}`}
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
                href={`/shop/orders?tab=${tab}&search=${search}&page=${page + 1}&timeframe=${timeframe}&filter=${filter}`}
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
