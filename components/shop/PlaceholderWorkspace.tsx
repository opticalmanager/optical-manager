"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon, ArrowLeft, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaceholderWorkspaceProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

export function PlaceholderWorkspace({
  title,
  subtitle,
  description,
  icon: Icon,
  badge = "UNDER DEVELOPMENT",
}: PlaceholderWorkspaceProps) {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0a52c3]/10 text-[#0a52c3] shadow-xs">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0a52c3] text-[10px] font-extrabold uppercase tracking-wider border border-blue-100">
                {badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>
          </div>
        </div>

        <Link href="/shop/dashboard">
          <Button
            variant="outline"
            className="h-10 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer bg-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Main Feature Preview Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-5 shadow-xs flex flex-col items-center justify-center min-h-[360px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-400 border border-slate-100 shadow-2xs">
          <Sparkles className="h-8 w-8 text-[#0a52c3] animate-pulse" />
        </div>

        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-extrabold text-slate-900">{title} Module Coming Soon</h2>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Link href="/shop/dashboard">
            <Button className="h-10 px-5 text-xs font-bold text-white bg-[#0a52c3] hover:bg-[#004bb5] rounded-xl shadow-md shadow-[#0a52c3]/20 cursor-pointer flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Go to Store Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
