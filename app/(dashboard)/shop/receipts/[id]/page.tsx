import { getCurrentUser } from "@/services/auth.service";
import { getReceiptDocumentData } from "@/services/document.service";
import { InvoiceDocument } from "@/components/shop/InvoiceDocument";
import { DocumentActionBar } from "@/components/shop/DocumentActionBar";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Receipt as ReceiptIcon, ArrowLeft, Plus } from "lucide-react";

export const metadata = {
  title: "Booking Details & Receipt | Optical Manager",
  description: "View and print optical booking details, clinical prescription, and payment receipt.",
};

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !user.organizationId) {
    redirect("/login");
  }

  let data = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Receipt query timeout")), 8000)
    );
    data = await Promise.race([
      getReceiptDocumentData(id, user.organizationId),
      timeoutPromise,
    ]);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[ReceiptDetailPage] error:", err);
    data = null;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl shadow-md p-8 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0a52c3] flex items-center justify-center mx-auto shadow-inner">
            <ReceiptIcon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-extrabold text-slate-900">Receipt Not Found</h1>
            <p className="text-xs text-slate-500">
              The requested payment receipt <span className="font-mono font-bold text-slate-700">#{id}</span> could not be found.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-4 justify-center">
            <Link
              href="/shop/orders"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> All Orders &amp; Receipts
            </Link>
            <Link
              href="/shop/invoices/new"
              className="px-4 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Invoice
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center gap-6 print:bg-white print:py-0 print:px-0 font-sans text-black">
      <DocumentActionBar documentType="Receipt" data={data} />
      <InvoiceDocument data={data} mode="RECEIPT" />
    </div>
  );
}
