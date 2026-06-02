import { getCurrentUser } from "@/services/auth.service";
import { getInvoiceById } from "@/services/invoice.service";
import { getShopById } from "@/services/shop.service";
import { getCustomerById } from "@/services/customer.service";
import { getPrescriptionsByCustomer } from "@/services/prescription.service";
import { PrintInvoiceButton } from "./PrintInvoiceButton";
import { db } from "@/lib/drizzle";
import { invoiceItems, inventory } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Tax Invoice | Clarity Eyecare",
  description: "View and print clinical tax invoice details.",
};

// Indian Numbering System converter for tax invoice grand totals
function convertNumberToWords(num: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  const convertLessThanOneThousand = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return (
      a[hundred] +
      " Hundred" +
      (rest ? " " + convertLessThanOneThousand(rest) : "")
    );
  };

  const convert = (n: number): string => {
    if (n < 1000) return convertLessThanOneThousand(n);
    if (n < 100000) {
      const thousand = Math.floor(n / 1000);
      const rest = n % 1000;
      return (
        convertLessThanOneThousand(thousand) +
        " Thousand" +
        (rest ? " " + convertLessThanOneThousand(rest) : "")
      );
    }
    if (n < 10000000) {
      const lakh = Math.floor(n / 100000);
      const rest = n % 100000;
      return (
        convertLessThanOneThousand(lakh) +
        " Lakh" +
        (rest ? " " + convert(rest) : "")
      );
    }
    const crore = Math.floor(n / 10000000);
    const rest = n % 10000000;
    return (
      convertLessThanOneThousand(crore) +
      " Crore" +
      (rest ? " " + convert(rest) : "")
    );
  };

  const integerPart = Math.floor(num);
  const fractionalPart = Math.round((num - integerPart) * 100);

  let result = convert(integerPart) + " Rupees";
  if (fractionalPart > 0) {
    result += " and " + convertLessThanOneThousand(fractionalPart) + " Paise Only";
  } else {
    result += " Only";
  }
  return result;
}

function formatDateDMY(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

function formatDateDMonthY(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = d.getDate();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatPrescriptionVal(val: number | string | null | undefined) {
  if (val === null || val === undefined) return "0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

function formatDecimal(val: number | string | null | undefined) {
  if (val === null || val === undefined) return "0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(num) ? "0.00" : num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <h3 className="text-lg font-bold">Unauthorized access</h3>
        <p className="text-sm">Please log in to view this invoice.</p>
      </div>
    );
  }

  const invoice = await getInvoiceById(id, user.organizationId);

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <h3 className="text-lg font-bold">Invoice Not Found</h3>
        <p className="text-sm">We couldn't retrieve an invoice with the specified ID.</p>
      </div>
    );
  }

  // Load associated records
  const shop = await getShopById(invoice.shopId, user.organizationId);
  const customer = await getCustomerById(invoice.customerId, user.organizationId);

  // Join invoice items with inventory details
  const invoiceLineItems = await db
    .select({
      id: invoiceItems.id,
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      subtotal: invoiceItems.subtotal,
      discountPercent: invoiceItems.discountPercent,
      discountAmount: invoiceItems.discountAmount,
      cgstPercent: invoiceItems.cgstPercent,
      cgstAmount: invoiceItems.cgstAmount,
      sgstPercent: invoiceItems.sgstPercent,
      sgstAmount: invoiceItems.sgstAmount,
      igstPercent: invoiceItems.igstPercent,
      igstAmount: invoiceItems.igstAmount,
      createdAt: invoiceItems.createdAt,
      inventoryId: invoiceItems.inventoryId,
      sku: inventory.sku,
      brand: inventory.brand,
      hsnCode: inventory.hsnCode,
      category: inventory.category,
    })
    .from(invoiceItems)
    .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
    .where(eq(invoiceItems.invoiceId, invoice.id))
    .orderBy(invoiceItems.createdAt);

  // Load prescription entries for the customer
  const prescriptions = customer ? await getPrescriptionsByCustomer(customer.id) : [];

  const distancePrescription = prescriptions.find(
    (p) => p.prescriptionType === "DISTANCE"
  );
  const nearPrescription = prescriptions.find(
    (p) => p.prescriptionType === "NEAR"
  );

  // Math aggregation for ledger summary totals
  const totals = invoiceLineItems.reduce(
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

  // Dynamic round-off matching database total
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

  invoiceLineItems.forEach((item) => {
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

  // Dynamic references for customer details
  const customerName = customer?.fullName || "Walk-in Customer";
  const customerPhone = customer?.phone || "";
  const customerAddress =
    customer?.address ||
    "1ST FLOOR, SHOP NO.20/FF AND 21/FF, VIVEKANAND MINI MARKET, HILL CART ROAD, SILIGURI, West Bengal, 734001";
  const patientState = "West Bengal";
  const patientPan = "ABQFA8202M";
  const patientGstin = "19ABQFA8202M1ZY";

  // Dynamic references for shop details
  const shopName = shop?.name || "Clarity Eyecare Pvt. Ltd.";
  const shopAddress =
    shop?.address ||
    "Clarity Eyecare Pvt. Ltd., D 25/8, MIDC Turbhe, Turbhe, Maharashtra (27), India, 400710";
  const shopGstin = "27AALCC7382F1ZC";
  const shopCin = "U32507MH2024PTC422044";
  const shopMsme = "UDYAM-MH-33-0456381";
  const shopPhone = shop?.phone || "9137012156";

  const invoiceRefId = `${customer?.registrationId || "AXIS-KOL"} | ${invoice.invoiceNumber}`;

  let lensItemCount = 0;

  return (
    <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center gap-8 print:bg-white print:py-0 print:px-0">
      {/* Navigation Buttons (hidden in print) */}
      <PrintInvoiceButton />

      {/* Strict Print CSS Overrides */}
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
                  <span>Place of supply (State Code): SILIGURI, {patientState} (19)</span>
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
                  {invoiceLineItems.map((item, idx) => {
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
                            invoiceLineItems.reduce((s, i) => s + (parseFloat(i.cgstAmount) || 0), 0)
                          )}
                        </td>
                        <td className="border-r border-black px-1.5 py-1 text-right">
                          {formatDecimal(
                            invoiceLineItems.reduce((s, i) => s + (parseFloat(i.sgstAmount) || 0), 0)
                          )}
                        </td>
                        <td className="border-r border-black px-1.5 py-1 text-right">
                          {formatDecimal(
                            invoiceLineItems.reduce((s, i) => s + (parseFloat(i.igstAmount) || 0), 0)
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
                    <div>: Axis Bank Limited.</div>

                    <div>Account No.</div>
                    <div className="font-bold">: 924020033652178</div>

                    <div>IFS Code</div>
                    <div className="font-bold">: UTIB0000661</div>
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
    </div>
  );
}
