"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  calculateAgeFromDOB,
  calculateDOBFromAge,
  formatDiopterValue,
  formatAxisValue,
  SPH_OPTIONS,
  CYL_OPTIONS,
  AXIS_OPTIONS,
  DISTANCE_VN_OPTIONS,
  NEAR_VN_OPTIONS,
  ADD_OPTIONS,
} from "@/utils/optometry";
import {
  registerPatientAndInvoiceAction,
  getNextRegistrationIdAction,
  getPatientDetailsAction,
  getClinicalSuggestionsAction,
} from "@/actions/patient.actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClinicalAutocompleteInput } from "@/components/ui/ClinicalAutocompleteInput";
import { ClinicalPrescriptionCard } from "./ClinicalPrescriptionCard";
import { useOffline } from "@/components/providers/OfflineProvider";
import {
  searchCustomersOffline,
  searchInventoryOffline,
  getCustomerByIdOffline,
} from "@/lib/offline/search";
import { enqueueOfflineInvoice } from "@/lib/offline/invoice-queue";
import { offlineDB } from "@/lib/offline/db";
import {
  ChevronDown,
  ReceiptText,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  DollarSign,
  Smartphone,
  CreditCard,
  Barcode,
  UserCheck,
  Wallet,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Copy,
  ShoppingCart,
  FileText,
  Save,
  X,
  Loader2,
  Check,
  Briefcase,
  Landmark,
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

function formatDateTimeLocal(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function NewInvoiceForm() {
  const router = useRouter();
  const { isOnline, shopId } = useOffline();
  const [isPending, setIsPending] = useState(false);
  const [regId, setRegId] = useState("OP-2026-XXXX");

  // Load Existing Patient Overlay State
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Section 01: Basic Details States
  const [invoiceDateTime, setInvoiceDateTime] = useState<string>(() => formatDateTimeLocal());
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Date of Birth & Age Sync
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [prescribedAt, setPrescribedAt] = useState(() => new Date().toISOString().split("T")[0]);

  const handleInvoiceDateTimeChange = (val: string) => {
    setInvoiceDateTime(val);
    setIsCustomDate(true);
    if (val) {
      const datePart = val.split("T")[0];
      setPrescribedAt(datePart);
    }
  };

  const handleResetDateTimeToNow = () => {
    const nowStr = formatDateTimeLocal();
    setInvoiceDateTime(nowStr);
    setIsCustomDate(false);
    setPrescribedAt(nowStr.split("T")[0]);
  };

  const isBackdated = (() => {
    if (!invoiceDateTime) return false;
    const selected = new Date(invoiceDateTime).getTime();
    const now = Date.now();
    return selected < now - 60000;
  })();

  const isFutureDate = (() => {
    if (!invoiceDateTime) return false;
    const selected = new Date(invoiceDateTime).getTime();
    const now = Date.now();
    return selected > now + 60000;
  })();

  const handleDobChange = (dobVal: string) => {
    setDob(dobVal);
    if (dobVal) {
      setAge(calculateAgeFromDOB(dobVal));
    } else {
      setAge("");
    }
  };

  const handleAgeChange = (ageVal: string) => {
    setAge(ageVal);
    if (ageVal) {
      const calcDOB = calculateDOBFromAge(ageVal);
      if (calcDOB) setDob(calcDOB);
    }
  };
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const [pincode, setPincode] = useState("");

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
  const [lensType, setLensType] = useState("Single Vision");
  const [doctorName, setDoctorName] = useState("");
  const [partyName, setPartyName] = useState("");
  const [frameName, setFrameName] = useState("");
  const [pdRight, setPdRight] = useState("31.5");
  const [pdLeft, setPdLeft] = useState("31.5");
  const [caddRight, setCaddRight] = useState("");
  const [caddLeft, setCaddLeft] = useState("");
  const [rxNumber, setRxNumber] = useState("PR-8821");
  const [rxCategory, setRxCategory] = useState("SPECTACLES");

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

  // Barcode Scanning Quick Ingestion States
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isBarcodeSearching, setIsBarcodeSearching] = useState(false);

  // Section 05: Payments & Summary
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "BANK_TRANSFER">("CASH");
  const [paymentType, setPaymentType] = useState<"FULL" | "PARTIAL">("FULL");
  const [amountPaidOverride, setAmountPaidOverride] = useState<string>("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [soldBy, setSoldBy] = useState("");
  const [deliveryDays, setDeliveryDays] = useState<number | "">("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  const handleDeliveryDateChange = (dateStr: string) => {
    setDeliveryDate(dateStr);
    if (!dateStr) {
      setDeliveryDays("");
      return;
    }
    const baseDateStr = invoiceDateTime ? invoiceDateTime.split("T")[0] : new Date().toISOString().split("T")[0];
    const base = new Date(baseDateStr + "T00:00:00");
    const target = new Date(dateStr + "T00:00:00");
    const diffMs = target.getTime() - base.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    setDeliveryDays(diffDays >= 0 ? diffDays : 0);
  };

  const handleDeliveryDaysPreset = (days: number) => {
    setDeliveryDays(days);
    const baseDateStr = invoiceDateTime ? invoiceDateTime.split("T")[0] : new Date().toISOString().split("T")[0];
    const base = new Date(baseDateStr + "T00:00:00");
    const target = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    setDeliveryDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleClearDelivery = () => {
    setDeliveryDays("");
    setDeliveryDate("");
  };

  const deliveryDateInputRef = useRef<HTMLInputElement>(null);

  const formatDeliveryDisplay = () => {
    if (!deliveryDate) return "";
    try {
      const parts = deliveryDate.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        const formattedDate = dateObj.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        if (deliveryDays === 0) {
          return `0 Days / Today (${formattedDate})`;
        } else if (typeof deliveryDays === "number") {
          return `${deliveryDays} ${deliveryDays === 1 ? "Day" : "Days"} (${formattedDate})`;
        }
        return formattedDate;
      }
    } catch {}
    return deliveryDate;
  };

  // Store Credit Management
  const [customerStoreCredit, setCustomerStoreCredit] = useState<number>(0);
  const [useStoreCredit, setUseStoreCredit] = useState<boolean>(false);
  const [creditToApply, setCreditToApply] = useState<string>("");

  // Load Next Registration ID on Load
  useEffect(() => {
    async function loadNextId() {
      if (!navigator.onLine || !isOnline) {
        setRegId(`REG-OFF-${Date.now().toString().slice(-6)}`);
        return;
      }
      try {
        const res = await getNextRegistrationIdAction();
        if (res.success && res.data) {
          setRegId(res.data);
        } else {
          setRegId(`REG-OFF-${Date.now().toString().slice(-6)}`);
        }
      } catch (err) {
        console.warn("Failed to load registration ID sequence (using offline fallback):", err);
        setRegId(`REG-OFF-${Date.now().toString().slice(-6)}`);
      }
    }
    if (!selectedCustomerId) {
      loadNextId();
    }
  }, [selectedCustomerId, isOnline]);

  const [referredBySuggestions, setReferredBySuggestions] = useState<string[]>([]);
  const [doctorSuggestions, setDoctorSuggestions] = useState<string[]>([]);
  const [staffSuggestions, setStaffSuggestions] = useState<string[]>([
    "Rahul Verma",
    "Priya Singh",
    "Amit Kumar",
    "Dr. Amit Gupta",
  ]);

  // Load Existing Patient Profiles & Prescriptions
  const handleSelectPatient = async (customerId: string) => {
    setShowPatientSearch(false);
    setSelectedCustomerId(customerId);

    // 1. Instant 0ms Hydration: Immediately populate basic patient info from search results or local IndexedDB
    let matchedPatient: any = patientResults.find((p) => p.id === customerId);
    let offlineCust: any = null;

    try {
      offlineCust = await getCustomerByIdOffline(customerId);
    } catch {}

    const targetPatient = offlineCust || matchedPatient;

    if (targetPatient) {
      setFullName(targetPatient.fullName || targetPatient.name || "");
      setEmail(targetPatient.email || "");
      setPhone(targetPatient.phone || "");
      setDob(targetPatient.dateOfBirth || "");
      setGender(targetPatient.gender || "");
      setBloodGroup(targetPatient.bloodGroup || "");
      setReferredBy(targetPatient.referredBy || "");
      setAddress(targetPatient.address || "");
      setCity(targetPatient.city || "");
      setState(targetPatient.state || "");
      setPincode(targetPatient.pincode || "");
      setRegId(targetPatient.registrationId || "OP-2026-XXXX");
      if (targetPatient.chiefComplaint) setChiefComplaint(targetPatient.chiefComplaint);
      if (targetPatient.familyHistory) setFamilyHistory(targetPatient.familyHistory);
      if (targetPatient.systemicIllness) setSystemicIllness(targetPatient.systemicIllness);
      if (targetPatient.allergies) setAllergies(targetPatient.allergies);

      const creditVal = parseFloat(targetPatient.storeCredit || "0") || 0;
      setCustomerStoreCredit(creditVal);
      setUseStoreCredit(false);
      setCreditToApply(creditVal > 0 ? creditVal.toString() : "");
    }

    // If completely offline, we're done immediately!
    if (!navigator.onLine || !isOnline) {
      toast.success("Loaded patient from local databank!");
      return;
    }

    // 2. Non-blocking background fetch for clinical prescriptions (with 2500ms timeout)
    const loadingToast = toast.loading("Checking past prescriptions...");
    try {
      const timeoutPromise = new Promise<{ success: boolean; data?: any; message?: string }>((_, reject) =>
        setTimeout(() => reject(new Error("Prescription lookup timeout")), 2500)
      );
      const res = await Promise.race([
        getPatientDetailsAction(customerId),
        timeoutPromise,
      ]);

      if (res.success && res.data) {
        const { customer, distancePrescription, nearPrescription } = res.data;

        // Auto-fill Store Credit
        const creditVal = parseFloat(customer.storeCredit || "0") || 0;
        setCustomerStoreCredit(creditVal);
        setCreditToApply(creditVal > 0 ? creditVal.toString() : "");

        // Auto-fill Section 01 (enriching with complete server data if needed)
        if (customer.fullName) setFullName(customer.fullName);
        if (customer.email) setEmail(customer.email);
        if (customer.phone) setPhone(customer.phone);
        if (customer.dateOfBirth) setDob(customer.dateOfBirth);
        if (customer.gender) setGender(customer.gender);
        if (customer.bloodGroup) setBloodGroup(customer.bloodGroup);
        if (customer.referredBy) setReferredBy(customer.referredBy);
        if (customer.address) setAddress(customer.address);
        if (customer.city) setCity(customer.city);
        if (customer.state) setState(customer.state);
        if (customer.pincode) setPincode(customer.pincode);
        if (customer.registrationId) setRegId(customer.registrationId);

        // Auto-fill Section 02
        if (customer.chiefComplaint) setChiefComplaint(customer.chiefComplaint);
        if (customer.familyHistory) setFamilyHistory(customer.familyHistory);
        if (customer.systemicIllness) setSystemicIllness(customer.systemicIllness);
        if (customer.allergies) setAllergies(customer.allergies);

        // Auto-fill Section 03 Distance Prescription
        if (distancePrescription) {
          setDistanceEnabled(true);
          setDistODSphere(distancePrescription.rightSphere || "");
          setDistODCylinder(distancePrescription.rightCylinder || "");
          setDistODAxis(distancePrescription.rightAxis || "");
          setDistODNv(distancePrescription.rightNv || "");
          setDistODAdd(distancePrescription.rightAdd || "");
          setCaddRight(distancePrescription.caddRight || "");

          setDistOSSphere(distancePrescription.leftSphere || "");
          setDistOSCylinder(distancePrescription.leftCylinder || "");
          setDistOSAxis(distancePrescription.leftAxis || "");
          setDistOSNv(distancePrescription.leftNv || "");
          setDistOSAdd(distancePrescription.leftAdd || "");
          setCaddLeft(distancePrescription.caddLeft || "");

          setPdRight(distancePrescription.pdRight || distancePrescription.pd || "31.5");
          setPdLeft(distancePrescription.pdLeft || distancePrescription.pd || "31.5");
          if (distancePrescription.rxNumber) setRxNumber(distancePrescription.rxNumber);
          if (distancePrescription.rxCategory) setRxCategory(distancePrescription.rxCategory);
          if (distancePrescription.lensType) setLensType(distancePrescription.lensType);

          setDoctorName(distancePrescription.doctorName || "");
          setPartyName(distancePrescription.partyName || "");
          setFrameName(distancePrescription.frameName || "");
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

          if (!distancePrescription) {
            setPdRight(nearPrescription.pdRight || nearPrescription.pd || "31.5");
            setPdLeft(nearPrescription.pdLeft || nearPrescription.pd || "31.5");
            if (nearPrescription.caddRight) setCaddRight(nearPrescription.caddRight);
            if (nearPrescription.caddLeft) setCaddLeft(nearPrescription.caddLeft);
            if (nearPrescription.rxNumber) setRxNumber(nearPrescription.rxNumber);
            if (nearPrescription.rxCategory) setRxCategory(nearPrescription.rxCategory);
            if (nearPrescription.lensType) setLensType(nearPrescription.lensType);
          }
        }

        if (distancePrescription?.notes || nearPrescription?.notes) {
          setLensType((prev) => distancePrescription?.lensType || distancePrescription?.notes || nearPrescription?.lensType || nearPrescription?.notes || prev);
        }

        toast.success("Patient details & clinical history loaded!", { id: loadingToast });
      } else {
        toast.success("Patient loaded from databank", { id: loadingToast });
      }
    } catch {
      toast.success("Patient loaded from databank", { id: loadingToast });
    }
  };

  // Pre-load patient details if redirected from customer profile page & clinical suggestions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get("customerId");
    if (customerId) {
      handleSelectPatient(customerId);
    }

    async function loadSuggestions() {
      if (!navigator.onLine || !isOnline) {
        setReferredBySuggestions(["Self", "Walk-in", "Family", "Dr. Sharma", "Dr. Patel"]);
        setDoctorSuggestions(["Dr. Sharma", "Dr. Patel", "Optometrist"]);
        return;
      }
      try {
        const res = await getClinicalSuggestionsAction();
        if (res.success) {
          setReferredBySuggestions(res.referredByList);
          setDoctorSuggestions(res.doctorNameList);
        } else {
          setReferredBySuggestions(["Self", "Walk-in", "Family", "Dr. Sharma", "Dr. Patel"]);
          setDoctorSuggestions(["Dr. Sharma", "Dr. Patel", "Optometrist"]);
        }
      } catch (err) {
        console.warn("Using offline clinical suggestions fallback:", err);
        setReferredBySuggestions(["Self", "Walk-in", "Family", "Dr. Sharma", "Dr. Patel"]);
        setDoctorSuggestions(["Dr. Sharma", "Dr. Patel", "Optometrist"]);
      }
    }
    loadSuggestions();
  }, [isOnline]);

  // Debounced Patient Search Trigger
  useEffect(() => {
    if (patientQuery.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingPatient(true);

      // Offline search fallback
      if (!navigator.onLine || !isOnline) {
        try {
          const offlineMatches = await searchCustomersOffline(shopId || "", patientQuery);
          setPatientResults(offlineMatches);
        } catch (err) {
          console.error("Offline patient search failed:", err);
        } finally {
          setIsSearchingPatient(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(patientQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setPatientResults(data.customers || []);
        } else {
          // If server responded with error, fall back to offline search
          const offlineMatches = await searchCustomersOffline(shopId || "", patientQuery);
          setPatientResults(offlineMatches);
        }
      } catch (err) {
        console.warn("Patient search network failure, falling back to offline:", err);
        try {
          const offlineMatches = await searchCustomersOffline(shopId || "", patientQuery);
          setPatientResults(offlineMatches);
        } catch (offlineErr) {
          console.error("Offline patient fallback also failed:", offlineErr);
        }
      } finally {
        setIsSearchingPatient(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [patientQuery, isOnline, shopId]);

  // Row Search Change Handler (Independent per row debouncing + 0ms local suggestion cache)
  const handleRowSearchChange = (index: number, query: string) => {
    // 1. Immediately update local row searchQuery AND description state
    // For custom non-inventory items, description matches typed query with inventoryId: null
    setLineItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              searchQuery: query,
              description: query,
              inventoryId: item.searchQuery === query ? item.inventoryId : null,
              showSuggestions: query.trim().length > 0,
              showDropdown: query.trim().length > 0,
            }
          : item
      )
    );

    // Clear previous timeout for this specific line item row
    if (searchTimeouts.current[index]) {
      clearTimeout(searchTimeouts.current[index]);
    }

    // Don't search if query is empty
    if (!query.trim()) {
      setLineItems((prev) =>
        prev.map((item, idx) =>
          idx === index
            ? {
                ...item,
                suggestions: [],
                showSuggestions: false,
                showDropdown: false,
                isSearching: false,
              }
            : item
        )
      );
      return;
    }

    // 2. Instant 0ms Local IndexedDB Lookup (provides immediate suggestions without network lag!)
    searchInventoryOffline(shopId || "", query)
      .then((offlineProducts) => {
        if (offlineProducts && offlineProducts.length > 0) {
          setLineItems((prev) =>
            prev.map((item, idx) =>
              idx === index && item.searchQuery === query
                ? {
                    ...item,
                    suggestions: offlineProducts,
                    showDropdown: true,
                  }
                : item
            )
          );
        }
      })
      .catch(() => {});

    // 3. Debounced Cloud API Enrichment (if online, enrich with fresh server stock)
    searchTimeouts.current[index] = setTimeout(async () => {
      if (navigator.onLine && isOnline) {
        setLineItems((prev) =>
          prev.map((item, idx) => (idx === index ? { ...item, isSearching: true } : item))
        );

        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            const cloudProducts = data.inventory || [];
            if (cloudProducts.length > 0) {
              setLineItems((prev) =>
                prev.map((item, idx) =>
                  idx === index && item.searchQuery === query
                    ? {
                        ...item,
                        suggestions: cloudProducts,
                        showDropdown: true,
                        isSearching: false,
                      }
                    : item
                )
              );
              return;
            }
          }
        } catch (err) {
          console.warn(`Row ${index} product lookup network failure:`, err);
        }
      }

      // Offline or network returned no extra results: finish search spinner
      try {
        const offlineProducts = await searchInventoryOffline(shopId || "", query);
        setLineItems((prev) =>
          prev.map((item, idx) =>
            idx === index && item.searchQuery === query
              ? {
                  ...item,
                  suggestions: offlineProducts || item.suggestions || [],
                  isSearching: false,
                }
              : item
          )
        );
      } catch {
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

        // Bi-directional Discount calculations:
        if (fields.discountAmount !== undefined) {
          const discAmt = Math.max(0, fields.discountAmount || 0);
          merged.discountAmount = discAmt;
          merged.discountPercent = lineSubtotal > 0 ? Math.min(100, (discAmt / lineSubtotal) * 100) : 0;
        } else if (fields.discountPercent !== undefined) {
          const discPct = Math.min(100, Math.max(0, fields.discountPercent || 0));
          merged.discountPercent = discPct;
          merged.discountAmount = lineSubtotal * (discPct / 100);
        } else {
          // If price or quantity changed, recompute discountAmount based on existing discountPercent
          merged.discountAmount = lineSubtotal * ((merged.discountPercent || 0) / 100);
        }

        merged.taxableSubtotal = Math.max(0, lineSubtotal - merged.discountAmount);

        // Editable GST computations:
        const cgstPct = Math.max(0, merged.cgstPercent ?? 0);
        const sgstPct = Math.max(0, merged.sgstPercent ?? 0);
        const igstPct = Math.max(0, merged.igstPercent ?? 0);

        merged.cgstPercent = cgstPct;
        merged.sgstPercent = sgstPct;
        merged.igstPercent = igstPct;

        merged.cgstAmount = merged.taxableSubtotal * (cgstPct / 100);
        merged.sgstAmount = merged.taxableSubtotal * (sgstPct / 100);
        merged.igstAmount = merged.taxableSubtotal * (igstPct / 100);

        merged.rowTotal =
          merged.taxableSubtotal + merged.cgstAmount + merged.sgstAmount + merged.igstAmount;
        return merged;
      }
      return item;
    });
    setLineItems(updated);
  };

  const loadProductByBarcode = (product: any) => {
    // Check if item is already in line items
    const existingIndex = lineItems.findIndex(
      (item) => item.inventoryId === product.id
    );

    if (existingIndex !== -1) {
      const currentQty = lineItems[existingIndex].quantity === "" ? 0 : Number(lineItems[existingIndex].quantity);
      const newQty = currentQty + 1;
      const maxStock = parseInt(product.quantity, 10) || 0;
      if (newQty > maxStock) {
        toast.warning(`Scanned quantity exceeds available stock (${maxStock} units) for "${product.name}"`);
      }
      updateLineItem(existingIndex, { quantity: newQty });
      toast.success(`Incremented quantity for "${product.name}" to ${newQty}.`);
      return;
    }

    // Otherwise, find the last empty row or add a new one
    const lastIndex = lineItems.length - 1;
    const lastItem = lineItems[lastIndex];
    const isEmpty = lastItem && !lastItem.inventoryId && lastItem.searchQuery === "" && lastItem.sku === "";

    const targetIndex = isEmpty ? lastIndex : lineItems.length;

    const price = parseFloat(product.price) || 0;
    const cgst = parseFloat(product.cgstPercent) || 0;
    const sgst = parseFloat(product.sgstPercent) || 0;
    const igst = parseFloat(product.igstPercent) || 0;
    const maxStock = parseInt(product.quantity, 10) || 0;

    if (maxStock <= 0) {
      toast.error(`Out of stock! "${product.name}" has 0 units available.`);
    }

    const initialLineItem = {
      inventoryId: product.id,
      description: product.name,
      sku: product.sku || "N/A",
      quantity: 1,
      unitPrice: price,
      discountPercent: 0,
      discountAmount: 0,
      cgstPercent: cgst,
      cgstAmount: 0,
      sgstPercent: sgst,
      sgstAmount: 0,
      igstPercent: igst,
      igstAmount: 0,
      taxableSubtotal: price,
      rowTotal: price * (1 + (cgst + sgst + igst) / 100),
      maxQty: maxStock,
      searchQuery: product.name,
      suggestions: [],
      showDropdown: false,
      isSearching: false,
    };

    if (isEmpty) {
      const updated = [...lineItems];
      updated[targetIndex] = initialLineItem;
      setLineItems(updated);
      updateLineItem(targetIndex, initialLineItem);
    } else {
      const lineSubtotal = 1 * price;
      const discountAmount = 0;
      const taxableSubtotal = lineSubtotal - discountAmount;
      const cgstAmount = taxableSubtotal * (cgst / 100);
      const sgstAmount = taxableSubtotal * (sgst / 100);
      const igstAmount = taxableSubtotal * (igst / 100);
      const rowTotal = taxableSubtotal + cgstAmount + sgstAmount + igstAmount;

      const fullyMergedItem = {
        ...initialLineItem,
        discountAmount,
        taxableSubtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        rowTotal,
      };

      setLineItems([...lineItems, fullyMergedItem]);
    }
    toast.success(`Loaded "${product.name}" into billing.`);
  };

  const triggerBarcodeSearch = async () => {
    const val = barcodeInput.trim();
    if (!val) return;

    setIsBarcodeSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        const products = data.inventory || [];
        const exactMatch = products.find(
          (prod: any) => (prod.sku || "").toLowerCase() === val.toLowerCase()
        );

        if (exactMatch) {
          loadProductByBarcode(exactMatch);
          setBarcodeInput(""); // Reset input
        } else {
          toast.error(`No exact SKU match found for barcode: "${val}"`);
        }
      } else {
        toast.error("Failed to query barcode index");
      }
    } catch (err) {
      console.error("Barcode lookup failed:", err);
      toast.error("Network error during barcode scan lookup");
    } finally {
      setIsBarcodeSearching(false);
    }
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
    function handleClickOutside(event: MouseEvent) {
      setLineItems((prev) => prev.map((item) => ({ ...item, showDropdown: false })));
      const target = event.target as HTMLElement;
      if (!target.closest(".state-autocomplete-wrapper")) {
        setShowStateSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReset = (e?: React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    setSelectedCustomerId(null);
    const nowStr = formatDateTimeLocal();
    setInvoiceDateTime(nowStr);
    setIsCustomDate(false);
    setPrescribedAt(nowStr.split("T")[0]);
    setSoldBy("");
    setFullName("");
    setEmail("");
    setPhone("");
    setDob("");
    setGender("");
    setBloodGroup("");
    setReferredBy("");
    setAddress("");
    setCity("");
    setState("");
    setPincode("");
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
    setDeliveryDays("");
    setDeliveryDate("");
    setCustomerStoreCredit(0);
    setUseStoreCredit(false);
    setCreditToApply("");
    toast.success("Form cleared successfully.");
  };

  const handleClearForm = handleReset;

  const handleSaveDraft = () => {
    try {
      const draft = {
        fullName,
        phone,
        email,
        dob,
        age,
        gender,
        address,
        city,
        state,
        pincode,
        referredBy,
        lineItems,
        paymentMethod,
        invoiceNotes,
      };
      localStorage.setItem("OM_INVOICE_DRAFT", JSON.stringify(draft));
      toast.success("Invoice draft saved locally.");
    } catch {
      toast.error("Failed to save draft.");
    }
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

  // Store Credit Calculations
  const availableCredit = customerStoreCredit;
  const parsedCreditInput = parseFloat(creditToApply) || 0;
  const maxAllowedCredit = Math.min(availableCredit, grandTotal);
  const appliedCredit = useStoreCredit
    ? Math.min(maxAllowedCredit, Math.max(0, parsedCreditInput))
    : 0;
  const netPayable = Math.max(0, grandTotal - appliedCredit);

  // Split calculations
  const finalAmountPaid = paymentType === "FULL" ? netPayable : parseFloat(amountPaidOverride) || 0;
  const finalBalanceDue = Math.max(0, netPayable - finalAmountPaid);

  // Handle Form Submission (Save Patient + Unified Invoice)
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPending) return;

    if (!fullName.trim() || !phone.trim()) {
      toast.error("Please enter patient Full Name and Mobile Number.");
      return;
    }

    const validItems = lineItems.filter(
      (item) => (item.description || item.searchQuery || "").trim().length > 0
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one billed product to the items ledger.");
      return;
    }

    // Verify blank or invalid quantities
    for (const item of lineItems) {
      const itemDesc = (item.description || item.searchQuery || "").trim();
      if (!itemDesc) {
        toast.error("Please enter a product description or item name for all rows.");
        return;
      }
      if (item.quantity === "" || isNaN(item.quantity) || item.quantity <= 0) {
        toast.error(`Please enter a valid Quantity (greater than 0) for item "${itemDesc}".`);
        return;
      }
    }

    // Verify stock bounds
    for (const item of lineItems) {
      if (item.inventoryId && (item.quantity as number) > item.maxQty) {
        toast.error(
          `Out of stock! Billed count of ${item.quantity} for "${item.description || item.searchQuery}" exceeds available stock (${item.maxQty} left).`
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
          city: city || undefined,
          state: state || undefined,
          pincode: pincode || undefined,
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
          caddRight: caddRight || undefined,
          leftSphere: distOSSphere || undefined,
          leftCylinder: distOSCylinder || undefined,
          leftAxis: distOSAxis || undefined,
          leftNv: distOSNv || undefined,
          leftAdd: distOSAdd || undefined,
          caddLeft: caddLeft || undefined,
          pdRight: pdRight || undefined,
          pdLeft: pdLeft || undefined,
        },
        nearPrescription: {
          rightSphere: nearODSphere || undefined,
          rightCylinder: nearODCylinder || undefined,
          rightAxis: nearODAxis || undefined,
          rightNv: nearODNv || undefined,
          caddRight: caddRight || undefined,
          leftSphere: nearOSSphere || undefined,
          leftCylinder: nearOSCylinder || undefined,
          leftAxis: nearOSAxis || undefined,
          leftNv: nearOSNv || undefined,
          caddLeft: caddLeft || undefined,
          pdRight: pdRight || undefined,
          pdLeft: pdLeft || undefined,
        },
        doctorName: doctorName || undefined,
        prescribedAt: prescribedAt || undefined,
        estimatedDelivery: deliveryDate || undefined,
        specialInstructions: undefined,
        prescriptionNotes: lensType || undefined,
        lensType: lensType || undefined,
        rxNumber: rxNumber || undefined,
        rxCategory: rxCategory || "SPECTACLES",
        invoiceEnabled: true,
        invoiceItems: lineItems.map((item) => {
          const qty = item.quantity === "" ? 0 : (item.quantity as number);
          const itemSubtotal = qty * item.unitPrice;
          const desc = (item.description || item.searchQuery || "Billed Product").trim();

          return {
            inventoryId: item.inventoryId || null,
            description: desc,
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
        creditApplied: appliedCredit,
        amountPaid: finalAmountPaid,
        balanceDue: finalBalanceDue,
        notes: invoiceNotes || undefined,
        soldBy: soldBy.trim() || undefined,
        deliveryDays: deliveryDays === "" ? 0 : deliveryDays,
        invoiceDate: invoiceDateTime || undefined,
      };

      // Offline mode submission: if device is offline, write directly to offline queue
      if (!isOnline || (typeof navigator !== "undefined" && !navigator.onLine)) {
        try {
          const targetShop = shopId || (await offlineDB.getCurrentShopId()) || "";
          const targetOrg = (await offlineDB.getCurrentOrgId()) || "";
          const queuedInvoice = await enqueueOfflineInvoice(
            targetShop,
            targetOrg,
            payload
          );
          toast.success(
            `Offline invoice #${queuedInvoice.offlineInvoiceNumber} created! Ready for printing and will sync automatically when reconnected.`,
            { id: savingToast }
          );
          setIsPending(false);
          router.push(`/shop/invoices/offline/${queuedInvoice.id}`);
          return;
        } catch (offlineSaveErr: any) {
          console.error("Failed to save offline invoice:", offlineSaveErr);
          toast.error("Failed to save offline invoice to local device memory.", { id: savingToast });
          setIsPending(false);
          return;
        }
      }

      // Online submission: attempt cloud server action first
      try {
        const res = await registerPatientAndInvoiceAction(payload);
        const targetInvoiceId = res.data?.invoiceId || res.data?.invoice?.id;
        const targetReceiptId = res.data?.receiptId || res.data?.receipt?.id;

        if (res.success && (targetInvoiceId || targetReceiptId)) {
          toast.success(res.message || "Transaction success! Invoice compiled.", { id: savingToast });
          setIsPending(false);
          if (paymentType === "PARTIAL" && targetReceiptId) {
            router.push(`/shop/receipts/${targetReceiptId}`);
          } else if (targetInvoiceId) {
            router.push(`/shop/invoices/${targetInvoiceId}`);
          } else {
            router.push(`/shop/invoices`);
          }
        } else {
          toast.error(res.message || "Failed to process patient invoice transaction.", {
            id: savingToast,
          });
          setIsPending(false);
        }
      } catch (actionOrNetworkErr: any) {
        console.warn("[NewInvoiceForm] Cloud invoice transaction failed, attempting offline queue fallback:", actionOrNetworkErr);
        try {
          const targetShop = shopId || (await offlineDB.getCurrentShopId()) || "";
          const targetOrg = (await offlineDB.getCurrentOrgId()) || "";
          const queuedInvoice = await enqueueOfflineInvoice(
            targetShop,
            targetOrg,
            payload
          );
          toast.success(
            `Network unreachable. Saved offline as #${queuedInvoice.offlineInvoiceNumber}! Will sync when reconnected.`,
            { id: savingToast }
          );
          setIsPending(false);
          router.push(`/shop/invoices/offline/${queuedInvoice.id}`);
        } catch (offlineErr: any) {
          toast.error(actionOrNetworkErr.message || "Unexpected transaction error occurred.", { id: savingToast });
          setIsPending(false);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Unexpected transaction error occurred.", { id: savingToast });
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmitInvoice}
      className="max-w-[1440px] mx-auto space-y-2 pb-6 select-none animate-fade-in text-slate-800"
    >
      {/* Compact Top Header Row */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900 tracking-tight">New Invoice</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">/ Invoicing</span>
        </div>
        <button
          type="button"
          onClick={handleClearForm}
          className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-600 shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
          title="Reset all form fields"
        >
          <RotateCcw className="h-3 w-3 text-slate-400" />
          <span>Clear Form</span>
        </button>
      </div>

      {/* OFFLINE STATUS NOTICE BANNER */}
      {typeof navigator !== "undefined" && !navigator.onLine && (
        <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-2.5 text-amber-900 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <div>
              <span className="font-extrabold block sm:inline mr-1">Offline Billing Active:</span>
              <span className="text-amber-800 font-medium">
                Searching cached databank. Invoices are stored in local device memory and can be printed immediately.
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[10px] font-extrabold uppercase shrink-0">
            Auto-Sync on Reconnect
          </span>
        </div>
      )}

      {/* SECTION 1: CUSTOMER & INVOICE DETAILS */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="py-1.5 px-3.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-[#2563eb]" />
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
              CUSTOMER & INVOICE DETAILS
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {customerStoreCredit > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Wallet className="h-3 w-3" />
                Credit: ₹{customerStoreCredit.toFixed(2)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowPatientSearch(true)}
              className="h-6.5 px-2.5 rounded-md border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-[10.5px] font-bold text-[#2563eb] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Search className="h-3 w-3" />
              <span>Load Existing Patient</span>
            </button>
          </div>
        </div>

        <div className="p-2.5 space-y-2">
          {/* Row 1: REGISTRATION ID, INVOICE DATE & TIME, FULL NAME, MOBILE NUMBER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* REGISTRATION ID */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                REGISTRATION ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={regId}
                  readOnly
                  className="w-full h-8 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-slate-50/60 text-xs font-bold text-slate-700 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(regId);
                    toast.success("Registration ID copied!");
                  }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Copy ID"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* INVOICE DATE & TIME */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                INVOICE DATE & TIME
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={invoiceDateTime}
                  onChange={(e) => handleInvoiceDateTimeChange(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <Calendar className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* FULL NAME */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                FULL NAME <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <User className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* MOBILE NUMBER */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                MOBILE NUMBER <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <Phone className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: DATE OF BIRTH, AGE (YRS), GENDER, EMAIL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* DATE OF BIRTH */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                DATE OF BIRTH
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <Calendar className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* AGE (YRS) */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                AGE (YRS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="28"
                  value={age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <User className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* GENDER */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                GENDER
              </label>
              <div className="relative">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-8 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] appearance-none cursor-pointer transition-all shadow-2xs"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                EMAIL
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <Mail className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 3: REFERRED BY & ADDRESS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                REFERRED BY
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="referred-by-suggestions"
                  placeholder="Dr. Amit Gupta"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <User className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <datalist id="referred-by-suggestions">
                  {referredBySuggestions.map((ref, idx) => (
                    <option key={idx} value={ref} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                FULL ADDRESS
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="742 Evergreen Terrace, Sector 14"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <MapPin className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                CITY
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Gurgaon"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <Building className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                STATE
              </label>
              <div className="relative">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-8 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] appearance-none cursor-pointer transition-all shadow-2xs"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                PIN CODE
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="122001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <MapPin className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SPECT(S) RX / CLINICAL PRESCRIPTION */}
      <ClinicalPrescriptionCard
        values={{
          rxNumber,
          rxCategory,
          lensType,
          doctorName,
          prescribedAt,
          rightSphere: distODSphere,
          rightCylinder: distODCylinder,
          rightAxis: distODAxis,
          rightAdd: distODAdd,
          rightNv: distODNv,
          pdRight,
          caddRight,
          leftSphere: distOSSphere,
          leftCylinder: distOSCylinder,
          leftAxis: distOSAxis,
          leftAdd: distOSAdd,
          leftNv: distOSNv,
          pdLeft,
          caddLeft,
        }}
        doctorSuggestions={doctorSuggestions}
        onChange={(updated) => {
          if (updated.rxNumber !== undefined) setRxNumber(updated.rxNumber);
          if (updated.rxCategory !== undefined) setRxCategory(updated.rxCategory);
          if (updated.lensType !== undefined) setLensType(updated.lensType);
          if (updated.doctorName !== undefined) setDoctorName(updated.doctorName);
          if (updated.prescribedAt !== undefined) setPrescribedAt(updated.prescribedAt);

          if (updated.rightSphere !== undefined) setDistODSphere(updated.rightSphere);
          if (updated.rightCylinder !== undefined) {
            setDistODCylinder(updated.rightCylinder);
            setNearODCylinder(updated.rightCylinder);
          }
          if (updated.rightAxis !== undefined) {
            setDistODAxis(updated.rightAxis);
            setNearODAxis(updated.rightAxis);
          }
          if (updated.rightAdd !== undefined) {
            setDistODAdd(updated.rightAdd);
            if (updated.rightAdd && updated.rightSphere) {
              const base = parseFloat(updated.rightSphere) || 0;
              const add = parseFloat(updated.rightAdd) || 0;
              setNearODSphere((base + add).toFixed(2));
            }
          }
          if (updated.rightNv !== undefined) setDistODNv(updated.rightNv);
          if (updated.pdRight !== undefined) setPdRight(updated.pdRight);
          if (updated.caddRight !== undefined) setCaddRight(updated.caddRight);

          if (updated.leftSphere !== undefined) setDistOSSphere(updated.leftSphere);
          if (updated.leftCylinder !== undefined) {
            setDistOSCylinder(updated.leftCylinder);
            setNearOSCylinder(updated.leftCylinder);
          }
          if (updated.leftAxis !== undefined) {
            setDistOSAxis(updated.leftAxis);
            setNearOSAxis(updated.leftAxis);
          }
          if (updated.leftAdd !== undefined) {
            setDistOSAdd(updated.leftAdd);
            if (updated.leftAdd && updated.leftSphere) {
              const base = parseFloat(updated.leftSphere) || 0;
              const add = parseFloat(updated.leftAdd) || 0;
              setNearOSSphere((base + add).toFixed(2));
            }
          }
          if (updated.leftNv !== undefined) setDistOSNv(updated.leftNv);
          if (updated.pdLeft !== undefined) setPdLeft(updated.pdLeft);
          if (updated.caddLeft !== undefined) setCaddLeft(updated.caddLeft);
        }}
      />

      {/* SECTION 3: PRODUCT SELECTION */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="py-1.5 px-3.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-3.5 w-3.5 text-[#2563eb]" />
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
              PRODUCT SELECTION
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100">
            {lineItems.length} {lineItems.length === 1 ? "Item" : "Items"}
          </span>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-1.5 px-2 min-w-[200px]">Product Search</th>
                  <th className="py-1.5 px-2 min-w-[85px]">SKU</th>
                  <th className="py-1.5 px-1.5 text-center min-w-[45px]">Qty</th>
                  <th className="py-1.5 px-2 text-right min-w-[80px]">Price (₹)</th>
                  <th className="py-1.5 px-1.5 text-center min-w-[60px]">Disc %</th>
                  <th className="py-1.5 px-1.5 text-center min-w-[70px]">Disc ₹</th>
                  <th className="py-1.5 px-2 text-right min-w-[65px]">CGST (₹)</th>
                  <th className="py-1.5 px-2 text-right min-w-[65px]">SGST (₹)</th>
                  <th className="py-1.5 px-2 text-right min-w-[65px]">IGST (₹)</th>
                  <th className="py-1.5 px-2 text-right min-w-[85px]">Total (₹)</th>
                  <th className="py-1.5 px-1 text-center min-w-[36px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    {/* Product Search & Description Autocomplete */}
                    <td className="py-1.5 px-2 relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={item.description || item.searchQuery}
                          onChange={(e) => handleRowSearchChange(index, e.target.value)}
                          onFocus={() => {
                            if (item.suggestions.length > 0) {
                              const updated = [...lineItems];
                              updated[index].showDropdown = true;
                              setLineItems(updated);
                            }
                          }}
                          placeholder="Search product name or frame..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] shadow-2xs"
                        />
                        {item.isSearching && (
                          <Loader2 className="absolute right-2 top-1.5 h-3.5 w-3.5 text-[#2563eb] animate-spin pointer-events-none" />
                        )}
                      </div>

                      {/* Autocomplete Dropdown */}
                      {item.showDropdown && item.suggestions.length > 0 && (
                        <div className="absolute top-full left-2 w-[320px] mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100 ring-1 ring-black/5">
                          {item.suggestions.map((sug) => (
                            <button
                              key={sug.id}
                              type="button"
                              onClick={() => handleSelectProduct(index, sug)}
                              className="w-full text-left p-2.5 hover:bg-blue-50/60 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-xs truncate group-hover:text-[#2563eb]">
                                  {sug.name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                                  <span>SKU: {sug.sku}</span>
                                  <span>•</span>
                                  <span>Stock: {sug.stockQuantity ?? sug.stock_quantity ?? 0}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-extrabold text-xs text-slate-900 block">
                                  ₹{Number(sug.sellingPrice ?? sug.selling_price ?? 0).toFixed(2)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => updateLineItem(index, { sku: e.target.value })}
                        placeholder="SKU"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] shadow-2xs"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-1.5 px-1.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity === "" || isNaN(item.quantity as number) ? "" : item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateLineItem(index, { quantity: val === "" ? "" : parseInt(val, 10) });
                        }}
                        placeholder="1"
                        className="w-11 text-center py-1 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] bg-white shadow-2xs"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-1.5 px-2">
                      <div className="relative">
                        <span className="absolute left-1.5 top-1 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateLineItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full text-right bg-white border border-slate-200 rounded-lg pl-4 pr-1.5 py-1 font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] shadow-2xs"
                        />
                      </div>
                    </td>

                    {/* Disc % */}
                    <td className="py-1.5 px-1.5 text-center">
                      <div className="relative inline-block w-full">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                          value={item.discountPercent === 0 ? "" : Number(item.discountPercent.toFixed(2))}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItem(index, {
                              discountPercent: val === "" ? 0 : Math.min(100, Math.max(0, parseFloat(val) || 0)),
                            });
                          }}
                          className="w-full text-center py-1 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] bg-white pr-2.5 shadow-2xs"
                        />
                        <span className="absolute right-1 top-1 text-slate-400 font-bold text-[9px] pointer-events-none">%</span>
                      </div>
                    </td>

                    {/* Disc ₹ */}
                    <td className="py-1.5 px-1.5 text-center">
                      <div className="relative inline-block w-full">
                        <span className="absolute left-1 top-1 text-slate-400 font-bold text-[9px] pointer-events-none">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={item.discountAmount === 0 ? "" : Number(item.discountAmount.toFixed(2))}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItem(index, {
                              discountAmount: val === "" ? 0 : Math.max(0, parseFloat(val) || 0),
                            });
                          }}
                          className="w-full text-right py-1 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] bg-white pl-2.5 pr-1 shadow-2xs"
                        />
                      </div>
                    </td>

                    {/* CGST (₹) */}
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-600">
                      ₹{item.cgstAmount.toFixed(2)}
                    </td>

                    {/* SGST (₹) */}
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-600">
                      ₹{item.sgstAmount.toFixed(2)}
                    </td>

                    {/* IGST (₹) */}
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-600">
                      ₹{item.igstAmount.toFixed(2)}
                    </td>

                    {/* Row Total (₹) */}
                    <td className="py-1.5 px-2 text-right font-black text-slate-900">
                      ₹{item.rowTotal.toFixed(2)}
                    </td>

                    {/* Action */}
                    <td className="py-1.5 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        title="Delete item"
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Actions */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 border border-dashed border-slate-300 hover:border-[#2563eb]/60 hover:bg-blue-50/40 text-xs font-bold text-slate-600 hover:text-[#2563eb] rounded-lg transition-all cursor-pointer flex items-center gap-1.5 self-start"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add another item</span>
            </button>

            {/* Quick Barcode Scanner Input */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-[#2563eb]/20 focus-within:border-[#2563eb] focus-within:bg-white transition-all w-full sm:w-64">
              <Barcode className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Click here & scan barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    triggerBarcodeSearch();
                  }
                }}
                className="w-full bg-transparent text-xs font-bold outline-none text-slate-800 placeholder:text-slate-400"
              />
              {isBarcodeSearching && (
                <Loader2 className="h-3.5 w-3.5 text-[#2563eb] animate-spin shrink-0" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: PAYMENT & INVOICE SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left: Payment Method, Payment Mode, Details & Remarks */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-xl shadow-xs p-3 space-y-2.5">
          {/* 1. Select Payment Method */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">
              1. Select Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "CASH", label: "Cash", icon: DollarSign },
                { id: "CARD", label: "Card", icon: CreditCard },
                { id: "UPI", label: "UPI", icon: Smartphone },
                { id: "BANK_TRANSFER", label: "Bank", icon: Landmark },
              ].map((method) => {
                const IconComponent = method.icon;
                const active = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      active
                        ? "border-[#2563eb] bg-blue-50/50 text-[#2563eb] font-bold shadow-xs ring-1 ring-[#2563eb]/20"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold"
                    }`}
                  >
                    <IconComponent className={`h-3.5 w-3.5 ${active ? "text-[#2563eb]" : "text-slate-400"}`} />
                    <span className="text-[11px]">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Payment Mode */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">
              2. Payment Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  paymentType === "FULL"
                    ? "border-[#2563eb] bg-blue-50/40 text-[#2563eb] font-bold shadow-xs ring-1 ring-[#2563eb]/20"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="paymentType"
                  value="FULL"
                  checked={paymentType === "FULL"}
                  onChange={() => setPaymentType("FULL")}
                  className="text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span className="text-xs font-bold">Full Payment</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  paymentType === "PARTIAL"
                    ? "border-[#2563eb] bg-blue-50/40 text-[#2563eb] font-bold shadow-xs ring-1 ring-[#2563eb]/20"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="paymentType"
                  value="PARTIAL"
                  checked={paymentType === "PARTIAL"}
                  onChange={() => setPaymentType("PARTIAL")}
                  className="text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span className="text-xs font-bold">Partial Payment</span>
              </label>
            </div>
          </div>

          {/* 4-Field Row: Amount Paid, Balance Due, Sold By, Expected Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Amount Paid */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                AMOUNT PAID
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={netPayable}
                  value={paymentType === "FULL" ? netPayable.toFixed(2) : amountPaidOverride}
                  onChange={(e) => setAmountPaidOverride(e.target.value)}
                  disabled={paymentType === "FULL"}
                  className={`w-full h-8 pl-6 pr-2.5 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
                    paymentType === "FULL"
                      ? "bg-slate-50/70 border-slate-200 text-slate-700 font-extrabold"
                      : "bg-white border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                  }`}
                />
              </div>
            </div>

            {/* Balance Due */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                BALANCE DUE
              </label>
              <div
                className={`w-full h-8 px-2.5 rounded-lg border flex items-center justify-between text-xs font-black shadow-2xs ${
                  finalBalanceDue > 0
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-slate-50/70 border-slate-200 text-slate-700"
                }`}
              >
                <span>₹</span>
                <span>{finalBalanceDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Sold By */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
                SOLD BY (STAFF)
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="staff-suggestions"
                  placeholder="Staff Name"
                  value={soldBy}
                  onChange={(e) => setSoldBy(e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <User className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <datalist id="staff-suggestions">
                  {staffSuggestions.map((st, idx) => (
                    <option key={idx} value={st} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Expected Delivery */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  EXPECTED DELIVERY
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDeliveryDaysPreset(0)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-colors cursor-pointer ${
                      deliveryDays === 0
                        ? "bg-[#2563eb] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    0D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeliveryDaysPreset(3)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-colors cursor-pointer ${
                      deliveryDays === 3
                        ? "bg-[#2563eb] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    3D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeliveryDaysPreset(7)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-colors cursor-pointer ${
                      deliveryDays === 7
                        ? "bg-[#2563eb] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    7D
                  </button>
                  {deliveryDate && (
                    <button
                      type="button"
                      onClick={handleClearDelivery}
                      title="Clear Delivery Date"
                      className="px-1 py-0.5 rounded text-[9px] font-extrabold text-rose-500 hover:bg-rose-50 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  placeholder="Select delivery date..."
                  value={formatDeliveryDisplay()}
                  onClick={() => {
                    try {
                      deliveryDateInputRef.current?.showPicker();
                    } catch {
                      deliveryDateInputRef.current?.focus();
                    }
                  }}
                  className="w-full h-8 pl-7 pr-7 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      deliveryDateInputRef.current?.showPicker();
                    } catch {
                      deliveryDateInputRef.current?.focus();
                    }
                  }}
                  className="absolute left-2 top-2 text-slate-400 hover:text-[#2563eb] cursor-pointer"
                  title="Open Calendar"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </button>
                {/* Hidden native date picker triggered by click */}
                <input
                  ref={deliveryDateInputRef}
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => handleDeliveryDateChange(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {deliveryDate ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearDelivery();
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Clear"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        deliveryDateInputRef.current?.showPicker();
                      } catch {
                        deliveryDateInputRef.current?.focus();
                      }
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-[#2563eb] cursor-pointer"
                    title="Pick Date"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Notes & Remarks */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-0.5">
              INVOICE NOTES & REMARKS
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Anti-reflective coating requested. Call customer when frame arrives from lab."
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs resize-none"
            />
          </div>
        </div>

        {/* Right: Line Items Summary Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-xl shadow-xs p-3 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ReceiptText className="h-3.5 w-3.5 text-[#2563eb]" />
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                LINE ITEMS SUMMARY
              </h3>
            </div>

            <div className="py-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>Subtotal</span>
                <span className="font-bold text-slate-800">₹{calculatedSubtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-600 font-semibold">
                <span className="flex items-center gap-1">
                  Total GST Taxes <span className="text-slate-400 text-[10px]">ⓘ</span>
                </span>
                <span className="font-bold text-slate-800">₹{totalGSTTax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-600 font-semibold">
                <span className="flex items-center gap-1">
                  Discount <span className="text-slate-400 text-[10px]">ⓘ</span>
                </span>
                <span className="font-bold text-emerald-600">-₹{calculatedDiscount.toFixed(2)}</span>
              </div>

              {customerStoreCredit > 0 && (
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3 w-3 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800">
                      Store Credit (₹{customerStoreCredit.toFixed(2)})
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useStoreCredit}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseStoreCredit(checked);
                        if (checked && (!creditToApply || parseFloat(creditToApply) <= 0)) {
                          setCreditToApply(maxAllowedCredit > 0 ? maxAllowedCredit.toFixed(2) : availableCredit.toFixed(2));
                        }
                      }}
                      className="rounded text-[#2563eb] focus:ring-[#2563eb]"
                    />
                    <span className="text-xs font-extrabold text-emerald-700">Apply</span>
                  </label>
                </div>
              )}

              {appliedCredit > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50/60 px-2 py-0.5 rounded-md border border-emerald-100">
                  <span>Store Credit Applied</span>
                  <span className="font-bold">-₹{appliedCredit.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/80 flex justify-between items-baseline">
                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                  Grand Total
                </span>
                <span className="text-xl font-black text-[#2563eb] tracking-tight">
                  ₹{netPayable.toFixed(2)}
                </span>
              </div>

              {paymentType === "PARTIAL" && (
                <div className="pt-1.5 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600 font-semibold">
                    <span>Paid Now:</span>
                    <span className="font-bold text-slate-800">₹{finalAmountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-extrabold">
                    <span>Balance Due:</span>
                    <span>₹{finalBalanceDue.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              className="w-1/3 h-10 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer text-xs transition-all"
            >
              <Save className="h-3.5 w-3.5 text-slate-500" />
              <span>Save Draft</span>
            </Button>

            <Button
              type="submit"
              disabled={isPending}
              className="w-2/3 h-10 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.99] text-xs"
            >
              {paymentType === "PARTIAL" ? (
                <>
                  <ReceiptText className="h-4 w-4" />
                  <span>{isPending ? "Generating..." : "Generate Receipt"}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isPending ? "Creating..." : "Create Invoice"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* LOAD EXISTING PATIENT MODAL OVERLAY */}
      {showPatientSearch && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#2563eb]" />
                <h3 className="text-sm font-bold text-slate-900">Load Existing Patient</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPatientSearch(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by patient name, mobile, or ID..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                {isSearchingPatient && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 text-[#2563eb] animate-spin pointer-events-none" />
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {patientResults.length > 0 ? (
                  patientResults.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => handleSelectPatient(cust.id)}
                      className="w-full text-left p-3 hover:bg-blue-50/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#2563eb]">
                          {cust.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {cust.phone} {cust.email ? `• ${cust.email}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono font-bold text-slate-400 block">
                          {cust.customerCode || cust.id.slice(0, 8)}
                        </span>
                        {Number(cust.storeCredit || 0) > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            ₹{Number(cust.storeCredit).toFixed(2)} Cr
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                ) : patientQuery.trim().length > 0 && !isSearchingPatient ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-semibold">
                    No existing patients found matching &quot;{patientQuery}&quot;
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 font-semibold">
                    Type a name or phone number to find patients
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OPTOMETRY INDUSTRY DATALISTS FOR SMART PRESCRIPTION SELECTION */}
      <datalist id="sph-options">
        {SPH_OPTIONS.map((val) => (
          <option key={val} value={val} />
        ))}
      </datalist>

      <datalist id="cyl-options">
        {CYL_OPTIONS.map((val) => (
          <option key={val} value={val} />
        ))}
      </datalist>

      <datalist id="axis-options">
        {AXIS_OPTIONS.map((val) => (
          <option key={val} value={val} />
        ))}
      </datalist>

      <datalist id="dist-vn-options">
        {DISTANCE_VN_OPTIONS.map((val) => (
          <option key={val} value={val} />
        ))}
      </datalist>

      <datalist id="near-vn-options">
        {NEAR_VN_OPTIONS.map((val) => (
          <option key={val} value={val} />
        ))}
      </datalist>

      <datalist id="add-options">
        {ADD_OPTIONS.map((val) => (
          <option key={val} value={val} />
        ))}
      </datalist>
    </form>
  );
}
