"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, ChevronLeft, ChevronRight } from "lucide-react";
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
              <th className="px-4 py-2.5 text-center">Invoice/Receipt</th>
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

                // Link download triggers to invoice or receipt
                const isPartial = parseFloat(order.balanceDue) > 0 && parseFloat(order.amountPaid) > 0;
                const printUrl = isPartial && order.receiptId
                  ? `/shop/receipts/${order.receiptId}`
                  : `/shop/invoices/${order.invoiceId}`;

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
                        parseFloat(order.balanceDue) === 0
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : parseFloat(order.amountPaid) > 0
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {parseFloat(order.balanceDue) === 0 ? "PAID" : "PARTIALLY PAID"}
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

                    {/* Invoice/Receipt Download/Print link */}
                    <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={printUrl}
                        className="p-1 rounded-lg inline-block text-slate-400 hover:text-[#2563eb] hover:bg-blue-50 transition-colors"
                        title="Print slip"
                      >
                        <FileDown className="h-4 w-4" />
                      </Link>
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
