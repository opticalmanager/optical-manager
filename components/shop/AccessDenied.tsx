"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, LayoutGrid, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AccessDeniedProps {
  moduleName?: string;
  userRole?: string | null;
  description?: string;
}

export function AccessDenied({
  moduleName = "this page",
  userRole = "Staff Member",
  description,
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 select-none">
      <Card className="w-full max-w-lg p-6 sm:p-8 bg-white border border-slate-200/90 shadow-lg shadow-slate-100 rounded-2xl text-center space-y-6">
        
        {/* Shield Icon Badge */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100/80 flex items-center justify-center shadow-xs">
          <ShieldAlert className="w-7 h-7 text-rose-600" />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 mb-1">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Role: {userRole || "Store Staff"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Access Restricted
          </h1>
          <p className="text-sm font-semibold text-slate-600">
            You do not have permission to access {moduleName}.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {description ||
              "This module has been restricted for your role in store settings. If you require access to this section, please contact your store owner or administrator."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto h-9 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Go Back</span>
          </button>

          <Link
            href="/shop/dashboard"
            className="w-full sm:w-auto h-9 px-5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
