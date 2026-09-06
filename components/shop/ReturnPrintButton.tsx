"use client";

import { Printer } from "lucide-react";

export function ReturnPrintButton({ isCreditNote }: { isCreditNote: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 px-5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
    >
      <Printer className="h-4 w-4" />
      <span>{isCreditNote ? "Print Credit Note" : "Print Refund Receipt"}</span>
    </button>
  );
}
