"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  Filter, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  X,
  User,
  AlertCircle
} from "lucide-react";

interface CustomerDashboardItem {
  id: string;
  fullName: string;
  registrationId: string | null;
  phone: string;
  email: string | null;
  lastVisitDate: Date | string;
  orderStatus: "READY" | "PROCESSING" | "DELIVERED" | "ON_HOLD";
  pendingDues: number;
}

interface CustomerRecordsClientProps {
  initialCustomers: CustomerDashboardItem[];
}

const ITEMS_PER_PAGE = 5;

// Helper to generate initials
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Deterministic avatar bg/text colors based on name hash
const getAvatarColors = (name: string) => {
  const colors = [
    { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    { bg: "bg-indigo-50", text: "text-indigo-650", border: "border-indigo-100" },
    { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
    { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-100" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export function CustomerRecordsClient({ initialCustomers }: CustomerRecordsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [duesFilter, setDuesFilter] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, duesFilter]);

  // Sync Search Query from global URL if any (e.g. if they searched from Topbar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setSearchQuery(q);
  }, []);

  // Filter & Search Logic
  const filteredCustomers = useMemo(() => {
    let result = [...initialCustomers];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) => 
          c.fullName.toLowerCase().includes(q) ||
          (c.registrationId || "").toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.orderStatus === statusFilter);
    }

    // Dues filter
    if (duesFilter) {
      result = result.filter((c) => c.pendingDues > 0);
    }

    return result;
  }, [initialCustomers, searchQuery, statusFilter, duesFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(filteredCustomers.length, currentPage * ITEMS_PER_PAGE);

  // Format Date to MMM DD, YYYY
  const formatDateStr = (dateVal: Date | string) => {
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ["Registration ID", "Full Name", "Phone", "Email", "Last Visit Date", "Latest Order Status", "Pending Dues (INR)"];
    const rows = filteredCustomers.map((c) => [
      c.registrationId || "",
      c.fullName,
      c.phone,
      c.email || "",
      formatDateStr(c.lastVisitDate),
      c.orderStatus,
      c.pendingDues.toFixed(2)
    ]);

    const escapeCSVField = (val: any) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSVField).join(","),
      ...rows.map((row) => row.map(escapeCSVField).join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `customer_records_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 select-none text-slate-800">
      
      {/* Subheader: Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Records
          </h1>
        </div>

        {/* Filters and CSV Export Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-4 font-bold shadow-sm rounded-xl cursor-pointer text-xs uppercase tracking-wider flex items-center gap-2 border-slate-200 ${
                showFilters || statusFilter !== "ALL" || duesFilter 
                  ? "bg-indigo-50 border-indigo-250 text-indigo-650"
                  : "bg-white text-slate-600 hover:bg-slate-55"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>

            {/* Float Filter Panel */}
            {showFilters && (
              <>
                {/* Blurred backdrop overlay for mobile viewports */}
                <div 
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
                  onClick={() => setShowFilters(false)}
                />
                <div className="fixed bottom-0 inset-x-0 w-full md:absolute md:bottom-auto md:top-full md:inset-x-auto md:right-0 md:mt-2 md:w-72 bg-white border-t border-slate-200/80 md:border md:border-slate-250/80 rounded-t-2xl md:rounded-2xl shadow-xl p-6 md:p-4 z-50 md:z-30 space-y-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Refine List</span>
                    <button 
                      onClick={() => setShowFilters(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Status Filter selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none bg-white cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="READY">Ready</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>

                  {/* Outstanding balance switch */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Pending Balance Due</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Show patients with outstanding balance</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={duesFilter}
                      onChange={(e) => setDuesFilter(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Reset Filters */}
                  {(statusFilter !== "ALL" || duesFilter) && (
                    <button
                      onClick={() => {
                        setStatusFilter("ALL");
                        setDuesFilter(false);
                        setShowFilters(false);
                      }}
                      className="w-full text-center py-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg transition-colors border border-rose-100 border-dashed"
                    >
                      Reset Active Filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={filteredCustomers.length === 0}
            className="h-10 px-4 font-bold shadow-sm rounded-xl cursor-pointer text-xs uppercase tracking-wider bg-white border-slate-200 text-slate-600 hover:bg-slate-55"
          >
            <Download className="h-4 w-4 mr-2 text-slate-450" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Local search bar to allow quick filtering from the page */}
      <div className="relative max-w-md bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/25 focus-within:border-indigo-500 transition-all flex items-center gap-2">
        <Search className="h-4.5 w-4.5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Filter by patient name, registration ID, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold outline-none text-slate-800 placeholder:text-slate-400/80"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="p-0.5 text-slate-400 hover:text-slate-650 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Customers Table Card */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase font-bold bg-slate-50/40 border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-3 md:px-8 py-5">Customer Details</th>
                <th className="px-2.5 sm:px-6 py-5">Contact</th>
                <th className="px-2.5 sm:px-6 py-5">Last Visit</th>
                <th className="px-2.5 sm:px-6 py-5 text-center">Order Status</th>
                <th className="px-2.5 sm:px-6 py-5 text-right">Pending Dues</th>
                <th className="px-3 md:px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((customer) => {
                  const avatarColors = getAvatarColors(customer.fullName);
                  const isDues = customer.pendingDues > 0;
                  
                  // Status Badge Styles
                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case "READY":
                        return (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-wider bg-[#e6f4fe] text-[#0a52c3] uppercase select-none">
                            Ready
                          </span>
                        );
                      case "PROCESSING":
                        return (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-wider bg-slate-100 text-slate-600 uppercase select-none">
                            Processing
                          </span>
                        );
                      case "DELIVERED":
                        return (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-wider bg-[#0a52c3] text-white uppercase select-none">
                            Delivered
                          </span>
                        );
                      case "ON_HOLD":
                        return (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-wider bg-[#fff1f2] text-[#e11d48] uppercase select-none">
                            On Hold
                          </span>
                        );
                      default:
                        return (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-wider bg-slate-100 text-slate-650 uppercase select-none">
                            {status}
                          </span>
                        );
                    }
                  };

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/shop/customers/${customer.id}`)}
                      className="group hover:bg-slate-100/60 transition-all duration-200 align-middle cursor-pointer border-l-2 border-l-transparent hover:border-l-[#0a52c3]"
                    >
                      {/* Customer Details */}
                      <td className="px-3 md:px-8 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <div className={`h-9 w-9 flex-shrink-0 rounded-full border ${avatarColors.bg} ${avatarColors.text} ${avatarColors.border} flex items-center justify-center text-[10px] font-extrabold shadow-inner group-hover:scale-105 transition-transform duration-200`}>
                            {getInitials(customer.fullName)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-sm group-hover:text-[#0a52c3] transition-colors duration-200">
                              {customer.fullName}
                            </p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                              ID: #{customer.registrationId || "OP-XXXXX"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-2.5 sm:px-6 py-4.5 font-semibold text-slate-700 text-sm group-hover:text-slate-900 transition-colors duration-200">
                        {customer.phone}
                      </td>

                      {/* Last Visit Date */}
                      <td className="px-2.5 sm:px-6 py-4.5 font-semibold text-slate-700 text-sm group-hover:text-slate-900 transition-colors duration-200">
                        {formatDateStr(customer.lastVisitDate)}
                      </td>

                      {/* Order Status Badge */}
                      <td className="px-2.5 sm:px-6 py-4.5 text-center">
                        {getStatusBadge(customer.orderStatus)}
                      </td>

                      {/* Pending Dues */}
                      <td className={`px-2.5 sm:px-6 py-4.5 text-right text-sm font-bold transition-all duration-200 ${
                        isDues ? "text-[#e11d48] group-hover:scale-102" : "text-slate-500 font-semibold"
                      }`}>
                        {formatCurrency(customer.pendingDues)}
                      </td>

                      {/* Action Arrow */}
                      <td className="px-3 md:px-8 py-4.5 text-right">
                        <span
                          className="p-1.5 text-slate-400 group-hover:text-[#0a52c3] group-hover:bg-[#0a52c3]/5 rounded-lg transition-all duration-200 inline-block transform group-hover:translate-x-1"
                          title="View customer profile details"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="p-4 bg-slate-50 text-indigo-500 rounded-full border border-slate-100 shadow-inner">
                        <User className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">
                          No Customer Records Found
                        </p>
                        <p className="text-xs text-slate-500 leading-normal">
                          {searchQuery
                            ? `No customer profiles match "${searchQuery}".`
                            : statusFilter !== "ALL" || duesFilter
                            ? "No customer records found matching the active status or pending dues filter."
                            : "Onboard your first customer to build your precision clinical database."}
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push("/shop/patients/new")}
                        className="h-9 px-4 bg-[#0a52c3] hover:bg-[#004bb5] text-xs font-bold text-white shadow-sm rounded-xl transition-colors cursor-pointer"
                      >
                        Add Patient Record
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        {filteredCustomers.length > 0 && (
          <div className="px-8 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-slate-450 font-bold uppercase tracking-wider bg-slate-50/20 text-center sm:text-left">
            <p>
              Showing {startIndex + 1} - {endIndex} of {filteredCustomers.length} patients
            </p>
            {totalPages > 1 && (
              <div className="flex gap-1 items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg cursor-pointer border-slate-200 hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const isSelected = page === currentPage;
                    return (
                      <Button
                        key={page}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 text-xs font-extrabold rounded-lg cursor-pointer flex items-center justify-center p-0 ${
                          isSelected 
                            ? "bg-[#0a52c3] hover:bg-[#004bb5] text-white" 
                            : "border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-lg cursor-pointer border-slate-200 hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
