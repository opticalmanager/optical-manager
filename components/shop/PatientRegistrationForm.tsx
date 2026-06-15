"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientVisitSchema } from "@/utils/validators";
import {
  registerPatientAction,
  getNextRegistrationIdAction,
  updatePatientAction,
} from "@/actions/patient.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronDown,
  RotateCcw,
  User,
  Activity,
  Eye,
  Check,
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

interface PatientRegistrationFormProps {
  initialPatientData?: {
    customer: any;
    distancePrescription?: any;
    nearPrescription?: any;
  };
  patientId?: string;
}

export function PatientRegistrationForm({ initialPatientData, patientId }: PatientRegistrationFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [regId, setRegId] = useState("OP-2026-XXXX");
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);

  const form = useForm({
    resolver: zodResolver(patientVisitSchema),
    defaultValues: initialPatientData ? {
      customer: {
        fullName: initialPatientData.customer.fullName || "",
        email: initialPatientData.customer.email || "",
        phone: initialPatientData.customer.phone || "",
        dateOfBirth: initialPatientData.customer.dateOfBirth || "",
        address: initialPatientData.customer.address || "",
        city: initialPatientData.customer.city || "",
        state: initialPatientData.customer.state || "",
        pincode: initialPatientData.customer.pincode || "",
        gender: initialPatientData.customer.gender || "",
        bloodGroup: initialPatientData.customer.bloodGroup || "",
        referredBy: initialPatientData.customer.referredBy || "",
        chiefComplaint: initialPatientData.customer.chiefComplaint || "",
        familyHistory: initialPatientData.customer.familyHistory || "",
        systemicIllness: initialPatientData.customer.systemicIllness || "",
        allergies: initialPatientData.customer.allergies || "",
        notes: initialPatientData.customer.notes || "",
      },
      prescriptionEnabled: !!(initialPatientData.distancePrescription || initialPatientData.nearPrescription),
      prescriptionType: {
        distance: !!initialPatientData.distancePrescription,
        near: !!initialPatientData.nearPrescription,
      },
      distancePrescription: {
        rightSphere: initialPatientData.distancePrescription?.rightSphere || "",
        rightCylinder: initialPatientData.distancePrescription?.rightCylinder || "",
        rightAxis: initialPatientData.distancePrescription?.rightAxis || "",
        rightAdd: initialPatientData.distancePrescription?.rightAdd || "",
        rightNv: initialPatientData.distancePrescription?.rightNv || "",
        leftSphere: initialPatientData.distancePrescription?.leftSphere || "",
        leftCylinder: initialPatientData.distancePrescription?.leftCylinder || "",
        leftAxis: initialPatientData.distancePrescription?.leftAxis || "",
        leftAdd: initialPatientData.distancePrescription?.leftAdd || "",
        leftNv: initialPatientData.distancePrescription?.leftNv || "",
        pdRight: initialPatientData.distancePrescription?.pdRight || "",
        pdLeft: initialPatientData.distancePrescription?.pdLeft || "",
        pd: initialPatientData.distancePrescription?.pd || "",
      },
      nearPrescription: {
        rightSphere: initialPatientData.nearPrescription?.rightSphere || "",
        rightCylinder: initialPatientData.nearPrescription?.rightCylinder || "",
        rightAxis: initialPatientData.nearPrescription?.rightAxis || "",
        rightAdd: initialPatientData.nearPrescription?.rightAdd || "",
        rightNv: initialPatientData.nearPrescription?.rightNv || "",
        leftSphere: initialPatientData.nearPrescription?.leftSphere || "",
        leftCylinder: initialPatientData.nearPrescription?.leftCylinder || "",
        leftAxis: initialPatientData.nearPrescription?.leftAxis || "",
        leftAdd: initialPatientData.nearPrescription?.leftAdd || "",
        leftNv: initialPatientData.nearPrescription?.leftNv || "",
        pdRight: initialPatientData.nearPrescription?.pdRight || "",
        pdLeft: initialPatientData.nearPrescription?.pdLeft || "",
        pd: initialPatientData.nearPrescription?.pd || "",
      },
      doctorName: initialPatientData.distancePrescription?.doctorName || initialPatientData.nearPrescription?.doctorName || "",
      partyName: initialPatientData.distancePrescription?.partyName || initialPatientData.nearPrescription?.partyName || "",
      frameName: initialPatientData.distancePrescription?.frameName || initialPatientData.nearPrescription?.frameName || "",
      estimatedDelivery: "",
      specialInstructions: initialPatientData.distancePrescription?.specialInstructions || initialPatientData.nearPrescription?.specialInstructions || "",
      prescriptionNotes: initialPatientData.distancePrescription?.notes || initialPatientData.nearPrescription?.notes || "",
      invoiceEnabled: false,
      invoiceItems: [],
      discountPercent: 0,
      taxPercent: 0,
      paymentMethod: "CASH" as any,
      notes: "",
    } : {
      customer: {
        fullName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        gender: "" as any,
        bloodGroup: "" as any,
        referredBy: "",
        chiefComplaint: "",
        familyHistory: "",
        systemicIllness: "",
        allergies: "",
        notes: "",
      },
      prescriptionEnabled: true,
      prescriptionType: {
        distance: true,
        near: true,
      },
      distancePrescription: {
        rightSphere: "",
        rightCylinder: "",
        rightAxis: "",
        rightAdd: "",
        rightNv: "",
        leftSphere: "",
        leftCylinder: "",
        leftAxis: "",
        leftAdd: "",
        leftNv: "",
        pdRight: "",
        pdLeft: "",
        pd: "",
      },
      nearPrescription: {
        rightSphere: "",
        rightCylinder: "",
        rightAxis: "",
        rightAdd: "",
        rightNv: "",
        leftSphere: "",
        leftCylinder: "",
        leftAxis: "",
        leftAdd: "",
        leftNv: "",
        pdRight: "",
        pdLeft: "",
        pd: "",
      },
      doctorName: "",
      partyName: "",
      frameName: "",
      estimatedDelivery: "",
      specialInstructions: "",
      prescriptionNotes: "",
      invoiceEnabled: false,
      invoiceItems: [],
      discountPercent: 0,
      taxPercent: 0,
      paymentMethod: "CASH" as any,
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  const distanceEnabled = watch("prescriptionType.distance");
  const nearEnabled = watch("prescriptionType.near");

  // Fetch the next Registration ID on load
  useEffect(() => {
    async function fetchNextId() {
      if (patientId) {
        setRegId(initialPatientData?.customer.registrationId || "OP-2026-XXXX");
        return;
      }
      try {
        const res = await getNextRegistrationIdAction();
        if (res.success && res.data) {
          setRegId(res.data);
        }
      } catch (err) {
        console.error("Failed to load sequential registration ID:", err);
      }
    }
    fetchNextId();
  }, [patientId, initialPatientData]);

  // Close state suggestions dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".state-autocomplete-wrapper")) {
        setShowStateSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    reset();
    toast.success("Form cleared successfully.");
  };

  const onSubmit = async (data: any) => {
    setIsPending(true);
    try {
      if (patientId) {
        const res = await updatePatientAction(patientId, data);
        if (res.success) {
          toast.success(res.message);
          router.push(`/shop/customers/${patientId}`);
        } else {
          toast.error(res.message || "Failed to update patient details");
        }
      } else {
        // Force invoice items to empty and disable billing since we are only onboarding the patient
        const submitData = {
          ...data,
          invoiceEnabled: false,
          invoiceItems: [],
        };

        const res = await registerPatientAction(submitData);
        if (res.success) {
          toast.success(res.message);
          router.push("/shop/customers");
        } else {
          toast.error(res.message || "Failed to register patient");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-6xl mx-auto space-y-8 pb-20 select-none animate-fade-in text-slate-800"
    >
      {/* Top Breadcrumb & Actions */}
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
            {patientId ? "Edit Patient Details" : "Customer Registration"}
          </h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            <span>Dashboard</span>
            <span>/</span>
            <span>Customers</span>
            <span>/</span>
            <span className="text-[#0a52c3]">{patientId ? "Edit Profile" : "New Patient"}</span>
          </div>
        </div>

        {/* Reset Link Action */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-[#0a52c3] transition-colors cursor-pointer self-start sm:self-center"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      {/* SECTION 1: BASIC DETAILS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md/5">
        <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2 rounded-t-2xl">
          <span className="h-4 w-1 bg-[#0a52c3] rounded" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0a52c3]">
            01. Basic Details
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Registration ID */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Registration ID
              </label>
              <div className="text-2xl font-extrabold tracking-wide text-[#0a52c3] h-10 flex items-center">
                {regId}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Julianne V. Sterling"
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-350 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.fullName")}
              />
              {errors.customer?.fullName?.message && (
                <span className="text-[10px] font-bold text-rose-500 mt-1.5 block">
                  {String(errors.customer.fullName.message)}
                </span>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <Input
                type="tel"
                placeholder="+91 9821716423"
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-350 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.phone")}
              />
              {errors.customer?.phone?.message && (
                <span className="text-[10px] font-bold text-rose-500 mt-1.5 block">
                  {String(errors.customer.phone.message)}
                </span>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Date of Birth
              </label>
              <Input
                type="date"
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.dateOfBirth")}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Gender
              </label>
              <div className="relative">
                <select
                  className="flex h-10 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3] appearance-none cursor-pointer"
                  {...register("customer.gender")}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="example@mail.com"
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-350 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.email")}
              />
              {errors.customer?.email?.message && (
                <span className="text-[10px] font-bold text-rose-500 mt-1.5 block">
                  {String(errors.customer.email.message)}
                </span>
              )}
            </div>
          </div>

          {/* Row 3: Referred By */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Referred By
              </label>
              <Input
                type="text"
                placeholder="Dr. Sarah Jenkins"
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-350 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.referredBy")}
              />
            </div>
          </div>

          {/* Row 4: Full Address, City, State, Pin Code */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Full Address
              </label>
              <Input
                type="text"
                placeholder="742 Evergreen Terrace, Springfield, IL 62704"
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-355 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.address")}
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                City
              </label>
              <Input
                type="text"
                placeholder="e.g. Gurgaon"
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-350 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.city")}
              />
            </div>

            <div className="relative state-autocomplete-wrapper">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                State
              </label>
              <Input
                type="text"
                placeholder="Type or select State..."
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-350 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.state")}
                onChange={(e) => {
                  register("customer.state").onChange(e);
                  setShowStateSuggestions(true);
                }}
                onFocus={() => setShowStateSuggestions(true)}
              />
              {showStateSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {INDIAN_STATES.filter((st) =>
                    st.toLowerCase().includes((watch("customer.state") || "").toLowerCase())
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setValue("customer.state", st);
                        setShowStateSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      {st}
                    </button>
                  ))}
                  {INDIAN_STATES.filter((st) =>
                    st.toLowerCase().includes((watch("customer.state") || "").toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-2.5 text-xs text-slate-400 text-center">
                      No matching states
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Pin Code
              </label>
              <Input
                type="text"
                placeholder="000-000"
                className="h-10 bg-white font-medium border-slate-200/80 text-slate-800 placeholder:text-slate-350 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                {...register("customer.pincode")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: MEDICAL HISTORY & SYMPTOMS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md/5">
        <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
          <span className="h-4 w-1 bg-[#0a52c3] rounded" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0a52c3]">
            02. Medical History & Symptoms
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chief Complaint */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Chief Complaint
              </label>
              <textarea
                placeholder="Describe symptoms, duration, and severity..."
                rows={3}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 font-medium placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all"
                {...register("customer.chiefComplaint")}
              />
            </div>

            {/* Family History */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Family History
              </label>
              <textarea
                placeholder="Ocular conditions in blood relatives..."
                rows={3}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 font-medium placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all"
                {...register("customer.familyHistory")}
              />
            </div>

            {/* Systemic Illness */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Systemic Illness
              </label>
              <textarea
                placeholder="e.g. Diabetes, Hypertension..."
                rows={3}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 font-medium placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all"
                {...register("customer.systemicIllness")}
              />
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Allergies
              </label>
              <textarea
                placeholder="Medication or environmental allergies..."
                rows={3}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 font-medium placeholder:text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all"
                {...register("customer.allergies")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: EYE PRESCRIPTION DETAILS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md/5">
        <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 bg-[#0a52c3] rounded" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0a52c3]">
              03. Eye Prescription Details
            </h2>
          </div>

          {/* Premium Pill Switchers */}
          <div className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl border border-slate-200/50">
            <button
              type="button"
              onClick={() =>
                setValue("prescriptionType.distance", !distanceEnabled)
              }
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
              onClick={() => setValue("prescriptionType.near", !nearEnabled)}
              className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-350 cursor-pointer ${
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
            {/* Grids Left Side (OD & OS Parameters) */}
            <div className="lg:col-span-2 space-y-6">
              {/* RIGHT EYE / OD TABLE */}
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
                      {/* D.V. Row */}
                      <tr className={distanceEnabled ? "" : "opacity-40"}>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">
                          D.V.
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+0.00"
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("distancePrescription.rightSphere")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.25"
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("distancePrescription.rightCylinder")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="180"
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("distancePrescription.rightAxis")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="6/6"
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("distancePrescription.rightNv")}
                          />
                        </td>
                      </tr>

                      {/* N.V. Row */}
                      <tr className={nearEnabled ? "" : "opacity-40"}>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">
                          N.V.
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+1.50"
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("nearPrescription.rightSphere")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.25"
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("nearPrescription.rightCylinder")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="180"
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("nearPrescription.rightAxis")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="N6"
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("nearPrescription.rightNv")}
                          />
                        </td>
                      </tr>

                      {/* Add Row */}
                      <tr>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">
                          Add
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="P.D."
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-indigo-600 bg-indigo-50/10 placeholder:text-indigo-400/50"
                            {...register("distancePrescription.rightAdd")}
                            onChange={(e) => {
                              setValue("distancePrescription.rightAdd", e.target.value);
                              setValue("nearPrescription.rightAdd", e.target.value);
                            }}
                          />
                        </td>
                        <td colSpan={3} className="bg-slate-50/10" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LEFT EYE / OS TABLE */}
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
                      {/* D.V. Row */}
                      <tr className={distanceEnabled ? "" : "opacity-40"}>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">
                          D.V.
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+0.50"
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("distancePrescription.leftSphere")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.50"
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("distancePrescription.leftCylinder")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="175"
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("distancePrescription.leftAxis")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="6/9"
                            disabled={!distanceEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("distancePrescription.leftNv")}
                          />
                        </td>
                      </tr>

                      {/* N.V. Row */}
                      <tr className={nearEnabled ? "" : "opacity-40"}>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">
                          N.V.
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+2.00"
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("nearPrescription.leftSphere")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.50"
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("nearPrescription.leftCylinder")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="175"
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("nearPrescription.leftAxis")}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="N6"
                            disabled={!nearEnabled}
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                            {...register("nearPrescription.leftNv")}
                          />
                        </td>
                      </tr>

                      {/* Add Row */}
                      <tr>
                        <td className="py-3 px-4 font-bold text-left text-slate-500">
                          Add
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="P.D."
                            className="w-full text-center py-1.5 border border-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-indigo-600 bg-indigo-50/10 placeholder:text-indigo-400/50"
                            {...register("distancePrescription.leftAdd")}
                            onChange={(e) => {
                              setValue("distancePrescription.leftAdd", e.target.value);
                              setValue("nearPrescription.leftAdd", e.target.value);
                            }}
                          />
                        </td>
                        <td colSpan={3} className="bg-slate-50/10" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Side Options */}
            <div className="space-y-5 bg-slate-50/30 border border-slate-200/50 p-5 rounded-2xl">
              {/* Lens Type */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Lens Type
                </label>
                <div className="relative">
                  <select
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3] appearance-none cursor-pointer font-semibold"
                    {...register("prescriptionNotes")}
                  >
                    <option value="">Select Lens Type...</option>
                    <option value="Single Vision">Single Vision</option>
                    <option value="Bifocal">Bifocal</option>
                    <option value="Kryptok Bifocal">Kryptok Bifocal</option>
                    <option value="D-Bifocal">D-Bifocal</option>
                    <option value="Progressive">Progressive</option>
                    <option value="Anti-Glare Blue Cut">Anti-Glare Blue Cut</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Prescribed By */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Prescribed By
                </label>
                <Input
                  type="text"
                  placeholder="Dr. Name"
                  className="h-10 bg-white font-semibold border-slate-200 text-slate-800 placeholder:text-slate-355 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                  {...register("doctorName")}
                />
              </div>

              {/* Party Name */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Party Name
                </label>
                <Input
                  type="text"
                  placeholder="Supplier/Clinic name"
                  className="h-10 bg-white font-semibold border-slate-200 text-slate-800 placeholder:text-slate-355 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                  {...register("partyName")}
                />
              </div>

              {/* Frame Name */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                  Frame Name
                </label>
                <Input
                  type="text"
                  placeholder="Brand/Model name"
                  className="h-10 bg-white font-semibold border-slate-200 text-slate-800 placeholder:text-slate-355 focus-visible:ring-2 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                  {...register("frameName")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons at the Bottom */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 text-sm font-bold bg-[#0a52c3] hover:bg-[#004bb5] text-white rounded-xl shadow-lg shadow-[#0a52c3]/10 hover:shadow-[#0a52c3]/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="h-4.5 w-4.5" />
          {isPending ? "Saving details..." : "Save Client Details"}
        </Button>
      </div>
    </form>
  );
}
