import { db } from "@/lib/drizzle";
import { receipts, invoices, invoiceItems, inventory, customers, shops, organizations, orders, prescriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/services/auth.service";
import { getReceiptById } from "@/services/receipt.service";
import { getInvoiceById } from "@/services/invoice.service";
import { getShopById } from "@/services/shop.service";
import { getCustomerById } from "@/services/customer.service";
import { getPrescriptionsByCustomer } from "@/services/prescription.service";
import { PrintReceiptButton } from "./PrintReceiptButton";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Payment Receipt | Optical Manager",
  description: "View and print clinical payment receipt details.",
};

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-bold text-sm">
        Unauthorized. Please log in.
      </div>
    );
  }

  // 1. Fetch Receipt
  const receipt = await getReceiptById(id, user.organizationId);
  if (!receipt) {
    notFound();
  }

  // 2. Fetch Invoice
  const invoice = await getInvoiceById(receipt.invoiceId, user.organizationId);
  if (!invoice) {
    notFound();
  }

  // 3. Fetch Shop
  const shop = await getShopById(receipt.shopId, user.organizationId);

  // 4. Fetch Customer
  const customer = await getCustomerById(invoice.customerId, user.organizationId);

  // 5. Fetch associated order to get order number
  const [orderRecord] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.invoiceId, invoice.id), eq(orders.organizationId, user.organizationId)))
    .limit(1);

  // 6. Fetch Invoice Line Items joined with Inventory
  const lineItems = await db
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
      inventoryId: invoiceItems.inventoryId,
      sku: inventory.sku,
      brand: inventory.brand,
      category: inventory.category,
      hsnCode: inventory.hsnCode,
    })
    .from(invoiceItems)
    .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
    .where(eq(invoiceItems.invoiceId, invoice.id))
    .orderBy(invoiceItems.createdAt);

  // 7. Load prescriptions
  const customerPrescriptions = customer ? await getPrescriptionsByCustomer(customer.id) : [];
  const latestPrescription = customerPrescriptions.length > 0 ? customerPrescriptions[0] : null;

  // Formatting helper constants
  const createdDate = new Date(receipt.createdAt);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase(); // e.g. OCT 24, 2024

  const formattedTime = createdDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }); // e.g. 02:32 PM

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

  // Constants mapping to Image 2 header styling
  const shopName = shop?.name || "OPTICAL PRECISION";
  const shopAddress = shop?.address || "42 INDUSTRIAL PARK, WEST WING, METRO CITY - 40001";
  const shopGstin = "27AALCC7382F1ZC";
  const shopCin = "U32507MH2024PTC422044";
  const shopPhone = shop?.phone || "+91 9876543210";

  return (
    <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center gap-6 print:bg-white print:py-0 print:px-0 font-sans text-black">
      {/* Navigation Buttons (hidden in print) */}
      <PrintReceiptButton />

      {/* Strict Print CSS Overrides */}
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
              <p className="font-semibold text-slate-650 max-w-[320px] uppercase">
                ADDRESS : {shopAddress}
              </p>
              <p className="font-semibold text-slate-650">
                GSTIN : <span className="font-extrabold">{shopGstin}</span>
              </p>
              <p className="font-semibold text-slate-650">
                CIN : <span className="font-extrabold">{shopCin}</span>
              </p>
              <p className="font-semibold text-slate-650">
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
            <p className="font-bold text-slate-650">
              DATE: <span className="font-extrabold text-slate-800">{formattedDate}</span>
            </p>
            <p className="font-bold text-slate-650">
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
            <p className="text-xs font-black text-slate-800 uppercase">{customer?.fullName || "Walk-in Customer"}</p>
            <p className="font-semibold text-slate-600">
              Reg ID: <span className="font-bold text-slate-700">{customer?.registrationId || "N/A"}</span>
            </p>
            {customer?.phone && (
              <p className="font-semibold text-slate-600">
                Phone: <span className="font-bold text-slate-700">{customer.phone}</span>
              </p>
            )}
            {customer?.email && (
              <p className="font-semibold text-slate-650 break-all">
                Email: <span className="font-bold text-slate-700">{customer.email}</span>
              </p>
            )}
          </div>

          {/* SHIP TO */}
          <div className="border-r border-slate-200 pr-4 space-y-1.5">
            <h3 className="font-black text-black border-b border-slate-200 pb-1 uppercase tracking-wider">
              SHIP TO,
            </h3>
            <p className="text-xs font-black text-slate-800 uppercase">{customer?.fullName || "Walk-in Customer"}</p>
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
              <p className="font-semibold text-slate-650 break-all">
                TXN ID: <span className="font-extrabold text-slate-850">{receipt.transactionId}</span>
              </p>
            )}
          </div>
        </div>

        {/* LINE ITEMS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-[8.5px] leading-tight">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-350 text-center font-bold text-slate-700 uppercase">
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
                    <td className="border-r border-slate-200 py-2 px-1 text-right font-semibold text-rose-650">
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
              <tr className="bg-slate-50 font-black text-slate-800 text-center uppercase border-t border-slate-350">
                <td className="border-r border-slate-300 py-2" colSpan={2}>
                  Line Total
                </td>
                <td className="border-r border-slate-300 py-2"></td>
                <td className="border-r border-slate-300 py-2 text-center">{totalQty}</td>
                <td className="border-r border-slate-300 py-2"></td>
                <td className="border-r border-slate-300 py-2 px-1 text-right">{subTotalSum.toFixed(2)}</td>
                <td className="border-r border-slate-300 py-2 px-1 text-right text-rose-650">{discountSum.toFixed(2)}</td>
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
              <div className="flex justify-between font-bold text-rose-650">
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
    </div>
  );
}
