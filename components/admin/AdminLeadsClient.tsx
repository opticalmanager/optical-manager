"use client";

import React, { useState } from "react";
import { 
  Users, 
  PhoneCall, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Calendar, 
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateDemoRequestStatus } from "@/services/admin.service";

interface AdminLeadsClientProps {
  leads: any[];
}

export default function AdminLeadsClient({ leads: initialLeads }: AdminLeadsClientProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: any) => {
    setLoadingId(id);
    try {
      await updateDemoRequestStatus(id, newStatus);
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const getWhatsAppLink = (phone: string, name: string, store: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${name}, thank you for requesting 14-day access for ${store} on Optical Manager! When is a good time for a 5-minute live demo call?`
    );
    return `https://wa.me/${fullPhone}?text=${msg}`;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Demo Requests & Sales Lead CRM
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Store owners requesting 14-day access from landing page • Direct WhatsApp & status pipeline
          </p>
        </div>

        <div className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
          Total Requests: <span className="text-white font-extrabold">{leads.length}</span>
        </div>
      </div>

      {/* Datatable */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Store & Owner Details</th>
                <th className="px-4 py-3">Phone & Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500 font-bold">
                    No demo requests submitted yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-extrabold text-white block text-sm">
                        {lead.storeName}
                      </span>
                      <span className="text-slate-400 text-xs block">
                        Owner: {lead.ownerName}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Requested: {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <a href={`tel:${lead.phone}`} className="text-blue-400 hover:underline block font-bold">
                        {lead.phone}
                      </a>
                      <a href={`mailto:${lead.email}`} className="text-slate-400 text-[11px] block hover:underline">
                        {lead.email}
                      </a>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-slate-300 font-bold">{lead.city || "Not Specified"}</span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <select
                        disabled={loadingId === lead.id}
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-extrabold bg-slate-950 border focus:outline-none cursor-pointer ${
                          lead.status === "PENDING"
                            ? "border-amber-500/40 text-amber-400"
                            : lead.status === "APPROVED"
                            ? "border-emerald-500/40 text-emerald-400"
                            : lead.status === "DEMO_SCHEDULED"
                            ? "border-blue-500/40 text-blue-400"
                            : "border-slate-700 text-slate-400"
                        }`}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="DEMO_SCHEDULED">DEMO SCHEDULED</option>
                        <option value="APPROVED">APPROVED & PROVISIONED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <a
                        href={getWhatsAppLink(lead.phone, lead.ownerName, lead.storeName)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          className="h-8 px-3 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Demo Call
                        </Button>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
