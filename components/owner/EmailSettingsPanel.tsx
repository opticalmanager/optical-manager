"use client";

import React from "react";
import { Mail, Send, Reply, AlertCircle, CheckCircle2, AlertTriangle, Building, Store, HelpCircle } from "lucide-react";

interface ShopRoutingInfo {
  id: string;
  name: string;
  email: string | null;
}

interface EmailSettingsPanelProps {
  shops: ShopRoutingInfo[];
  organizationName: string;
  fromAddress: string | null;
  isConfigured: boolean;
}

export function EmailSettingsPanel({
  shops,
  organizationName,
  fromAddress,
  isConfigured,
}: EmailSettingsPanelProps) {
  const systemFromAddress = fromAddress || "notifications@mail.theoptical-manager.com";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Panel Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">
            Email Notification Settings
          </h3>
        </div>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Monitor the system-wide MailerSend transactional email pipeline for your optical store chain.
        </p>
      </div>

      {/* ── Status Banner ── */}
      {isConfigured ? (
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3.5">
          <div className="mt-1 flex items-center justify-center shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-emerald-900">
              Active · Managed System Domain
            </h4>
            <p className="text-xs text-emerald-800/95 leading-relaxed font-medium">
              Transactional email routing is active for <span className="font-bold">{organizationName}</span>. Invoices, receipts, and appointment alerts are dispatched automatically via the platform&apos;s verified shared sender pool. No domain setups are required from shop managers.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-950">
              System Setup Pending
            </h4>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              The email sending service is currently offline. To enable automated communications, please verify that both <code className="font-mono bg-amber-100/50 px-1 py-0.5 rounded text-[10px] text-amber-950 font-bold">MAILERSEND_API_KEY</code> and <code className="font-mono bg-amber-100/50 px-1 py-0.5 rounded text-[10px] text-amber-950 font-bold">MAILERSEND_FROM_ADDRESS</code> have been injected into the host application environment.
            </p>
          </div>
        </div>
      )}

      {/* ── Two-Column Information Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Outbound Routing Card */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 text-indigo-700">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Send className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Outbound Routing</h4>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            All system-triggered notifications are dispatched via our shared server to guarantee high deliverability and bypass spam filters.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Sender Display Name
              </span>
              <div className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                [Shop Name]
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Sender Address (From)
              </span>
              <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg break-all">
                {systemFromAddress}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50/50 px-3 py-2 rounded-lg border border-indigo-100/50">
            <Building className="w-3.5 h-3.5" />
            <span>Patients see: &quot;[Shop Name] via Optical Manager&quot;</span>
          </div>
        </div>

        {/* Inbound Reply Card */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 text-indigo-700">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Reply className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Inbound Replies</h4>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Patient responses to transactional emails bypass our central notification system and are forwarded directly to the originating store.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Routing Rule
              </span>
              <div className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                Reply-To Header = Shop Email Address
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Destination Mailbox
              </span>
              <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg break-all">
                [Shop Registered Email]
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100/50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Replies are routed directly to individual store mailboxes</span>
          </div>
        </div>
      </div>

      {/* ── Per-Shop Email Routing Table ── */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Per-Store Routing Breakdown</h4>
          <p className="text-xs text-slate-400 font-medium">
            Review the status of each physical location under your organization.
          </p>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Store Location
                  </th>
                  <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Sender Display Name
                  </th>
                  <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Inbound Reply-To Email
                  </th>
                  <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-right">
                    Routing Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {shops.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                      No shops associated with this organization.
                    </td>
                  </tr>
                ) : (
                  shops.map((shop) => {
                    const hasEmail = !!shop.email && shop.email.trim() !== "";
                    return (
                      <tr key={shop.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-900">{shop.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium text-slate-600">{shop.name}</span>
                        </td>
                        <td className="px-5 py-4">
                          {hasEmail ? (
                            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              {shop.email}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span className="italic">Not configured</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {hasEmail ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase bg-emerald-50 border border-emerald-200 text-emerald-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase bg-amber-50 border border-amber-200 text-amber-700">
                              No Reply-To Address
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Help / Footer Alert ── */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          Need to change a store&apos;s email address? Go to the{" "}
          <span className="font-semibold text-slate-700">Shops & Access</span> tab in settings, find the store, and update the shop credentials. The reply-to address will update immediately across all notification tasks.
        </p>
      </div>
    </div>
  );
}
