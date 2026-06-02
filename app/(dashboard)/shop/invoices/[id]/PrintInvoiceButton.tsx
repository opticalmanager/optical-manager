"use client";

import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function PrintInvoiceButton() {
  const router = useRouter();

  return (
    <div className="flex gap-4 print:hidden mb-6">
      <Button
        variant="outline"
        onClick={() => router.push("/shop/invoices")}
        className="h-11 px-6 font-bold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </Button>

      <Button
        onClick={() => window.print()}
        className="h-11 px-6 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer"
      >
        <Printer className="h-4 w-4" /> Print Invoice
      </Button>
    </div>
  );
}
