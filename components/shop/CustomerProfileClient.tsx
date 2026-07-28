"use client";

import { calculateAgeFromDOB } from "@/utils/optometry";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  User, 
  ShoppingCart, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Eye, 
  FileText,
  X,
  Loader2,
  Calendar,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Plus,
  Clock
} from "lucide-react";
import { AddPrescriptionModal } from "@/components/shop/AddPrescriptionModal";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

interface CustomerData {
  id: string;
  fullName: string;
  registrationId: string | null;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  bloodGroup: string | null;
  referredBy: string | null;
  chiefComplaint: string | null;
  familyHistory: string | null;
  systemicIllness: string | null;
  allergies: string | null;
  notes: string | null;
  isActive: boolean;
}

interface PrescriptionData {
  id: string;
  prescriptionType: "DISTANCE" | "NEAR";
  rightSphere: string | null;
  rightCylinder: string | null;
  rightAxis: string | null;
  rightAdd: string | null;
  rightNv: string | null;
  leftSphere: string | null;
  leftCylinder: string | null;
  leftAxis: string | null;
  leftAdd: string | null;
  leftNv: string | null;
  pd: string | null;
  pdRight: string | null;
  pdLeft: string | null;
  doctorName: string | null;
  partyName: string | null;
  frameName: string | null;
  notes: string | null;
  specialInstructions: string | null;
  prescribedBy: string | null;
  prescribedAt: string | null;
  createdAt: string | Date;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  total: string;
  balanceDue: string;
  status: "DRAFT" | "PENDING" | "PAID" | "CANCELLED";
  fulfillmentStatus: "PROCESSING" | "READY" | "DELIVERED" | "ON_HOLD";
  createdAt: string | Date;
  notes: string | null;
}

interface ProfileData {
  customer: CustomerData;
  prescriptions: PrescriptionData[];
  invoices: InvoiceData[];
  pendingDues: number;
  totalOrdersCount: number;
  lastVisitDate: Date | string;
  latestPrescription: PrescriptionData | null;
  latestInvoice: InvoiceData | null;
}

interface CustomerProfileClientProps {
  profile: ProfileData;
}

export function CustomerProfileClient({ profile }: CustomerProfileClientProps) {
  const router = useRouter();
  const [medHistoryExpanded, setMedHistoryExpanded] = useState(false);
  const [prescriptionsExpanded, setPrescriptionsExpanded] = useState(true);
  const [isAddRxModalOpen, setIsAddRxModalOpen] = useState(false);
  const [selectedRxIndex, setSelectedRxIndex] = useState(0);

  const { customer, prescriptions, invoices, pendingDues, lastVisitDate, latestInvoice } = profile;

  // Format power values helper (+1.25, -0.50, -, etc.)
  const formatPower = (val: string | null | undefined) => {
    if (!val || val === "" || val === "-") return "-";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num > 0) return `+${num.toFixed(2)}`;
    if (num === 0) return "+0.00";
    return num.toFixed(2);
  };

  // Format axis (adds degree symbol or keeps integer)
  const formatAxis = (val: string | null | undefined) => {
    if (!val || val === "" || val === "-") return "-";
    const num = parseInt(val, 10);
    if (isNaN(num)) return val;
    return `${num}°`;
  };

  // Format Date to Month DD, YYYY
  const formatDateStr = (dateVal: Date | string | null | undefined) => {
    if (!dateVal) return "N/A";
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Group prescriptions by date/doctor for full historical timeline
  const groupedPrescriptions = useMemo(() => {
    if (!prescriptions || prescriptions.length === 0) return [];
    
    // Group by prescribedAt or date string
    const map = new Map<string, { date: string; doctor: string; distRx: PrescriptionData | null; nearRx: PrescriptionData | null }>();

    for (const p of prescriptions) {
      const key = p.prescribedAt ? String(p.prescribedAt) : new Date(p.createdAt).toISOString().split("T")[0];
      const doc = p.prescribedBy || p.doctorName || "Standard Exam";

      if (!map.has(key)) {
        map.set(key, {
          date: key,
          doctor: doc,
          distRx: p.prescriptionType === "DISTANCE" ? p : null,
          nearRx: p.prescriptionType === "NEAR" ? p : null,
        });
      } else {
        const existing = map.get(key)!;
        if (p.prescriptionType === "DISTANCE") existing.distRx = p;
        if (p.prescriptionType === "NEAR") existing.nearRx = p;
      }
    }

    return Array.from(map.values());
  }, [prescriptions]);

  const activeGroup = groupedPrescriptions[selectedRxIndex] || groupedPrescriptions[0] || null;
  const activeDistRx = activeGroup?.distRx;
  const activeNearRx = activeGroup?.nearRx;
  const activeRxMeta = activeDistRx || activeNearRx;

  return (
    <div className="space-y-4 text-slate-800 pb-16 select-none max-w-7xl mx-auto">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <Link href="/shop/dashboard" className="hover:text-slate-600">Dashboard</Link>
        <span className="text-slate-300">/</span>
        <Link href="/shop/customers" className="hover:text-slate-600">Customers</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700">{customer.fullName}</span>
      </div>

      {/* Compact Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {customer.fullName}
            </h1>

            <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              customer.isActive 
                ? "bg-blue-50 border-blue-150 text-[#0a52c3]" 
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}>
              {customer.isActive ? "Active Patient" : "Inactive"}
            </Badge>

            {/* Top Pending Dues Icon Badge */}
            {pendingDues > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-50 text-rose-600 border border-rose-150 shadow-2xs animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Pending Dues: {formatCurrency(pendingDues)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-150">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                No Dues Pending
              </span>
            )}
          </div>

          <p className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wide">
            ID: <span className="text-[#0a52c3] font-bold">{customer.registrationId || "N/A"}</span>
          </p>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsAddRxModalOpen(true)}
            className="h-8 px-3 font-bold rounded-lg text-xs tracking-wide bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-sm gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Prescription
          </button>

          <Link
            href={`/shop/patients/edit/${customer.id}`}
            className="h-8 px-3 font-bold rounded-lg text-xs tracking-wide bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-xs"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1 text-slate-400" />
            Edit Profile
          </Link>

          <Link
            href={`/shop/invoices/new?customerId=${customer.id}`}
            className="h-8 px-3.5 font-bold rounded-lg text-xs tracking-wide bg-[#0a52c3] hover:bg-[#004bb5] text-white flex items-center justify-center transition-colors shadow-sm gap-1.5"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            New Order
          </Link>
        </div>
      </div>

      {/* Row 1: Details & Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Basic Details (2/3 width) */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
          <div className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[#0a52c3]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0a52c3]">
              01. Basic Details
            </h2>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
              
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Full Name</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{customer.fullName}</span>
              </div>
              
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Mobile Number</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{customer.phone}</span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Email Address</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5 lowercase truncate">{customer.email || "-"}</span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Date of Birth / Age</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                  {formatDateStr(customer.dateOfBirth)}
                  {customer.dateOfBirth && calculateAgeFromDOB(customer.dateOfBirth) ? (
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-150">
                      {calculateAgeFromDOB(customer.dateOfBirth)} yrs
                    </span>
                  ) : null}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Gender</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5 capitalize">{customer.gender?.toLowerCase() || "-"}</span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Referred By</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{customer.referredBy || "-"}</span>
              </div>

              <div className="col-span-2 md:col-span-3 border-t border-slate-100 pt-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Full Address</span>
                <span className="text-xs font-semibold text-slate-700 block mt-0.5">{customer.address || "-"}</span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">City</span>
                <span className="text-xs font-semibold text-slate-700 block mt-0.5">{customer.city || "-"}</span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">State</span>
                <span className="text-xs font-semibold text-slate-700 block mt-0.5">{customer.state || "-"}</span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Pin Code</span>
                <span className="text-xs font-semibold text-slate-700 block mt-0.5">{customer.pincode || "-"}</span>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Patient Snapshot (1/3 width) */}
        <Card className="border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white flex flex-col justify-between">
          <div>
            <div className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-[#0a52c3]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0a52c3]">
                04. Patient Snapshot
              </h2>
            </div>
            
            <div className="p-3.5 space-y-3">
              {/* Compact High-Density Dues Card */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                pendingDues > 0 
                  ? "bg-rose-50/70 border-rose-200/80 text-rose-900" 
                  : "bg-emerald-50/70 border-emerald-200/80 text-emerald-900"
              }`}>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-75">
                    Total Pending Dues
                  </span>
                  <h3 className="text-xl font-extrabold tracking-tight mt-0.5">
                    {formatCurrency(pendingDues)}
                  </h3>
                </div>
                <div className={`p-2 rounded-lg ${
                  pendingDues > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                }`}>
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>

              {/* Snapshot Metrics */}
              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Current Order</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {latestInvoice ? `Invoice #${latestInvoice.invoiceNumber}` : "No active orders"}
                    </span>
                    {latestInvoice && (
                      <Badge className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-blue-50 text-[#0a52c3] border border-blue-150">
                        {latestInvoice.fulfillmentStatus}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2.5">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Last Visit</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">
                      {formatDateStr(lastVisitDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Examining Doctor</span>
                    <span className="text-xs font-bold text-[#0a52c3] block mt-0.5 truncate">
                      {activeRxMeta?.prescribedBy || activeRxMeta?.doctorName || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

      </div>

      {/* Row 2: Medical History (Collapsible Accordion) */}
      <Card className="border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setMedHistoryExpanded(!medHistoryExpanded)}
          className="w-full py-2.5 px-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-2 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1 bg-[#0a52c3] rounded" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0a52c3]">
              02. Medical History & Symptoms
            </h2>
          </div>
          {medHistoryExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {medHistoryExpanded && (
          <CardContent className="p-4 transition-all animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              
              <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Chief Complaint</span>
                <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug">
                  {customer.chiefComplaint || "No details reported."}
                </p>
              </div>

              <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Family History</span>
                <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug">
                  {customer.familyHistory || "No reports recorded."}
                </p>
              </div>

              <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Systemic Illness</span>
                <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug">
                  {customer.systemicIllness || "None reported."}
                </p>
              </div>

              <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Allergies</span>
                <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug">
                  {customer.allergies || "None reported."}
                </p>
              </div>

            </div>
          </CardContent>
        )}
      </Card>

      {/* Row 3: Eye Prescriptions History (Collapsible Accordion with Timeline Selector) */}
      <Card className="border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
        <div className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-2">
          <button
            onClick={() => setPrescriptionsExpanded(!prescriptionsExpanded)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
          >
            <span className="h-3.5 w-1 bg-[#0a52c3] rounded" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0a52c3]">
              03. Eye Prescription Details & Clinical History ({groupedPrescriptions.length})
            </h2>
            {prescriptionsExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsAddRxModalOpen(true)}
            className="text-[11px] font-bold text-[#0a52c3] hover:text-[#004bb5] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Rx
          </button>
        </div>

        {prescriptionsExpanded && (
          <CardContent className="p-4 transition-all animate-fade-in space-y-4">
            
            {groupedPrescriptions.length > 0 ? (
              <div>
                
                {/* Prescription Timeline Selector Bar */}
                {groupedPrescriptions.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 mb-3 scrollbar-none">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider shrink-0 mr-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> History Timeline:
                    </span>
                    {groupedPrescriptions.map((g, idx) => (
                      <button
                        key={g.date + idx}
                        type="button"
                        onClick={() => setSelectedRxIndex(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                          selectedRxIndex === idx
                            ? "bg-[#0a52c3] text-white border-[#0a52c3] shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {formatDateStr(g.date)} {g.doctor ? `(${g.doctor})` : ""}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Prescription Reading Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  
                  {/* Right Eye (OD) */}
                  <div className="space-y-2 bg-slate-50/40 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <Eye className="h-3.5 w-3.5 text-[#0a52c3]" />
                      Right Eye (OD)
                    </div>
                    <table className="w-full text-xs font-bold text-slate-700 text-center border-collapse">
                      <thead>
                        <tr className="text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-200/60">
                          <th className="py-1.5 text-left">Type</th>
                          <th className="py-1.5">SPH</th>
                          <th className="py-1.5">CYL</th>
                          <th className="py-1.5">Axis</th>
                          <th className="py-1.5">V/N</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1.5 text-left text-[9px] uppercase tracking-wide text-slate-400">D.V.</td>
                          <td className="py-1.5 text-[#0a52c3] font-extrabold">{formatPower(activeDistRx?.rightSphere)}</td>
                          <td className="py-1.5">{formatPower(activeDistRx?.rightCylinder)}</td>
                          <td className="py-1.5">{formatAxis(activeDistRx?.rightAxis)}</td>
                          <td className="py-1.5 text-slate-500">{activeDistRx?.rightNv || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-left text-[9px] uppercase tracking-wide text-slate-400">N.V.</td>
                          <td className="py-1.5 text-[#0a52c3] font-extrabold">{formatPower(activeNearRx?.rightSphere)}</td>
                          <td className="py-1.5">{formatPower(activeNearRx?.rightCylinder)}</td>
                          <td className="py-1.5">{formatAxis(activeNearRx?.rightAxis)}</td>
                          <td className="py-1.5 text-slate-500">{activeNearRx?.rightNv || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-left text-[9px] uppercase tracking-wide text-slate-400">ADD</td>
                          <td className="py-1.5">-</td>
                          <td className="py-1.5 text-[#0a52c3] font-extrabold">{formatPower(activeDistRx?.rightAdd || activeNearRx?.rightAdd)}</td>
                          <td className="py-1.5">-</td>
                          <td className="py-1.5">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Left Eye (OS) */}
                  <div className="space-y-2 bg-slate-50/40 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <Eye className="h-3.5 w-3.5 text-[#0a52c3]" />
                      Left Eye (OS)
                    </div>
                    <table className="w-full text-xs font-bold text-slate-700 text-center border-collapse">
                      <thead>
                        <tr className="text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-200/60">
                          <th className="py-1.5 text-left">Type</th>
                          <th className="py-1.5">SPH</th>
                          <th className="py-1.5">CYL</th>
                          <th className="py-1.5">Axis</th>
                          <th className="py-1.5">V/N</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1.5 text-left text-[9px] uppercase tracking-wide text-slate-400">D.V.</td>
                          <td className="py-1.5 text-[#0a52c3] font-extrabold">{formatPower(activeDistRx?.leftSphere)}</td>
                          <td className="py-1.5">{formatPower(activeDistRx?.leftCylinder)}</td>
                          <td className="py-1.5">{formatAxis(activeDistRx?.leftAxis)}</td>
                          <td className="py-1.5 text-slate-500">{activeDistRx?.leftNv || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-left text-[9px] uppercase tracking-wide text-slate-400">N.V.</td>
                          <td className="py-1.5 text-[#0a52c3] font-extrabold">{formatPower(activeNearRx?.leftSphere)}</td>
                          <td className="py-1.5">{formatPower(activeNearRx?.leftCylinder)}</td>
                          <td className="py-1.5">{formatAxis(activeNearRx?.leftAxis)}</td>
                          <td className="py-1.5 text-slate-500">{activeNearRx?.leftNv || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-left text-[9px] uppercase tracking-wide text-slate-400">ADD</td>
                          <td className="py-1.5">-</td>
                          <td className="py-1.5 text-[#0a52c3] font-extrabold">{formatPower(activeDistRx?.leftAdd || activeNearRx?.leftAdd)}</td>
                          <td className="py-1.5">-</td>
                          <td className="py-1.5">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Prescription Metadata */}
                  <div className="space-y-3 bg-slate-50/40 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <FileText className="h-3.5 w-3.5 text-[#0a52c3]" />
                      Prescription Specs
                    </div>
                    <div className="space-y-2 text-xs font-semibold text-slate-700">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Prescribed Date</span>
                        <span className="text-slate-800 font-extrabold block mt-0.5">{formatDateStr(activeGroup?.date)}</span>
                      </div>
                      <div className="border-t border-slate-200/50 pt-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Prescribed By Doctor</span>
                        <span className="text-[#0a52c3] font-extrabold block mt-0.5">{activeRxMeta?.prescribedBy || activeRxMeta?.doctorName || "N/A"}</span>
                      </div>
                      <div className="border-t border-slate-200/50 pt-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pupil Distance (P.D.)</span>
                        <span className="text-slate-800 font-extrabold block mt-0.5">{activeDistRx?.pd || activeNearRx?.pd ? `${activeDistRx?.pd || activeNearRx?.pd} mm` : "Standard"}</span>
                      </div>
                      <div className="border-t border-slate-200/50 pt-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Notes & Lens Type</span>
                        <span className="text-slate-800 font-extrabold block mt-0.5">{activeRxMeta?.notes || "Standard Optical Prescription"}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs font-semibold">
                No visual prescription history registered for this customer.
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddRxModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0a52c3] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Record First Prescription
                  </button>
                </div>
              </div>
            )}

          </CardContent>
        )}
      </Card>

      {/* Row 4: Recent Orders */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900 uppercase">
            Recent Orders & Invoices
          </h2>
          <Link
            href="/shop/invoices"
            className="text-xs font-bold text-[#0a52c3] hover:text-[#004bb5] uppercase tracking-wider"
          >
            View All
          </Link>
        </div>

        <Card className="border-slate-200/80 shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-400 uppercase font-extrabold bg-slate-50/50 border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Invoice #</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Details</th>
                  <th className="px-4 py-2.5 text-right">Total Amount</th>
                  <th className="px-4 py-2.5 text-right">Balance Due</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoices.length > 0 ? (
                  invoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-extrabold text-[#0a52c3]">
                        <Link href={`/shop/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">
                        {formatDateStr(inv.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-600">
                        {inv.notes || "Optical Billing Order"}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-800 text-right">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-right">
                        {Number(inv.balanceDue) > 0 ? (
                          <span className="text-rose-600">{formatCurrency(Number(inv.balanceDue))}</span>
                        ) : (
                          <span className="text-emerald-600">₹0.00</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase select-none ${
                          inv.status === "PAID" 
                            ? "bg-emerald-50 border-emerald-150 text-emerald-600" 
                            : "bg-rose-50 border-rose-150 text-rose-600"
                        }`}>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs font-semibold text-slate-400">
                      No invoices recorded for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add New Prescription Modal */}
      <AddPrescriptionModal
        isOpen={isAddRxModalOpen}
        onClose={() => setIsAddRxModalOpen(false)}
        customerId={customer.id}
        customerName={customer.fullName}
      />

    </div>
  );
}
