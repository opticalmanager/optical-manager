"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Store, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  PauseCircle, 
  PlayCircle, 
  Plus, 
  DollarSign,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { extendSubscription, toggleStoreSuspension } from "@/services/admin.service";

interface AdminOrganizationsClientProps {
  organizations: any[];
}

export default function AdminOrganizationsClient({ organizations: initialOrgs }: AdminOrganizationsClientProps) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(initialOrgs);

  // Extension modal state
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [extensionMonths, setExtensionMonths] = useState<number>(1);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenExtendModal = (org: any) => {
    setSelectedOrg(org);
    setExtensionMonths(1);
    setAdminNotes("");
  };

  const handleApplyExtension = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);

    try {
      const res = await extendSubscription(selectedOrg.id, extensionMonths, adminNotes);
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === selectedOrg.id
            ? { ...o, currentPeriodEnd: res.newPeriodEnd, status: "ACTIVE" }
            : o
        )
      );
      setSelectedOrg(null);
    } catch (err) {
      console.error("Failed to extend subscription:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSuspension = async (orgId: string) => {
    try {
      const res = await toggleStoreSuspension(orgId);
      setOrgs((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, status: res.newStatus } : o))
      );
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] p-5 rounded-2xl border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Tenant Store Organizations & Subscriptions
            </h1>
          </div>
          <p className="text-xs font-normal text-slate-400 mt-1">
            Click any row to inspect store outlets, subscription logs, and administrative controls
          </p>
        </div>

        <div className="text-xs font-medium text-slate-300 bg-[#070b13] px-3.5 py-2 rounded-xl border border-slate-800/80">
          Total Organizations: <span className="text-white font-bold">{orgs.length}</span>
        </div>
      </div>

      {/* Datatable */}
      <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070b13] border-b border-slate-800/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Organization & Slug</th>
                <th className="px-4 py-3">Owner Details</th>
                <th className="px-4 py-3 text-center">Plan & Outlets</th>
                <th className="px-4 py-3 text-center">Subscription End</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Subscription Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-normal">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 font-medium">
                    No store organizations provisioned yet.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => {
                  const endStr = org.currentPeriodEnd
                    ? new Date(org.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "N/A";

                  const isSuspended = org.status === "SUSPENDED";

                  return (
                    <tr 
                      key={org.id} 
                      onClick={() => router.push(`/admin/organizations/${org.id}`)}
                      className="hover:bg-[#131b2e] transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white block group-hover:text-blue-400 transition-colors">
                          {org.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Slug: {org.slug}
                        </span>
                        {org.notes && (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5 max-w-[200px] truncate" title={org.notes}>
                            Notes: {org.notes}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-slate-200 block font-medium">{org.ownerName}</span>
                        <span className="text-slate-400 text-[11px] block">{org.ownerEmail}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-purple-500/20 block w-fit mx-auto mb-1">
                          {org.plan || "PRO"}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          {org.shopsCount} Store Outlet(s)
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="text-slate-200 font-medium block">{endStr}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
                          isSuspended
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {org.status || "ACTIVE"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            onClick={() => handleOpenExtendModal(org)}
                            className="h-7 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer shadow-xs border-none"
                          >
                            + Add Months
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleToggleSuspension(org.id)}
                            variant="outline"
                            className={`h-7 px-2.5 text-[11px] font-medium rounded-lg cursor-pointer ${
                              isSuspended
                                ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                            }`}
                          >
                            {isSuspended ? "Resume" : "Pause"}
                          </Button>

                          <Button
                            type="button"
                            onClick={() => router.push(`/admin/organizations/${org.id}`)}
                            variant="outline"
                            className="h-7 px-2 text-[11px] font-medium border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extension Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-6 max-w-md w-full space-y-5 text-white shadow-2xl">
            <div className="border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold tracking-tight">
                Extend Subscription: {selectedOrg.name}
              </h3>
              <p className="text-xs text-slate-400 font-normal">
                Add validity months and log manual Cash/UPI payment details
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">
                  Select Months to Add
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtensionMonths(m)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        extensionMonths === m
                          ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                          : "bg-[#070b13] text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      +{m} {m === 1 ? "Mo" : "Mos"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">
                  Payment / Admin Log Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g., Received ₹15,000 via GPay on Jul 21"
                  className="w-full p-3 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3">
              <Button
                type="button"
                onClick={() => setSelectedOrg(null)}
                variant="outline"
                className="h-8 px-3 text-xs font-medium border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleApplyExtension}
                className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer shadow-sm border-none"
              >
                {isSubmitting ? "Saving..." : "Apply Extension"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
