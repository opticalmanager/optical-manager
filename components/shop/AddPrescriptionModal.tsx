"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { savePatientPrescriptionAction, getClinicalSuggestionsAction } from "@/actions/patient.actions";
import { ClinicalPrescriptionCard, type ClinicalPrescriptionValues } from "./ClinicalPrescriptionCard";
import { X, Eye, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { offlineDB } from "@/lib/offline/db";
import { enqueueOfflineMutation } from "@/lib/offline/mutation-queue";

interface AddPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onPrescriptionAdded?: (newRx: any) => void;
}

export function AddPrescriptionModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onPrescriptionAdded,
}: AddPrescriptionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctorSuggestions, setDoctorSuggestions] = useState<string[]>([]);

  const [rxValues, setRxValues] = useState<ClinicalPrescriptionValues>({
    rxNumber: "PR-" + Math.floor(1000 + Math.random() * 9000),
    rxCategory: "SPECTACLES",
    lensType: "Single Vision",
    doctorName: "",
    prescribedAt: new Date().toISOString().split("T")[0],
    rightSphere: "",
    rightCylinder: "",
    rightAxis: "",
    rightAdd: "",
    rightNv: "6/6",
    pdRight: "31.5",
    caddRight: "",
    leftSphere: "",
    leftCylinder: "",
    leftAxis: "",
    leftAdd: "",
    leftNv: "6/6",
    pdLeft: "31.5",
    caddLeft: "",
  });

  useEffect(() => {
    if (isOpen) {
      getClinicalSuggestionsAction().then((res) => {
        if (res.success) {
          setDoctorSuggestions(res.doctorNameList || []);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    const loadingToast = toast.loading("Saving new clinical prescription...");

    const rxPayload = {
      customerId,
      doctorName: rxValues.doctorName?.trim() || undefined,
      prescribedAt: rxValues.prescribedAt || undefined,
      prescriptionNotes: rxValues.lensType?.trim() || undefined,
      lensType: rxValues.lensType?.trim() || undefined,
      rxNumber: rxValues.rxNumber?.trim() || undefined,
      rxCategory: rxValues.rxCategory || "SPECTACLES",
      distanceEnabled: true,
      nearEnabled: true,
      distancePrescription: {
        rightSphere: rxValues.rightSphere || undefined,
        rightCylinder: rxValues.rightCylinder || undefined,
        rightAxis: rxValues.rightAxis || undefined,
        rightAdd: rxValues.rightAdd || undefined,
        rightNv: rxValues.rightNv || undefined,
        caddRight: rxValues.caddRight || undefined,
        leftSphere: rxValues.leftSphere || undefined,
        leftCylinder: rxValues.leftCylinder || undefined,
        leftAxis: rxValues.leftAxis || undefined,
        leftAdd: rxValues.leftAdd || undefined,
        leftNv: rxValues.leftNv || undefined,
        caddLeft: rxValues.caddLeft || undefined,
        pdRight: rxValues.pdRight || undefined,
        pdLeft: rxValues.pdLeft || undefined,
        pd: rxValues.pdRight || undefined,
      },
      nearPrescription: {
        rightSphere:
          rxValues.rightAdd && rxValues.rightSphere
            ? (parseFloat(rxValues.rightSphere) + parseFloat(rxValues.rightAdd)).toFixed(2)
            : rxValues.rightSphere || undefined,
        rightCylinder: rxValues.rightCylinder || undefined,
        rightAxis: rxValues.rightAxis || undefined,
        rightAdd: rxValues.rightAdd || undefined,
        rightNv: rxValues.rightNv || undefined,
        caddRight: rxValues.caddRight || undefined,
        leftSphere:
          rxValues.leftAdd && rxValues.leftSphere
            ? (parseFloat(rxValues.leftSphere) + parseFloat(rxValues.leftAdd)).toFixed(2)
            : rxValues.leftSphere || undefined,
        leftCylinder: rxValues.leftCylinder || undefined,
        leftAxis: rxValues.leftAxis || undefined,
        leftAdd: rxValues.leftAdd || undefined,
        leftNv: rxValues.leftNv || undefined,
        caddLeft: rxValues.caddLeft || undefined,
        pdRight: rxValues.pdRight || undefined,
        pdLeft: rxValues.pdLeft || undefined,
        pd: rxValues.pdRight || undefined,
      },
    };

    const saveOfflinePrescription = async () => {
      try {
        const shopId = (await offlineDB.getCurrentShopId()) || "";
        await enqueueOfflineMutation(shopId, "PRESCRIPTION_CREATE", rxPayload);

        const localRx = {
          id: "rx-offline-" + Date.now(),
          prescriptionType: "DISTANCE" as const,
          rightSphere: rxPayload.distancePrescription.rightSphere || null,
          rightCylinder: rxPayload.distancePrescription.rightCylinder || null,
          rightAxis: rxPayload.distancePrescription.rightAxis || null,
          rightAdd: rxPayload.distancePrescription.rightAdd || null,
          rightNv: rxPayload.distancePrescription.rightNv || null,
          leftSphere: rxPayload.distancePrescription.leftSphere || null,
          leftCylinder: rxPayload.distancePrescription.leftCylinder || null,
          leftAxis: rxPayload.distancePrescription.leftAxis || null,
          leftAdd: rxPayload.distancePrescription.leftAdd || null,
          leftNv: rxPayload.distancePrescription.leftNv || null,
          pd: rxPayload.distancePrescription.pd || null,
          pdRight: rxPayload.distancePrescription.pdRight || null,
          pdLeft: rxPayload.distancePrescription.pdLeft || null,
          caddRight: rxPayload.distancePrescription.caddRight || null,
          caddLeft: rxPayload.distancePrescription.caddLeft || null,
          rxNumber: rxValues.rxNumber || null,
          rxCategory: rxValues.rxCategory || "SPECTACLES",
          lensType: rxValues.lensType || null,
          doctorName: rxValues.doctorName || "Optometrist",
          prescribedAt: rxValues.prescribedAt || new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
        };

        if (onPrescriptionAdded) {
          onPrescriptionAdded(localRx);
        }

        window.dispatchEvent(new CustomEvent("offline-databank-updated"));
        toast.success("Prescription saved locally! Will sync automatically when online.", { id: loadingToast });
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to save prescription locally.", { id: loadingToast });
      }
    };

    if (!navigator.onLine) {
      await saveOfflinePrescription();
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await savePatientPrescriptionAction(rxPayload);

      if (res.success) {
        toast.success(res.message || "Prescription recorded successfully!", { id: loadingToast });
        router.refresh();
        onClose();
      } else {
        toast.error(res.message || "Failed to record prescription.", { id: loadingToast });
      }
    } catch (err: any) {
      console.warn("[AddPrescriptionModal] Online save failed, fallback to offline:", err);
      await saveOfflinePrescription();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in-50">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Add Clinical Prescription
              </h2>
              <p className="text-[10px] font-semibold text-slate-400">
                Patient: <span className="text-[#2563eb] font-bold">{customerName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4 flex-1 text-xs">
          <ClinicalPrescriptionCard
            values={rxValues}
            onChange={(updated) => setRxValues(updated)}
            doctorSuggestions={doctorSuggestions}
          />

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 font-bold rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 font-bold rounded-lg text-xs bg-[#2563eb] hover:bg-blue-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Save Prescription
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
