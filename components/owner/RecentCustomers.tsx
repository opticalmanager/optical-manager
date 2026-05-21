import React from "react";
import Link from "next/link";
import { Users, ArrowRight, Store } from "lucide-react";

interface CustomerRecord {
  id: string;
  fullName: string;
  phone: string;
  createdAt: Date | string;
  shopName?: string;
}

interface RecentCustomersProps {
  customers: CustomerRecord[];
}

export function RecentCustomers({ customers }: RecentCustomersProps) {
  const getInitials = (name: string) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "CU";
  };

  // Pre-configured colors for avatars
  const avatarColors = [
    "bg-indigo-50 border-indigo-100 text-indigo-700",
    "bg-emerald-50 border-emerald-100 text-emerald-700",
    "bg-amber-50 border-amber-100 text-amber-700",
    "bg-blue-50 border-blue-100 text-blue-700",
    "bg-purple-50 border-purple-100 text-purple-700",
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-900 tracking-tight">
            Recent Customers
          </h3>
        </div>
        <Link 
          href="/owner/customers" 
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table / List */}
      <div className="flex-1 overflow-x-auto">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-48 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">No customers yet</p>
              <p className="text-xs text-slate-400 max-w-[200px]">Add your first customer in a shop to see them here.</p>
            </div>
            <Link
              href="/owner/customers"
              className="text-xs font-bold text-indigo-600 hover:underline pt-1"
            >
              Add first customer &rarr;
            </Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/30">
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Shop</th>
                <th className="px-6 py-3 text-right">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {customers.map((customer, index) => {
                const color = avatarColors[index % avatarColors.length];
                const addedDate = typeof customer.createdAt === "string" 
                  ? new Date(customer.createdAt) 
                  : customer.createdAt;
                
                const formattedDate = addedDate.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                });

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                        {getInitials(customer.fullName)}
                      </div>
                      <div className="min-w-0 font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {customer.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{customer.shopName || "First Shop"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs text-right font-medium">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
