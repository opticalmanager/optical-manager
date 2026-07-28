"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { savePatientPrescriptionAction, getClinicalSuggestionsAction } from "@/actions/patient.actions";
import { ClinicalAutocompleteInput } from "@/components/ui/ClinicalAutocompleteInput";
import { SPH_OPTIONS, CYL_OPTIONS, AXIS_OPTIONS, DISTANCE_VN_OPTIONS, NEAR_VN_OPTIONS, ADD_OPTIONS, formatDiopterValue, formatAxisValue } from "@/utils/optometry";
import { X, Eye, FileText, Stethoscope, Calendar, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
}

export function AddPrescriptionModal({
  isOpen,
  onClose,
  customerId,
  customerName,
}: AddPrescriptionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctorSuggestions, setDoctorSuggestions] = useState<string[]>([]);

  // Form State
  const [prescribedAt, setPrescribedAt] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [doctorName, setDoctorName] = useState<string>("");
  const [prescriptionNotes, setPrescriptionNotes] = useState<string>("");
  const [partyName, setPartyName] = useState<string>("");
  const [frameName, setFrameName] = useState<string>("");

  const [distanceEnabled, setDistanceEnabled] = useState(true);
  const [nearEnabled, setNearEnabled] = useState(false);

  // Distance OD
  const [distODSph, setDistODSph] = useState("");
  const [distODCyl, setDistODCyl] = useState("");
  const [distODAxis, setDistODAxis] = useState("");
  const [distODAdd, setDistODAdd] = useState("");
  const [distODNv, setDistODNv] = useState("");

  // Distance OS
  const [distOSSph, setDistOSSph] = useState("");
  const [distOSCyl, setDistOSCyl] = useState("");
  const [distOSAxis, setDistOSAxis] = useState("");
  const [distOSAdd, setDistOSAdd] = useState("");
  const [distOSNv, setDistOSNv] = useState("");
  const [distPd, setDistPd] = useState("");

  // Near OD
  const [nearODSph, setNearODSph] = useState("");
  const [nearODCyl, setNearODCyl] = useState("");
  const [nearODAxis, setNearODAxis] = useState("");
  const [nearODNv, setNearODNv] = useState("");

  // Near OS
  const [nearOSSph, setNearOSSph] = useState("");
  const [nearOSCyl, setNearOSCyl] = useState("");
  const [nearOSAxis, setNearOSAxis] = useState("");
  const [nearOSNv, setNearOSNv] = useState("");

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

    if (!distanceEnabled && !nearEnabled) {
      toast.error("Please enable at least Distance Vision or Near Vision prescription.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Saving new optical prescription...");

    try {
      const res = await savePatientPrescriptionAction({
        customerId,
        doctorName: doctorName.trim() || undefined,
        prescribedAt: prescribedAt || undefined,
        prescriptionNotes: prescriptionNotes.trim() || undefined,
        partyName: partyName.trim() || undefined,
        frameName: frameName.trim() || undefined,
        distanceEnabled,
        nearEnabled,
        distancePrescription: distanceEnabled
          ? {
              rightSphere: formatDiopterValue(distODSph) || undefined,
              rightCylinder: formatDiopterValue(distODCyl) || undefined,
              rightAxis: formatAxisValue(distODAxis) || undefined,
              rightAdd: formatDiopterValue(distODAdd) || undefined,
              rightNv: distODNv.trim() || undefined,
              leftSphere: formatDiopterValue(distOSSph) || undefined,
              leftCylinder: formatDiopterValue(distOSCyl) || undefined,
              leftAxis: formatAxisValue(distOSAxis) || undefined,
              leftAdd: formatDiopterValue(distOSAdd) || undefined,
              leftNv: distOSNv.trim() || undefined,
              pd: distPd.trim() || undefined,
            }
          : undefined,
        nearPrescription: nearEnabled
          ? {
              rightSphere: formatDiopterValue(nearODSph) || undefined,
              rightCylinder: formatDiopterValue(nearODCyl) || undefined,
              rightAxis: formatAxisValue(nearODAxis) || undefined,
              rightNv: nearODNv.trim() || undefined,
              leftSphere: formatDiopterValue(nearOSSph) || undefined,
              leftCylinder: formatDiopterValue(nearOSCyl) || undefined,
              leftAxis: formatAxisValue(nearOSAxis) || undefined,
              leftNv: nearOSNv.trim() || undefined,
              pd: distPd.trim() || undefined,
            }
          : undefined,
      });

      if (res.success) {
        toast.success(res.message || "Prescription recorded successfully!", { id: loadingToast });
        router.refresh();
        onClose();
      } else {
        toast.error(res.message || "Failed to record prescription.", { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving prescription.", { id: loadingToast });
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
            <div className="p-1.5 rounded-lg bg-[#0a52c3]/10 text-[#0a52c3]">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Add New Prescription
              </h2>
              <p className="text-[10px] font-semibold text-slate-400">
                Patient: <span className="text-[#0a52c3] font-bold">{customerName}</span>
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
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1 text-xs">
          
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Prescribed Date
              </label>
              <input
                type="date"
                value={prescribedAt}
                onChange={(e) => setPrescribedAt(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0a52c3]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Prescribed By (Doctor)
              </label>
              <ClinicalAutocompleteInput
                options={doctorSuggestions}
                iconType="doctor"
                placeholder="Dr. Rajesh Mehta"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="h-8 bg-white text-xs font-semibold border-slate-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Notes / Lens Type
              </label>
              <input
                type="text"
                placeholder="e.g. Progressive Blue Cut"
                value={prescriptionNotes}
                onChange={(e) => setPrescriptionNotes(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0a52c3]"
              />
            </div>
          </div>

          {/* Vision Toggles */}
          <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={distanceEnabled}
                onChange={(e) => setDistanceEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#0a52c3] focus:ring-[#0a52c3] h-4 w-4"
              />
              <span>Distance Vision (D.V.)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={nearEnabled}
                onChange={(e) => setNearEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#0a52c3] focus:ring-[#0a52c3] h-4 w-4"
              />
              <span>Near Vision (N.V.)</span>
            </label>
          </div>

          {/* Distance Vision Section */}
          {distanceEnabled && (
            <div className="space-y-3 bg-blue-50/20 p-3.5 rounded-xl border border-blue-100/60">
              <div className="flex items-center justify-between border-b border-blue-100/80 pb-1.5">
                <span className="font-extrabold text-[#0a52c3] uppercase tracking-wider text-[11px]">
                  Distance Vision Refraction (D.V.)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">P.D. (mm):</span>
                  <input
                    type="text"
                    placeholder="64"
                    value={distPd}
                    onChange={(e) => setDistPd(e.target.value)}
                    className="w-16 h-7 px-2 text-center bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Refraction Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-200/60">
                      <th className="py-1 text-left w-20">Eye</th>
                      <th className="py-1">SPH</th>
                      <th className="py-1">CYL</th>
                      <th className="py-1">AXIS</th>
                      <th className="py-1">V/N</th>
                      <th className="py-1">ADD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Right Eye */}
                    <tr>
                      <td className="py-1.5 text-left font-extrabold text-slate-700">Right (OD)</td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="0.00"
                          list="sph-list"
                          value={distODSph}
                          onChange={(e) => setDistODSph(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="0.00"
                          list="cyl-list"
                          value={distODCyl}
                          onChange={(e) => setDistODCyl(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="90"
                          list="axis-list"
                          value={distODAxis}
                          onChange={(e) => setDistODAxis(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="6/6"
                          list="dvn-list"
                          value={distODNv}
                          onChange={(e) => setDistODNv(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="+1.50"
                          list="add-list"
                          value={distODAdd}
                          onChange={(e) => setDistODAdd(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                    </tr>

                    {/* Left Eye */}
                    <tr>
                      <td className="py-1.5 text-left font-extrabold text-slate-700">Left (OS)</td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="0.00"
                          list="sph-list"
                          value={distOSSph}
                          onChange={(e) => setDistOSSph(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="0.00"
                          list="cyl-list"
                          value={distOSCyl}
                          onChange={(e) => setDistOSCyl(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="90"
                          list="axis-list"
                          value={distOSAxis}
                          onChange={(e) => setDistOSAxis(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="6/6"
                          list="dvn-list"
                          value={distOSNv}
                          onChange={(e) => setDistOSNv(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="+1.50"
                          list="add-list"
                          value={distOSAdd}
                          onChange={(e) => setDistOSAdd(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Near Vision Section */}
          {nearEnabled && (
            <div className="space-y-3 bg-emerald-50/20 p-3.5 rounded-xl border border-emerald-100/60">
              <div className="flex items-center justify-between border-b border-emerald-100/80 pb-1.5">
                <span className="font-extrabold text-emerald-700 uppercase tracking-wider text-[11px]">
                  Near Vision Refraction (N.V.)
                </span>
              </div>

              {/* Refraction Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-200/60">
                      <th className="py-1 text-left w-20">Eye</th>
                      <th className="py-1">SPH</th>
                      <th className="py-1">CYL</th>
                      <th className="py-1">AXIS</th>
                      <th className="py-1">V/N</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Right Eye */}
                    <tr>
                      <td className="py-1.5 text-left font-extrabold text-slate-700">Right (OD)</td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="0.00"
                          list="sph-list"
                          value={nearODSph}
                          onChange={(e) => setNearODSph(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="0.00"
                          list="cyl-list"
                          value={nearODCyl}
                          onChange={(e) => setNearODCyl(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="90"
                          list="axis-list"
                          value={nearODAxis}
                          onChange={(e) => setNearODAxis(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="N6"
                          list="nvn-list"
                          value={nearODNv}
                          onChange={(e) => setNearODNv(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                    </tr>

                    {/* Left Eye */}
                    <tr>
                      <td className="py-1.5 text-left font-extrabold text-slate-700">Left (OS)</td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="0.00"
                          list="sph-list"
                          value={nearOSSph}
                          onChange={(e) => setNearOSSph(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="0.00"
                          list="cyl-list"
                          value={nearOSCyl}
                          onChange={(e) => setNearOSCyl(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="90"
                          list="axis-list"
                          value={nearOSAxis}
                          onChange={(e) => setNearOSAxis(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          placeholder="N6"
                          list="nvn-list"
                          value={nearOSNv}
                          onChange={(e) => setNearOSNv(e.target.value)}
                          className="w-full h-7 px-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 focus:border-[#0a52c3]"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Datalists for input auto-suggestions */}
          <datalist id="sph-list">
            {SPH_OPTIONS.map((val) => (
              <option key={val} value={val} />
            ))}
          </datalist>
          <datalist id="cyl-list">
            {CYL_OPTIONS.map((val) => (
              <option key={val} value={val} />
            ))}
          </datalist>
          <datalist id="axis-list">
            {AXIS_OPTIONS.map((val) => (
              <option key={val} value={val} />
            ))}
          </datalist>
          <datalist id="dvn-list">
            {DISTANCE_VN_OPTIONS.map((val) => (
              <option key={val} value={val} />
            ))}
          </datalist>
          <datalist id="nvn-list">
            {NEAR_VN_OPTIONS.map((val) => (
              <option key={val} value={val} />
            ))}
          </datalist>
          <datalist id="add-list">
            {ADD_OPTIONS.map((val) => (
              <option key={val} value={val} />
            ))}
          </datalist>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 font-bold rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-8 px-4 font-bold rounded-lg text-xs bg-[#0a52c3] hover:bg-[#004bb5] text-white transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Prescription"
              )}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
