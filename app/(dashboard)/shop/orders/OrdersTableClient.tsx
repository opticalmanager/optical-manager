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
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="text-[13px] text-slate-900 font-extrabold bg-slate-50 border-b border-slate-200/80">
              <th className="px-6 py-4.5 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4.5 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4.5 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4.5 uppercase tracking-wider">SKU Details</th>
              <th className="px-6 py-4.5 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4.5 uppercase tracking-wider text-center">Payment Status</th>
              <th className="px-6 py-4.5 uppercase tracking-wider text-center">Delivery Status</th>
              <th className="px-6 py-4.5 uppercase tracking-wider text-center">Invoice/Receipt</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => {
                const itemsCount = order.skus.reduce((sum, s) => sum + s.quantity, 0);
                const isDelayed =
                  order.fulfillmentStatus !== "DELIVERED" &&
                  order.estimatedDelivery &&
                  order.estimatedDelivery < new Date().toISOString().split("T")[0];

                // Link download triggers to invoice or receipt
                const isPartial = parseFloat(order.balanceDue) > 0 && parseFloat(order.amountPaid) > 0;
                const printUrl = isPartial
                  ? `/shop/receipts/${order.id}`
                  : `/shop/invoices/${order.invoiceId}`;

                return (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order)}
                    className="group border-b border-slate-100 last:border-0 hover:bg-[#0a52c3]/5 transition-all duration-200 align-middle cursor-pointer border-l-2 border-l-transparent hover:border-l-[#0a52c3] hover:shadow-sm"
                  >
                    {/* Order ID */}
                    <td className="px-6 py-5 font-black text-slate-900 group-hover:text-slate-955 transition-colors">
                      {order.orderNumber}
                    </td>

                    {/* Customer Info */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {/* Circle Avatar badge */}
                        <div className="h-8 w-8 rounded-full bg-slate-100 text-[#0a52c3] flex items-center justify-center text-[11px] font-black uppercase shrink-0 group-hover:scale-105 transition-transform duration-200">
                          {order.customerName.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 leading-tight group-hover:text-[#0a52c3] transition-colors duration-200">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-slate-600 font-semibold mt-0.5 group-hover:text-slate-700 transition-colors">
                            {order.categoryText}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-5 font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* SKU Details Hover dropdown */}
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <SKUDetailsDropdown
                        label={`${itemsCount} SKU${itemsCount !== 1 ? "s" : ""}`}
                        skus={order.skus}
                      />
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-5 font-extrabold text-slate-900 text-[14px] group-hover:text-slate-955 transition-colors">
                      {formatCurrency(parseFloat(order.total))}
                    </td>

                    {/* Payment Status */}
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase border ${
                        parseFloat(order.balanceDue) === 0
                          ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                          : parseFloat(order.amountPaid) > 0
                          ? "bg-amber-50 text-amber-700 border-amber-250"
                          : "bg-rose-50 text-rose-700 border-rose-250"
                      }`}>
                        {parseFloat(order.balanceDue) === 0 ? "PAID" : "PARTIALLY PAID"}
                      </span>
                    </td>

                    {/* Delivery Status */}
                    <td className="px-6 py-5 text-center space-y-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase border ${
                        order.fulfillmentStatus === "DELIVERED"
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : order.isRescheduled
                          ? "bg-amber-50 text-amber-700 border-amber-250"
                          : "bg-indigo-50 text-indigo-700 border-indigo-250"
                      }`}>
                        {order.fulfillmentStatus === "DELIVERED"
                          ? "DELIVERED"
                          : order.fulfillmentStatus === "PROCESSING"
                          ? (order.isRescheduled ? "In Processing (Delayed)" : "UNDER PROCESSING")
                          : order.fulfillmentStatus.replace("_", " ")}
                      </span>
                      {isDelayed && (
                        <div className="block">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                            DELAYED
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Invoice/Receipt Download/Print link */}
                    <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={printUrl}
                        className="p-1.5 rounded-lg inline-block text-slate-400 group-hover:text-[#0a52c3] group-hover:bg-[#0a52c3]/5 transition-all duration-200 transform group-hover:scale-110"
                        title="Print slip"
                      >
                        <FileDown className="h-4.5 w-4.5" />
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
        <div className="py-4 px-6 border-t border-slate-200/80 flex items-center justify-between bg-white">
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
