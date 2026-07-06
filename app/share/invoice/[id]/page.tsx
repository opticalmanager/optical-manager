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
    <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center gap-8 print:bg-white print:py-0 print:px-0 font-sans text-black">
      {/* Public Action Header */}
      <div className="flex gap-4 print:hidden items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm max-w-4xl w-full justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xs font-black uppercase text-slate-800 tracking-wider">Tax Invoice</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Invoice No: {data.invoice?.invoiceNumber}</p>
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
