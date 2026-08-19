import { getCurrentUser } from "@/services/auth.service";
import { getReturnById } from "@/services/return.service";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  RotateCcw,
  ArrowLeft,
  Printer,
  Receipt,
  User,
  Phone,
  Calendar,
  Store,
  CheckCircle2,
  Clock,
  Ban,
  Package,
  Wrench,
  Truck,
  Trash2,
  Eye,
  CreditCard
} from "lucide-react";

export const metadata = {
  title: "Return Credit Note | Optical Manager",
  description: "Sales return receipt and clinical credit note.",
};

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const data = await getReturnById(id, user.organizationId);
  if (!data) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 select-none text-slate-800 print:max-w-none print:pb-0">
      
      {/* Top Action Bar (hidden on print) */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/shop/returns"
          className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors inline-flex items-center gap-2 bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Returns</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/shop/invoices/${data.invoiceId}`}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors inline-flex items-center gap-1.5 bg-white"
          >
            <Receipt className="h-4 w-4 text-slate-400" />
            <span>View Original Invoice</span>
          </Link>
          
          <PrintButton />
        </div>
      </div>

      {/* Printable Credit Note Document */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-[#2563eb] tracking-tight">
              {data.shopName}
            </h1>
            <p className="text-xs text-slate-500 font-medium whitespace-pre-line max-w-sm">
              {data.shopAddress || "Corporate Optical Center"}
            </p>
            <p className="text-xs text-slate-400">
              Phone: {data.shopPhone || "N/A"} {data.shopGst && `• GSTIN: ${data.shopGst}`}
            </p>
          </div>

          <div className="sm:text-right space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-[#2563eb] text-xs font-black uppercase tracking-wider">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Sales Return & Credit Note</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              {data.returnNumber}
            </h2>
            <p className="text-xs text-slate-500">
              Date: {new Date(data.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-slate-400">
              Ref Invoice: <strong className="text-slate-700">{data.invoiceNumber}</strong>
            </p>
          </div>
        </div>

        {/* Customer & Invoice Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/60 p-4 rounded-xl border border-slate-200/60">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Patient / Customer Details
            </span>
            <h4 className="text-sm font-extrabold text-slate-900">{data.customerName}</h4>
            <p className="text-xs text-slate-600">Phone: {data.customerPhone || "N/A"}</p>
            {data.customerEmail && <p className="text-xs text-slate-600">Email: {data.customerEmail}</p>}
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Return Status & Processing
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
              data.status === "COMPLETED"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {data.status}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Processed By: <strong>{data.processedByName || "Store Manager"}</strong>
            </p>
            <p className="text-xs text-slate-500">
              Return Type: <strong>{data.returnType === "ENTIRE_INVOICE" ? "Full Invoice Return" : "Selected Product Return"}</strong>
            </p>
          </div>
        </div>

        {/* Returned Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Product Description</th>
                <th className="py-2.5 px-2">Inspection Reason</th>
                <th className="py-2.5 px-2">Action</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-2 text-right">Unit Price</th>
                <th className="py-2.5 px-2 text-right">Refund Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((item, idx) => (
                <tr key={item.id} className="text-slate-800 font-medium">
                  <td className="py-3 px-2 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-3 px-2">
                    <span className="font-bold text-slate-900 block">{item.description}</span>
                    <span className="text-[10px] text-slate-400">
                      {item.brand || item.model || item.category || "Item"} {item.sku && `• SKU: ${item.sku}`}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.inspectionReason}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#2563eb] border border-blue-100">
                      {item.finalAction}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center font-bold">{item.quantityReturned}</td>
                  <td className="py-3 px-2 text-right">₹{parseFloat(item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-2 text-right font-extrabold text-slate-900">
                    ₹{parseFloat(item.refundAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={6} className="py-3 px-2 text-right text-xs font-black uppercase text-slate-600">
                  Total Refund Credit
                </td>
                <td className="py-3 px-2 text-right text-sm font-extrabold text-[#2563eb]">
                  ₹{parseFloat(data.totalRefundAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Staff Remarks */}
        {data.notes && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-500 block mb-0.5">Staff Remarks:</span>
            <p className="text-slate-700 italic">{data.notes}</p>
          </div>
        )}

        {/* Signatures & Footer */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-400">
          <div className="border-t border-slate-200 pt-2 font-bold">
            Customer Signature
          </div>
          <div className="border-t border-slate-200 pt-2 font-bold">
            Authorized Store Manager
          </div>
        </div>

      </div>

    </div>
  );
}

// Client Print Button
function PrintButton() {
  return (
    <button
      onClick={() => typeof window !== "undefined" && window.print()}
      className="h-10 px-5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
    >
      <Printer className="h-4 w-4" />
      <span>Print Credit Note</span>
    </button>
  );
}
