"use client";

import { useState, useTransition, useEffect } from "react";
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
  AlertTriangle
} from "lucide-react";

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
  const [prescriptionsExpanded, setPrescriptionsExpanded] = useState(false);

  const { customer, prescriptions, invoices, pendingDues, lastVisitDate, latestPrescription, latestInvoice } = profile;

  // Format power values helper (+1.25, -0.50, -, etc.)
  const formatPower = (val: string | null | undefined) => {
    if (!val || val === "" || val === "-") return "-";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num > 0) return `+${num.toFixed(2)}`;
    if (num === 0) return "+0.00";
    return num.toFixed(2); // Negative already has sign
  };

  // Format axis (adds degree symbol or keeps integer)
  const formatAxis = (val: string | null | undefined) => {
    if (!val || val === "" || val === "-") return "-";
    const num = parseInt(val, 10);
    if (isNaN(num)) return val;
    return `${num}°`;
  };

  // Extract latest prescription details
  const distRx = prescriptions.find((p) => p.prescriptionType === "DISTANCE") || null;
  const nearRx = prescriptions.find((p) => p.prescriptionType === "NEAR") || null;

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



  return (
    <div className="space-y-6 text-slate-800 pb-20 select-none">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <Link href="/shop/dashboard" className="hover:text-slate-600">Dashboard</Link>
        <span className="text-slate-350">/</span>
        <Link href="/shop/customers" className="hover:text-slate-600">Customer Records</Link>
        <span className="text-slate-355">/</span>
        <span className="text-slate-600">{customer.fullName}</span>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {customer.fullName}
            </h1>
            <Badge className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${
              customer.isActive 
                ? "bg-blue-50 border-blue-150 text-[#0a52c3] hover:bg-blue-100/50" 
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}>
              {customer.isActive ? "Active Patient" : "Inactive"}
            </Badge>
          </div>
          <p className="text-xs font-mono font-semibold text-slate-500 mt-2 uppercase tracking-wide">
            # Registration ID: <span className="text-indigo-650">{customer.registrationId || "N/A"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/shop/patients/edit/${customer.id}`}
            className="h-10 px-4 font-bold shadow-sm rounded-xl text-xs uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors"
          >
            <Edit3 className="h-4 w-4 mr-2 text-slate-455" />
            Edit Profile
          </Link>

          <Link
            href={`/shop/invoices/new?customerId=${customer.id}`}
            className="h-10 px-4 font-bold shadow-sm rounded-xl text-xs uppercase tracking-wider bg-[#0a52c3] hover:bg-[#004bb5] text-white flex items-center justify-center transition-colors"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Order
          </Link>
        </div>
      </div>

      {/* Row 1: Details & Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Basic Details (2/3 width) */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
            <User className="h-4 w-4 text-[#0a52c3]" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#0a52c3]">
              01. Basic Details
            </h2>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-4">
              
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Full Name</span>
                <span className="text-sm font-extrabold text-slate-800 block mt-1">{customer.fullName}</span>
              </div>
              
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Mobile Number</span>
                <span className="text-sm font-extrabold text-slate-800 block mt-1">{customer.phone}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Email Address</span>
                <span className="text-sm font-extrabold text-slate-800 block mt-1 lowercase truncate">{customer.email || "-"}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Date of Birth</span>
                <span className="text-sm font-extrabold text-slate-800 block mt-1">{formatDateStr(customer.dateOfBirth)}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Gender</span>
                <span className="text-sm font-extrabold text-slate-800 block mt-1 capitalize">{customer.gender?.toLowerCase() || "-"}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Referred By</span>
                <span className="text-sm font-extrabold text-slate-800 block mt-1">{customer.referredBy || "-"}</span>
              </div>

              <div className="md:col-span-3 border-t border-slate-50 pt-4">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Full Address</span>
                <span className="text-sm font-semibold text-slate-700 block mt-1">{customer.address || "-"}</span>
              </div>

              <div className="md:col-span-1 border-t border-slate-50 pt-4">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">City</span>
                <span className="text-sm font-semibold text-slate-700 block mt-1">{customer.city || "-"}</span>
              </div>

              <div className="md:col-span-1 border-t border-slate-50 pt-4">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">State</span>
                <span className="text-sm font-semibold text-slate-700 block mt-1">{customer.state || "-"}</span>
              </div>

              <div className="md:col-span-1 border-t border-slate-50 pt-4">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Pin Code</span>
                <span className="text-sm font-semibold text-slate-700 block mt-1">{customer.pincode || "-"}</span>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Patient Snapshot (1/3 width) */}
        <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col justify-between">
          <div>
            <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#0a52c3]" />
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#0a52c3]">
                04. Patient Snapshot
              </h2>
            </div>
            
            {/* Dark Blue Dues Block */}
            <div className="bg-[#0a52c3] p-6 text-white">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-100 opacity-90">Pending Dues</span>
              <h3 className="text-3xl font-extrabold tracking-tight mt-1 flex items-baseline gap-1">
                {formatCurrency(pendingDues)}
              </h3>
            </div>

            {/* Snapshot Metrics Block */}
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Current Order</span>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <span className="text-sm font-extrabold text-slate-800 line-clamp-1">
                    {latestInvoice ? "Spectacles Order" : "No active orders"}
                  </span>
                  {latestInvoice && (
                    <Badge className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-[#e6f4fe] text-[#0a52c3] hover:bg-[#e6f4fe]">
                      {latestInvoice.fulfillmentStatus}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Last Visit</span>
                  <span className="text-sm font-extrabold text-slate-800 block mt-1">
                    {formatDateStr(lastVisitDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Doctor</span>
                  <span className="text-sm font-extrabold text-[#0a52c3] block mt-1 truncate">
                    {distRx?.doctorName || nearRx?.doctorName || "DR. S. MEHTA"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

      </div>

      {/* Row 2: Medical History (Collapsible Accordion) */}
      <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
        <button
          onClick={() => setMedHistoryExpanded(!medHistoryExpanded)}
          className="w-full py-4.5 px-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2 hover:bg-slate-100/60 transition-all duration-200 cursor-pointer text-left border-l-2 border-l-transparent hover:border-l-[#0a52c3]"
        >
          <div className="flex items-center gap-2">
            <span className="h-4.5 w-1.5 bg-[#0a52c3] rounded" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#0a52c3]">
              02. Medical History & Symptoms
            </h2>
          </div>
          {medHistoryExpanded ? (
            <ChevronUp className="h-4.5 w-4.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-4.5 w-4.5 text-slate-400" />
          )}
        </button>

        {medHistoryExpanded && (
          <CardContent className="p-6 transition-all animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-50/60 p-4.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Chief Complaint</span>
                <p className="text-sm font-semibold text-slate-700 mt-2 leading-relaxed">
                  {customer.chiefComplaint || "No details reported."}
                </p>
              </div>

              <div className="bg-slate-50/60 p-4.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Family History</span>
                <p className="text-sm font-semibold text-slate-700 mt-2 leading-relaxed">
                  {customer.familyHistory || "No reports recorded."}
                </p>
              </div>

              <div className="bg-slate-50/60 p-4.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Systemic Illness</span>
                <p className="text-sm font-semibold text-slate-700 mt-2 leading-relaxed">
                  {customer.systemicIllness || "None reported."}
                </p>
              </div>

              <div className="bg-slate-50/60 p-4.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Allergies</span>
                <p className="text-sm font-semibold text-slate-700 mt-2 leading-relaxed">
                  {customer.allergies || "None reported."}
                </p>
              </div>

            </div>
          </CardContent>
        )}
      </Card>

      {/* Row 3: Eye Prescriptions (Collapsible Accordion) */}
      <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
        <button
          onClick={() => setPrescriptionsExpanded(!prescriptionsExpanded)}
          className="w-full py-4.5 px-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2 hover:bg-slate-100/60 transition-all duration-200 cursor-pointer text-left border-l-2 border-l-transparent hover:border-l-[#0a52c3]"
        >
          <div className="flex items-center gap-2">
            <span className="h-4.5 w-1.5 bg-[#0a52c3] rounded" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#0a52c3]">
              03. Eye Prescription Details
            </h2>
          </div>
          {prescriptionsExpanded ? (
            <ChevronUp className="h-4.5 w-4.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-4.5 w-4.5 text-slate-400" />
          )}
        </button>

        {prescriptionsExpanded && (
          <CardContent className="p-6 transition-all animate-fade-in space-y-6">
            
            {latestPrescription ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Right Eye (OD) */}
                <div className="space-y-3 bg-slate-50/40 p-4.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <Eye className="h-3.5 w-3.5" />
                    Right Eye (OD)
                  </div>
                  <table className="w-full text-xs font-bold text-slate-700 text-center border-collapse">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wider text-slate-450 border-b border-slate-200/60">
                        <th className="py-2 text-left">Type</th>
                        <th className="py-2">SPH</th>
                        <th className="py-2">CYL</th>
                        <th className="py-2">Axis</th>
                        <th className="py-2">V/N</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 text-left text-[9px] uppercase tracking-wide text-slate-400">D.V.</td>
                        <td className="py-2 text-indigo-650">{formatPower(distRx?.rightSphere)}</td>
                        <td className="py-2">{formatPower(distRx?.rightCylinder)}</td>
                        <td className="py-2">{formatAxis(distRx?.rightAxis)}</td>
                        <td className="py-2 text-slate-500">{distRx?.rightNv || "-"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left text-[9px] uppercase tracking-wide text-slate-400">N.V.</td>
                        <td className="py-2 text-indigo-650">{formatPower(nearRx?.rightSphere)}</td>
                        <td className="py-2">{formatPower(nearRx?.rightCylinder)}</td>
                        <td className="py-2">{formatAxis(nearRx?.rightAxis)}</td>
                        <td className="py-2 text-slate-500">{nearRx?.rightNv || "-"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left text-[9px] uppercase tracking-wide text-slate-400">ADD</td>
                        <td className="py-2">-</td>
                        <td className="py-2 text-indigo-650">{formatPower(distRx?.rightAdd || nearRx?.rightAdd)}</td>
                        <td className="py-2">-</td>
                        <td className="py-2">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Left Eye (OS) */}
                <div className="space-y-3 bg-slate-50/40 p-4.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <Eye className="h-3.5 w-3.5" />
                    Left Eye (OS)
                  </div>
                  <table className="w-full text-xs font-bold text-slate-700 text-center border-collapse">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wider text-slate-450 border-b border-slate-200/60">
                        <th className="py-2 text-left">Type</th>
                        <th className="py-2">SPH</th>
                        <th className="py-2">CYL</th>
                        <th className="py-2">Axis</th>
                        <th className="py-2">V/N</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 text-left text-[9px] uppercase tracking-wide text-slate-400">D.V.</td>
                        <td className="py-2 text-indigo-650">{formatPower(distRx?.leftSphere)}</td>
                        <td className="py-2">{formatPower(distRx?.leftCylinder)}</td>
                        <td className="py-2">{formatAxis(distRx?.leftAxis)}</td>
                        <td className="py-2 text-slate-500">{distRx?.leftNv || "-"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left text-[9px] uppercase tracking-wide text-slate-400">N.V.</td>
                        <td className="py-2 text-indigo-650">{formatPower(nearRx?.leftSphere)}</td>
                        <td className="py-2">{formatPower(nearRx?.leftCylinder)}</td>
                        <td className="py-2">{formatAxis(nearRx?.leftAxis)}</td>
                        <td className="py-2 text-slate-500">{nearRx?.leftNv || "-"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left text-[9px] uppercase tracking-wide text-slate-400">ADD</td>
                        <td className="py-2">-</td>
                        <td className="py-2 text-indigo-650">{formatPower(distRx?.leftAdd || nearRx?.leftAdd)}</td>
                        <td className="py-2">-</td>
                        <td className="py-2">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Prescription Metadata */}
                <div className="space-y-4 bg-slate-50/40 p-4.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    Prescription Specs
                  </div>
                  <div className="space-y-3 text-xs font-semibold text-slate-700">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lens Type</span>
                      <span className="text-slate-800 font-extrabold block mt-0.5">{latestPrescription.doctorName ? "Zeiss Digital Pro Lenses" : "Progressive, Anti-Reflective"}</span>
                    </div>
                    <div className="border-t border-slate-200/40 pt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Prescribed By</span>
                      <span className="text-indigo-650 font-extrabold block mt-0.5">{latestPrescription.prescribedBy || "Dr. Aris Thorne"}</span>
                    </div>
                    <div className="border-t border-slate-200/40 pt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Party Name</span>
                      <span className="text-slate-800 font-extrabold block mt-0.5">{latestPrescription.partyName || "Optical Precision Clinic"}</span>
                    </div>
                    <div className="border-t border-slate-200/40 pt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Frame Name</span>
                      <span className="text-slate-800 font-extrabold block mt-0.5">{latestPrescription.frameName || "Ray-Ban Wayfarer Classic"}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 text-xs font-semibold">
                No visual prescription history registered for this customer.
              </div>
            )}

          </CardContent>
        )}
      </Card>

      {/* Row 4: Recent Orders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Recent Orders
          </h2>
          <Link
            href="/shop/invoices"
            className="text-xs font-bold text-[#0a52c3] hover:text-[#004bb5] uppercase tracking-wider"
          >
            View All
          </Link>
        </div>

        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase font-bold bg-slate-50/40 border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-8 py-4">Invoice #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-8 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoices.length > 0 ? (
                  invoices.slice(0, 3).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-55/40 transition-colors">
                      <td className="px-8 py-4 font-mono font-bold text-[#0a52c3] text-xs">
                        <Link href={`/shop/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 text-xs">
                        {formatDateStr(inv.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-650 text-xs">
                        {inv.notes || "Spectacles Custom Assembly"}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 text-right text-xs">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-8 py-4 text-center">
                        <Badge className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase select-none ${
                          inv.status === "PAID" 
                            ? "bg-emerald-50 border-emerald-150 text-emerald-600 hover:bg-emerald-50" 
                            : "bg-amber-50 border-amber-150 text-amber-600 hover:bg-amber-50"
                        }`}>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs font-semibold text-slate-550">
                      No invoices recorded for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>



    </div>
  );
}
