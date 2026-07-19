"use client";

import React from "react";
import { TopCustomer } from "@/services/dashboard.service";
import { formatCurrency } from "@/lib/utils";
import { Crown, Sparkles, ChevronRight, User } from "lucide-react";
import Link from "next/link";

interface TopCustomersTableProps {
  customers: TopCustomer[];
}

export default function TopCustomersTable({ customers }: TopCustomersTableProps) {
  return (
    <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Top Patients (VIP spenders)
              </h3>
              <p className="text-[10px] font-semibold text-slate-400">
                Highest lifetime value patients in period
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> VIP Telemetry
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-2 rounded-l-lg">Patient</th>
                <th className="px-3.5 py-2 text-center">Orders</th>
                <th className="px-3.5 py-2 text-right">Total Spend</th>
                <th className="px-3.5 py-2 text-center rounded-r-lg">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-xs text-slate-400 font-semibold">
                    No patient transactions recorded in selected window
                  </td>
                </tr>
              ) : (
                customers.map((c, idx) => (
                  <tr key={c.id || idx} className="hover:bg-amber-50/20 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {c.name}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {c.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {c.ordersCount}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatCurrency(c.totalSpent)}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="text-[10px] font-semibold text-slate-500">
                        {c.lastVisitDate}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 px-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-400">
          Ranked by net billing volume
        </span>
        <Link 
          href="/shop/appointments" 
          className="text-xs font-bold text-[#2563eb] hover:underline inline-flex items-center gap-1"
        >
          View all patients <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
