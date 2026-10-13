"use client";

import React, { useState } from "react";
import type { DocumentData } from "@/services/document.service";
import {
  getShopBusinessDetails,
  getCustomerTaxDetails,
  resolvePrescriptionDisplaySettings,
} from "@/lib/document-config";
import {
  convertNumberToWords,
  formatDateDMY,
  formatDateDMonthY,
  formatPrescriptionVal,
  formatDecimal,
  formatReceiptDate,
  formatReceiptTime,
  safeFormatDateLocale,
} from "@/lib/invoice-helpers";
import { formatCurrency, cn } from "@/lib/utils";
import { resolveOpticalCategory } from "@/lib/optical-category-resolver";
import { Printer } from "lucide-react";

const formatRxPower = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === "") return "-";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return typeof val === "string" && val.trim() ? val : "-";
  if (num === 0) return "0.00";
  return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
};

interface InvoiceDocumentProps {
  data: DocumentData;
  mode: "INVOICE" | "RECEIPT";
}

export function InvoiceDocument({ data, mode }: InvoiceDocumentProps) {
  const invoice = data?.invoice;
  const shop = data?.shop;
  const customer = data?.customer;
  const lineItems = data?.lineItems || [];
  const prescriptions = data?.prescriptions || [];
  const receipt = data?.receipt;

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-bold">
        Document data is not available.
      </div>
    );
  }

  const { showPrescriptionOnInvoice, showPrescriptionOnBooking } = resolvePrescriptionDisplaySettings(data);
  const shopDetails = getShopBusinessDetails(shop);
  const customerTax = getCustomerTaxDetails(customer);

  const shopName = shopDetails.name;
  const shopAddress = shopDetails.address;
  const shopGstin = shopDetails.gstin;
  const shopCin = shopDetails.cin;
  const shopPhone = shopDetails.phone;

  // Custom metadata for compliance based on invoice layout
  const shopMsme = shopDetails.msmeUdyam;
  const patientState = customerTax.state;
  const patientPan = customerTax.pan;
  const patientGstin = customerTax.gstin;

  const customerName = customer?.fullName || "Walk-in Customer";
  const customerPhone = customer?.phone || "";
  const customerAddress = customer?.address || "";

  if (mode === "INVOICE") {
    // -------------------------------------------------------------
    // INVOICE MODE CALCULATIONS
    // -------------------------------------------------------------
    const distRx = prescriptions.slice().reverse().find((p) => p.prescriptionType === "DISTANCE") || null;
    const nearRx = prescriptions.slice().reverse().find((p) => p.prescriptionType === "NEAR") || null;

    const hasDistanceRx = Boolean(
      distRx && (
        distRx.rightSphere || distRx.rightCylinder || distRx.rightAxis || distRx.rightAdd || distRx.rightNv ||
        distRx.leftSphere || distRx.leftCylinder || distRx.leftAxis || distRx.leftAdd || distRx.leftNv
      )
    );

    const hasNearRx = Boolean(
      nearRx && (
        nearRx.rightSphere || nearRx.rightCylinder || nearRx.rightAxis || nearRx.rightAdd || nearRx.rightNv ||
        nearRx.leftSphere || nearRx.leftCylinder || nearRx.leftAxis || nearRx.leftAdd || nearRx.leftNv
      )
    );

    const hasPrescription = hasDistanceRx || hasNearRx;
    const rxCategory = distRx?.rxCategory || nearRx?.rxCategory || "";
    const rxDoctorName = distRx?.doctorName || nearRx?.doctorName || "";
    const rxNumber = distRx?.rxNumber || nearRx?.rxNumber || "";

    const totals = lineItems.reduce(
      (acc, item) => {
        const qty = item.quantity;
        const subtotal = parseFloat(item.subtotal) || 0;
        const discount = parseFloat(item.discountAmount) || 0;
        const taxable = subtotal - discount;
        const cgst = parseFloat(item.cgstAmount) || 0;
        const sgst = parseFloat(item.sgstAmount) || 0;
        const igst = parseFloat(item.igstAmount) || 0;
        const gst = cgst + sgst + igst;
        const amount = taxable + gst;

        return {
          qty: acc.qty + qty,
          subtotal: acc.subtotal + subtotal,
          discount: acc.discount + discount,
          taxable: acc.taxable + taxable,
          gst: acc.gst + gst,
          amount: acc.amount + amount,
        };
      },
      { qty: 0, subtotal: 0, discount: 0, taxable: 0, gst: 0, amount: 0 }
    );

    const databaseTotal = parseFloat(invoice.total) || 0;
    const calculatedGrandTotal = totals.taxable + totals.gst;
    const roundOff = databaseTotal - calculatedGrandTotal;

    // Group items by Optical Category + GST rate slabs for tax summary table
    const taxSummarySlabs: {
      [key: string]: {
        particularsName: string;
        gstPercent: number;
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        total: number;
        sortOrder: number;
      };
    } = {};

    lineItems.forEach((item) => {
      const cgstPercent = parseFloat(item.cgstPercent) || 0;
      const sgstPercent = parseFloat(item.sgstPercent) || 0;
      const igstPercent = parseFloat(item.igstPercent) || 0;
      const totalPercent = cgstPercent + sgstPercent + igstPercent;

      if (totalPercent === 0) return;

      const subtotal = parseFloat(item.subtotal) || 0;
      const discount = parseFloat(item.discountAmount) || 0;
      const taxable = subtotal - discount;

      const cgst = parseFloat(item.cgstAmount) || 0;
      const sgst = parseFloat(item.sgstAmount) || 0;
      const igst = parseFloat(item.igstAmount) || 0;
      const totalTax = cgst + sgst + igst;

      const categoryInfo = resolveOpticalCategory(item.category, item.description);
      const key = `${categoryInfo.name}__${totalPercent.toFixed(2)}`;

      if (taxSummarySlabs[key]) {
        taxSummarySlabs[key].taxableValue += taxable;
        taxSummarySlabs[key].cgst += cgst;
        taxSummarySlabs[key].sgst += sgst;
        taxSummarySlabs[key].igst += igst;
        taxSummarySlabs[key].total += totalTax;
      } else {
        taxSummarySlabs[key] = {
          particularsName: categoryInfo.name,
          gstPercent: totalPercent,
          taxableValue: taxable,
          cgst,
          sgst,
          igst,
          total: totalTax,
          sortOrder: categoryInfo.sortOrder,
        };
      }
    });

    const taxSummaryRows = Object.values(taxSummarySlabs).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.particularsName.localeCompare(b.particularsName)
    );
    const invoiceRefId = `${customer?.registrationId || "AXIS-KOL"} | ${invoice.invoiceNumber}`;

    const balanceDueNum = parseFloat(invoice.balanceDue) || 0;
    const amountPaidNum = parseFloat(invoice.amountPaid) || 0;
    const isFullyPaid = balanceDueNum <= 0;
    const isPartiallyPaid = !isFullyPaid && amountPaidNum > 0;

    return (
      <>
        {/* Strict Print CSS Overrides for Invoice */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                /* Hide layout sidebar, topbar, and controls completely */
                aside, 
                header, 
                nav, 
                button, 
                .w-64,
                div.w-64,
                .print\\:hidden,
                [role="navigation"],
                [role="banner"],
                .flex.h-screen.overflow-hidden > div:first-child {
                  display: none !important;
                  width: 0 !important;
                  height: 0 !important;
                  overflow: hidden !important;
                  opacity: 0 !important;
                  visibility: hidden !important;
                }

                /* Reset layout container system for full-bleed print flow */
                .flex.h-screen.overflow-hidden {
                  display: block !important;
                  height: auto !important;
                  width: 100% !important;
                  overflow: visible !important;
                  background: white !important;
                }

                .flex.flex-1.flex-col.overflow-hidden {
                  display: block !important;
                  height: auto !important;
                  width: 100% !important;
                  overflow: visible !important;
                }

                main.flex-1.overflow-y-auto {
                  display: block !important;
                  height: auto !important;
                  width: 100% !important;
                  overflow: visible !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                }

                /* Set up strict A4 page boundaries */
                @page {
                  size: A4 portrait;
                  margin: 0;
                }

                body {
                  width: 210mm;
                  background-color: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                .print-page {
                  width: 210mm;
                  height: 297mm;
                  max-height: 297mm;
                  page-break-before: avoid;
                  page-break-after: avoid;
                  page-break-inside: avoid;
                  break-before: avoid;
                  break-after: avoid;
                  break-inside: avoid;
                  position: relative;
                  box-sizing: border-box;
                  background: white !important;
                  overflow: hidden;
                }

                table {
                  page-break-inside: avoid;
                }

                tr {
                  page-break-inside: avoid;
                  page-break-after: auto;
                }

                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `,
          }}
        />

        {/* ========================================================================= */}
        {/* OFFICIAL A4 DOCUMENT VIEW (Authentic A4 Paper Layout for Mobile & Desktop) */}
        {/* ========================================================================= */}
        <div className="w-full max-w-full overflow-x-auto flex justify-center py-2 print:overflow-visible print:p-0 print:w-auto">
          <div
            id="invoice-print-area"
            className="flex flex-col gap-0 items-center w-[794px] max-w-[794px] shrink-0 print:w-auto print:max-w-none"
          >
            {/* ================= SINGLE PAGE A4 TAX INVOICE ================= */}
            <div className="w-[794px] min-h-[1123px] max-w-[794px] bg-white border border-slate-200 shadow-xl p-[10mm] flex flex-col justify-between print:w-[210mm] print:h-[297mm] print:max-h-[297mm] print:border-none print:shadow-none print:p-[8mm] print-page shrink-0">
            <div className="flex-1 flex flex-col">
              {/* Header Block */}
              <div className="flex justify-between items-start border-b border-black pb-2.5">
                <div className="flex gap-3">
                  {/* Golden Eye Logo */}
                  <div className="mt-1">
                    <svg width="42" height="32" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M50 10C25 10 5 40 5 40C5 40 25 70 50 70C75 70 95 40 95 40C95 40 75 10 50 10Z"
                        stroke="#a17c24"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="50" cy="40" r="16" stroke="#a17c24" strokeWidth="8" />
                      <circle cx="50" cy="40" r="6" fill="#a17c24" />
                    </svg>
                  </div>

                  {/* Shop Metadata */}
                  <div>
                    <h1 className="text-sm font-black text-black leading-tight tracking-tight uppercase">
                      {shopName}
                    </h1>
                    <div className="grid grid-cols-[60px_8px_1fr] gap-y-0.5 text-[10px] text-black font-semibold mt-1">
                      {shopAddress && (
                        <>
                          <div>Address</div>
                          <div>:</div>
                          <div className="whitespace-pre-line leading-tight">{shopAddress}</div>
                        </>
                      )}

                      {shopGstin && (
                        <>
                          <div>GSTIN</div>
                          <div>:</div>
                          <div>{shopGstin}</div>
                        </>
                      )}

                      {shopCin && (
                        <>
                          <div>CIN</div>
                          <div>:</div>
                          <div>{shopCin}</div>
                        </>
                      )}

                      {shopMsme && (
                        <>
                          <div>MSME No.</div>
                          <div>:</div>
                          <div>{shopMsme}</div>
                        </>
                      )}

                      {shopPhone && (
                        <>
                          <div>Phone</div>
                          <div>:</div>
                          <div>{shopPhone}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Title */}
                <div className="text-right">
                  {parseFloat(invoice.balanceDue) > 0 && invoice.status !== "PAID" ? (
                    <div>
                      <h2 className="text-lg font-black text-[#0a52c3] tracking-wide leading-none uppercase">
                        OPTICAL ORDER FORM
                      </h2>
                      <p className="text-[10px] font-bold text-slate-700 mt-1 uppercase">
                        Order Ref # - {invoice.invoiceNumber}
                      </p>
                      <div className="inline-block mt-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase border border-rose-200">
                        OUTSTANDING DUES: {formatCurrency(parseFloat(invoice.balanceDue))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-2xl font-black text-black tracking-wide leading-none">
                        INVOICE
                      </h2>
                      <p className="text-[11px] font-bold text-black mt-1.5 uppercase">
                        Invoice # - {invoice.invoiceNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bill / Ship Grid */}
              <div className="grid grid-cols-[1fr_1fr_1.1fr] border border-black mt-3 text-[10px] font-semibold">
                {/* Bill To */}
                <div className="border-r border-black p-2 flex flex-col gap-0.5">
                  <span className="text-black font-bold uppercase border-b border-black pb-0.5 mb-1 block">
                    Bill To,
                  </span>
                  <span className="text-black font-bold uppercase">{customerName}</span>
                  {customerAddress && <span className="text-slate-700 leading-normal line-clamp-3">{customerAddress}</span>}
                  {customerPhone && <span>Phone: {customerPhone}</span>}
                  <div className="mt-1 flex flex-col gap-0.5">
                    {patientState && <span>State : {patientState}</span>}
                    {patientPan && <span>PAN No: {patientPan}</span>}
                    {patientGstin && <span>GSTIN: {patientGstin}</span>}
                  </div>
                </div>

                {/* Ship To */}
                <div className="border-r border-black p-2 flex flex-col gap-0.5">
                  <span className="text-black font-bold uppercase border-b border-black pb-0.5 mb-1 block">
                    Ship To,
                  </span>
                  <span className="text-black font-bold uppercase">{customerName}</span>
                  {customerAddress && <span className="text-slate-700 leading-normal line-clamp-3">{customerAddress}</span>}
                  <div className="mt-1 flex flex-col gap-0.5">
                    {patientState && <span>State : {patientState}</span>}
                    {patientState && <span>Place of supply: {patientState}</span>}
                  </div>
                </div>

                {/* Invoice Details Card */}
                <div className="p-2 flex flex-col gap-1 bg-slate-50/10">
                  <div className="grid grid-cols-[100px_1fr] gap-y-1">
                    <div className="text-slate-600 font-bold">Invoice Number:</div>
                    <div className="text-black font-black">{invoice.invoiceNumber}</div>

                    <div className="text-slate-600 font-bold">Invoice Date:</div>
                    <div className="text-black font-bold">
                      {formatDateDMonthY(invoice.createdAt)}
                    </div>

                    {invoice.soldBy && (
                      <>
                        <div className="text-slate-600 font-bold">Sold By:</div>
                        <div className="text-black font-bold">{invoice.soldBy}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* OPTICAL PRESCRIPTION TABLE (Controlled by customization toggle, default OFF) */}
              {showPrescriptionOnInvoice && hasPrescription && (
                <div className="mt-2.5 border border-black text-black">
                  <div className="flex items-center justify-between bg-slate-100 border-b border-black px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>Optical Prescription (Rx Details)</span>
                      {rxCategory && (
                        <span className="text-[7.5px] font-bold px-1 py-0.2 bg-white border border-black/40 rounded">
                          {rxCategory}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[7.5px] font-bold text-slate-700">
                      {rxDoctorName && (
                        <span>Doctor/Optom: <span className="text-black font-black">{rxDoctorName}</span></span>
                      )}
                      {rxNumber && (
                        <span>Rx No: <span className="text-black font-black">{rxNumber}</span></span>
                      )}
                    </div>
                  </div>

                  <table className="w-full table-fixed text-center border-collapse text-[8.5px] font-semibold leading-tight">
                    <thead>
                      <tr className="bg-slate-50 border-b border-black text-[8px] font-bold uppercase text-slate-800">
                        <th className="border-r border-black py-0.5 px-1 w-[14%] text-left">Type / Eye</th>
                        <th className="border-r border-black py-0.5 px-1 w-[11%]">SPH</th>
                        <th className="border-r border-black py-0.5 px-1 w-[11%]">CYL</th>
                        <th className="border-r border-black py-0.5 px-1 w-[10%]">AXIS</th>
                        <th className="border-r border-black py-0.5 px-1 w-[11%]">ADD</th>
                        <th className="border-r border-black py-0.5 px-1 w-[11%]">V/N</th>
                        <th className="border-r border-black py-0.5 px-1 w-[14%]">CADD</th>
                        <th className="py-0.5 px-1 w-[18%]">P.D. (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasDistanceRx && (
                        <>
                          <tr className="border-b border-black/50">
                            <td className="border-r border-black py-0.5 px-1 text-left font-black bg-slate-50/50">
                              DIST (RE / OD)
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {formatRxPower(distRx?.rightSphere)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {formatRxPower(distRx?.rightCylinder)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {distRx?.rightAxis ? `${distRx.rightAxis}°` : "-"}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold text-[#0a52c3]">
                              {formatRxPower(distRx?.rightAdd)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 text-slate-700">
                              {distRx?.rightNv || "-"}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 text-slate-700">
                              {distRx?.caddRight || "-"}
                            </td>
                            <td className="py-0.5 px-1 text-slate-800">
                              {distRx?.pdRight ? `R: ${distRx.pdRight}mm` : (distRx?.pd ? `${distRx.pd}mm` : "-")}
                            </td>
                          </tr>
                          <tr className={hasNearRx ? "border-b border-black" : ""}>
                            <td className="border-r border-black py-0.5 px-1 text-left font-black bg-slate-50/50">
                              DIST (LE / OS)
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {formatRxPower(distRx?.leftSphere)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {formatRxPower(distRx?.leftCylinder)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {distRx?.leftAxis ? `${distRx.leftAxis}°` : "-"}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold text-[#0a52c3]">
                              {formatRxPower(distRx?.leftAdd)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 text-slate-700">
                              {distRx?.leftNv || "-"}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 text-slate-700">
                              {distRx?.caddLeft || "-"}
                            </td>
                            <td className="py-0.5 px-1 text-slate-800">
                              {distRx?.pdLeft ? `L: ${distRx.pdLeft}mm` : (distRx?.pd ? `${distRx.pd}mm` : "-")}
                            </td>
                          </tr>
                        </>
                      )}
                      {hasNearRx && (
                        <>
                          <tr className="border-b border-black/50 bg-blue-50/20">
                            <td className="border-r border-black py-0.5 px-1 text-left font-black bg-slate-50/50">
                              NEAR (RE / OD)
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {formatRxPower(nearRx?.rightSphere)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {formatRxPower(nearRx?.rightCylinder)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {nearRx?.rightAxis ? `${nearRx.rightAxis}°` : "-"}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold text-[#0a52c3]">
                              {formatRxPower(nearRx?.rightAdd)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 text-slate-700">
                              {nearRx?.rightNv || "-"}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 text-slate-700">
                              {nearRx?.caddRight || "-"}
                            </td>
                            <td className="py-0.5 px-1 text-slate-800">
                              {nearRx?.pdRight ? `R: ${nearRx.pdRight}mm` : "-"}
                            </td>
                          </tr>
                          <tr className="bg-blue-50/20">
                            <td className="border-r border-black py-0.5 px-1 text-left font-black bg-slate-50/50">
                              NEAR (LE / OS)
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {formatRxPower(nearRx?.leftSphere)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {formatRxPower(nearRx?.leftCylinder)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold">
                              {nearRx?.leftAxis ? `${nearRx.leftAxis}°` : "-"}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 font-bold text-[#0a52c3]">
                              {formatRxPower(nearRx?.leftAdd)}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 text-slate-700">
                              {nearRx?.leftNv || "-"}
                            </td>
                            <td className="border-r border-black py-0.5 px-1 text-slate-700">
                              {nearRx?.caddLeft || "-"}
                            </td>
                            <td className="py-0.5 px-1 text-slate-800">
                              {nearRx?.pdLeft ? `L: ${nearRx.pdLeft}mm` : "-"}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>

                  {(distRx?.lensType || distRx?.frameName || distRx?.notes || distRx?.specialInstructions) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[7.5px] font-semibold text-slate-700 px-2 py-0.5 bg-slate-50 border-t border-black/40">
                      {distRx.lensType && (
                        <span>Lens Type: <span className="font-black text-black">{distRx.lensType}</span></span>
                      )}
                      {distRx.frameName && (
                        <span>Frame: <span className="font-black text-black">{distRx.frameName}</span></span>
                      )}
                      {distRx.notes && (
                        <span>Notes: <span className="font-black text-black">{distRx.notes}</span></span>
                      )}
                      {distRx.specialInstructions && (
                        <span>Instructions: <span className="font-black text-black">{distRx.specialInstructions}</span></span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Items Ledger Table */}
              <div className="mt-2.5">
                <table className="w-full table-fixed text-[9.5px] text-black border-collapse border border-black font-semibold leading-tight">
                  <thead>
                    <tr className="border-b border-black bg-slate-50 font-bold text-[8.5px] uppercase">
                      <th className="border-r border-black px-1 py-1 text-center w-[4%]">Sr.</th>
                      <th className="border-r border-black px-1.5 py-1 text-left w-[14%]">Order Details</th>
                      <th className="border-r border-black px-1.5 py-1 text-left w-[24%]">Product Description</th>
                      <th className="border-r border-black px-1 py-1 text-center w-[5%]">Qty</th>
                      <th className="border-r border-black px-1 py-1 text-right w-[8%]">Rate</th>
                      <th className="border-r border-black px-1 py-1 text-right w-[8%]">Sub Total</th>
                      <th className="border-r border-black px-1 py-1 text-right w-[7%]">Disc.</th>
                      <th className="border-r border-black px-1 py-1 text-right w-[8%]">Taxable</th>
                      <th className="border-r border-black px-0.5 py-1 text-center w-[7%]">GST %</th>
                      <th className="border-r border-black px-1 py-1 text-right w-[7%]">GST Amt</th>
                      <th className="px-1.5 py-1 text-right w-[8%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const cgstPercent = parseFloat(item.cgstPercent) || 0;
                      const sgstPercent = parseFloat(item.sgstPercent) || 0;
                      const igstPercent = parseFloat(item.igstPercent) || 0;
                      const totalGstPercent = igstPercent > 0 ? igstPercent : (cgstPercent + sgstPercent);

                      const cgst = parseFloat(item.cgstAmount) || 0;
                      const sgst = parseFloat(item.sgstAmount) || 0;
                      const igst = parseFloat(item.igstAmount) || 0;
                      const rowGst = cgst + sgst + igst;

                      const subtotal = parseFloat(item.subtotal) || 0;
                      const discount = parseFloat(item.discountAmount) || 0;
                      const taxable = subtotal - discount;
                      const totalAmount = taxable + rowGst;

                      return (
                        <tr key={item.id} className="border-b border-black align-top hover:bg-slate-50/10">
                          {/* Sr No */}
                          <td className="border-r border-black px-1 py-1 text-center font-bold">
                            {idx + 1}
                          </td>

                          {/* Order Details */}
                          <td className="border-r border-black px-1.5 py-1 text-[8.5px] leading-tight break-words">
                            <div className="font-mono font-bold text-black">{item.sku || "—"}</div>
                            {item.brand && <div className="font-bold text-slate-800 uppercase">{item.brand}</div>}
                            <div className="text-[7.5px] text-slate-500">{formatDateDMY(invoice.createdAt)}</div>
                          </td>

                          {/* Product Description */}
                          <td className="border-r border-black px-1.5 py-1 text-[8.5px] leading-tight break-words">
                            <div className="font-bold text-black uppercase">{item.description}</div>
                            {item.hsnCode && (
                              <div className="text-[7px] leading-none font-bold text-slate-700 mt-0.5 inline-flex items-center gap-0.5 tracking-tight">
                                <span className="text-[6.5px] uppercase font-bold text-slate-500">HSN:</span>
                                <span className="font-mono font-bold text-black">{item.hsnCode}</span>
                              </div>
                            )}
                          </td>

                          {/* Qty */}
                          <td className="border-r border-black px-1 py-1 text-center text-[8.5px]">
                            {item.quantity} pcs
                          </td>

                          {/* Rate/Pcs */}
                          <td className="border-r border-black px-1 py-1 text-right text-[8.5px] font-medium">
                            {formatDecimal(item.unitPrice)}
                          </td>

                          {/* Sub Total */}
                          <td className="border-r border-black px-1 py-1 text-right text-[8.5px] font-medium">
                            {formatDecimal(item.subtotal)}
                          </td>

                          {/* Discount */}
                          <td className="border-r border-black px-1 py-1 text-right text-[8.5px] font-medium">
                            {formatDecimal(item.discountAmount)}
                          </td>

                          {/* Taxable value */}
                          <td className="border-r border-black px-1 py-1 text-right text-[8.5px] font-bold">
                            {formatDecimal(taxable)}
                          </td>

                          {/* GST % */}
                          <td className="border-r border-black px-0.5 py-1 text-center text-[8.5px] leading-tight">
                            <div className="font-bold">{totalGstPercent > 0 ? `${totalGstPercent.toFixed(1)}%` : "0%"}</div>
                            {igstPercent > 0 ? (
                              <div className="text-[7px] text-slate-500 font-semibold uppercase">IGST</div>
                            ) : cgstPercent > 0 || sgstPercent > 0 ? (
                              <div className="text-[7px] text-slate-500 font-semibold">
                                {cgstPercent > 0 ? `C:${cgstPercent.toFixed(0)}% ` : ""}{sgstPercent > 0 ? `S:${sgstPercent.toFixed(0)}%` : ""}
                              </div>
                            ) : null}
                          </td>

                          {/* GST Amount */}
                          <td className="border-r border-black px-1 py-1 text-right text-[8.5px] font-medium">
                            {formatDecimal(rowGst)}
                          </td>

                          {/* Amount */}
                          <td className="px-1.5 py-1 text-right text-[8.5px] font-black">
                            {formatDecimal(totalAmount)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Summary Totals Row */}
                    <tr className="border-b border-black font-black bg-slate-50 text-[8.5px]">
                      <td className="border-r border-black px-1 py-1 text-center"></td>
                      <td className="border-r border-black px-1.5 py-1 uppercase" colSpan={2}>
                        Line Total
                      </td>
                      <td className="border-r border-black px-1 py-1 text-center">
                        {totals.qty}
                      </td>
                      <td className="border-r border-black px-1 py-1"></td>
                      <td className="border-r border-black px-1 py-1 text-right">
                        {formatDecimal(totals.subtotal)}
                      </td>
                      <td className="border-r border-black px-1 py-1 text-right">
                        {formatDecimal(totals.discount)}
                      </td>
                      <td className="border-r border-black px-1 py-1 text-right">
                        {formatDecimal(totals.taxable)}
                      </td>
                      <td className="border-r border-black px-0.5 py-1 text-center"></td>
                      <td className="border-r border-black px-1 py-1 text-right">
                        {formatDecimal(totals.gst)}
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        {formatDecimal(totals.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Calculations & Tax Summary */}
              <div className="grid grid-cols-[1.3fr_1fr] gap-3 mt-2.5">
                {/* Left Column: Words, Tax Slab summary, bank details */}
                <div className="flex flex-col gap-2 font-semibold text-[9px]">
                  {/* Amount in words */}
                  <div className="leading-tight">
                    <span className="text-black font-bold">Amount in words: </span>
                    <span className="text-black font-black italic">
                      {convertNumberToWords(databaseTotal)}
                    </span>
                  </div>

                  {/* Tax summary table */}
                  <div className="border border-black">
                    <div className="bg-slate-50 border-b border-black px-1.5 py-0.5 text-[8.5px] font-bold uppercase">
                      Statutory GST Breakdown
                    </div>
                    <table className="w-full text-[8.5px] text-black border-collapse">
                      <thead>
                        <tr className="border-b border-black text-center font-bold bg-slate-50">
                          <th className="border-r border-black px-1.5 py-0.5 text-left">Particular Name</th>
                          <th className="border-r border-black px-1 py-0.5">GST %</th>
                          <th className="border-r border-black px-1.5 py-0.5 text-right">Taxable</th>
                          <th className="border-r border-black px-1.5 py-0.5 text-right">CGST</th>
                          <th className="border-r border-black px-1.5 py-0.5 text-right">SGST</th>
                          <th className="border-r border-black px-1.5 py-0.5 text-right">IGST</th>
                          <th className="px-1.5 py-0.5 text-right">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxSummaryRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-black text-center">
                            <td className="border-r border-black px-1.5 py-0.5 text-left font-medium">{row.particularsName}</td>
                            <td className="border-r border-black px-1 py-0.5">{row.gstPercent.toFixed(1)}%</td>
                            <td className="border-r border-black px-1.5 py-0.5 text-right">{formatDecimal(row.taxableValue)}</td>
                            <td className="border-r border-black px-1.5 py-0.5 text-right">{formatDecimal(row.cgst)}</td>
                            <td className="border-r border-black px-1.5 py-0.5 text-right">{formatDecimal(row.sgst)}</td>
                            <td className="border-r border-black px-1.5 py-0.5 text-right">{formatDecimal(row.igst)}</td>
                            <td className="px-1.5 py-0.5 text-right font-bold">{formatDecimal(row.total)}</td>
                          </tr>
                        ))}
                        {/* Total row */}
                        <tr className="font-bold bg-slate-50 text-center">
                          <td className="border-r border-black px-1.5 py-0.5 text-left">Total</td>
                          <td className="border-r border-black px-1.5 py-0.5"></td>
                          <td className="border-r border-black px-1.5 py-0.5 text-right">{formatDecimal(totals.taxable)}</td>
                          <td className="border-r border-black px-1.5 py-0.5 text-right">
                            {formatDecimal(
                              lineItems.reduce((s, i) => s + (parseFloat(i.cgstAmount) || 0), 0)
                            )}
                          </td>
                          <td className="border-r border-black px-1.5 py-0.5 text-right">
                            {formatDecimal(
                              lineItems.reduce((s, i) => s + (parseFloat(i.sgstAmount) || 0), 0)
                            )}
                          </td>
                          <td className="border-r border-black px-1.5 py-0.5 text-right">
                            {formatDecimal(
                              lineItems.reduce((s, i) => s + (parseFloat(i.igstAmount) || 0), 0)
                            )}
                          </td>
                          <td className="px-1.5 py-0.5 text-right">{formatDecimal(totals.gst)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Bank Account Details */}
                  {shopDetails.enableBankDetails && shopDetails.bankAccountNumber ? (
                    <div className="border border-black p-1.5 flex flex-col gap-0.5 text-[8.5px]">
                      <span className="font-bold border-b border-black pb-0.5 mb-0.5 block uppercase">
                        Bank Details:
                      </span>
                      <div className="grid grid-cols-[65px_6px_1fr] gap-y-0.5">
                        {shopDetails.bankName && (
                          <>
                            <div>Bank Name</div>
                            <div>:</div>
                            <div>{shopDetails.bankName}</div>
                          </>
                        )}
                        <div>Account No.</div>
                        <div>:</div>
                        <div className="font-bold">{shopDetails.bankAccountNumber}</div>
                        {shopDetails.bankIfsc && (
                          <>
                            <div>IFS Code</div>
                            <div>:</div>
                            <div className="font-bold">{shopDetails.bankIfsc}</div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Right Column: Ledger calculations & Settlement */}
                <div className="flex flex-col gap-1 text-[9.5px] font-bold pl-4">
                  <div className="grid grid-cols-[105px_8px_1fr] text-black">
                    <div>Sub Total</div>
                    <div>:</div>
                    <div className="text-right">{formatDecimal(totals.subtotal)}</div>

                    <div>Discount</div>
                    <div>:</div>
                    <div className="text-right">-{formatDecimal(totals.discount)}</div>

                    <div>GST</div>
                    <div>:</div>
                    <div className="text-right">{formatDecimal(totals.gst)}</div>

                    <div>Round Off</div>
                    <div>:</div>
                    <div className="text-right">{formatDecimal(roundOff)}</div>

                    <div className="col-span-3 border-t border-black my-1" />

                    <div className="text-sm font-black text-black">Total Amount</div>
                    <div className="text-sm font-black text-black">:</div>
                    <div className="text-sm font-black text-black text-right">
                      {formatDecimal(databaseTotal)}
                    </div>

                    {parseFloat(invoice.creditApplied || "0") > 0 && (
                      <>
                        <div className="text-[8.5px] font-bold text-emerald-800">Store Credit Applied</div>
                        <div className="text-[8.5px] font-bold text-emerald-800">:</div>
                        <div className="text-[8.5px] font-bold text-emerald-800 text-right">
                          -{formatDecimal(parseFloat(invoice.creditApplied))}
                        </div>

                        <div className="text-xs font-black text-black border-t border-black/40 pt-0.5">Net Payable</div>
                        <div className="text-xs font-black text-black border-t border-black/40 pt-0.5">:</div>
                        <div className="text-xs font-black text-black text-right border-t border-black/40 pt-0.5">
                          {formatDecimal(Math.max(0, databaseTotal - parseFloat(invoice.creditApplied)))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payment status badge */}
                  <div className="mt-1 pt-1 border-t border-black/20 text-[8.5px]">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-600 font-semibold uppercase">Amount Paid:</span>
                      <span className="font-bold text-black">{formatCurrency(amountPaidNum)}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-600 font-semibold uppercase">Balance Due:</span>
                      <span className={`font-black ${balanceDueNum > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        {formatCurrency(balanceDueNum)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installment Payment History Log */}
              {data.allReceipts && data.allReceipts.length > 0 && (
                <div className="border border-black mt-2 text-[8.5px]">
                  <div className="bg-slate-100 border-b border-black px-1.5 py-0.5 font-bold text-black uppercase flex items-center justify-between text-[8px]">
                    <span>Payment Settlement History ({data.allReceipts.length} Installments)</span>
                    <span className="font-extrabold text-emerald-800 uppercase">
                      {balanceDueNum <= 0 ? "Account Fully Settled" : `Pending Balance: ₹${balanceDueNum.toFixed(2)}`}
                    </span>
                  </div>
                  <table className="w-full text-center border-collapse text-[8px]">
                    <thead>
                      <tr className="border-b border-black font-bold bg-slate-50 text-slate-700 uppercase">
                        <th className="py-0.5 px-1 border-r border-black text-left">Receipt #</th>
                        <th className="py-0.5 px-1 border-r border-black">Payment Date</th>
                        <th className="py-0.5 px-1 border-r border-black">Payment Mode</th>
                        <th className="py-0.5 px-1 border-r border-black text-right">Amount Paid</th>
                        <th className="py-0.5 px-1 text-right">Remaining Dues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.allReceipts.map((r) => (
                        <tr key={r.id} className="border-b border-black/30 font-semibold text-slate-800">
                          <td className="py-0.5 px-1 border-r border-black text-left font-mono font-bold text-black">
                            {r.receiptNumber}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black">
                            {safeFormatDateLocale(r.createdAt, "—", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black font-bold text-slate-700 uppercase">
                            {r.paymentMethod}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right font-black text-emerald-800">
                            {formatCurrency(parseFloat(r.amountPaid))}
                          </td>
                          <td className="py-0.5 px-1 text-right font-extrabold text-slate-700">
                            {formatCurrency(parseFloat(r.balanceDue))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Single-Page Footer */}
            <div className="border-t border-black pt-1 flex justify-between items-center text-[8.5px] font-bold text-black mt-2">
              <div>{invoiceRefId}</div>
              <div className="text-slate-600 font-semibold uppercase text-[7.5px]">
                This is a computer-generated tax invoice
              </div>
              <div>Page 1 of 1</div>
            </div>
          </div>
        </div>
      </div>
    </>
    );
  } else {
    // -------------------------------------------------------------
    // RECEIPT MODE
    // -------------------------------------------------------------
    if (!receipt) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-bold">
          Receipt details are missing.
        </div>
      );
    }

    const formattedDate = formatReceiptDate(receipt.createdAt) || formatReceiptDate(invoice?.createdAt) || formatReceiptDate(new Date());
    const formattedTime = formatReceiptTime(receipt.createdAt) || formatReceiptTime(invoice?.createdAt) || formatReceiptTime(new Date());

    // Totals calculations
    const subTotalSum = lineItems.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);
    const discountSum = lineItems.reduce((acc, item) => acc + parseFloat(item.discountAmount), 0);
    const taxableValSum = subTotalSum - discountSum;
    const totalGstSum = lineItems.reduce(
      (acc, item) => acc + parseFloat(item.cgstAmount) + parseFloat(item.sgstAmount) + parseFloat(item.igstAmount),
      0
    );
    const netTotalSum = taxableValSum + totalGstSum;
    const totalQty = lineItems.reduce((acc, item) => acc + item.quantity, 0);

    const latestPrescription = prescriptions.length > 0 ? prescriptions[0] : null;

    const distRx = prescriptions.slice().reverse().find((p) => p.prescriptionType === "DISTANCE") || null;
    const nearRx = prescriptions.slice().reverse().find((p) => p.prescriptionType === "NEAR") || null;

    const hasDistanceRx = Boolean(
      distRx && (
        distRx.rightSphere || distRx.rightCylinder || distRx.rightAxis || distRx.rightAdd || distRx.rightNv ||
        distRx.leftSphere || distRx.leftCylinder || distRx.leftAxis || distRx.leftAdd || distRx.leftNv
      )
    );

    const hasNearRx = Boolean(
      nearRx && (
        nearRx.rightSphere || nearRx.rightCylinder || nearRx.rightAxis || nearRx.rightAdd || nearRx.rightNv ||
        nearRx.leftSphere || nearRx.leftCylinder || nearRx.leftAxis || nearRx.leftAdd || nearRx.leftNv
      )
    );

    const hasPrescription = hasDistanceRx || hasNearRx;
    const rxCategory = distRx?.rxCategory || nearRx?.rxCategory || "";
    const rxDoctorName = distRx?.doctorName || nearRx?.doctorName || "";
    const rxNumber = distRx?.rxNumber || nearRx?.rxNumber || "";

    return (
      <>
        {/* Strict Print CSS Overrides for Receipt */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                aside, header, nav, button, .print\\:hidden {
                  display: none !important;
                }
                body {
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .print-container {
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  max-width: 100% !important;
                  width: 100% !important;
                  background: transparent !important;
                }
              }
            `,
          }}
        />

        <div className="w-full max-w-full overflow-x-auto flex justify-center py-2 print:overflow-visible print:p-0 print:w-auto">
          {/* Receipt Paper Card Container */}
          <div
            id="invoice-print-area"
            className="print-container bg-white border border-slate-200 shadow-md rounded-xl p-8 w-[794px] max-w-[794px] shrink-0 flex flex-col gap-6 text-[10px] leading-tight select-none print:w-auto print:max-w-none"
          >
          {/* HEADER SECTION */}
          <div className="flex justify-between items-start gap-4">
            {/* Logo & Company info */}
            <div className="flex items-start gap-3 flex-1">
              {/* Eye Icon SVG Logo */}
              <div className="pt-1 text-[#0a52c3] flex-shrink-0">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>

              <div className="space-y-1">
                <h1 className="text-xl font-black tracking-tight leading-none text-black uppercase">
                  {shopName}
                </h1>
                {shopAddress && (
                  <p className="font-semibold text-slate-600 max-w-[320px] uppercase">
                    ADDRESS : {shopAddress}
                  </p>
                )}
                {shopGstin && (
                  <p className="font-semibold text-slate-600">
                    GSTIN : <span className="font-extrabold">{shopGstin}</span>
                  </p>
                )}
                {shopCin && (
                  <p className="font-semibold text-slate-600">
                    CIN : <span className="font-extrabold">{shopCin}</span>
                  </p>
                )}
                {shopPhone && (
                  <p className="font-semibold text-slate-600">
                    PHONE : <span className="font-extrabold">{shopPhone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Order Form Identification */}
            <div className="text-right space-y-1">
              <h2 className="text-base font-black tracking-wide text-black uppercase">
                OPTICAL ORDER FORM
              </h2>
              <p className="font-bold text-slate-800">
                ORDER FORM # - <span className="font-black text-black">{receipt.receiptNumber}</span>
              </p>
              {invoice?.invoiceNumber && (
                <p className="font-bold text-slate-600">
                  INVOICE REF: <span className="font-extrabold text-slate-800">{invoice.invoiceNumber}</span>
                </p>
              )}
              <p className="font-bold text-slate-600">
                DATE: <span className="font-extrabold text-slate-800">{formattedDate}</span>
              </p>
              <p className="font-bold text-slate-600">
                TIME: <span className="font-extrabold text-slate-800">{formattedTime}</span>
              </p>
              {invoice?.soldBy && (
                <p className="font-bold text-slate-600">
                  SOLD BY: <span className="font-extrabold text-slate-800">{invoice.soldBy}</span>
                </p>
              )}
            </div>
          </div>

          {/* Thick divider line */}
          <div className="border-b-2 border-black w-full" />

          {/* CUSTOMER & TRANSACTION BLOCKS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-[9.5px]">
            {/* BILL TO */}
            <div className="border-r border-slate-200 pr-4 space-y-1.5">
              <h3 className="font-black text-black border-b border-slate-200 pb-1 uppercase tracking-wider">
                BILL TO,
              </h3>
              <p className="text-xs font-black text-slate-800 uppercase">{customerName}</p>
              {customer?.registrationId && (
                <p className="font-semibold text-slate-600">
                  Reg ID: <span className="font-bold text-slate-700">{customer.registrationId}</span>
                </p>
              )}
              {customerPhone && (
                <p className="font-semibold text-slate-600">
                  Phone: <span className="font-bold text-slate-700">{customerPhone}</span>
                </p>
              )}
              {customer?.email && (
                <p className="font-semibold text-slate-600 break-all">
                  Email: <span className="font-bold text-slate-700">{customer.email}</span>
                </p>
              )}
              {customer?.gstin && (
                <p className="font-semibold text-slate-600">
                  GSTIN: <span className="font-mono font-bold text-slate-700">{customer.gstin}</span>
                </p>
              )}
            </div>

            {/* SHIP TO */}
            <div className="border-r border-slate-200 pr-4 space-y-1.5">
              <h3 className="font-black text-black border-b border-slate-200 pb-1 uppercase tracking-wider">
                SHIP TO,
              </h3>
              <p className="text-xs font-black text-slate-800 uppercase">{customerName}</p>
              {customerAddress && (
                <p className="font-semibold text-slate-600 max-w-[200px] uppercase leading-relaxed">
                  {customerAddress}
                </p>
              )}
            </div>

            {/* TRANSACTION STATUS */}
            <div className="space-y-1.5">
              <h3 className="font-black text-black border-b border-slate-200 pb-1 uppercase tracking-wider">
                TRANSACTION DETAILS
              </h3>
              <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                <span>TRANSACTION STATUS:</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                  parseFloat(receipt.balanceDue) > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {parseFloat(receipt.balanceDue) > 0 ? "PARTIAL" : "PAID"}
                </span>
              </div>
              <p className="font-semibold text-slate-600">
                PAYMENT MODE: <span className="font-extrabold text-slate-800 uppercase">{receipt.paymentMethod.replace("_", " ")} PAYMENT</span>
              </p>
              {receipt.transactionId && (
                <p className="font-semibold text-slate-600 break-all">
                  TXN ID: <span className="font-extrabold text-slate-800">{receipt.transactionId}</span>
                </p>
              )}
              {invoice?.estimatedDelivery && (
                <p className="font-semibold text-slate-600">
                  EST. DELIVERY: <span className="font-extrabold text-slate-800">{formatDateDMY(invoice.estimatedDelivery)}</span>
                </p>
              )}
            </div>
          </div>

          {/* OPTICAL PRESCRIPTION BLOCK (Controlled by customization toggle, default ON) */}
          {showPrescriptionOnBooking && hasPrescription && (
            <div className="space-y-1.5 border border-slate-300 rounded-lg p-2.5 bg-slate-50/30">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-black uppercase tracking-wider text-[9.5px]">
                    OPTICAL PRESCRIPTION (RX DETAILS)
                  </h3>
                  {rxCategory && (
                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-50 text-[#0a52c3] border border-blue-200">
                      {rxCategory}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[8.5px] font-bold text-slate-600">
                  {rxDoctorName && (
                    <span>DOCTOR/OPTOM: <span className="text-black font-extrabold">{rxDoctorName}</span></span>
                  )}
                  {rxNumber && (
                    <span>RX NO: <span className="text-black font-extrabold">{rxNumber}</span></span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse border border-slate-300 text-[8.5px] leading-tight bg-white">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-extrabold uppercase text-[8px]">
                      <th className="border-r border-slate-300 py-1 px-1.5 w-[14%] text-left">TYPE / EYE</th>
                      <th className="border-r border-slate-300 py-1 px-1 w-[12%]">SPH</th>
                      <th className="border-r border-slate-300 py-1 px-1 w-[12%]">CYL</th>
                      <th className="border-r border-slate-300 py-1 px-1 w-[10%]">AXIS</th>
                      <th className="border-r border-slate-300 py-1 px-1 w-[12%]">ADD</th>
                      <th className="border-r border-slate-300 py-1 px-1 w-[12%]">V/N</th>
                      <th className="border-r border-slate-300 py-1 px-1 w-[12%]">CADD</th>
                      <th className="py-1 px-1 w-[16%]">P.D. (MM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[8.5px] font-bold">
                    {/* DISTANCE RX */}
                    {hasDistanceRx && (
                      <>
                        <tr className="border-b border-slate-200">
                          <td className="border-r border-slate-300 py-1 px-1.5 text-left font-black text-slate-900 bg-slate-50/50">
                            DIST (RE / OD)
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {formatRxPower(distRx?.rightSphere)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {formatRxPower(distRx?.rightCylinder)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {distRx?.rightAxis ? `${distRx.rightAxis}°` : "-"}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-[#0a52c3] font-black">
                            {formatRxPower(distRx?.rightAdd)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-700">
                            {distRx?.rightNv || "-"}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-700">
                            {distRx?.caddRight || "-"}
                          </td>
                          <td className="py-1 px-1 text-slate-700 font-semibold">
                            {distRx?.pdRight ? `R: ${distRx.pdRight}mm` : (distRx?.pd ? `${distRx.pd}mm` : "-")}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="border-r border-slate-300 py-1 px-1.5 text-left font-black text-slate-900 bg-slate-50/50">
                            DIST (LE / OS)
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {formatRxPower(distRx?.leftSphere)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {formatRxPower(distRx?.leftCylinder)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {distRx?.leftAxis ? `${distRx.leftAxis}°` : "-"}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-[#0a52c3] font-black">
                            {formatRxPower(distRx?.leftAdd)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-700">
                            {distRx?.leftNv || "-"}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-700">
                            {distRx?.caddLeft || "-"}
                          </td>
                          <td className="py-1 px-1 text-slate-700 font-semibold">
                            {distRx?.pdLeft ? `L: ${distRx.pdLeft}mm` : (distRx?.pd ? `${distRx.pd}mm` : "-")}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* NEAR RX */}
                    {hasNearRx && (
                      <>
                        <tr className="border-b border-slate-200 bg-blue-50/20">
                          <td className="border-r border-slate-300 py-1 px-1.5 text-left font-black text-slate-900 bg-slate-50/50">
                            NEAR (RE / OD)
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {formatRxPower(nearRx?.rightSphere)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {formatRxPower(nearRx?.rightCylinder)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {nearRx?.rightAxis ? `${nearRx.rightAxis}°` : "-"}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-[#0a52c3] font-black">
                            {formatRxPower(nearRx?.rightAdd)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-700">
                            {nearRx?.rightNv || "-"}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-700">
                            {nearRx?.caddRight || "-"}
                          </td>
                          <td className="py-1 px-1 text-slate-700 font-semibold">
                            {nearRx?.pdRight ? `R: ${nearRx.pdRight}mm` : "-"}
                          </td>
                        </tr>
                        <tr className="bg-blue-50/20">
                          <td className="border-r border-slate-300 py-1 px-1.5 text-left font-black text-slate-900 bg-slate-50/50">
                            NEAR (LE / OS)
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {formatRxPower(nearRx?.leftSphere)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {formatRxPower(nearRx?.leftCylinder)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-800 font-extrabold">
                            {nearRx?.leftAxis ? `${nearRx.leftAxis}°` : "-"}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-[#0a52c3] font-black">
                            {formatRxPower(nearRx?.leftAdd)}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-700">
                            {nearRx?.leftNv || "-"}
                          </td>
                          <td className="border-r border-slate-300 py-1 px-1 text-slate-700">
                            {nearRx?.caddLeft || "-"}
                          </td>
                          <td className="py-1 px-1 text-slate-700 font-semibold">
                            {nearRx?.pdLeft ? `L: ${nearRx.pdLeft}mm` : "-"}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Optional Lens Type / Frame / Notes row if present */}
              {(distRx?.lensType || distRx?.frameName || distRx?.notes || distRx?.specialInstructions) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[8px] font-semibold text-slate-600 pt-0.5">
                  {distRx.lensType && (
                    <span>LENS TYPE: <span className="font-extrabold text-slate-800">{distRx.lensType}</span></span>
                  )}
                  {distRx.frameName && (
                    <span>FRAME: <span className="font-extrabold text-slate-800">{distRx.frameName}</span></span>
                  )}
                  {distRx.notes && (
                    <span>NOTES: <span className="font-extrabold text-slate-800">{distRx.notes}</span></span>
                  )}
                  {distRx.specialInstructions && (
                    <span>INSTRUCTIONS: <span className="font-extrabold text-slate-800">{distRx.specialInstructions}</span></span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* LINE ITEMS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-[8.5px] leading-tight">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-center font-bold text-slate-700 uppercase">
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[4%]">SR. NO.</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[20%]">ORDER DETAILS</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[28%]">PRODUCT DESCRIPTION</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[6%]">QTY</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[8%]">RATE/PCS</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[8%]">SUB TOTAL</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[8%]">DISCOUNT</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[6%]">ADDITIONAL AMOUNT</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[8%]">TAXABLE VALUE</th>
                  <th className="border-r border-slate-300 py-1.5 px-0.5 w-[5%]">SGST %</th>
                  <th className="border-r border-slate-300 py-1.5 px-0.5 w-[5%]">CGST %</th>
                  <th className="border-r border-slate-300 py-1.5 px-0.5 w-[5%]">IGST %</th>
                  <th className="border-r border-slate-300 py-1.5 px-1 w-[8%]">GST</th>
                  <th className="py-1.5 px-1 w-[10%]">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => {
                  const taxableValue = parseFloat(item.subtotal) - parseFloat(item.discountAmount);
                  const gstAmount = parseFloat(item.cgstAmount) + parseFloat(item.sgstAmount) + parseFloat(item.igstAmount);
                  const totalAmount = taxableValue + gstAmount;

                  return (
                    <tr key={item.id} className="border-b border-slate-200 text-slate-800">
                      {/* SR. NO. */}
                      <td className="border-r border-slate-200 py-2 text-center font-bold">
                        {idx + 1}
                      </td>

                      {/* ORDER DETAILS */}
                      <td className="border-r border-slate-200 py-2 px-1.5 font-semibold uppercase leading-normal">
                        <div className="font-bold text-slate-800 break-all">
                          {item.sku || "N/A"}
                        </div>
                        <div className="text-[7.5px] text-slate-500">
                          {formattedDate}
                        </div>
                        {item.brand && (
                          <div className="text-[7.5px] text-slate-500 font-bold break-all">
                            {item.brand}
                          </div>
                        )}
                      </td>

                      {/* PRODUCT DESCRIPTION */}
                      <td className="border-r border-slate-200 py-2 px-1.5 font-semibold leading-normal">
                        <div className="font-extrabold text-slate-800 uppercase break-all">
                          {item.description}
                        </div>

                        {item.hsnCode && (
                          <div className="text-[7px] leading-none font-bold text-slate-600 mt-0.5 inline-flex items-center gap-0.5 tracking-tight">
                            <span className="text-[6.5px] uppercase font-bold text-slate-400">HSN:</span>
                            <span className="font-mono font-bold text-slate-800">{item.hsnCode}</span>
                          </div>
                        )}
                      </td>

                      {/* QTY */}
                      <td className="border-r border-slate-200 py-2 text-center font-bold text-slate-700">
                        {item.quantity} pcs
                      </td>

                      {/* RATE/PCS */}
                      <td className="border-r border-slate-200 py-2 px-1 text-right font-semibold">
                        {parseFloat(item.unitPrice).toFixed(2)}
                      </td>

                      {/* SUB TOTAL */}
                      <td className="border-r border-slate-200 py-2 px-1 text-right font-bold">
                        {parseFloat(item.subtotal).toFixed(2)}
                      </td>

                      {/* DISCOUNT */}
                      <td className="border-r border-slate-200 py-2 px-1 text-right font-semibold text-rose-600">
                        {parseFloat(item.discountAmount) > 0 ? parseFloat(item.discountAmount).toFixed(2) : "0.00"}
                      </td>

                      {/* ADDITIONAL AMOUNT */}
                      <td className="border-r border-slate-200 py-2 px-1 text-right font-semibold text-slate-400">
                        0.00
                      </td>

                      {/* TAXABLE VALUE */}
                      <td className="border-r border-slate-200 py-2 px-1 text-right font-bold text-slate-800">
                        {taxableValue.toFixed(2)}
                      </td>

                      {/* SGST % */}
                      <td className="border-r border-slate-200 py-2 text-center font-semibold text-slate-500">
                        {parseFloat(item.sgstPercent) > 0 ? `${parseFloat(item.sgstPercent)}%` : "-"}
                      </td>

                      {/* CGST % */}
                      <td className="border-r border-slate-200 py-2 text-center font-semibold text-slate-500">
                        {parseFloat(item.cgstPercent) > 0 ? `${parseFloat(item.cgstPercent)}%` : "-"}
                      </td>

                      {/* IGST % */}
                      <td className="border-r border-slate-200 py-2 text-center font-semibold text-slate-500">
                        {parseFloat(item.igstPercent) > 0 ? `${parseFloat(item.igstPercent)}%` : "-"}
                      </td>

                      {/* GST */}
                      <td className="border-r border-slate-200 py-2 px-1 text-right font-semibold text-slate-700">
                        {gstAmount > 0 ? gstAmount.toFixed(2) : "0.00"}
                      </td>

                      {/* AMOUNT */}
                      <td className="py-2 px-1 text-right font-black text-slate-900">
                        {totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {/* TABLE TOTALS FOOTER */}
                <tr className="bg-slate-50 font-black text-slate-800 text-center uppercase border-t border-slate-300">
                  <td className="border-r border-slate-300 py-2" colSpan={2}>
                    Line Total
                  </td>
                  <td className="border-r border-slate-300 py-2"></td>
                  <td className="border-r border-slate-300 py-2 text-center">{totalQty}</td>
                  <td className="border-r border-slate-300 py-2"></td>
                  <td className="border-r border-slate-300 py-2 px-1 text-right">{subTotalSum.toFixed(2)}</td>
                  <td className="border-r border-slate-300 py-2 px-1 text-right text-rose-600">{discountSum.toFixed(2)}</td>
                  <td className="border-r border-slate-300 py-2 px-1 text-right">0.00</td>
                  <td className="border-r border-slate-300 py-2 px-1 text-right">{taxableValSum.toFixed(2)}</td>
                  <td className="border-r border-slate-300 py-2" colSpan={3}></td>
                  <td className="border-r border-slate-300 py-2 px-1 text-right">{totalGstSum.toFixed(2)}</td>
                  <td className="py-2 px-1 text-right text-black">{netTotalSum.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BOTTOM SECTION */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mt-4">
            {/* Note and disclaimer */}
            <div className="flex-1 space-y-4 max-w-[360px]">
              {parseFloat(receipt.balanceDue) > 0 ? (
                <p className="font-semibold text-slate-600 leading-relaxed italic">
                  &quot;Please keep this Order Form for future reference until the total outstanding balance of{" "}
                  <span className="font-black text-rose-600">{formatCurrency(receipt.balanceDue)}</span> is cleared.
                  Full delivery of prescription eyewear will occur upon final settlement.&quot;
                </p>
              ) : (
                <p className="font-semibold text-slate-600 leading-relaxed italic">
                  &quot;Thank you for completing your payment transaction. Your account has been cleared in full.&quot;
                </p>
              )}

              <p className="font-extrabold text-slate-800 uppercase tracking-wide">
                THANK YOU FOR CHOOSING {shopName}.
              </p>
            </div>

            {/* Receipt Math Summary */}
            <div className="w-full sm:w-[240px] space-y-2 text-[9.5px]">
              <div className="flex justify-between font-bold text-slate-600">
                <span>SUB TOTAL :</span>
                <span>₹{subTotalSum.toFixed(2)}</span>
              </div>
              {discountSum > 0 && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>DISCOUNT ({((discountSum / subTotalSum) * 100).toFixed(0)}%) :</span>
                  <span>-₹{discountSum.toFixed(2)}</span>
                </div>
              )}
              {parseFloat(invoice.creditApplied || "0") > 0 && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>STORE CREDIT APPLIED :</span>
                  <span>-₹{parseFloat(invoice.creditApplied).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-slate-900 border-b border-slate-200 pb-1.5">
                <span>NET TOTAL :</span>
                <span>₹{netTotalSum.toFixed(2)}</span>
              </div>

              {/* Amount Paid block */}
              <div className="flex justify-between items-center bg-slate-100 py-1.5 px-3 rounded font-black text-slate-800 text-[10px]">
                <span>AMOUNT PAID TODAY</span>
                <span className="text-slate-900">₹{parseFloat(receipt.amountPaid).toFixed(2)}</span>
              </div>

              {/* Remaining Balance block */}
              <div className="flex justify-between items-center border border-rose-200/60 bg-rose-50/20 py-1.5 px-3 rounded font-black text-rose-600 text-[10px]">
                <span>REMAINING BALANCE</span>
                <span className="font-black">₹{parseFloat(receipt.balanceDue).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Divider dotted line */}
          <div className="border-b border-slate-200 border-dashed w-full pt-4" />

          {/* SIGNATURE SECTION */}
          <div className="flex justify-end pt-8">
            <div className="text-center w-[200px] space-y-1">
              <div className="border-b border-slate-800 w-full mb-1" />
              <h4 className="font-black text-slate-900 uppercase">AUTHORITY SIGNATURE</h4>
              <p className="font-semibold text-slate-500">For {shopName}</p>
            </div>
          </div>
        </div>
      </div>
    </>
    );
  }
}
