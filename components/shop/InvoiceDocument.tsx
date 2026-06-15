import React from "react";
import type { DocumentData } from "@/services/document.service";
import { getShopBusinessDetails, getCustomerTaxDetails } from "@/lib/document-config";
import {
  convertNumberToWords,
  formatDateDMY,
  formatDateDMonthY,
  formatPrescriptionVal,
  formatDecimal,
  formatReceiptDate,
  formatReceiptTime,
} from "@/lib/invoice-helpers";
import { formatCurrency } from "@/lib/utils";

interface InvoiceDocumentProps {
  data: DocumentData;
  mode: "INVOICE" | "RECEIPT";
}

export function InvoiceDocument({ data, mode }: InvoiceDocumentProps) {
  const { invoice, shop, customer, lineItems, prescriptions, receipt } = data;

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
  const customerAddress =
    customer?.address ||
    "1ST FLOOR, SHOP NO.20/FF AND 21/FF, VIVEKANAND MINI MARKET, HILL CART ROAD, SILIGURI, West Bengal, 734001";

  if (mode === "INVOICE") {
    // -------------------------------------------------------------
    // INVOICE MODE CALCULATIONS
    // -------------------------------------------------------------
    const distancePrescription = prescriptions.find(
      (p) => p.prescriptionType === "DISTANCE"
    );
    const nearPrescription = prescriptions.find(
      (p) => p.prescriptionType === "NEAR"
    );

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

    // Group items by GST rate slabs for tax summary table
    const taxSummarySlabs: {
      [slabRate: string]: {
        particularsName: string;
        gstPercent: number;
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        total: number;
      };
    } = {};

    lineItems.forEach((item) => {
      const cgstPercent = parseFloat(item.cgstPercent) || 0;
      const sgstPercent = parseFloat(item.sgstPercent) || 0;
      const igstPercent = parseFloat(item.igstPercent) || 0;
      const totalPercent = cgstPercent + sgstPercent + igstPercent;

      if (totalPercent === 0) return;

      const key = totalPercent.toFixed(2);
      const subtotal = parseFloat(item.subtotal) || 0;
      const discount = parseFloat(item.discountAmount) || 0;
      const taxable = subtotal - discount;

      const cgst = parseFloat(item.cgstAmount) || 0;
      const sgst = parseFloat(item.sgstAmount) || 0;
      const igst = parseFloat(item.igstAmount) || 0;
      const totalTax = cgst + sgst + igst;

      let particularsName = "Ophthalmic Lens";
      if (item.category === "FRAME") particularsName = "Spectacle Frame";
      else if (item.category === "CONTACT_LENS") particularsName = "Contact Lens";
      else if (item.category === "SOLUTION") particularsName = "Contact Lens Solution";
      else if (item.category === "ACCESSORY") particularsName = "Spectacle Accessory";

      if (taxSummarySlabs[key]) {
        taxSummarySlabs[key].taxableValue += taxable;
        taxSummarySlabs[key].cgst += cgst;
        taxSummarySlabs[key].sgst += sgst;
        taxSummarySlabs[key].igst += igst;
        taxSummarySlabs[key].total += totalTax;
      } else {
        taxSummarySlabs[key] = {
          particularsName,
          gstPercent: totalPercent,
          taxableValue: taxable,
          cgst,
          sgst,
          igst,
          total: totalTax,
        };
      }
    });

    const taxSummaryRows = Object.values(taxSummarySlabs);
    const invoiceRefId = `${customer?.registrationId || "AXIS-KOL"} | ${invoice.invoiceNumber}`;
    let lensItemCount = 0;

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
                  page-break-after: always;
                  break-after: page;
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

        {/* Pages Holder */}
        <div id="invoice-print-area" className="flex flex-col gap-8 print:gap-0">
          {/* ================= PAGE 1 ================= */}
          <div className="w-[210mm] h-[297mm] bg-white border border-slate-200 shadow-xl p-[12mm] flex flex-col justify-between print:border-none print:shadow-none print:p-[12mm] print-page">
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
                      <div>Address</div>
                      <div>:</div>
                      <div className="whitespace-pre-line leading-tight">{shopAddress}</div>

                      <div>GSTIN</div>
                      <div>:</div>
                      <div>{shopGstin}</div>

                      <div>CIN</div>
                      <div>:</div>
                      <div>{shopCin}</div>

                      <div>MSME No.</div>
                      <div>:</div>
                      <div>{shopMsme}</div>

                      <div>Phone</div>
                      <div>:</div>
                      <div>{shopPhone}</div>
                    </div>
                  </div>
                </div>

                {/* Invoice Title */}
                <div className="text-right">
                  <h2 className="text-2xl font-black text-black tracking-wide leading-none">
                    TAX INVOICE
                  </h2>
                  <p className="text-[11px] font-bold text-black mt-1.5 uppercase">
                    Tax Invoice # - {invoice.invoiceNumber}
                  </p>
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
                  <span className="text-slate-700 leading-normal line-clamp-3">{customerAddress}</span>
                  {customerPhone && <span>Phone: {customerPhone}</span>}
                  <div className="mt-1 flex flex-col gap-0.5">
                    <span>State : {patientState}</span>
                    <span>PAN No: {patientPan}</span>
                    <span>GSTIN: {patientGstin}</span>
                  </div>
                </div>

                {/* Ship To */}
                <div className="border-r border-black p-2 flex flex-col gap-0.5">
                  <span className="text-black font-bold uppercase border-b border-black pb-0.5 mb-1 block">
                    Ship To,
                  </span>
                  <span className="text-black font-bold uppercase">{customerName}</span>
                  <span className="text-slate-700 leading-normal line-clamp-3">{customerAddress}</span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <span>State : {patientState}</span>
                    <span>Place of supply (State Code): SILIGURI, {patientState} ({customerTax.stateCode || "19"})</span>
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
                  </div>
                </div>
              </div>

              {/* Items Ledger Table */}
              <div className="mt-3">
                <table className="w-full text-[10px] text-black border-collapse border border-black font-semibold leading-tight">
                  <thead>
                    <tr className="border-b border-black bg-slate-50 font-bold text-[9px] uppercase">
                      <th className="border-r border-black px-1 py-1 text-center w-[4%]">Sr. No.</th>
                      <th className="border-r border-black px-1.5 py-1 text-left w-[14%]">Order Details</th>
                      <th className="border-r border-black px-2 py-1 text-left w-[26%]">Product Description</th>
                      <th className="border-r border-black px-1 py-1 text-center w-[6%]">Qty</th>
                      <th className="border-r border-black px-1.5 py-1 text-right w-[8%]">Rate/<br />Pcs</th>
                      <th className="border-r border-black px-1.5 py-1 text-right w-[8%]">Sub Total</th>
                      <th className="border-r border-black px-1.5 py-1 text-right w-[7%]">Discount</th>
                      <th className="border-r border-black px-1.5 py-1 text-right w-[7%]">Additional Amount</th>
                      <th className="border-r border-black px-1.5 py-1 text-right w-[8%]">Taxable value</th>
                      <th className="border-r border-black px-1 py-1 text-center w-[5%]">SGST %</th>
                      <th className="border-r border-black px-1 py-1 text-center w-[5%]">CGST %</th>
                      <th className="border-r border-black px-1 py-1 text-center w-[5%]">IGST %</th>
                      <th className="border-r border-black px-1.5 py-1 text-right w-[7%]">GST</th>
                      <th className="px-1.5 py-1 text-right w-[9%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const cgstPercent = parseFloat(item.cgstPercent) || 0;
                      const sgstPercent = parseFloat(item.sgstPercent) || 0;
                      const igstPercent = parseFloat(item.igstPercent) || 0;

                      const cgst = parseFloat(item.cgstAmount) || 0;
                      const sgst = parseFloat(item.sgstAmount) || 0;
                      const igst = parseFloat(item.igstAmount) || 0;
                      const rowGst = cgst + sgst + igst;

                      const subtotal = parseFloat(item.subtotal) || 0;
                      const discount = parseFloat(item.discountAmount) || 0;
                      const taxable = subtotal - discount;
                      const totalAmount = taxable + rowGst;

                      // Match prescription RE/LE details dynamically for Lens categories
                      let rowPrescription = null;
                      if (item.category === "LENS" || item.description.toUpperCase().includes("LENS")) {
                        lensItemCount++;
                        if (lensItemCount === 1) {
                          rowPrescription = distancePrescription || nearPrescription || null;
                        } else if (lensItemCount === 2) {
                          rowPrescription = nearPrescription || distancePrescription || null;
                        }
                      }

                      return (
                        <tr key={item.id} className="border-b border-black align-top hover:bg-slate-50/10">
                          {/* Sr No */}
                          <td className="border-r border-black px-1 py-1.5 text-center font-bold">
                            {idx + 1}
                          </td>

                          {/* Order Details */}
                          <td className="border-r border-black px-1.5 py-1.5 whitespace-pre-line text-[9px] leading-relaxed">
                            <div>{item.sku || "01260008416"}</div>
                            <div>{formatDateDMY(rowPrescription?.createdAt || invoice.createdAt)}</div>
                            <div className="font-bold">{item.brand || "smart view"}</div>
                          </td>

                          {/* Product Description */}
                          <td className="border-r border-black px-2 py-1.5 text-[9px] leading-relaxed">
                            <div className="font-bold text-black uppercase">{item.description}</div>
                            {rowPrescription && (
                              <div className="text-[8px] font-bold text-slate-600 mt-1 leading-normal uppercase">
                                <div>
                                  RE: {formatPrescriptionVal(rowPrescription.rightSphere)} {formatPrescriptionVal(rowPrescription.rightCylinder)}
                                  {rowPrescription.rightAxis ? ` x ${rowPrescription.rightAxis}` : ""}
                                  {rowPrescription.rightAdd ? ` Add ${formatPrescriptionVal(rowPrescription.rightAdd)}` : ""}
                                </div>
                                <div>
                                  LE: {formatPrescriptionVal(rowPrescription.leftSphere)} {formatPrescriptionVal(rowPrescription.leftCylinder)}
                                  {rowPrescription.leftAxis ? ` x ${rowPrescription.leftAxis}` : ""}
                                  {rowPrescription.leftAdd ? ` Add ${formatPrescriptionVal(rowPrescription.leftAdd)}` : ""}
                                </div>
                              </div>
                            )}
                            <div className="text-[8px] font-bold text-black mt-0.5">
                              HSN: {item.hsnCode || "90015000"}
                            </div>
                          </td>

                          {/* Qty */}
                          <td className="border-r border-black px-1 py-1.5 text-center">
                            {item.quantity} pcs
                          </td>

                          {/* Rate/Pcs */}
                          <td className="border-r border-black px-1.5 py-1.5 text-right font-medium">
                            {formatDecimal(item.unitPrice)}
                          </td>

                          {/* Sub Total */}
                          <td className="border-r border-black px-1.5 py-1.5 text-right font-medium">
                            {formatDecimal(item.subtotal)}
                          </td>

                          {/* Discount */}
                          <td className="border-r border-black px-1.5 py-1.5 text-right font-medium">
                            {formatDecimal(item.discountAmount)}
                          </td>

                          {/* Additional Amount */}
                          <td className="border-r border-black px-1.5 py-1.5 text-right font-medium">
                            0.00
                          </td>

                          {/* Taxable value */}
                          <td className="border-r border-black px-1.5 py-1.5 text-right font-bold">
                            {formatDecimal(taxable)}
                          </td>

                          {/* SGST % */}
                          <td className="border-r border-black px-1 py-1.5 text-center">
                            {sgstPercent > 0 ? `${sgstPercent.toFixed(2)} %` : ""}
                          </td>

                          {/* CGST % */}
                          <td className="border-r border-black px-1 py-1.5 text-center">
                            {cgstPercent > 0 ? `${cgstPercent.toFixed(2)} %` : ""}
                          </td>

                          {/* IGST % */}
                          <td className="border-r border-black px-1 py-1.5 text-center">
                            {igstPercent > 0 ? `${igstPercent.toFixed(2)} %` : ""}
                          </td>

                          {/* GST Amount */}
                          <td className="border-r border-black px-1.5 py-1.5 text-right font-medium">
                            {formatDecimal(rowGst)}
                          </td>

                          {/* Amount */}
                          <td className="px-1.5 py-1.5 text-right font-black">
                            {formatDecimal(totalAmount)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Summary Totals Row */}
                    <tr className="border-b border-black font-black bg-slate-50 text-[9px]">
                      <td className="border-r border-black px-1 py-1.5 text-center"></td>
                      <td className="border-r border-black px-1.5 py-1.5" colSpan={2}>
                        Line Total
                      </td>
                      <td className="border-r border-black px-1 py-1.5 text-center">
                        {totals.qty}
                      </td>
                      <td className="border-r border-black px-1.5 py-1.5"></td>
                      <td className="border-r border-black px-1.5 py-1.5 text-right">
                        {formatDecimal(totals.subtotal)}
                      </td>
                      <td className="border-r border-black px-1.5 py-1.5 text-right">
                        {formatDecimal(totals.discount)}
                      </td>
                      <td className="border-r border-black px-1.5 py-1.5 text-right">0.00</td>
                      <td className="border-r border-black px-1.5 py-1.5 text-right">
                        {formatDecimal(totals.taxable)}
                      </td>
                      <td className="border-r border-black px-1.5 py-1.5" colSpan={3}></td>
                      <td className="border-r border-black px-1.5 py-1.5 text-right">
                        {formatDecimal(totals.gst)}
                      </td>
                      <td className="px-1.5 py-1.5 text-right">
                        {formatDecimal(totals.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Calculations & Tax Summary */}
              <div className="grid grid-cols-[1.3fr_1fr] gap-4 mt-3">
                {/* Left Column: Words, Tax Slab summary, bank details */}
                <div className="flex flex-col gap-3 font-semibold text-[10px]">
                  {/* Amount in words */}
                  <div>
                    <span className="text-black font-bold">Amount in words: </span>
                    <span className="text-black font-black italic">
                      {convertNumberToWords(databaseTotal)}
                    </span>
                  </div>

                  {/* Tax summary table */}
                  <div className="border border-black">
                    <div className="bg-slate-50 border-b border-black p-1 text-[9px] font-bold uppercase">
                      Tax Summary
                    </div>
                    <table className="w-full text-[9px] text-black border-collapse">
                      <thead>
                        <tr className="border-b border-black text-center font-bold bg-slate-50">
                          <th className="border-r border-black px-1.5 py-1 text-left">Particular Name</th>
                          <th className="border-r border-black px-1.5 py-1">GST %</th>
                          <th className="border-r border-black px-1.5 py-1 text-right">Taxable Value</th>
                          <th className="border-r border-black px-1.5 py-1 text-right">CGST</th>
                          <th className="border-r border-black px-1.5 py-1 text-right">SGST</th>
                          <th className="border-r border-black px-1.5 py-1 text-right">IGST</th>
                          <th className="px-1.5 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxSummaryRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-black text-center">
                            <td className="border-r border-black px-1.5 py-1 text-left">{row.particularsName}</td>
                            <td className="border-r border-black px-1.5 py-1">{row.gstPercent.toFixed(2)}</td>
                            <td className="border-r border-black px-1.5 py-1 text-right">{formatDecimal(row.taxableValue)}</td>
                            <td className="border-r border-black px-1.5 py-1 text-right">{formatDecimal(row.cgst)}</td>
                            <td className="border-r border-black px-1.5 py-1 text-right">{formatDecimal(row.sgst)}</td>
                            <td className="border-r border-black px-1.5 py-1 text-right">{formatDecimal(row.igst)}</td>
                            <td className="px-1.5 py-1 text-right font-bold">{formatDecimal(row.total)}</td>
                          </tr>
                        ))}
                        {/* Total row */}
                        <tr className="font-bold bg-slate-50 text-center">
                          <td className="border-r border-black px-1.5 py-1 text-left">Total</td>
                          <td className="border-r border-black px-1.5 py-1"></td>
                          <td className="border-r border-black px-1.5 py-1 text-right">{formatDecimal(totals.taxable)}</td>
                          <td className="border-r border-black px-1.5 py-1 text-right">
                            {formatDecimal(
                              lineItems.reduce((s, i) => s + (parseFloat(i.cgstAmount) || 0), 0)
                            )}
                          </td>
                          <td className="border-r border-black px-1.5 py-1 text-right">
                            {formatDecimal(
                              lineItems.reduce((s, i) => s + (parseFloat(i.sgstAmount) || 0), 0)
                            )}
                          </td>
                          <td className="border-r border-black px-1.5 py-1 text-right">
                            {formatDecimal(
                              lineItems.reduce((s, i) => s + (parseFloat(i.igstAmount) || 0), 0)
                            )}
                          </td>
                          <td className="px-1.5 py-1 text-right">{formatDecimal(totals.gst)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Bank Account Details */}
                  <div className="border border-black p-2 flex flex-col gap-0.5">
                    <span className="font-bold border-b border-black pb-0.5 mb-1 block uppercase">
                      Bank Account Details:
                    </span>
                    <div className="grid grid-cols-[80px_1fr] gap-y-0.5">
                      <div>Bank Name</div>
                      <div>: {shopDetails.bankName}</div>

                      <div>Account No.</div>
                      <div className="font-bold">: {shopDetails.bankAccountNumber}</div>

                      <div>IFS Code</div>
                      <div className="font-bold">: {shopDetails.bankIfsc}</div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Ledger calculations */}
                <div className="flex flex-col gap-1 text-[10px] font-bold pl-8">
                  <div className="grid grid-cols-[120px_10px_1fr] text-black">
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
                  </div>
                </div>
              </div>
            </div>

            {/* Footer of Page 1 */}
            <div className="border-t border-black pt-1 flex justify-between text-[9px] font-bold text-black mt-2">
              <div>{invoiceRefId}</div>
              <div>Page 1 of 2</div>
            </div>
          </div>

          {/* ================= PAGE 2 ================= */}
          <div className="w-[210mm] h-[297mm] bg-white border border-slate-200 shadow-xl p-[12mm] flex flex-col justify-between print:border-none print:shadow-none print:p-[12mm] print-page">
            <div className="flex-1 flex flex-col">
              {/* Header Block (Branding Duplicate) */}
              <div className="flex justify-between items-start border-b border-black pb-2.5">
                <div className="flex gap-3">
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
                  <div>
                    <h1 className="text-sm font-black text-black leading-tight tracking-tight uppercase">
                      {shopName}
                    </h1>
                    <div className="grid grid-cols-[60px_8px_1fr] gap-y-0.5 text-[10px] text-black font-semibold mt-1">
                      <div>Address</div>
                      <div>:</div>
                      <div className="whitespace-pre-line leading-tight">{shopAddress}</div>

                      <div>GSTIN</div>
                      <div>:</div>
                      <div>{shopGstin}</div>

                      <div>CIN</div>
                      <div>:</div>
                      <div>{shopCin}</div>

                      <div>MSME No.</div>
                      <div>:</div>
                      <div>{shopMsme}</div>

                      <div>Phone</div>
                      <div>:</div>
                      <div>{shopPhone}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-black tracking-wide leading-none">
                    TAX INVOICE
                  </h2>
                  <p className="text-[11px] font-bold text-black mt-1.5 uppercase">
                    Tax Invoice # - {invoice.invoiceNumber}
                  </p>
                </div>
              </div>

              {/* Terms and conditions */}
              <div className="mt-4 font-semibold text-[10px] text-black">
                <h3 className="text-[11px] font-black border-b border-black pb-0.5 mb-2 uppercase">
                  Terms and conditions:
                </h3>
                <ol className="list-none pl-0 space-y-1.5 text-justify leading-relaxed">
                  <li>
                    <span className="font-bold">1. Payment Terms:</span> All payments must be made within 30 days from the date of the invoice. Late payments may attract a penalty of 1.5% per month on the outstanding balance.
                  </li>
                  <li>
                    <span className="font-bold">2. Taxes:</span> All applicable taxes, including but not limited to Goods and Services Tax (GST) or Value Added Tax (VAT), are included as per government regulations. Any changes in tax rates or additional levies introduced by law after the invoice date will be applicable and payable by the customer.
                  </li>
                  <li>
                    <span className="font-bold">3. Delivery and Risk:</span> Goods delivered are considered accepted unless objections are raised within 24 Hours of delivery. Risk of loss or damage to goods passes to the buyer upon delivery.
                  </li>
                  <li>
                    <span className="font-bold">4. Rounding Off:</span> Invoice totals may be rounded off to the nearest currency unit as per standard accounting practices.
                  </li>
                  <li>
                    <span className="font-bold">5. Returns and Refunds:</span> Any returns must be initiated within 14 days of delivery, subject to approval and as per our return policy. Refunds will be processed within 10 business days for eligible returns unless it is deliberately tempered.
                  </li>
                  <li>
                    <span className="font-bold">6. Modification of Terms:</span> These terms are subject to change without prior notice and as per regulatory or business requirements.
                  </li>
                  <li>
                    <span className="font-bold">7. Liability:</span> Clarity Eyecare Pvt. Ltd. Navi Mumbai is not liable for any indirect, incidental, or consequential damages arising from the use of the products or services provided.
                  </li>
                  <li>
                    <span className="font-bold">8. Disputes:</span> Any disputes arising out of this invoice must be reported within 180 days of receipt. All disputes will be governed by the laws of Turbhe.
                  </li>
                  <li>
                    <span className="font-bold">9. Ownership of Goods:</span> Ownership of goods remains with Clarity Eyecare Pvt. Ltd. Navi Mumbai until full payment is received.
                  </li>
                  <li>
                    <span className="font-bold">10. Contact Information:</span> For inquiries or clarifications regarding this invoice, please contact us at: Clarity Eyecare Pvt. Ltd. Navi Mumbai, Clarity Eyecare Pvt. Ltd., D 25/8, MIDC Turbhe, 9137012156, info@clarityeyecare.in.
                  </li>
                </ol>
              </div>

              {/* Signature Area */}
              <div className="mt-20 self-end mr-4 text-center font-semibold text-[10px] text-black">
                <div>For {shopName}</div>
                <div className="h-16" />
                <div className="border-t border-black pt-1 w-48 font-bold">
                  Authority Signature
                </div>
              </div>
            </div>

            {/* Footer of Page 2 */}
            <div className="border-t border-black pt-1 flex justify-between text-[9px] font-bold text-black mt-2">
              <div>{invoiceRefId}</div>
              <div>Page 2 of 2</div>
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

    const formattedDate = formatReceiptDate(receipt.createdAt);
    const formattedTime = formatReceiptTime(receipt.createdAt);

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

        {/* Receipt Paper Card Container */}
        <div className="print-container bg-white border border-slate-200 shadow-md rounded-xl p-8 max-w-[800px] w-full flex flex-col gap-6 text-[10px] leading-tight select-none">
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
                <p className="font-semibold text-slate-600 max-w-[320px] uppercase">
                  ADDRESS : {shopAddress}
                </p>
                <p className="font-semibold text-slate-600">
                  GSTIN : <span className="font-extrabold">{shopGstin}</span>
                </p>
                <p className="font-semibold text-slate-600">
                  CIN : <span className="font-extrabold">{shopCin}</span>
                </p>
                <p className="font-semibold text-slate-600">
                  PHONE : <span className="font-extrabold">{shopPhone}</span>
                </p>
              </div>
            </div>

            {/* Receipt Identification */}
            <div className="text-right space-y-1">
              <h2 className="text-base font-black tracking-wide text-black uppercase">
                PAYMENT RECEIPT
              </h2>
              <p className="font-bold text-slate-800">
                SLIP ID # - <span className="font-black text-black">{receipt.receiptNumber}</span>
              </p>
              <p className="font-bold text-slate-600">
                DATE: <span className="font-extrabold text-slate-800">{formattedDate}</span>
              </p>
              <p className="font-bold text-slate-600">
                TIME: <span className="font-extrabold text-slate-800">{formattedTime}</span>
              </p>
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
              <p className="font-semibold text-slate-600">
                Reg ID: <span className="font-bold text-slate-700">{customer?.registrationId || "N/A"}</span>
              </p>
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
            </div>

            {/* SHIP TO */}
            <div className="border-r border-slate-200 pr-4 space-y-1.5">
              <h3 className="font-black text-black border-b border-slate-200 pb-1 uppercase tracking-wider">
                SHIP TO,
              </h3>
              <p className="text-xs font-black text-slate-800 uppercase">{customerName}</p>
              <p className="font-semibold text-slate-600 max-w-[200px] uppercase leading-relaxed">
                {customer?.address || shopAddress}
              </p>
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
            </div>
          </div>

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

                        {/* Render Prescription details if Frame or Lens and has a prescription */}
                        {(item.category === "FRAME" || item.category === "LENS") && latestPrescription && (
                          <div className="text-[7.5px] text-slate-500 font-bold mt-1 space-y-0.5 border-t border-slate-100 pt-1">
                            <div className="flex justify-between">
                              <span>RE: {latestPrescription.rightSphere ? `SPH ${latestPrescription.rightSphere}` : ""} {latestPrescription.rightCylinder ? `CYL ${latestPrescription.rightCylinder}` : ""} {latestPrescription.rightAxis ? `AX ${latestPrescription.rightAxis}` : ""}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>LE: {latestPrescription.leftSphere ? `SPH ${latestPrescription.leftSphere}` : ""} {latestPrescription.leftCylinder ? `CYL ${latestPrescription.leftCylinder}` : ""} {latestPrescription.leftAxis ? `AX ${latestPrescription.leftAxis}` : ""}</span>
                            </div>
                          </div>
                        )}

                        {item.hsnCode && (
                          <div className="text-[7px] text-slate-400 mt-1 uppercase font-bold">
                            HSN: {item.hsnCode}
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
                  &quot;Please keep this slip for future reference until the total outstanding balance of{" "}
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
              <p className="font-semibold text-slate-500">Dr. Aris Thorne (Chief Optometrist)</p>
            </div>
          </div>
        </div>
      </>
    );
  }
}
