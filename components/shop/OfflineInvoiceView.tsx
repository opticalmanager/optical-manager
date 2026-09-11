"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { offlineDB, type OfflineQueuedInvoice } from "@/lib/offline/db";
import { useOffline } from "@/components/providers/OfflineProvider";
import { Printer, ArrowLeft, Plus, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OfflineInvoiceViewProps {
  queueId: string;
}

export function OfflineInvoiceView({ queueId }: OfflineInvoiceViewProps) {
  const router = useRouter();
  const { isOnline, syncNow, isSyncing } = useOffline();
  const [record, setRecord] = useState<OfflineQueuedInvoice | null>(null);
  const [shopProfile, setShopProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecord() {
      try {
        let item = await offlineDB.offline_invoices_queue.get(queueId);
        let shopId = item?.shopId;

        if (!item) {
          // Check cached_invoices for previously synced records
          const cachedInv = await offlineDB.cached_invoices.get(queueId);
          if (cachedInv) {
            shopId = cachedInv.shopId;
            item = {
              id: cachedInv.id,
              shopId: cachedInv.shopId,
              organizationId: cachedInv.organizationId,
              offlineInvoiceNumber: cachedInv.invoiceNumber,
              serverInvoiceNumber: cachedInv.invoiceNumber,
              syncStatus: "SYNCED",
              retryCount: 0,
              createdAt: cachedInv.createdAt,
              payload: {
                shopId: cachedInv.shopId,
                organizationId: cachedInv.organizationId,
                customerId: cachedInv.customerId,
                paymentMethod: cachedInv.paymentMethod,
                amountPaid: parseFloat(cachedInv.amountPaid || "0"),
                balanceDue: parseFloat(cachedInv.balanceDue || "0"),
                customer: {
                  fullName: cachedInv.customerName,
                  phone: cachedInv.customerPhone,
                },
                invoiceItems: (cachedInv.items || []).map((it) => ({
                  description: it.description,
                  quantity: it.quantity,
                  unitPrice: parseFloat(it.unitPrice || "0"),
                  subtotal: parseFloat(it.subtotal || "0"),
                  discountAmount: 0,
                  taxRate: 0,
                  cgstAmount: 0,
                  sgstAmount: 0,
                  igstAmount: 0,
                })),
              },
            };
          }
        }

        setRecord(item || null);
        if (shopId) {
          const profile = await offlineDB.cached_shop_profile.get(shopId);
          if (profile) {
            setShopProfile(profile);
          } else {
            const allProfiles = await offlineDB.cached_shop_profile.toArray();
            if (allProfiles.length > 0) setShopProfile(allProfiles[0]);
          }
        } else {
          const allProfiles = await offlineDB.cached_shop_profile.toArray();
          if (allProfiles.length > 0) setShopProfile(allProfiles[0]);
        }
      } catch (err) {
        console.error("Failed to load offline invoice record:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecord();
  }, [queueId]);

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-slate-400 text-xs font-semibold">
        <RefreshCw className="w-5 h-5 animate-spin text-[#0a52c3] mr-2" />
        Loading offline invoice document...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center">
        <h2 className="text-base font-bold text-slate-800">Invoice Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">
          The requested offline invoice could not be located in your local device memory.
        </p>
        <button
          onClick={() => router.push("/shop/invoices/new")}
          className="mt-6 px-4 py-2 bg-[#0a52c3] text-white text-xs font-bold rounded-xl"
        >
          Create New Invoice
        </button>
      </div>
    );
  }

  const payload = record.payload;
  const customer = payload?.customer || {};
  const items: any[] = payload?.invoiceItems || [];

  const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const discount = items.reduce((acc, item) => acc + (item.discountAmount || 0), 0);
  const totalTax = items.reduce(
    (acc, item) => acc + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0),
    0
  );
  const grandTotal = Math.max(0, subtotal - discount) + totalTax;
  const amountPaid = payload?.amountPaid ?? grandTotal;
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="print:hidden mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/shop/invoices")}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
            title="Back to Invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">
                Invoice #{record.offlineInvoiceNumber}
              </span>
              {record.syncStatus === "SYNCED" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="h-3 w-3" /> Synced (#{record.serverInvoiceNumber})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#0a52c3] border border-blue-200">
                  <Clock className="h-3 w-3" /> Stored in Device Queue
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Created on {new Date(record.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isOnline && record.syncStatus !== "SYNCED" && (
            <button
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="h-10 px-3.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#0a52c3] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync to Cloud"}</span>
            </button>
          )}

          <button
            onClick={() => router.push("/shop/invoices/new")}
            className="h-10 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Bill</span>
          </button>

          <button
            onClick={() => window.print()}
            className="h-10 px-4 rounded-xl bg-[#0a52c3] hover:bg-[#004bb5] text-white text-xs font-bold shadow-sm shadow-[#0a52c3]/15 transition-all cursor-pointer flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Clean, Official Printable Invoice Document (NO OFFLINE WATERMARK) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 print:p-0 print:border-none print:shadow-none">
        {/* Shop & Store Header */}
        {shopProfile && (
          <div className="border-b border-slate-200 pb-4 mb-4">
            <h2 className="text-xl font-black text-slate-900">{shopProfile.name}</h2>
            {shopProfile.address && <p className="text-xs text-slate-600 mt-0.5">{shopProfile.address}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              {shopProfile.phone && <span>Phone: <strong className="text-slate-800">{shopProfile.phone}</strong></span>}
              {shopProfile.email && <span>Email: {shopProfile.email}</span>}
              {shopProfile.gstNumber && <span>GSTIN: <strong className="text-slate-800 font-bold">{shopProfile.gstNumber}</strong></span>}
            </div>
          </div>
        )}

        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">TAX INVOICE</h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Invoice No: <span className="text-slate-900">{record.serverInvoiceNumber || record.offlineInvoiceNumber}</span>
            </p>
            <p className="text-xs text-slate-500">
              Date: <span className="text-slate-900">{new Date(record.createdAt).toLocaleDateString()}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
              {payload.paymentMethod || "CASH"}
            </span>
            {payload.soldBy && (
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Sales Rep: <strong className="text-slate-700">{payload.soldBy}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Customer & Billing Details */}
        <div className="grid grid-cols-2 gap-6 border-b border-slate-200 pb-6 mb-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
              Billed To (Patient)
            </h3>
            <p className="font-extrabold text-sm text-slate-900">{customer.fullName || "Customer"}</p>
            <p className="text-slate-600 mt-0.5">Phone: {customer.phone || "N/A"}</p>
            {customer.address && <p className="text-slate-600">{customer.address}</p>}
            {(customer.city || customer.state) && (
              <p className="text-slate-600">
                {[customer.city, customer.state, customer.pincode].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div className="text-right">
            <h3 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
              Payment Summary
            </h3>
            <p className="text-slate-600">
              Payment Status: <strong className={balanceDue <= 0 ? "text-emerald-700" : "text-amber-700"}>
                {balanceDue <= 0 ? "PAID IN FULL" : "PARTIAL / PENDING"}
              </strong>
            </p>
            <p className="text-slate-600 mt-0.5">
              Amount Paid: <strong>{formatCurrency(amountPaid)}</strong>
            </p>
            {balanceDue > 0 && (
              <p className="text-rose-600 font-bold mt-0.5">
                Balance Due: {formatCurrency(balanceDue)}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-xs text-left mb-6">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <th className="py-2.5">#</th>
              <th className="py-2.5">Item Description</th>
              <th className="py-2.5 text-center">Qty</th>
              <th className="py-2.5 text-right">Unit Price</th>
              <th className="py-2.5 text-right">Discount</th>
              <th className="py-2.5 text-right">Tax</th>
              <th className="py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => {
              const itemTax = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
              const itemTotal = (item.subtotal || 0) - (item.discountAmount || 0) + itemTax;
              return (
                <tr key={idx} className="text-slate-700">
                  <td className="py-2.5 font-medium text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 font-bold text-slate-800">{item.description}</td>
                  <td className="py-2.5 text-center font-semibold">{item.quantity}</td>
                  <td className="py-2.5 text-right font-medium">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2.5 text-right font-medium text-slate-500">
                    {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : "—"}
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-500">
                    {itemTax > 0 ? formatCurrency(itemTax) : "—"}
                  </td>
                  <td className="py-2.5 text-right font-extrabold text-slate-900">
                    {formatCurrency(itemTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals Breakdown */}
        <div className="border-t border-slate-200 pt-4 flex justify-end">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-semibold">-{formatCurrency(discount)}</span>
              </div>
            )}
            {totalTax > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>GST Tax:</span>
                <span className="font-semibold text-slate-800">+{formatCurrency(totalTax)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
              <span>Grand Total:</span>
              <span className="text-[#0a52c3]">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Amount Paid:</span>
              <span className="font-bold text-slate-800">{formatCurrency(amountPaid)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Balance Due:</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="border-t border-slate-200 mt-8 pt-4 text-center text-[10px] text-slate-400">
          Thank you for your business! Optical prescriptions and lens warranties are subject to store policy.
        </div>
      </div>
    </div>
  );
}
