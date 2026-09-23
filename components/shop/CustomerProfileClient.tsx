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
  Clock,
  Tag,
  Zap,
  Sparkles,
  Wallet
} from "lucide-react";
import { AddPrescriptionModal } from "@/components/shop/AddPrescriptionModal";
import { ClinicalPrescriptionCard } from "@/components/shop/ClinicalPrescriptionCard";
import { CustomerOrdersSection } from "@/components/shop/CustomerOrdersSection";
import type { OrderItem } from "@/services/order.service";
import { offlineDB } from "@/lib/offline/db";

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
  storeCredit?: string | number | null;
  isActive: boolean;
}

interface PrescriptionData {
  id: string;
  prescriptionType: "DISTANCE" | "NEAR";
  rxNumber?: string | null;
  rxCategory?: string | null;
  lensType?: string | null;
  caddRight?: string | null;
  caddLeft?: string | null;
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
  orders?: OrderItem[];
  creditLedger?: Array<{
    id: string;
    transactionType: string;
    amount: string;
    balanceBefore: string;
    balanceAfter: string;
    referenceType: string | null;
    referenceNumber: string | null;
    notes: string | null;
    createdAt: Date | string;
    performedByName?: string | null;
  }>;
  pendingDues: number;
  totalOrderValue?: number;
  totalOrdersCount: number;
  lastVisitDate: Date | string;
  latestPrescription: PrescriptionData | null;
  latestInvoice: InvoiceData | null;
}

interface CustomerProfileClientProps {
  initialProfile?: ProfileData | null;
  profile?: ProfileData | null;
  customerId?: string;
  canEditOrders?: boolean;
}

export function CustomerProfileClient({ initialProfile, profile: legacyProfile, customerId, canEditOrders = false }: CustomerProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(initialProfile || legacyProfile || null);
  const [isLoadingOffline, setIsLoadingOffline] = useState(!initialProfile && !legacyProfile);
  const [medHistoryExpanded, setMedHistoryExpanded] = useState(false);
  const [prescriptionsExpanded, setPrescriptionsExpanded] = useState(true);
  const [isAddRxModalOpen, setIsAddRxModalOpen] = useState(false);
  const [selectedRxIndex, setSelectedRxIndex] = useState(0);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setIsLoadingOffline(false);
      return;
    }
    if (!profile && customerId) {
      async function loadOfflineCustomer() {
        try {
          let cust = await offlineDB.cached_customers.get(customerId!);
          if (!cust) {
            cust = await offlineDB.cached_customers.where("phone").equals(customerId!).first();
          }
          if (!cust) {
            cust = await offlineDB.cached_customers.where("registrationId").equals(customerId!).first();
          }
          if (cust) {
            const [custInvoices, custOrders] = await Promise.all([
              offlineDB.cached_invoices
                .where("customerId")
                .equals(customerId!)
                .reverse()
                .sortBy("createdAt"),
              offlineDB.cached_orders
                .where("customerId")
                .equals(customerId!)
                .reverse()
                .sortBy("createdAt")
                .catch(() => []),
            ]);

            const mappedInvoices: InvoiceData[] = custInvoices.map((inv) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              total: inv.total,
              balanceDue: inv.balanceDue,
              status: inv.status as any,
              fulfillmentStatus: inv.fulfillmentStatus as any,
              createdAt: inv.createdAt,
              notes: inv.notes || null,
            }));

            const mappedOrders: OrderItem[] = custOrders.map((o) => ({
              id: o.id,
              orderNumber: (o as any).orderNumber || o.invoiceNumber,
              invoiceId: o.invoiceId,
              invoiceNumber: o.invoiceNumber,
              createdAt: new Date(o.createdAt),
              total: o.totalAmount,
              amountPaid: o.paidAmount,
              balanceDue: o.dueAmount,
              paymentMethod: (o as any).paymentMethod || "CASH",
              fulfillmentStatus: o.status,
              estimatedDelivery: o.deliveryDate || null,
              isRescheduled: false,
              customerId: o.customerId || "",
              customerName: o.customerName || cust.fullName,
              customerPhone: o.customerPhone || cust.phone,
              customerEmail: null,
              skus: [{ description: "Optical Item", quantity: o.itemsCount || 1, category: "FRAME", sku: "OFFLINE" }],
              categoryText: "Prescription Order",
              receipts: [],
            }));

            const pendingDues = mappedInvoices.reduce(
              (sum, inv) => sum + parseFloat(inv.balanceDue || "0"),
              0
            );

            setProfile({
              customer: {
                id: cust.id,
                fullName: cust.fullName || "Patient",
                registrationId: cust.registrationId || null,
                phone: cust.phone || "N/A",
                email: cust.email || null,
                dateOfBirth: cust.dateOfBirth || null,
                address: cust.address || null,
                city: cust.city || null,
                state: cust.state || null,
                pincode: cust.pincode || null,
                gender: cust.gender as any,
                bloodGroup: cust.bloodGroup || null,
                referredBy: cust.referredBy || null,
                chiefComplaint: null,
                familyHistory: null,
                systemicIllness: null,
                allergies: null,
                notes: "Local Offline Databank Record",
                storeCredit: cust.storeCredit || "0.00",
                isActive: true,
              },
              prescriptions: [],
              invoices: mappedInvoices,
              orders: mappedOrders,
              creditLedger: [],
              pendingDues,
              totalOrderValue: mappedOrders.reduce((sum, ord) => sum + (parseFloat(ord.total) || 0), 0),
              totalOrdersCount: mappedOrders.length || mappedInvoices.length,
              lastVisitDate: cust.updatedAt || new Date().toISOString(),
              latestPrescription: null,
              latestInvoice: mappedInvoices[0] || null,
            });
          }
        } catch (err) {
          console.warn("[CustomerProfileClient] Error reading offline patient data:", err);
        } finally {
          setIsLoadingOffline(false);
        }
      }
      loadOfflineCustomer();
    }
  }, [profile, customerId, initialProfile]);

  const customer = profile?.customer;
  const prescriptions = profile?.prescriptions || [];
  const invoices = profile?.invoices || [];
  const lastVisitDate = profile?.lastVisitDate || new Date();
  const latestInvoice = profile?.latestInvoice || null;

  const customerOrders: OrderItem[] = useMemo(() => {
    if (profile?.orders && profile.orders.length > 0) {
      return profile.orders;
    }
    return (profile?.invoices || [])
      .filter((inv) => inv.status !== "CANCELLED")
      .map((inv) => ({
        id: inv.id,
        orderNumber: inv.invoiceNumber,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: new Date(inv.createdAt),
        total: inv.total,
        amountPaid: String(Math.max(0, Number(inv.total) - Number(inv.balanceDue))),
        balanceDue: inv.balanceDue,
        paymentMethod: "CASH",
        fulfillmentStatus: inv.fulfillmentStatus || "PROCESSING",
        estimatedDelivery: null,
        isRescheduled: false,
        customerId: customer?.id || "",
        customerName: customer?.fullName || "",
        customerPhone: customer?.phone || null,
        customerEmail: customer?.email || null,
        skus: [{ description: inv.notes || "Optical Billing Order", quantity: 1, category: "FRAME", sku: null }],
        categoryText: "Prescription Order",
        receipts: [],
      }));
  }, [profile?.orders, profile?.invoices, customer]);

  // Compute Single-Source-of-Truth Pending Dues across Customer Profile
  const pendingDues = useMemo(() => {
    if (customerOrders && customerOrders.length > 0) {
      return customerOrders.reduce((sum, ord) => sum + (parseFloat(ord.balanceDue) || 0), 0);
    }
    return profile?.pendingDues || 0;
  }, [customerOrders, profile?.pendingDues]);

  // Compute Total Lifetime Order Value
  const totalOrderValue = useMemo(() => {
    if (customerOrders && customerOrders.length > 0) {
      return customerOrders
        .filter((o) => o.fulfillmentStatus !== "CANCELLED")
        .reduce((sum, ord) => sum + (parseFloat(ord.total) || 0), 0);
    }
    return profile?.totalOrderValue || 0;
  }, [customerOrders, profile?.totalOrderValue]);

  // Single-Source-of-Truth Latest Active Order for snapshot card
  const latestActiveOrder = useMemo(() => {
    if (customerOrders && customerOrders.length > 0) {
      return customerOrders[0];
    }
    return latestInvoice;
  }, [customerOrders, latestInvoice]);

  // Compute Automated Customer Tags based on habits & purchase history
  const autoTags = useMemo(() => {
    const tags: Array<{ name: string; label: string; color: string; desc: string }> = [];
    
    const totalSpent = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const orderCount = invoices.length;

    // 1. Spending & Value Tags
    if (totalSpent >= 15000 || orderCount >= 2) {
      tags.push({ name: "VIP", label: "👑 VIP Customer", color: "bg-blue-50 border-blue-200 text-blue-700", desc: "High-value repeat customer (> ₹15,000 spend)" });
    } else if (totalSpent >= 5000) {
      tags.push({ name: "PREMIUM", label: "💎 Premium Buyer", color: "bg-purple-50 border-purple-200 text-purple-700", desc: "High single order value buyer (> ₹5,000 spend)" });
    }

    // 2. Clinical & Rx Retest Tags
    if (prescriptions && prescriptions.length > 0) {
      const latestRx = prescriptions[0];
      const rxDate = new Date(latestRx.createdAt || Date.now());
      const daysOld = Math.floor((Date.now() - rxDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld > 180) {
        tags.push({ name: "RETEST_DUE", label: "👁 Eye Retest Due (>6 Mos)", color: "bg-amber-50 border-amber-200 text-amber-700", desc: "Prescription checkup is due" });
      }

      const rSph = Math.abs(parseFloat(latestRx.rightSphere || "0"));
      const lSph = Math.abs(parseFloat(latestRx.leftSphere || "0"));
      if (rSph >= 4.0 || lSph >= 4.0) {
        tags.push({ name: "HIGH_POWER", label: "🩺 High Power (|Sph| ≥ 4.0D)", color: "bg-rose-50 border-rose-200 text-rose-700", desc: "High spherical power prescription" });
      }
    }

    // 3. Product Habit Tags
    let boughtFrames = false;
    let boughtLenses = false;
    let boughtProgressive = false;

    invoices.forEach((inv) => {
      const notesStr = (inv.notes || "").toLowerCase();
      if (notesStr.includes("frame")) boughtFrames = true;
      if (notesStr.includes("lens")) boughtLenses = true;
      if (notesStr.includes("progressive")) boughtProgressive = true;
    });

    if (boughtFrames || invoices.length > 0) {
      tags.push({ name: "FRAME_BUYER", label: "👓 Frame Buyer", color: "bg-emerald-50 border-emerald-200 text-emerald-700", desc: "Purchased optical frames" });
    }
    if (boughtLenses || prescriptions.length > 0) {
      tags.push({ name: "LENS_BUYER", label: "🔍 Lens Buyer", color: "bg-indigo-50 border-indigo-200 text-indigo-700", desc: "Purchased prescription lenses" });
    }
    if (boughtProgressive) {
      tags.push({ name: "PROGRESSIVE", label: "⚡ Progressive Wearer", color: "bg-purple-50 border-purple-200 text-purple-700", desc: "Multifocal progressive lens user" });
    }

    return tags;
  }, [invoices, prescriptions]);

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

  // Group prescriptions by rxNumber or date for full historical timeline
  const groupedPrescriptions = useMemo(() => {
    if (!prescriptions || prescriptions.length === 0) return [];
    
    const map = new Map<string, { date: string; doctor: string; distRx: PrescriptionData | null; nearRx: PrescriptionData | null }>();

    for (const p of prescriptions) {
      const dateKey = p.prescribedAt ? String(p.prescribedAt) : new Date(p.createdAt).toISOString().split("T")[0];
      const key = p.rxNumber ? `${p.rxNumber}_${dateKey}` : dateKey;
      const doc = p.prescribedBy || p.doctorName || "Standard Exam";

      if (!map.has(key)) {
        map.set(key, {
          date: dateKey,
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

  if (isLoadingOffline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 space-y-3">
        <Loader2 className="w-8 h-8 text-[#0a52c3] animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading patient profile from offline databank...</p>
      </div>
    );
  }

  if (!profile || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
          ⚠️
        </div>
        <h3 className="text-lg font-bold text-slate-900">Patient Record Unavailable Offline</h3>
        <p className="text-xs text-slate-500 max-w-md">
          This patient record has not been synchronized to your local offline databank yet. Reconnect to internet or return to the customers directory.
        </p>
        <Button onClick={() => router.push("/shop/customers")} variant="outline" size="sm">
          Return to Customers
        </Button>
      </div>
    );
  }

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

      {/* Compact Header Bar with Auto-Tagging Badge Cloud */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          {/* Action Buttons */}
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

        {/* AUTOMATED CUSTOMER TAGS CLOUD */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Auto-Assigned Habit Tags:
          </span>
          {autoTags.map((tag) => (
            <span
              key={tag.name}
              title={tag.desc}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all shadow-2xs ${tag.color}`}
            >
              {tag.label}
            </span>
          ))}
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
              {/* Compact High-Density Dues & Store Credit Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Dues Card */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  pendingDues > 0 
                    ? "bg-rose-50/70 border-rose-200/80 text-rose-900" 
                    : "bg-emerald-50/70 border-emerald-200/80 text-emerald-900"
                }`}>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-wider block opacity-75">
                      Pending Dues
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5">
                      {formatCurrency(pendingDues)}
                    </h3>
                  </div>
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    pendingDues > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                  }`}>
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>

                {/* Available Store Credit Card */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  parseFloat(customer.storeCredit?.toString() || "0") > 0
                    ? "bg-blue-50/70 border-blue-200/80 text-[#0a52c3]"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-wider block opacity-75">
                      Store Credit
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5">
                      {formatCurrency(parseFloat(customer.storeCredit?.toString() || "0"))}
                    </h3>
                  </div>
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    parseFloat(customer.storeCredit?.toString() || "0") > 0
                      ? "bg-blue-100 text-[#0a52c3]"
                      : "bg-slate-200/70 text-slate-500"
                  }`}>
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Snapshot Metrics */}
              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Current Order</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {latestActiveOrder ? `Invoice #${latestActiveOrder.invoiceNumber}` : "No active orders"}
                    </span>
                    {latestActiveOrder && (
                      <Badge className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-blue-50 text-[#0a52c3] border border-blue-150">
                        {latestActiveOrder.fulfillmentStatus}
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

      {/* Row 3: Eye Prescriptions History */}
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
                
                {/* Smart Prescription Record Selector Dropdown */}
                {groupedPrescriptions.length > 1 ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1 shrink-0">
                        <Clock className="h-3.5 w-3.5 text-[#0a52c3]" />
                        Select Prescription Record:
                      </span>
                      <div className="relative min-w-[260px] sm:min-w-[340px]">
                        <select
                          value={selectedRxIndex}
                          onChange={(e) => setSelectedRxIndex(Number(e.target.value))}
                          className="w-full h-8 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] appearance-none cursor-pointer transition-all shadow-2xs"
                        >
                          {groupedPrescriptions.map((g, idx) => {
                            const rxNum = g.distRx?.rxNumber || g.nearRx?.rxNumber;
                            const rSph = g.distRx?.rightSphere || g.nearRx?.rightSphere;
                            const lSph = g.distRx?.leftSphere || g.nearRx?.leftSphere;
                            const powerSummary = (rSph || lSph) ? ` [OD: ${formatPower(rSph)}, OS: ${formatPower(lSph)}]` : "";
                            const isLatest = idx === 0;
                            return (
                              <option key={idx} value={idx}>
                                {isLatest ? "★ Latest: " : `#${idx + 1}: `}{formatDateStr(g.date)} — {g.doctor}{rxNum ? ` (${rxNum})` : ""}{powerSummary}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500">
                      Showing <span className="font-bold text-slate-800">{selectedRxIndex + 1}</span> of <span className="font-bold text-slate-800">{groupedPrescriptions.length}</span> recorded Rx
                    </div>
                  </div>
                ) : groupedPrescriptions.length === 1 ? (
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        Prescription Record:
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatDateStr(groupedPrescriptions[0].date)} — {groupedPrescriptions[0].doctor}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-150">
                        Latest / Active
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Modern Clinical Prescription Card Display */}
                <ClinicalPrescriptionCard
                  readOnly={true}
                  values={{
                    rxNumber: activeRxMeta?.rxNumber || `PR-${activeGroup?.date ? activeGroup.date.replace(/-/g, "").slice(-4) : "8821"}`,
                    rxCategory: activeRxMeta?.rxCategory || "SPECTACLES",
                    lensType: activeRxMeta?.lensType || activeRxMeta?.notes || "Single Vision",
                    doctorName: activeRxMeta?.prescribedBy || activeRxMeta?.doctorName || "Dr. Optometrist",
                    prescribedAt: formatDateStr(activeGroup?.date),
                    rightSphere: formatPower(activeDistRx?.rightSphere),
                    rightCylinder: formatPower(activeDistRx?.rightCylinder),
                    rightAxis: activeDistRx?.rightAxis ? `${activeDistRx.rightAxis}` : "",
                    rightAdd: formatPower(activeDistRx?.rightAdd || activeNearRx?.rightAdd),
                    rightNv: activeDistRx?.rightNv || activeNearRx?.rightNv || "6/6",
                    pdRight: activeDistRx?.pdRight || activeDistRx?.pd || "31.5",
                    caddRight: (activeDistRx as any)?.caddRight || "-",
                    leftSphere: formatPower(activeDistRx?.leftSphere),
                    leftCylinder: formatPower(activeDistRx?.leftCylinder),
                    leftAxis: activeDistRx?.leftAxis ? `${activeDistRx.leftAxis}` : "",
                    leftAdd: formatPower(activeDistRx?.leftAdd || activeNearRx?.leftAdd),
                    leftNv: activeDistRx?.leftNv || activeNearRx?.leftNv || "6/6",
                    pdLeft: activeDistRx?.pdLeft || activeDistRx?.pd || "31.5",
                    caddLeft: (activeDistRx as any)?.caddLeft || "-",
                  }}
                />

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

      {/* Row 4: Orders & Invoices History with Parity Table */}
      {customer && (
        <CustomerOrdersSection
          orders={customerOrders}
          customer={{
            id: customer.id,
            fullName: customer.fullName,
            phone: customer.phone,
          }}
          canEditOrders={canEditOrders}
          onOrderUpdated={() => {
            router.refresh();
          }}
        />
      )}

      {/* Row 5: Store Credit History & Ledger */}
      {profile.creditLedger && profile.creditLedger.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900 uppercase flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-[#0a52c3]" />
              <span>Store Credit Ledger History</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              Current Available: <strong className="text-[#0a52c3] font-black">{formatCurrency(parseFloat(customer.storeCredit?.toString() || "0"))}</strong>
            </span>
          </div>

          <Card className="border-slate-200/80 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] text-slate-400 uppercase font-extrabold bg-slate-50/50 border-b border-slate-100 tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Date & Time</th>
                    <th className="px-4 py-2.5">Transaction</th>
                    <th className="px-4 py-2.5">Reference #</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5 text-right">Balance After</th>
                    <th className="px-4 py-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {profile.creditLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-700">
                        {formatDateStr(entry.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          entry.transactionType === "CREDIT_ISSUED"
                            ? "bg-blue-50 text-[#0a52c3] border border-blue-150"
                            : "bg-amber-50 text-amber-700 border border-amber-150"
                        }`}>
                          {entry.transactionType === "CREDIT_ISSUED" ? "Credit Added (Return)" : "Credit Redeemed (Sale)"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                        {entry.referenceNumber || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-extrabold">
                        <span className={entry.transactionType === "CREDIT_ISSUED" ? "text-emerald-600" : "text-amber-600"}>
                          {entry.transactionType === "CREDIT_ISSUED" ? "+" : "-"}
                          {formatCurrency(parseFloat(entry.amount))}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                        {formatCurrency(parseFloat(entry.balanceAfter))}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 font-medium">
                        {entry.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Add New Prescription Modal */}
      <AddPrescriptionModal
        isOpen={isAddRxModalOpen}
        onClose={() => setIsAddRxModalOpen(false)}
        customerId={customer.id}
        customerName={customer.fullName}
        onPrescriptionAdded={(newRx) => {
          setProfile((prev) =>
            prev ? { ...prev, prescriptions: [newRx, ...(prev.prescriptions || [])] } : prev
          );
        }}
      />

    </div>
  );
}
