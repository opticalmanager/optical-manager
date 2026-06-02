"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  registerPatientAndInvoiceAction,
  getNextRegistrationIdAction,
  getPatientDetailsAction,
} from "@/actions/patient.actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronDown,
  RotateCcw,
  Search,
  Eye,
  Check,
  Plus,
  Trash2,
  Loader2,
  DollarSign,
  Briefcase,
  Smartphone,
  CreditCard,
  CheckCircle,
} from "lucide-react";

interface LineItem {
  inventoryId: string | null;
  description: string;
  sku: string;
  quantity: number | "";
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  taxableSubtotal: number;
  rowTotal: number;
  maxQty: number;

  // Autocomplete states per row item
  searchQuery: string;
  suggestions: any[];
  showDropdown: boolean;
  isSearching: boolean;
}

export function NewInvoiceForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [regId, setRegId] = useState("OP-2026-XXXX");

  // Load Existing Patient Overlay State
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Section 01: Basic Details States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [address, setAddress] = useState("");

  // Section 02: Medical History States
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [systemicIllness, setSystemicIllness] = useState("");
  const [allergies, setAllergies] = useState("");

  // Section 03: Eye Prescription States
  const [distanceEnabled, setDistanceEnabled] = useState(true);
  const [nearEnabled, setNearEnabled] = useState(true);

  // Distance Prescription Right/Left
  const [distODSphere, setDistODSphere] = useState("");
  const [distODCylinder, setDistODCylinder] = useState("");
  const [distODAxis, setDistODAxis] = useState("");
  const [distODNv, setDistODNv] = useState("");
  const [distODAdd, setDistODAdd] = useState("");

  const [distOSSphere, setDistOSSphere] = useState("");
  const [distOSCylinder, setDistOSCylinder] = useState("");
  const [distOSAxis, setDistOSAxis] = useState("");
  const [distOSNv, setDistOSNv] = useState("");
  const [distOSAdd, setDistOSAdd] = useState("");

  // Near Prescription Right/Left
  const [nearODSphere, setNearODSphere] = useState("");
  const [nearODCylinder, setNearODCylinder] = useState("");
  const [nearODAxis, setNearODAxis] = useState("");
  const [nearODNv, setNearODNv] = useState("");

  const [nearOSSphere, setNearOSSphere] = useState("");
  const [nearOSCylinder, setNearOSCylinder] = useState("");
  const [nearOSAxis, setNearOSAxis] = useState("");
  const [nearOSNv, setNearOSNv] = useState("");

  // Clinical Options
  const [lensType, setLensType] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [partyName, setPartyName] = useState("");
  const [frameName, setFrameName] = useState("");

  // Section 04: Product Selection (Order Line Items)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      inventoryId: null,
      description: "",
      sku: "",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      cgstPercent: 0,
      cgstAmount: 0,
      sgstPercent: 0,
      sgstAmount: 0,
      igstPercent: 0,
      igstAmount: 0,
      taxableSubtotal: 0,
      rowTotal: 0,
      maxQty: 999,
      searchQuery: "",
      suggestions: [],
      showDropdown: false,
      isSearching: false,
    },
  ]);

  // Timers for row search debouncing
  const searchTimeouts = useRef<{ [key: number]: NodeJS.Timeout }>({});

  // Section 05: Payments & Summary
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "BANK_TRANSFER">("CASH");
  const [paymentType, setPaymentType] = useState<"FULL" | "PARTIAL">("FULL");
  const [amountPaidOverride, setAmountPaidOverride] = useState<string>("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Load Next Registration ID on Load
  useEffect(() => {
    async function loadNextId() {
      try {
        const res = await getNextRegistrationIdAction();
        if (res.success && res.data) {
          setRegId(res.data);
        }
      } catch (err) {
        console.error("Failed to load registration ID sequence:", err);
      }
    }
    if (!selectedCustomerId) {
      loadNextId();
    }
  }, [selectedCustomerId]);

  // Debounced Patient Search Trigger
  useEffect(() => {
    if (patientQuery.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingPatient(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(patientQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setPatientResults(data.customers || []);
        }
      } catch (err) {
        console.error("Patient search failed:", err);
      } finally {
        setIsSearchingPatient(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [patientQuery]);

  // Load Existing Patient Profiles & Prescriptions
  const handleSelectPatient = async (customerId: string) => {
    setShowPatientSearch(false);
    setSelectedCustomerId(customerId);
    const loadingToast = toast.loading("Loading clinical databanks for patient...");

    try {
      const res = await getPatientDetailsAction(customerId);
      if (res.success && res.data) {
        const { customer, distancePrescription, nearPrescription } = res.data;

        // Auto-fill Section 01
        setFullName(customer.fullName || "");
        setEmail(customer.email || "");
        setPhone(customer.phone || "");
        setDob(customer.dateOfBirth || "");
        setGender(customer.gender || "");
        setBloodGroup(customer.bloodGroup || "");
        setReferredBy(customer.referredBy || "");
        setAddress(customer.address || "");
        setRegId(customer.registrationId || "OP-2026-XXXX");

        // Auto-fill Section 02
        setChiefComplaint(customer.chiefComplaint || "");
        setFamilyHistory(customer.familyHistory || "");
        setSystemicIllness(customer.systemicIllness || "");
        setAllergies(customer.allergies || "");

        // Auto-fill Section 03 Distance Prescription
        if (distancePrescription) {
          setDistanceEnabled(true);
          setDistODSphere(distancePrescription.rightSphere || "");
          setDistODCylinder(distancePrescription.rightCylinder || "");
          setDistODAxis(distancePrescription.rightAxis || "");
          setDistODNv(distancePrescription.rightNv || "");
          setDistODAdd(distancePrescription.rightAdd || "");

          setDistOSSphere(distancePrescription.leftSphere || "");
          setDistOSCylinder(distancePrescription.leftCylinder || "");
          setDistOSAxis(distancePrescription.leftAxis || "");
          setDistOSNv(distancePrescription.leftNv || "");
          setDistOSAdd(distancePrescription.leftAdd || "");

          setDoctorName(distancePrescription.doctorName || "");
          setPartyName(distancePrescription.partyName || "");
          setFrameName(distancePrescription.frameName || "");
        } else {
          setDistanceEnabled(false);
        }

        // Auto-fill Section 03 Near Prescription
        if (nearPrescription) {
          setNearEnabled(true);
          setNearODSphere(nearPrescription.rightSphere || "");
          setNearODCylinder(nearPrescription.rightCylinder || "");
          setNearODAxis(nearPrescription.rightAxis || "");
          setNearODNv(nearPrescription.rightNv || "");

          setNearOSSphere(nearPrescription.leftSphere || "");
          setNearOSCylinder(nearPrescription.leftCylinder || "");
          setNearOSAxis(nearPrescription.leftAxis || "");
          setNearOSNv(nearPrescription.leftNv || "");
        } else {
          setNearEnabled(false);
        }

        if (distancePrescription?.notes || nearPrescription?.notes) {
          setLensType(distancePrescription?.notes || nearPrescription?.notes || "");
        }

        toast.success("Patient clinical ledger loaded successfully!", { id: loadingToast });
      } else {
        toast.error(res.message || "Failed to load patient profile details.", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Failed to fetch patient details.", { id: loadingToast });
    }
  };

  // Row Search Change Handler (Independent per row debouncing)
  const handleRowSearchChange = (index: number, query: string) => {
    // 1. Immediately update local row searchQuery state
    const updated = lineItems.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          searchQuery: query,
          description: query, // Synced to description until selected
          showDropdown: query.trim().length >= 1,
        };
      }
      return item;
    });
    setLineItems(updated);

    // 2. Clear previous debounced timeouts
    if (searchTimeouts.current[index]) {
      clearTimeout(searchTimeouts.current[index]);
    }

    if (query.trim().length < 1) {
      return;
    }

    // 3. Set debounced API trigger
    searchTimeouts.current[index] = setTimeout(async () => {
      // Toggle row isSearching flag
      setLineItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, isSearching: true } : item))
      );

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setLineItems((prev) =>
            prev.map((item, idx) =>
              idx === index
                ? {
                    ...item,
                    suggestions: data.inventory || [],
                    isSearching: false,
                  }
                : item
            )
          );
        }
      } catch (err) {
        console.error(`Row ${index} product lookup failed:`, err);
        setLineItems((prev) =>
          prev.map((item, idx) => (idx === index ? { ...item, isSearching: false } : item))
        );
      }
    }, 300);
  };

  // Add Item Table Actions
  const handleAddRow = () => {
    setLineItems([
      ...lineItems,
      {
        inventoryId: null,
        description: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        cgstPercent: 0,
        cgstAmount: 0,
        sgstPercent: 0,
        sgstAmount: 0,
        igstPercent: 0,
        igstAmount: 0,
        taxableSubtotal: 0,
        rowTotal: 0,
        maxQty: 999,
        searchQuery: "",
        suggestions: [],
        showDropdown: false,
        isSearching: false,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (lineItems.length === 1) {
      toast.warning("Invoices must contain at least one row item.");
      return;
    }
    if (searchTimeouts.current[index]) {
      clearTimeout(searchTimeouts.current[index]);
    }
    const updated = lineItems.filter((_, idx) => idx !== index);
    setLineItems(updated);
  };

  const updateLineItem = (index: number, fields: Partial<LineItem>) => {
    const updated = lineItems.map((item, idx) => {
      if (idx === index) {
        const merged = { ...item, ...fields };
        
        // Handle potential empty/blank quantity or price while editing
        const qty = merged.quantity === "" || isNaN(merged.quantity as number) ? 0 : (merged.quantity as number);
        const price = isNaN(merged.unitPrice) ? 0 : merged.unitPrice;
        
        const lineSubtotal = qty * price;
        merged.discountAmount = lineSubtotal * ((merged.discountPercent || 0) / 100);
        merged.taxableSubtotal = lineSubtotal - merged.discountAmount;
        
        merged.cgstAmount = merged.taxableSubtotal * ((merged.cgstPercent || 0) / 100);
        merged.sgstAmount = merged.taxableSubtotal * ((merged.sgstPercent || 0) / 100);
        merged.igstAmount = merged.taxableSubtotal * ((merged.igstPercent || 0) / 100);
        merged.rowTotal =
          merged.taxableSubtotal + merged.cgstAmount + merged.sgstAmount + merged.igstAmount;
        return merged;
      }
      return item;
    });
    setLineItems(updated);
  };

  const handleSelectProduct = (index: number, product: any) => {
    const price = parseFloat(product.price) || 0;
    const cgst = parseFloat(product.cgstPercent) || 0;
    const sgst = parseFloat(product.sgstPercent) || 0;
    const igst = parseFloat(product.igstPercent) || 0;
    const maxStock = parseInt(product.quantity, 10) || 0;

    if (maxStock <= 0) {
      toast.error(`Out of stock! "${product.name}" has 0 units available.`);
    }

    updateLineItem(index, {
      inventoryId: product.id,
      description: product.name,
      sku: product.sku || "N/A",
      unitPrice: price,
      cgstPercent: cgst,
      sgstPercent: sgst,
      igstPercent: igst,
      maxQty: maxStock,
      searchQuery: product.name,
      suggestions: [],
      showDropdown: false,
    });
    toast.success(`Loaded "${product.name}" into billing row.`);
  };

  // Close all row dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside() {
      setLineItems((prev) => prev.map((item) => ({ ...item, showDropdown: false })));
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedCustomerId(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setDob("");
    setGender("");
    setBloodGroup("");
    setReferredBy("");
    setAddress("");
    setChiefComplaint("");
    setFamilyHistory("");
    setSystemicIllness("");
    setAllergies("");

    setDistODSphere("");
    setDistODCylinder("");
    setDistODAxis("");
    setDistODNv("");
    setDistODAdd("");
    setDistOSSphere("");
    setDistOSCylinder("");
    setDistOSAxis("");
    setDistOSNv("");
    setDistOSAdd("");

    setNearODSphere("");
    setNearODCylinder("");
    setNearODAxis("");
    setNearODNv("");
    setNearOSSphere("");
    setNearOSCylinder("");
    setNearOSAxis("");
    setNearOSNv("");

    setLensType("");
    setDoctorName("");
    setPartyName("");
    setFrameName("");

    // Clear active timeouts
    Object.keys(searchTimeouts.current).forEach((k) =>
      clearTimeout(searchTimeouts.current[parseInt(k, 10)])
    );

    setLineItems([
      {
        inventoryId: null,
        description: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        cgstPercent: 0,
        cgstAmount: 0,
        sgstPercent: 0,
        sgstAmount: 0,
        igstPercent: 0,
        igstAmount: 0,
        taxableSubtotal: 0,
        rowTotal: 0,
        maxQty: 999,
        searchQuery: "",
        suggestions: [],
        showDropdown: false,
        isSearching: false,
      },
    ]);
    setPaymentMethod("CASH");
    setPaymentType("FULL");
    setAmountPaidOverride("");
    setInvoiceNotes("");
    toast.success("Form cleared successfully.");
  };

  // Reactive Total Calculations
  const calculatedSubtotal = lineItems.reduce(
    (sum, item) => sum + (item.quantity === "" ? 0 : item.quantity) * item.unitPrice,
    0
  );

  const calculatedDiscount = lineItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const taxableValue = calculatedSubtotal - calculatedDiscount;

  const summedCGST = lineItems.reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
  const summedSGST = lineItems.reduce((sum, item) => sum + (item.sgstAmount || 0), 0);
  const summedIGST = lineItems.reduce((sum, item) => sum + (item.igstAmount || 0), 0);

  const totalGSTTax = summedCGST + summedSGST + summedIGST;
  const grandTotal = taxableValue + totalGSTTax;

  // Split calculations
  const finalAmountPaid = paymentType === "FULL" ? grandTotal : parseFloat(amountPaidOverride) || 0;
  const finalBalanceDue = Math.max(0, grandTotal - finalAmountPaid);

  // Handle Form Submission (Save Patient + Unified Invoice)
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim()) {
      toast.error("Please enter patient Full Name and Mobile Number.");
      return;
    }

    if (lineItems.length === 0 || !lineItems[0].description) {
      toast.error("Please add at least one billed product to the items ledger.");
      return;
    }

    // Verify blank or invalid quantities
    for (const item of lineItems) {
      if (item.quantity === "" || isNaN(item.quantity) || item.quantity <= 0) {
        toast.error(`Please enter a valid Quantity (greater than 0) for item "${item.description || "Billed Product"}".`);
        return;
      }
    }

    // Verify stock bounds
    for (const item of lineItems) {
      if (item.inventoryId && (item.quantity as number) > item.maxQty) {
        toast.error(
          `Out of stock! Billed count of ${item.quantity} for "${item.description}" exceeds available stock (${item.maxQty} left).`
        );
        return;
      }
    }

    setIsPending(true);
    const savingToast = toast.loading("Processing transaction ledger and printing invoice...");

    try {
      const payload = {
        customer: {
          id: selectedCustomerId || undefined,
          fullName,
          email: email || undefined,
          phone,
          dateOfBirth: dob || undefined,
          address: address || undefined,
          gender: gender || undefined,
          bloodGroup: bloodGroup || undefined,
          referredBy: referredBy || undefined,
          chiefComplaint: chiefComplaint || undefined,
          familyHistory: familyHistory || undefined,
          systemicIllness: systemicIllness || undefined,
          allergies: allergies || undefined,
        },
        prescriptionEnabled: true,
        prescriptionType: {
          distance: distanceEnabled,
          near: nearEnabled,
        },
        distancePrescription: {
          rightSphere: distODSphere || undefined,
          rightCylinder: distODCylinder || undefined,
          rightAxis: distODAxis || undefined,
          rightNv: distODNv || undefined,
          rightAdd: distODAdd || undefined,
          leftSphere: distOSSphere || undefined,
          leftCylinder: distOSCylinder || undefined,
          leftAxis: distOSAxis || undefined,
          leftNv: distOSNv || undefined,
          leftAdd: distOSAdd || undefined,
        },
        nearPrescription: {
          rightSphere: nearODSphere || undefined,
          rightCylinder: nearODCylinder || undefined,
          rightAxis: nearODAxis || undefined,
          rightNv: nearODNv || undefined,
          leftSphere: nearOSSphere || undefined,
          leftCylinder: nearOSCylinder || undefined,
          leftAxis: nearOSAxis || undefined,
          leftNv: nearOSNv || undefined,
        },
        doctorName: doctorName || undefined,
        partyName: partyName || undefined,
        frameName: frameName || undefined,
        estimatedDelivery: undefined,
        specialInstructions: undefined,
        prescriptionNotes: lensType || undefined,
        invoiceEnabled: true,
        invoiceItems: lineItems.map((item) => {
          const qty = item.quantity === "" ? 0 : (item.quantity as number);
          const itemSubtotal = qty * item.unitPrice;

          return {
            inventoryId: item.inventoryId,
            description: item.description,
            quantity: qty,
            unitPrice: item.unitPrice,
            subtotal: itemSubtotal,
            discountPercent: item.discountPercent || 0,
            discountAmount: item.discountAmount || 0,
            cgstPercent: item.cgstPercent || 0,
            cgstAmount: item.cgstAmount || 0,
            sgstPercent: item.sgstPercent || 0,
            sgstAmount: item.sgstAmount || 0,
            igstPercent: item.igstPercent || 0,
            igstAmount: item.igstAmount || 0,
          };
        }),
        discountPercent: calculatedSubtotal > 0 ? (calculatedDiscount / calculatedSubtotal) * 100 : 0,
        taxPercent: taxableValue > 0 ? (totalGSTTax / taxableValue) * 100 : 0,
        paymentMethod,
        amountPaid: finalAmountPaid,
        balanceDue: finalBalanceDue,
        notes: invoiceNotes || undefined,
      };

      const res = await registerPatientAndInvoiceAction(payload);
      if (res.success && res.data?.invoice?.id) {
        toast.success("Transaction success! Invoice compiled.", { id: savingToast });
        router.push(`/shop/invoices/${res.data.invoice.id}`);
      } else {
        toast.error(res.message || "Failed to process patient invoice transaction.", {
          id: savingToast,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Unexpected transaction error occurred.", { id: savingToast });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmitInvoice}
      className="max-w-7xl mx-auto space-y-8 pb-20 select-none animate-fade-in text-slate-800"
    >
      {/* Top Breadcrumbs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 bg-slate-100/70 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg transition-all mb-3 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Checkout Billing Invoice
          </h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            <span>Dashboard</span>
            <span>/</span>
            <span>Invoicing</span>
            <span>/</span>
            <span className="text-[#0a52c3]">New Checkout</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer mr-3"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear Form
          </button>

          <button
            type="button"
            onClick={() => toast.success("Draft saved successfully!")}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-colors cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-4 rounded-xl bg-[#0a52c3] hover:bg-[#004bb5] text-xs font-bold text-white shadow-sm shadow-[#0a52c3]/10 transition-colors cursor-pointer"
          >
            Create Invoice
          </button>
        </div>
      </div>

      {/* SECTION 1: BASIC DETAILS & LOAD CUSTOMER */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md/5">
        <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 bg-[#0a52c3] rounded" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0a52c3]">
              01. Basic Details
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowPatientSearch(!showPatientSearch)}
            className="px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 text-[10px] font-extrabold uppercase text-[#0a52c3] tracking-wide transition-all cursor-pointer flex items-center gap-1"
          >
            <Search className="h-3.5 w-3.5" />
            Load Existing Patient
          </button>
        </div>

        {showPatientSearch && (
          <div className="p-5 bg-indigo-50/20 border-b border-slate-100 space-y-3 transition-all animate-fade-in">
            <label className="block text-[10px] font-extrabold uppercase text-[#0a52c3] tracking-wider">
              Search Patient Records
            </label>
            <div className="relative max-w-md">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type Name, Phone, or Registration ID (e.g. OP-2024-)..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="w-full bg-transparent text-xs outline-none text-slate-800 placeholder:text-slate-350"
                  autoFocus
                />
                {isSearchingPatient && (
                  <Loader2 className="h-4 w-4 text-[#0a52c3] animate-spin" />
                )}
              </div>

              {patientResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {patientResults.map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => handleSelectPatient(pat.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors text-xs flex justify-between items-center group cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-slate-700 block">{pat.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ID: {pat.registrationId || "N/A"} • Phone: {pat.phone}
                        </span>
                      </div>
                      <CheckCircle className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              )}

              {!isSearchingPatient && patientQuery.length >= 2 && patientResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 shadow-xl z-35">
                  No patients matching "{patientQuery}" found in databanks.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Registration ID
              </label>
              <div className="text-2xl font-extrabold tracking-wide text-[#0a52c3] h-10 flex items-center">
                {regId}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Julianne V. Sterling"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Date of Birth
              </label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Gender
              </label>
              <div className="relative">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 appearance-none cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Blood Group
              </label>
              <div className="relative">
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 appearance-none cursor-pointer"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A_POSITIVE">A+</option>
                  <option value="A_NEGATIVE">A-</option>
                  <option value="B_POSITIVE">B+</option>
                  <option value="B_NEGATIVE">B-</option>
                  <option value="AB_POSITIVE">AB+</option>
                  <option value="AB_NEGATIVE">AB-</option>
                  <option value="O_POSITIVE">O+</option>
                  <option value="O_NEGATIVE">O-</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Referred By
              </label>
              <Input
                type="text"
                placeholder="Dr. Sarah Jenkins"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-355 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Full Address
              </label>
              <Input
                type="text"
                placeholder="742 Evergreen Terrace, Springfield, IL 62704"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-355 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: MEDICAL HISTORY */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md/5">
        <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
          <span className="h-4 w-1 bg-[#0a52c3] rounded" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0a52c3]">
            02. Medical History & Symptoms
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Chief Complaint
              </label>
              <textarea
                placeholder="Describe symptoms, duration, and severity..."
                rows={3}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 font-medium placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Family History
              </label>
              <textarea
                placeholder="Ocular conditions in blood relatives..."
                rows={3}
                value={familyHistory}
                onChange={(e) => setFamilyHistory(e.target.value)}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 font-medium placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Systemic Illness
              </label>
              <textarea
                placeholder="e.g. Diabetes, Hypertension..."
                rows={3}
                value={systemicIllness}
                onChange={(e) => setSystemicIllness(e.target.value)}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 font-medium placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Allergies
              </label>
              <textarea
                placeholder="Medication or environmental allergies..."
                rows={3}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 font-medium placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: EYE EXAMINATION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md/5">
        <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 bg-[#0a52c3] rounded" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0a52c3]">
              03. Eye Prescription Details
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => setDistanceEnabled(!distanceEnabled)}
              className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                distanceEnabled
                  ? "bg-[#0a52c3] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              Distance
            </button>
            <button
              type="button"
              onClick={() => setNearEnabled(!nearEnabled)}
              className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer ${
                nearEnabled
                  ? "bg-[#0a52c3] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              Near
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* RIGHT EYE GRID */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Eye className="h-4 w-4 text-indigo-500" /> Right Eye (OD)
                </div>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="py-2.5 w-16 text-left px-4">PWR</th>
                        <th className="py-2.5 px-1.5">SPH</th>
                        <th className="py-2.5 px-1.5">CYL</th>
                        <th className="py-2.5 px-1.5">AXIS</th>
                        <th className="py-2.5 px-1.5">V/N</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      <tr className={distanceEnabled ? "" : "opacity-40"}>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">D.V.</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+0.00"
                            value={distODSphere}
                            onChange={(e) => setDistODSphere(e.target.value)}
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.25"
                            value={distODCylinder}
                            onChange={(e) => setDistODCylinder(e.target.value)}
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="180"
                            value={distODAxis}
                            onChange={(e) => setDistODAxis(e.target.value)}
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="6/6"
                            value={distODNv}
                            onChange={(e) => setDistODNv(e.target.value)}
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                      </tr>

                      <tr className={nearEnabled ? "" : "opacity-40"}>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">N.V.</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+1.50"
                            value={nearODSphere}
                            onChange={(e) => setNearODSphere(e.target.value)}
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.25"
                            value={nearODCylinder}
                            onChange={(e) => setNearODCylinder(e.target.value)}
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="180"
                            value={nearODAxis}
                            onChange={(e) => setNearODAxis(e.target.value)}
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="N6"
                            value={nearODNv}
                            onChange={(e) => setNearODNv(e.target.value)}
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">Add</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="P.D."
                            value={distODAdd}
                            onChange={(e) => {
                              setDistODAdd(e.target.value);
                              setDistOSAdd(e.target.value);
                            }}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-[#0a52c3]"
                          />
                        </td>
                        <td colSpan={3} className="bg-slate-50/10" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LEFT EYE GRID */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Eye className="h-4 w-4 text-emerald-500" /> Left Eye (OS)
                </div>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="py-2.5 w-16 text-left px-4">PWR</th>
                        <th className="py-2.5 px-1.5">SPH</th>
                        <th className="py-2.5 px-1.5">CYL</th>
                        <th className="py-2.5 px-1.5">AXIS</th>
                        <th className="py-2.5 px-1.5">V/N</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      <tr className={distanceEnabled ? "" : "opacity-40"}>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">D.V.</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+0.50"
                            value={distOSSphere}
                            onChange={(e) => setDistOSSphere(e.target.value)}
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.50"
                            value={distOSCylinder}
                            onChange={(e) => setDistOSCylinder(e.target.value)}
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="175"
                            value={distOSAxis}
                            onChange={(e) => setDistOSAxis(e.target.value)}
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="6/9"
                            value={distOSNv}
                            onChange={(e) => setDistOSNv(e.target.value)}
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                      </tr>

                      <tr className={nearEnabled ? "" : "opacity-40"}>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">N.V.</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+2.00"
                            value={nearOSSphere}
                            onChange={(e) => setNearOSSphere(e.target.value)}
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.50"
                            value={nearOSCylinder}
                            onChange={(e) => setNearOSCylinder(e.target.value)}
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="175"
                            value={nearOSAxis}
                            onChange={(e) => setNearOSAxis(e.target.value)}
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="N6"
                            value={nearOSNv}
                            onChange={(e) => setNearOSNv(e.target.value)}
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">Add</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="P.D."
                            value={distOSAdd}
                            onChange={(e) => {
                              setDistODAdd(e.target.value);
                              setDistOSAdd(e.target.value);
                            }}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-[#0a52c3]"
                          />
                        </td>
                        <td colSpan={3} className="bg-slate-50/10" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-5 bg-slate-50/30 border border-slate-200/50 p-5 rounded-2xl">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Lens Type
                </label>
                <div className="relative">
                  <select
                    value={lensType}
                    onChange={(e) => setLensType(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 appearance-none cursor-pointer"
                  >
                    <option value="">Select Lens Type...</option>
                    <option value="Single Vision">Single Vision</option>
                    <option value="Bifocal">Bifocal</option>
                    <option value="Kryptok Bifocal">Kryptok Bifocal</option>
                    <option value="Progressive">Progressive</option>
                    <option value="Polycarbonate HD">Polycarbonate HD</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Prescribed By
                </label>
                <Input
                  type="text"
                  placeholder="Dr. Name"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="h-10 bg-white font-semibold border-slate-200 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Party Name
                </label>
                <Input
                  type="text"
                  placeholder="Supplier/Clinic name"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="h-10 bg-white font-semibold border-slate-200 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Frame Name
                </label>
                <Input
                  type="text"
                  placeholder="Brand/Model name"
                  value={frameName}
                  onChange={(e) => setFrameName(e.target.value)}
                  className="h-10 bg-white font-semibold border-slate-200 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: PRODUCT SELECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md/5">
        <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 bg-[#0a52c3] rounded" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0a52c3]">
              04. Product Selection
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="overflow-x-auto pb-48">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-150 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-2 w-1/4">Product Search (Name/SKU/Model)</th>
                  <th className="py-3 px-2 w-36">SKU</th>
                  <th className="py-3 px-2 w-20 text-center">QTY</th>
                  <th className="py-3 px-2 text-right w-28">Price</th>
                  <th className="py-3 px-2 text-center w-24">DISC %</th>
                  <th className="py-3 px-2 text-center w-24">CGST</th>
                  <th className="py-3 px-2 text-center w-24">SGST</th>
                  <th className="py-3 px-2 text-center w-24">IGST</th>
                  <th className="py-3 px-2 text-right w-28">Row Total</th>
                  <th className="py-3 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lineItems.map((item, index) => (
                  <tr key={index} className="group hover:bg-slate-50/20 transition-colors">
                    {/* Independent Product Search Autocomplete */}
                    <td className="py-3 px-1.5 relative" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-[#0a52c3] transition-all">
                        <Search className="h-4 w-4 text-slate-505 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search Frame or SKU..."
                          value={item.searchQuery}
                          onChange={(e) => handleRowSearchChange(index, e.target.value)}
                          onFocus={() => {
                            if (item.searchQuery.trim().length >= 1) {
                              updateLineItem(index, { showDropdown: true });
                            }
                          }}
                          className="w-full bg-transparent text-sm font-bold outline-none text-slate-900 placeholder:text-slate-400"
                        />
                        {item.isSearching && (
                          <Loader2 className="h-4 w-4 text-[#0a52c3] animate-spin shrink-0" />
                        )}
                      </div>

                      {/* Dropdown Suggestions */}
                      {item.showDropdown && item.suggestions.length > 0 && (
                        <div className="absolute top-full left-1.5 right-1.5 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                          {item.suggestions.map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectProduct(index, prod)}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-xs flex justify-between items-center group cursor-pointer font-bold"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="text-slate-950 block truncate font-bold">{prod.name}</span>
                                <span className="text-[10px] text-slate-650 block mt-0.5 font-bold">
                                  SKU: <span className="font-mono text-slate-800">{prod.sku || "N/A"}</span> • Price: ₹{prod.price} • Stock: <span className={prod.quantity <= 0 ? "text-rose-600" : "text-emerald-700 font-extrabold"}>{prod.quantity}</span>
                                </span>
                              </div>
                              <Plus className="h-4 w-4 text-[#0a52c3] opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {!item.isSearching && item.searchQuery.length >= 1 && item.suggestions.length === 0 && item.showDropdown && (
                        <div className="absolute top-full left-1.5 right-1.5 mt-1.5 bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 shadow-2xl z-50">
                          No matching stock items found.
                        </div>
                      )}
                    </td>

                    {/* SKU Column */}
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => updateLineItem(index, { sku: e.target.value })}
                        placeholder="SKU"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0a52c3] focus:ring-1 focus:ring-[#0a52c3]"
                      />
                    </td>

                    {/* Quantity Selector */}
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        value={item.quantity === "" || isNaN(item.quantity as number) ? "" : item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateLineItem(index, { quantity: val === "" ? "" : parseInt(val, 10) });
                        }}
                        placeholder="0"
                        className="w-20 text-center py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:outline-none focus:border-[#0a52c3] focus:ring-1 focus:ring-[#0a52c3] bg-white"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateLineItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                          }
                          className="w-28 text-right bg-white border border-slate-300 rounded-lg pl-6 pr-2.5 py-2 font-bold text-sm text-slate-900 focus:outline-none focus:border-[#0a52c3] focus:ring-1 focus:ring-[#0a52c3]"
                        />
                      </div>
                    </td>

                    {/* Discount Input */}
                    <td className="py-3 px-2 text-center">
                      <div className="relative inline-block">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="0"
                          value={item.discountPercent === 0 ? "" : item.discountPercent}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItem(index, { discountPercent: val === "" ? 0 : Math.min(100, Math.max(0, parseFloat(val) || 0)) });
                          }}
                          className="w-20 text-center py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:outline-none focus:border-[#0a52c3] focus:ring-1 focus:ring-[#0a52c3] bg-white pr-5"
                        />
                        <span className="absolute right-2 top-2.5 text-slate-400 font-bold text-xs">%</span>
                      </div>
                    </td>

                    {/* CGST Column */}
                    <td className="py-3 px-2 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-750 text-[10px] font-bold">
                          {item.cgstPercent}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold mt-1">
                          ₹{item.cgstAmount.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* SGST Column */}
                    <td className="py-3 px-2 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {item.sgstPercent}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold mt-1">
                          ₹{item.sgstAmount.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* IGST Column */}
                    <td className="py-3 px-2 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {item.igstPercent}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold mt-1">
                          ₹{item.igstAmount.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Row Total */}
                    <td className="py-3 px-2 text-right font-extrabold text-sm text-slate-950">
                      ₹{item.rowTotal.toFixed(2)}
                    </td>

                    {/* Delete Item Action */}
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className="h-9 w-9 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 border border-dashed border-slate-350 hover:border-[#0a52c3]/50 hover:bg-indigo-50/20 text-xs font-bold text-slate-500 hover:text-[#0a52c3] rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add another item...
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: SUMMARY & PAYMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-4">
              1. Select Payment Method
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { id: "CASH", label: "Cash", icon: DollarSign },
                { id: "CARD", label: "Card", icon: CreditCard },
                { id: "UPI", label: "UPI", icon: Smartphone },
                { id: "BANK_TRANSFER", label: "Bank", icon: Briefcase },
              ].map((method) => {
                const IconComponent = method.icon;
                const active = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                      active
                        ? "border-[#0a52c3] bg-indigo-50/20 text-[#0a52c3] font-bold shadow-sm"
                        : "border-slate-200 text-slate-400 hover:bg-slate-50/50 font-semibold"
                    }`}
                  >
                    <IconComponent className={`h-6 w-6 mb-2 ${active ? "text-[#0a52c3]" : "text-slate-400"}`} />
                    <span className="text-xs">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-4">
              2. Payment Type
            </h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === "FULL"}
                  onChange={() => setPaymentType("FULL")}
                  className="h-4 w-4 text-[#0a52c3]"
                />
                Full Payment
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === "PARTIAL"}
                  onChange={() => setPaymentType("PARTIAL")}
                  className="h-4 w-4 text-[#0a52c3]"
                />
                Partial Payment
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Amount Paid
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={paymentType === "FULL" ? grandTotal.toFixed(2) : amountPaidOverride}
                  onChange={(e) => setAmountPaidOverride(e.target.value)}
                  disabled={paymentType === "FULL"}
                  className="w-full h-10 pl-7 pr-3 bg-white border border-slate-200/80 rounded-lg text-sm font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Balance Due
              </label>
              <div className="text-xl font-extrabold tracking-wide text-rose-500 h-10 flex items-center">
                ₹{finalBalanceDue.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
              Invoice Notes & Remarks
            </label>
            <textarea
              placeholder="e.g. Next eye testing due in 6 months..."
              rows={2}
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 font-semibold focus:outline-none"
            />
          </div>
        </div>

        {/* Calculations Sidebar Ledger (GST-Automated) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
              Line Items Summary
            </h3>

            {/* Billed items listing */}
            <div className="space-y-2 max-h-36 overflow-y-auto divide-y divide-slate-100 pr-1">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1.5">
                  <span className="text-slate-650 truncate max-w-[150px]">
                    {item.description || "Unspecified Product"} (x{item.quantity})
                  </span>
                  <span className="text-slate-700 font-bold">₹{item.rowTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-slate-200" />

            <div className="space-y-2.5 text-xs font-bold text-slate-650">
              <div className="flex justify-between">
                <span>Subtotal (Base)</span>
                <span className="text-slate-800">₹{calculatedSubtotal.toFixed(2)}</span>
              </div>

              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-rose-600 font-extrabold">
                  <span>Total Discount</span>
                  <span>-₹{calculatedDiscount.toFixed(2)}</span>
                </div>
              )}

              {/* CGST Sum */}
              {summedCGST > 0 && (
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Total CGST</span>
                  <span>+₹{summedCGST.toFixed(2)}</span>
                </div>
              )}

              {/* SGST Sum */}
              {summedSGST > 0 && (
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Total SGST</span>
                  <span>+₹{summedSGST.toFixed(2)}</span>
                </div>
              )}

              {/* IGST Sum */}
              {summedIGST > 0 && (
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Total IGST</span>
                  <span>+₹{summedIGST.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-indigo-600 pt-1.5 border-t border-slate-100">
                <span>Total GST Taxes</span>
                <span>+₹{totalGSTTax.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 mt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-extrabold uppercase text-slate-400">Grand Total</span>
              <span className="text-3xl font-extrabold text-[#0a52c3] tracking-tight">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => {
            if (confirm("Are you sure you want to discard this invoice builder session?")) {
              router.push("/shop/invoices");
            }
          }}
          className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
        >
          Discard Form
        </button>

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 text-sm font-bold bg-[#0a52c3] hover:bg-[#004bb5] text-white rounded-xl shadow-lg shadow-[#0a52c3]/10 hover:shadow-[#0a52c3]/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Check className="h-4.5 w-4.5" />
          {isPending ? "Creating Invoice..." : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
