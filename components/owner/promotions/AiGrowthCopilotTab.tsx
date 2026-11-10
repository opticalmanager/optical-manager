"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Smartphone, 
  Send, 
  MessageSquare, 
  Store, 
  RefreshCw, 
  Laptop, 
  Wifi, 
  WifiOff, 
  ArrowUpRight,
  ChevronRight,
  ShieldAlert,
  Loader2,
  X
} from "lucide-react";
import { 
  fetchGrowthDashboardAction, 
  fetchCohortPatientsAction, 
  dispatchGrowthBroadcastAction 
} from "@/actions/ai-growth.actions";
import { CohortPatientsDrawer } from "./CohortPatientsDrawer";
import { AiCopyStudioModal } from "./AiCopyStudioModal";
import type { 
  GrowthOpportunityCard, 
  GrowthSummaryTelemetry, 
  GrowthCohortCategory, 
  SanitizedPatient 
} from "@/types/ai-growth";
import { toast } from "sonner";

export function AiGrowthCopilotTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<GrowthSummaryTelemetry | null>(null);
  const [cards, setCards] = useState<GrowthOpportunityCard[]>([]);
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("ALL");
  const [activeKpiFilter, setActiveKpiFilter] = useState<"ALL" | "PIPELINE" | "REACHABLE" | "SHIELD">("ALL");

  // Slide-over Drawer State
  const [drawerCohort, setDrawerCohort] = useState<GrowthCohortCategory | null>(null);
  const [drawerPatients, setDrawerPatients] = useState<SanitizedPatient[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  // AI Copy Studio Modal State
  const [studioCohort, setStudioCohort] = useState<GrowthCohortCategory | null>(null);

  // Broadcast Confirmation Modal State
  const [confirmBroadcastCard, setConfirmBroadcastCard] = useState<GrowthOpportunityCard | null>(null);
  const [customPatientIdsToBroadcast, setCustomPatientIdsToBroadcast] = useState<string[] | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Load dashboard data
  const loadDashboard = useCallback(async (shopId?: string) => {
    try {
      setIsLoading(true);
      const res = await fetchGrowthDashboardAction(shopId);
      if (res.success && res.data) {
        setTelemetry(res.data.telemetry);
        setCards(res.data.cards);
        setShops(res.data.shops || []);
      } else {
        toast.error(res.error || "Failed to load growth suggestions");
      }
    } catch (err: any) {
      toast.error("Error loading AI Growth Copilot");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(selectedShopId);
  }, [selectedShopId, loadDashboard]);

  // Open Drawer and fetch patients for cohort
  const handleOpenDrawer = async (cohortType: GrowthCohortCategory) => {
    setDrawerCohort(cohortType);
    setIsDrawerLoading(true);
    try {
      const res = await fetchCohortPatientsAction(cohortType, selectedShopId);
      if (res.success && res.patients) {
        setDrawerPatients(res.patients);
      } else {
        toast.error(res.error || "Failed to load patient roster");
        setDrawerPatients([]);
      }
    } catch (err) {
      toast.error("Failed to load patients");
      setDrawerPatients([]);
    } finally {
      setIsDrawerLoading(false);
    }
  };

  // Open 1-Click Broadcast confirmation
  const handleInitiateBroadcast = (card: GrowthOpportunityCard, explicitPatientIds?: string[]) => {
    setConfirmBroadcastCard(card);
    setCustomPatientIdsToBroadcast(explicitPatientIds || null);
  };

  // Execute Dispatch
  const handleConfirmDispatch = async () => {
    if (!confirmBroadcastCard) return;

    try {
      setIsDispatching(true);
      toast.loading("Enqueuing broadcast with jitter pacing...", { id: "dispatch-broadcast" });

      // Determine target patient IDs
      let targetIds: string[] = [];
      if (customPatientIdsToBroadcast && customPatientIdsToBroadcast.length > 0) {
        targetIds = customPatientIdsToBroadcast;
      } else {
        // Fetch cohort patients to extract reachable patient IDs
        const res = await fetchCohortPatientsAction(confirmBroadcastCard.cohortType, selectedShopId);
        if (res.success && res.patients) {
          targetIds = res.patients
            .filter((p) => p.isValidWhatsApp && !p.isRecentlyContacted)
            .map((p) => p.id);
        }
      }

      if (targetIds.length === 0) {
        toast.error("No eligible patients found for this broadcast.", { id: "dispatch-broadcast" });
        setIsDispatching(false);
        return;
      }

      const dispatchRes = await dispatchGrowthBroadcastAction({
        cohortType: confirmBroadcastCard.cohortType,
        patientIds: targetIds,
        messageTemplate: confirmBroadcastCard.suggestedMessage,
        shopId: selectedShopId !== "ALL" ? selectedShopId : undefined,
        offerDetails: confirmBroadcastCard.defaultDiscount,
      });

      if (dispatchRes.success) {
        toast.success(
          `🚀 Successfully staged ${dispatchRes.enqueuedCount} messages! Paced at 3.5s - 6.8s intervals.`,
          { id: "dispatch-broadcast", duration: 5000 }
        );
        setConfirmBroadcastCard(null);
        setCustomPatientIdsToBroadcast(null);
        // Refresh dashboard metrics
        loadDashboard(selectedShopId);
      } else {
        toast.error(dispatchRes.error || "Failed to enqueue broadcast", { id: "dispatch-broadcast" });
      }
    } catch (err: any) {
      toast.error("Error dispatching broadcast", { id: "dispatch-broadcast" });
    } finally {
      setIsDispatching(false);
    }
  };

  // Update card copy when refined by AI Copy Studio
  const handleApplyRefinedCopy = (result: { messageBody: string; approvedOffer: string }) => {
    if (!studioCohort) return;
    setCards((prev) =>
      prev.map((c) =>
        c.cohortType === studioCohort
          ? {
              ...c,
              suggestedMessage: result.messageBody,
              defaultDiscount: result.approvedOffer,
            }
          : c
      )
    );
  };

  const activeDrawerCard = cards.find((c) => c.cohortType === drawerCohort);
  const activeStudioCard = cards.find((c) => c.cohortType === studioCohort);

  const filteredCards = cards.filter((card) => {
    if (activeKpiFilter === "PIPELINE") return card.estimatedRevenue > 0;
    if (activeKpiFilter === "REACHABLE") return card.reachableCount > 0;
    if (activeKpiFilter === "SHIELD") return card.cooldownCount > 0;
    return true;
  });

  return (
    <div className="space-y-4 select-none">
      {/* 1. TOP VELOCITY & TELEMETRY SUMMARY BAR (High-Density Stripe/Linear Proportions & Interactive KPI Selection) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Recoverable Pipeline */}
        <div 
          onClick={() => setActiveKpiFilter((prev) => prev === "PIPELINE" ? "ALL" : "PIPELINE")}
          className={`p-3.5 rounded-2xl bg-white transition-all cursor-pointer ${
            activeKpiFilter === "PIPELINE"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border border-slate-200/90 shadow-2xs hover:border-[#2563eb]/40"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Recoverable Pipeline
            </span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isLoading ? (
              <span className="text-slate-300 animate-pulse">₹--,---</span>
            ) : (
              `₹${(telemetry?.totalRecoverablePipeline || 0).toLocaleString("en-IN")}`
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {activeKpiFilter === "PIPELINE" ? "Active Filter • Click to show all" : "Estimated 30-day revenue across 6 cohorts"}
          </p>
        </div>

        {/* KPI 2: Reachable Target Patients */}
        <div 
          onClick={() => setActiveKpiFilter((prev) => prev === "REACHABLE" ? "ALL" : "REACHABLE")}
          className={`p-3.5 rounded-2xl bg-white transition-all cursor-pointer ${
            activeKpiFilter === "REACHABLE"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border border-slate-200/90 shadow-2xs hover:border-[#2563eb]/40"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Reachable Patients
            </span>
            <span className="p-1 rounded-md bg-blue-50 text-[#2563eb]">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-slate-300 animate-pulse">---</span>
              ) : (
                telemetry?.totalReachablePatients || 0
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified WhatsApp
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {activeKpiFilter === "REACHABLE" ? "Active Filter • Cohorts with reachable patients" : `${telemetry?.invalidPhoneCount || 0} invalid landlines auto-skipped`}
          </p>
        </div>

        {/* KPI 3: Anti-Fatigue Shield */}
        <div 
          onClick={() => setActiveKpiFilter((prev) => prev === "SHIELD" ? "ALL" : "SHIELD")}
          className={`p-3.5 rounded-2xl bg-white transition-all cursor-pointer ${
            activeKpiFilter === "SHIELD"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border border-slate-200/90 shadow-2xs hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Anti-Fatigue Shield
            </span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-600">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 tracking-tight">
            {isLoading ? (
              <span className="text-slate-300 animate-pulse">--</span>
            ) : (
              telemetry?.cooldownProtectedCount || 0
            )}
          </div>
          <p className="text-[10px] text-amber-700/80 font-medium mt-0.5">
            {activeKpiFilter === "SHIELD" ? "Active Filter • Cohorts with cooldown patients" : "Protected by 14-day promotional cooldown"}
          </p>
        </div>

        {/* KPI 4: WhatsApp Engine Status */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              WhatsApp Engine
            </span>
            <span className="p-1 rounded-md bg-slate-100 text-slate-600">
              <Laptop className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {telemetry?.whatsappStatus === "CONNECTED_READY" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Desktop Ready</span>
              </span>
            ) : telemetry?.whatsappStatus === "APP_ONLINE_WA_DISCONNECTED" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Assistant QR Needed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Desktop Tool Offline</span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {telemetry?.connectedPhone ? `Connected: ${telemetry.connectedPhone}` : "Counter PC auto-dispatches jobs"}
          </p>
        </div>
      </div>

      {/* 2. MULTI-BRANCH SCOPE SELECTOR & REFRESH */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">
            Branch Scope:
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedShopId("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedShopId === "ALL"
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Branches
            </button>
            {shops.map((shop) => (
              <button
                key={shop.id}
                type="button"
                onClick={() => setSelectedShopId(shop.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedShopId === shop.id
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {shop.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeKpiFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setActiveKpiFilter("ALL")}
              className="text-xs text-[#2563eb] font-bold hover:underline cursor-pointer px-2"
            >
              Reset Filter ({activeKpiFilter})
            </button>
          )}

          <button
            type="button"
            onClick={() => loadDashboard(selectedShopId)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh Pipeline</span>
          </button>
        </div>
      </div>

      {/* 3. 6 GROWTH OPPORTUNITY CARDS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-white border border-slate-200 p-4 animate-pulse space-y-3">
              <div className="h-5 w-24 bg-slate-100 rounded" />
              <div className="h-6 w-48 bg-slate-100 rounded" />
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500 space-y-2">
          <p className="font-semibold text-slate-700">No opportunity cohorts match the active &quot;{activeKpiFilter}&quot; filter.</p>
          <button
            type="button"
            onClick={() => setActiveKpiFilter("ALL")}
            className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
          >
            Show All 6 Cohorts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCards.map((card) => {
            const badgeClasses = {
              blue: "bg-blue-50 text-[#2563eb] border-blue-200",
              purple: "bg-purple-50 text-purple-700 border-purple-200",
              emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
              amber: "bg-amber-50 text-amber-700 border-amber-200",
              indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
              rose: "bg-rose-50 text-rose-700 border-rose-200",
            }[card.badgeColor];

            return (
              <div
                key={card.cohortType}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header & Category Pill */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${badgeClasses}`}>
                      {card.badgeLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ₹{card.estimatedRevenue.toLocaleString("en-IN")} Pipeline
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {card.subtitle}
                    </p>
                  </div>

                  {/* Clinical & Sales Rationale Box */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                    <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      Clinical & Commercial Rationale
                    </div>
                    <p>{card.rationale}</p>
                  </div>

                  {/* Reachability Counter Banner */}
                  <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
                    <span className="font-bold text-slate-800">
                      {card.patientCount} Matched Patients
                    </span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {card.reachableCount} Reachable
                    </span>
                  </div>

                  {/* WhatsApp Smartphone Speech Bubble */}
                  <div className="p-2.5 rounded-xl bg-[#EFEAE2] border border-[#DDD5C7] shadow-inner relative">
                    <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-500">
                      <span className="font-bold flex items-center gap-1 text-slate-700">
                        <MessageSquare className="w-3 h-3 text-emerald-700" />
                        Live WhatsApp Template
                      </span>
                      <button
                        type="button"
                        onClick={() => setStudioCohort(card.cohortType)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Polish
                      </button>
                    </div>

                    <div className="bg-white rounded-lg rounded-tl-none p-2 shadow-xs border border-slate-100 text-slate-800 text-[11px] leading-relaxed">
                      <p className="line-clamp-3">
                        {card.suggestedMessage}
                      </p>
                      <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                        <span className="font-bold text-indigo-600">
                          {card.defaultDiscount}
                        </span>
                        <span>Delivered</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDrawer(card.cohortType)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-xs font-bold transition-all text-center cursor-pointer shadow-2xs"
                  >
                    View Patients ({card.patientCount})
                  </button>

                  <button
                    type="button"
                    disabled={card.reachableCount === 0}
                    onClick={() => handleInitiateBroadcast(card)}
                    className="py-1.5 px-3 rounded-xl bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Broadcast</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. SLIDE-OVER COHORT PATIENTS DRAWER */}
      {drawerCohort && activeDrawerCard && (
        <CohortPatientsDrawer
          isOpen={Boolean(drawerCohort)}
          onClose={() => setDrawerCohort(null)}
          cohortType={drawerCohort}
          cohortTitle={activeDrawerCard.title}
          badgeLabel={activeDrawerCard.badgeLabel}
          badgeColor={activeDrawerCard.badgeColor}
          patients={drawerPatients}
          isLoading={isDrawerLoading}
          onLaunchBroadcast={(selectedIds) => {
            handleInitiateBroadcast(activeDrawerCard, selectedIds);
          }}
        />
      )}

      {/* 5. AI COPY STUDIO MODAL */}
      {studioCohort && activeStudioCard && (
        <AiCopyStudioModal
          isOpen={Boolean(studioCohort)}
          onClose={() => setStudioCohort(null)}
          cohortType={studioCohort}
          initialMessage={activeStudioCard.suggestedMessage}
          initialDiscount={activeStudioCard.defaultDiscount}
          onApplyCopy={handleApplyRefinedCopy}
        />
      )}

      {/* 6. 1-CLICK BROADCAST CONFIRMATION MODAL */}
      {confirmBroadcastCard && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#2563eb] px-2 py-0.5 rounded-md border border-blue-200">
                  Broadcast Confirmation
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Launch {confirmBroadcastCard.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm dispatch parameters and anti-spam pacing before enqueuing.
                </p>
              </div>

              <button
                onClick={() => setConfirmBroadcastCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Count & Target Branch */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Target Patients
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {customPatientIdsToBroadcast ? customPatientIdsToBroadcast.length : confirmBroadcastCard.reachableCount} Patients
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Dispatch Branch
                </span>
                <span className="text-sm font-bold text-slate-900 truncate block">
                  {selectedShopId === "ALL" 
                    ? "Patient Home Branch" 
                    : shops.find((s) => s.id === selectedShopId)?.name || "Store Branch"}
                </span>
              </div>
            </div>

            {/* Jitter Pacing Notice */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#2563eb]">
                <Clock className="w-3.5 h-3.5" />
                Humanized Jitter Pacing (3.5s - 6.8s Randomized Stagger)
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                Messages will be scheduled in safe, staggered intervals to simulate natural counter typing. This prevents WhatsApp account rate-limiting bans.
              </p>
            </div>

            {/* Desktop Assistant Status Gate Warning */}
            {telemetry?.whatsappStatus !== "CONNECTED_READY" && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Counter Desktop Assistant is Currently Offline
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Messages will stage safely as PENDING in your database queue and dispatch automatically the moment your store PC reconnects.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmBroadcastCard(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDispatching}
                onClick={handleConfirmDispatch}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enqueuing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Enqueue Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
