import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Users, Plus, Mail, Phone, Calendar, Search } from "lucide-react";

export default async function OwnerCustomersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const dbCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.organizationId, user.organizationId!));

  const hasRealCustomers = dbCustomers.length > 0;

  // Mock fallbacks if database is empty
  const displayCustomers = hasRealCustomers ? dbCustomers : [
    {
      id: "mock-c1",
      fullName: "Arjun Mehta",
      phone: "98765 43210",
      email: "arjun.mehta@gmail.com",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hrs ago
      address: "Bandra, Mumbai",
    },
    {
      id: "mock-c2",
      fullName: "Priya Sharma",
      phone: "98123 45678",
      email: "priya.sharma@yahoo.com",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      address: "Andheri, Mumbai",
    },
    {
      id: "mock-c3",
      fullName: "Rajesh Patel",
      phone: "91234 56789",
      email: "rpatel@outlook.com",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      address: "Juhu, Mumbai",
    },
    {
      id: "mock-c4",
      fullName: "Sneha Reddy",
      phone: "99887 76655",
      email: "snehareddy@gmail.com",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
      address: "Colaba, Mumbai",
    },
    {
      id: "mock-c5",
      fullName: "Amit Verma",
      phone: "98989 89898",
      email: "averma@rediffmail.com",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
      address: "Powai, Mumbai",
    }
  ];

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

  const avatarColors = [
    "bg-indigo-50 border-indigo-100 text-indigo-700",
    "bg-emerald-50 border-emerald-100 text-emerald-700",
    "bg-amber-50 border-amber-100 text-amber-700",
    "bg-blue-50 border-blue-100 text-blue-700",
    "bg-purple-50 border-purple-100 text-purple-700",
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Customers Directory
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Search, manage and examine comprehensive profiles of store clients and prescriptions.
          </p>
        </div>
        
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm cursor-pointer shadow-md shadow-indigo-600/10 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {!hasRealCustomers && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Showing Demo Customer Records (Database Empty)
        </div>
      )}

      {/* Directory Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            disabled
          />
        </div>
        
        <div className="text-xs text-slate-400 font-medium sm:ml-auto select-none">
          Total Directory Count: <span className="font-semibold text-slate-800">{displayCustomers.length}</span>
        </div>
      </div>

      {/* Customers Table Listing */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/30">
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Registration Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {displayCustomers.map((customer, index) => {
                const color = avatarColors[index % avatarColors.length];
                const addedDate = typeof customer.createdAt === "string"
                  ? new Date(customer.createdAt)
                  : customer.createdAt;

                const formattedDate = addedDate.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                });

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                        {getInitials(customer.fullName)}
                      </div>
                      <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {customer.fullName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {customer.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{customer.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {customer.address || <span className="italic">N/A</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs text-right font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
