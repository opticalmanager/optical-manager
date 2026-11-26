"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { offlineDB, type OfflineQueuedInvoice } from "@/lib/offline/db";
import { useOffline } from "@/components/providers/OfflineProvider";
import { Printer, ArrowLeft, Plus, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { DEFAULT_PRESCRIPTION_ADVISORY_NOTE } from "@/lib/document-config";
import { formatCurrency } from "@/lib/utils";
import { safeFormatDateLocale } from "@/lib/invoice-helpers";

interface OfflineInvoiceViewProps {
  queueId: string;
}

export function OfflineInvoiceView({ queueId }: OfflineInvoiceViewProps) {
  const router = useRouter();
  const { isOnline, syncNow, isSyncing } = useOffline();
  const [record, setRecord] = useState<OfflineQueuedInvoice | null>(null);
  const [shopProfile, setShopProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPrescriptionView, setIsPrescriptionView] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setIsPrescriptionView(params.get("view") === "prescription");
    }
  }, []);

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
  const rawPrescriptions: any[] = Array.isArray(payload?.prescriptions)
    ? payload.prescriptions
    : payload?.prescription
    ? [payload.prescription]
    : [];
  const hasRxPowers = (rx: any) =>
    Boolean(
      rx &&
        (rx.rightSphere || rx.rightCylinder || rx.rightAxis || rx.rightAdd || rx.rightNv ||
          rx.leftSphere || rx.leftCylinder || rx.leftAxis || rx.leftAdd || rx.leftNv)
    );
  const distRx = rawPrescriptions.find((r) => (r.prescriptionType || "DISTANCE") === "DISTANCE" && hasRxPowers(r)) || rawPrescriptions.find(hasRxPowers) || null;
  const nearRx = rawPrescriptions.find((r) => r.prescriptionType === "NEAR" && hasRxPowers(r)) || null;
  const hasAnyOfflineRx = Boolean(distRx || nearRx);
  const metaRx = distRx || nearRx || rawPrescriptions[0] || null;
  const formatOfflineRxVal = (val: unknown) => {
    if (val === null || val === undefined || String(val).trim() === "") return "-";
    const num = Number(val);
    if (!Number.isNaN(num)) {
      if (num === 0) return "0.00";
      return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    }
    return String(val);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 print:py-0 print:px-0 print:m-0 print:max-w-none print:w-full">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="print:hidden mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(isPrescriptionView ? "/shop/orders" : "/shop/invoices")}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
            title={isPrescriptionView ? "Back to Orders" : "Back to Invoices"}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">
                {isPrescriptionView ? "Prescription" : "Invoice"} #{record.offlineInvoiceNumber}
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
              Created on {safeFormatDateLocale(record.createdAt, "—", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
            <span>{isPrescriptionView ? "Print Prescription" : "Print Invoice"}</span>
          </button>
        </div>
      </div>

      {/* Clean, Official Printable Invoice Document (NO OFFLINE WATERMARK) */}
      <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-8 print:border-none print:shadow-none ${isPrescriptionView ? "print:p-[12mm]" : "print:p-0"}`}>
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

        {isPrescriptionView ? (
          <>
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  @media print {
                    @page { size: A4 portrait; margin: 0 !important; }
                    aside, header, nav, button, .print\\:hidden, [data-sidebar], [data-topbar] { display: none !important; }
                    html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
                  }
                `,
              }}
            />
          <div className="flex flex-col gap-5 text-[10px] leading-tight">
            <div className="flex justify-between items-start gap-4 border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-base font-black tracking-wide text-black uppercase">OPTICAL PRESCRIPTION</h2>
                <p className="font-bold text-slate-800 mt-1">
                  RX NO - <span className="font-black text-black">{metaRx?.rxNumber || record.serverInvoiceNumber || record.offlineInvoiceNumber}</span>
                </p>
                <p className="font-bold text-slate-600">
                  DATE: <span className="font-extrabold text-slate-800">{safeFormatDateLocale(record.createdAt, "—")}</span>
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-bold text-slate-600">
                  OPTOMETRIST: <span className="font-extrabold text-slate-800">{metaRx?.doctorName || metaRx?.prescribedBy || payload?.soldBy || "IN-HOUSE OPTOMETRIST"}</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 text-[9.5px]">
              <div className="border-r border-slate-200 pr-4 space-y-1">
                <h3 className="font-black text-black border-b border-slate-200 pb-1 uppercase tracking-wider">PATIENT DETAILS,</h3>
                <p className="text-xs font-black text-slate-800 uppercase">{customer.fullName || "Patient"}</p>
                <p className="font-semibold text-slate-600">Phone: <span className="font-bold text-slate-700">{customer.phone || "N/A"}</span></p>
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-black border-b border-slate-200 pb-1 uppercase tracking-wider">PATIENT ADDRESS,</h3>
                <p className="text-xs font-black text-slate-800 uppercase">{customer.fullName || "Patient"}</p>
                {customer.address && <p className="font-semibold text-slate-600 uppercase">{customer.address}</p>}
              </div>
            </div>
            <div className="space-y-2 border border-slate-300 rounded-lg p-3.5 bg-slate-50/30">
              <div className="border-b border-slate-200 pb-1">
                <h3 className="font-black text-black uppercase tracking-wider text-[10px]">OPTICAL PRESCRIPTION (RX DETAILS)</h3>
              </div>
              {hasAnyOfflineRx ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse border border-slate-300 text-[10px] leading-tight bg-white">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-extrabold uppercase text-[8.5px]">
                        <th className="border-r border-slate-300 py-2 px-2 text-left">TYPE / EYE</th>
                        <th className="border-r border-slate-300 py-2 px-1.5">SPH</th>
                        <th className="border-r border-slate-300 py-2 px-1.5">CYL</th>
                        <th className="border-r border-slate-300 py-2 px-1.5">AXIS</th>
                        <th className="border-r border-slate-300 py-2 px-1.5">ADD</th>
                        <th className="border-r border-slate-300 py-2 px-1.5">V/N</th>
                        <th className="border-r border-slate-300 py-2 px-1.5">CADD</th>
                        <th className="py-2 px-1.5">P.D. (MM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold">
                      {distRx && (
                        <>
                          <tr className="border-b border-slate-200">
                            <td className="border-r border-slate-300 py-2 px-2 text-left font-black text-slate-900 bg-slate-50/70">DIST (RE / OD)</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{formatOfflineRxVal(distRx.rightSphere)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{formatOfflineRxVal(distRx.rightCylinder)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{distRx.rightAxis ? `${distRx.rightAxis}°` : "-"}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5 text-[#0a52c3] font-black">{formatOfflineRxVal(distRx.rightAdd)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{distRx.rightNv || "-"}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{distRx.caddRight || "-"}</td>
                            <td className="py-2 px-1.5">{distRx.pdRight ? `R: ${distRx.pdRight}mm` : distRx.pd ? `${distRx.pd}mm` : "-"}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="border-r border-slate-300 py-2 px-2 text-left font-black text-slate-900 bg-slate-50/70">DIST (LE / OS)</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{formatOfflineRxVal(distRx.leftSphere)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{formatOfflineRxVal(distRx.leftCylinder)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{distRx.leftAxis ? `${distRx.leftAxis}°` : "-"}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5 text-[#0a52c3] font-black">{formatOfflineRxVal(distRx.leftAdd)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{distRx.leftNv || "-"}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{distRx.caddLeft || "-"}</td>
                            <td className="py-2 px-1.5">{distRx.pdLeft ? `L: ${distRx.pdLeft}mm` : distRx.pd ? `${distRx.pd}mm` : "-"}</td>
                          </tr>
                        </>
                      )}
                      {nearRx && (
                        <>
                          <tr className="border-b border-slate-200 bg-blue-50/20">
                            <td className="border-r border-slate-300 py-2 px-2 text-left font-black text-slate-900 bg-slate-50/70">NEAR (RE / OD)</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{formatOfflineRxVal(nearRx.rightSphere)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{formatOfflineRxVal(nearRx.rightCylinder)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{nearRx.rightAxis ? `${nearRx.rightAxis}°` : "-"}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5 text-[#0a52c3] font-black">{formatOfflineRxVal(nearRx.rightAdd)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{nearRx.rightNv || "-"}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{nearRx.caddRight || "-"}</td>
                            <td className="py-2 px-1.5">{nearRx.pdRight ? `R: ${nearRx.pdRight}mm` : "-"}</td>
                          </tr>
                          <tr className="bg-blue-50/20">
                            <td className="border-r border-slate-300 py-2 px-2 text-left font-black text-slate-900 bg-slate-50/70">NEAR (LE / OS)</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{formatOfflineRxVal(nearRx.leftSphere)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{formatOfflineRxVal(nearRx.leftCylinder)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{nearRx.leftAxis ? `${nearRx.leftAxis}°` : "-"}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5 text-[#0a52c3] font-black">{formatOfflineRxVal(nearRx.leftAdd)}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{nearRx.leftNv || "-"}</td>
                            <td className="border-r border-slate-300 py-2 px-1.5">{nearRx.caddLeft || "-"}</td>
                            <td className="py-2 px-1.5">{nearRx.pdLeft ? `L: ${nearRx.pdLeft}mm` : "-"}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded py-5 text-center">
                  <p className="font-black text-slate-800 uppercase">No Refractive Eye Prescription Recorded</p>
                </div>
              )}
            </div>
            {items.length > 0 && (
              <table className="w-full border-collapse border border-slate-300 text-[8.5px] leading-tight">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700 uppercase">
                    <th className="border-r border-slate-300 py-1.5 px-2 w-[8%]">SR. NO.</th>
                    <th className="border-r border-slate-300 py-1.5 px-2 text-left">PRODUCT DESCRIPTION</th>
                    <th className="py-1.5 px-2 w-[12%]">QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="border-r border-slate-200 py-2 text-center font-bold">{idx + 1}</td>
                      <td className="border-r border-slate-200 py-2 px-2 font-extrabold uppercase text-slate-800">{item.description}</td>
                      <td className="py-2 text-center font-bold text-slate-700">{item.quantity} pcs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="font-semibold text-slate-600 leading-relaxed italic max-w-[420px]">&quot;{DEFAULT_PRESCRIPTION_ADVISORY_NOTE}&quot;</p>
            <div className="border-b border-slate-200 border-dashed w-full pt-2" />
            <div className="flex justify-end pt-6">
              <div className="text-center w-[200px] space-y-1">
                <div className="border-b border-slate-800 w-full mb-1" />
                <h4 className="font-black text-slate-900 uppercase">OPTOMETRIST SIGNATURE</h4>
              </div>
            </div>
          </div>
          </>
        ) : (
          <>
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">TAX INVOICE</h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Invoice No: <span className="text-slate-900">{record.serverInvoiceNumber || record.offlineInvoiceNumber}</span>
            </p>
            <p className="text-xs text-slate-500">
              Date: <span className="text-slate-900">{safeFormatDateLocale(record.createdAt, "—")}</span>
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
                  <td className="py-2.5 font-bold text-slate-800">
                    <div>{item.description}</div>
                    {item.hsnCode && (
                      <div className="text-[10px] leading-none font-semibold text-slate-500 mt-0.5 inline-flex items-center gap-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400">HSN:</span>
                        <span className="font-mono text-slate-700">{item.hsnCode}</span>
                      </div>
                    )}
                  </td>
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
          </>
        )}
      </div>
    </div>
  );
}
