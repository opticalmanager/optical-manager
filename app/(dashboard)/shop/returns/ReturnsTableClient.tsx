"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  Eye,
  Store,
  Wrench,
  Truck,
  Trash2,
  ExternalLink,
  Receipt,
  User,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  ChevronDown
} from "lucide-react";
import { SalesReturnListItem, ReturnItemDetail } from "@/services/return.service";
import { cancelReturnDraftAction } from "@/actions/return.actions";
import { toast } from "sonner";

interface ReturnsTableClientProps {
  returns: SalesReturnListItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  tab: string;
  search: string;
  limit: number;
}

export function ReturnsTableClient({
  returns,
  page,
  totalPages,
  totalCount,
  tab,
  search,
  limit,
}: ReturnsTableClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedReturnId, setExpandedReturnId] = useState<string | null>(null);

  const handleCancelDraft = (returnId: string, returnNumber: string) => {
    if (!confirm(`Are you sure you want to cancel draft return ${returnNumber}?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await cancelReturnDraftAction(returnId);
        if (res.success) {
          toast.success("Draft return cancelled.");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to cancel draft.");
        }
      } catch (err: any) {
        toast.error("Error cancelling draft.");
      }
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "RESTOCK_INVENTORY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Store className="h-3 w-3" /> Restocked
          </span>
        );
      case "REPAIR_AT_STORE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <Wrench className="h-3 w-3" /> Store Repair
          </span>
        );
      case "SEND_TO_VENDOR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#2563eb] border border-blue-100">
            <Truck className="h-3 w-3" /> Vendor Claim
          </span>
        );
      case "SCRAP_DAMAGE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
            <Trash2 className="h-3 w-3" /> Scrapped
          </span>
        );
      case "HOLD_FOR_INSPECTION":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
            <Eye className="h-3 w-3" /> Inspection
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-[#2563eb] border border-blue-200/60">
            <Clock className="h-3 w-3" /> Draft
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200/60">
            <Ban className="h-3 w-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Return #</th>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Return Details</th>
              <th className="py-3 px-4">Refund Amount</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RotateCcw className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No product returns found</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {search
                        ? "Try clearing your search query or filters."
                        : "Create a new return when a customer returns purchased frames, lenses, or accessories."}
                    </p>
                    <Link
                      href="/shop/returns/new"
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Create New Return
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              returns.map((ret) => {
                const isExpanded = expandedReturnId === ret.id;
                return (
                  <React.Fragment key={ret.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors group">
                      {/* Return # */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/shop/returns/${ret.id}`}
                          className="font-extrabold text-[#2563eb] hover:underline flex items-center gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                          <span>{ret.returnNumber}</span>
                        </Link>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          By: {ret.processedByName || "Staff"}
                        </span>
                      </td>

                      {/* Invoice # */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/shop/invoices/${ret.invoiceId}`}
                          className="font-bold text-slate-900 hover:text-[#2563eb] flex items-center gap-1"
                        >
                          <Receipt className="h-3 w-3 text-slate-400" />
                          <span>{ret.invoiceNumber}</span>
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block leading-tight">
                          {ret.customerName}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {ret.customerPhone || "N/A"}
                        </span>
                      </td>

                      {/* Return Details */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setExpandedReturnId(isExpanded ? null : ret.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#2563eb] cursor-pointer bg-transparent border-none p-0"
                        >
                          <Package className="h-3.5 w-3.5 text-slate-400" />
                          <span>{ret.itemCount} Item(s)</span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ret.items.slice(0, 2).map((it, idx) => (
                            <span key={idx} className="text-[10px]">
                              {getActionBadge(it.finalAction)}
                            </span>
                          ))}
                          {ret.items.length > 2 && (
                            <span className="text-[9px] font-bold text-slate-400">
                              +{ret.items.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Refund Amount */}
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 text-xs block">
                          ₹{parseFloat(ret.totalRefundAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ret.returnType === "ENTIRE_INVOICE" ? "Full Return" : "Partial"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusBadge(ret.status)}</td>

                      {/* Date */}
                      <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(ret.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/shop/returns/${ret.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                            title="View Return Note"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>

                          {ret.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => handleCancelDraft(ret.id, ret.returnNumber)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer bg-white"
                              title="Cancel Draft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable items preview row */}
                    {isExpanded && (
                      <tr className="bg-blue-50/20 border-b border-slate-200/80 animate-in fade-in duration-150">
                        <td colSpan={8} className="p-4">
                          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                            <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                              Returned Items Breakdown
                            </h5>
                            <div className="divide-y divide-slate-100 text-xs">
                              {ret.items.map((it) => (
                                <div
                                  key={it.id}
                                  className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div>
                                    <span className="font-bold text-slate-900 block">
                                      {it.description}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Category: {it.category || "General"} • Qty Returned: {it.quantityReturned} • Unit Price: ₹{parseFloat(it.unitPrice).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                      Reason: {it.inspectionReason}
                                    </span>
                                    {getActionBadge(it.finalAction)}
                                    <span className="font-extrabold text-slate-900 text-xs">
                                      ₹{parseFloat(it.refundAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium px-4 pb-4">
          <span>
            Showing <strong className="text-slate-800">{(page - 1) * limit + 1}</strong> to{" "}
            <strong className="text-slate-800">{Math.min(page * limit, totalCount)}</strong> of{" "}
            <strong className="text-slate-800">{totalCount}</strong> returns
          </span>

          <div className="flex items-center gap-1">
            <Link
              href={`/shop/returns?page=${page - 1}&tab=${tab}&search=${encodeURIComponent(search)}`}
              aria-disabled={page <= 1}
              className={`p-2 rounded-xl border border-slate-200 transition-colors ${
                page <= 1
                  ? "pointer-events-none opacity-40 bg-slate-50"
                  : "hover:bg-slate-100 bg-white"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>

            <span className="px-3 py-1 text-xs font-bold text-slate-800">
              Page {page} of {totalPages}
            </span>

            <Link
              href={`/shop/returns?page=${page + 1}&tab=${tab}&search=${encodeURIComponent(search)}`}
              aria-disabled={page >= totalPages}
              className={`p-2 rounded-xl border border-slate-200 transition-colors ${
                page >= totalPages
                  ? "pointer-events-none opacity-40 bg-slate-50"
                  : "hover:bg-slate-100 bg-white"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
