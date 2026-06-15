"use client";

import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface DocumentActionBarProps {
  documentType: "Invoice" | "Receipt";
}

export function DocumentActionBar({ documentType }: DocumentActionBarProps) {
  const router = useRouter();
  const isInvoice = documentType === "Invoice";

  return (
    <div className="flex gap-4 print:hidden mb-6">
      <Button
        variant="outline"
        onClick={() => router.push("/shop/invoices")}
        className="h-11 px-6 font-bold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer bg-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </Button>

      <Button
        onClick={() => window.print()}
        className={`h-11 px-6 font-bold text-white rounded-xl shadow-lg active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer ${
          isInvoice
            ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 hover:shadow-indigo-600/20"
            : "bg-[#0a52c3] hover:bg-[#004bb5] shadow-[#0a52c3]/10 hover:shadow-[#0a52c3]/20"
        }`}
      >
        <Printer className="h-4 w-4" /> Print {documentType}
      </Button>
    </div>
  );
}
