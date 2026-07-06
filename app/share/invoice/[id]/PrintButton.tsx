"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="h-10 px-5 font-black text-white bg-[#0a52c3] hover:bg-[#004bb5] shadow-md shadow-indigo-650/10 rounded-xl active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider border-none"
    >
      <Printer className="h-4 w-4" /> Save as PDF / Print
    </button>
  );
}
