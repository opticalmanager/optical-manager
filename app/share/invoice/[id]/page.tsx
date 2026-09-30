import React from "react";
import { getPublicInvoiceDocumentData } from "@/services/document.service";
import { InvoiceDocument } from "@/components/shop/InvoiceDocument";
import { PrintButton } from "./PrintButton";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Tax Invoice Document | Clarity Eyecare",
  description: "View and print your clinical tax invoice details.",
};

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublicInvoiceDocumentData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="bg-slate-100 min-h-screen py-3 px-2 sm:py-6 sm:px-4 md:py-8 flex flex-col items-center gap-4 sm:gap-6 md:gap-8 print:bg-white print:py-0 print:px-0 font-sans text-black max-w-full overflow-x-hidden">
      {/* Public Action Header */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden items-stretch sm:items-center bg-white p-3.5 sm:p-4 border border-slate-200/90 rounded-2xl shadow-xs max-w-4xl w-full justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-black uppercase text-slate-800 tracking-wider">Tax Invoice</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {data.shop?.name || "Optical Store"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold">Invoice No: <span className="font-bold text-slate-800">{data.invoice?.invoiceNumber}</span></p>
        </div>
        <PrintButton />
      </div>

      <InvoiceDocument data={data} mode="INVOICE" />

      {/* Auto-print trigger script on client load */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Auto open print dialog on desktop for convenience after load
            setTimeout(() => {
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              if (!isMobile) {
                window.print();
              }
            }, 1000);
          `,
        }}
      />
    </div>
  );
}
