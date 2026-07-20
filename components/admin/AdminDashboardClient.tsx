"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Store, 
  Users, 
  CreditCard, 
  DollarSign, 
  ArrowRight,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface AdminDashboardClientProps {
  stats: {
    totalOrganizations: number;
    totalShops: number;
    activeSubscriptions: number;
    pendingLeads: number;
    approvedLeads: number;
    totalPlatformRevenue: number;
  };
  recentOrganizations: any[];
}

export default function AdminDashboardClient({ stats, recentOrganizations }: AdminDashboardClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] p-5 rounded-2xl border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">
              SYSTEM LIVE & SECURE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
            Platform Control Center
          </h1>
          <p className="text-xs font-normal text-slate-400">
            SaaS B2B Multi-Tenant Health, Lead Pipeline & Subscription Telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/leads">
            <Button className="h-9 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm cursor-pointer flex items-center gap-2 transition-all">
              <Users className="h-3.5 w-3.5" />
              <span>Pending Leads ({stats.pendingLeads})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 SaaS Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Platform Revenue */}
        <div className="bg-[#0d1424] border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              PLATFORM REVENUE
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              {formatCurrency(stats.totalPlatformRevenue)}
            </div>
            <p className="text-[11px] font-normal text-slate-400 mt-1">
              Across {stats.totalShops} active shop POS outlets
            </p>
          </div>
        </div>

        {/* Card 2: Active Outlets */}
        <div className="bg-[#0d1424] border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              ACTIVE OUTLETS
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.totalShops} <span className="text-sm font-semibold text-slate-400">Stores</span>
            </div>
            <p className="text-[11px] font-normal text-slate-400 mt-1">
              Under {stats.totalOrganizations} Organization Tenants
            </p>
          </div>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="bg-[#0d1424] border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              ACTIVE SUBSCRIPTIONS
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.activeSubscriptions} <span className="text-sm font-semibold text-purple-400">Active</span>
            </div>
            <p className="text-[11px] font-normal text-slate-400 mt-1">
              Paid B2B Stores & Active Trials
            </p>
          </div>
        </div>

        {/* Card 4: Approved Demo Leads */}
        <div className="bg-[#0d1424] border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              APPROVED LEADS
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.approvedLeads} <span className="text-sm font-semibold text-slate-400">Converted</span>
            </div>
            <p className="text-[11px] font-normal text-slate-400 mt-1">
              Onboarded store lead requests
            </p>
          </div>
        </div>
      </div>

      {/* Datatable: Registered Store Organizations */}
      <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Tenant Store Chains
            </h2>
            <p className="text-xs text-slate-400 font-normal">
              Click any store row to open its administrative control panel and subscription status
            </p>
          </div>
          <Link href="/admin/organizations">
            <Button variant="outline" className="h-8 px-3 text-xs font-medium border-slate-700/80 text-slate-300 hover:bg-slate-800/80 hover:text-white rounded-xl cursor-pointer">
              View All Stores
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070b13] border-b border-slate-800/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Organization Name</th>
                <th className="px-4 py-3">Owner Contact</th>
                <th className="px-4 py-3 text-center">Outlets</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-normal">
              {recentOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                    No store organizations provisioned yet.
                  </td>
                </tr>
              ) : (
                recentOrganizations.map((org) => (
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
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-200 block font-medium">{org.ownerName}</span>
                      <span className="text-slate-400 text-[11px] block">{org.ownerEmail}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-800/80 text-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-700/50">
                        {org.shopsCount} Store(s)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
                        org.status === "ACTIVE" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : org.status === "SUSPENDED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {org.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/organizations/${org.id}`);
                        }}
                        className="h-7 px-2.5 text-[11px] font-semibold border-slate-700/80 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg cursor-pointer transition-all"
                      >
                        <span>Manage Store</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
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
