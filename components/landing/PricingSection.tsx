"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DemoRequestModal from "./DemoRequestModal";
import { FadeIn, StaggerContainer, staggerItem, TiltCard } from "./motion";
import { motion } from "framer-motion";

const monthlyFeatures = [
  "Advanced POS billing & invoicing (GST compliant)",
  "Complete patient eye prescription records",
  "Real-time inventory catalog & stock movement",
  "Single store management dashboard",
  "Thermal & A4 invoice printing formats",
  "Standard email & WhatsApp assistance",
];

const yearlyFeatures = [
  "Everything in Monthly Plan, plus:",
  "Multi-store centralized dashboard & unified reports",
  "Barcode scanning & thermal label generation",
  "Automated low-stock alerts & smart reordering",
  "Patient WhatsApp appointment & reminder triggers",
  "Multi-staff role permissions & access control",
  "Priority 24/7 dedicated phone & WhatsApp support",
  "Free automated daily cloud backups & data exports",
];

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"yearly" | "monthly">("yearly");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <section id="pricing" className="relative bg-transparent py-20 px-4 border-b border-slate-200/50 select-none overflow-hidden">
      {/* Decorative subtle ambient circle */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        {/* Section Header */}
        <FadeIn direction="up" className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-primary text-xs font-bold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-blue-700">Transparent, High-ROI Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-slate-900 tracking-tight">
            Simple Plans Built for Optical Retailers
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-medium">
            Scale from a single optical boutique to a multi-store retail chain with zero setup fees and predictable pricing.
          </p>

          {/* Billing Cycle Interactive Toggle with Pill Animation */}
          <div className="pt-4 flex items-center justify-center">
            <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-300/60 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Annual Billing</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase">
                  Save 50%
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Monthly Billing</span>
              </button>
            </div>
          </div>
        </FadeIn>

        {/* Pricing Cards Grid with Tilt & Stagger */}
        <StaggerContainer staggerDelay={0.15} className="grid md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {/* Monthly Plan Card */}
          <motion.div variants={staggerItem} className="h-full">
            <TiltCard className="h-full bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-300 hover:shadow-xl transition-all duration-300 relative">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-xl text-slate-900">
                    Monthly Starter
                  </h3>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                    Flexible
                  </span>
                </div>

                <div className="mb-2 flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    ₹ 499
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    / month / store
                  </span>
                </div>

                <p className="text-slate-500 text-xs mb-6 leading-relaxed font-medium">
                  Essential POS billing and prescription storage for single store setups. Billed month-to-month.
                </p>

                <ul className="space-y-3 mb-8 border-t border-slate-100 pt-6">
                  {monthlyFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <Check className="size-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full h-11 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Get Started with Monthly
              </Button>
            </TiltCard>
          </motion.div>

          {/* Yearly Plan Card (Highlighted Best Value) */}
          <motion.div variants={staggerItem} className="h-full">
            <TiltCard className="h-full bg-white border-2 border-blue-600 rounded-3xl p-8 relative flex flex-col justify-between shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
              <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md shadow-blue-500/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Best Value · ₹4,999/yr /store</span>
              </span>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-xl text-slate-900">
                    Annual Growth Plan
                  </h3>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold">
                    Recommended
                  </span>
                </div>

                <div className="mb-1 flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    ₹ 4,999
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    / year / store
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    Effective ₹416/mo per store
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Billed annually)
                  </span>
                </div>

                <p className="text-slate-500 text-xs mb-6 leading-relaxed font-medium">
                  Complete multi-store ERP with inventory synchronization, doctor appointments, staff RBAC, and priority 24/7 support.
                </p>

                <ul className="space-y-3 mb-8 border-t border-slate-100 pt-6">
                  {yearlyFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-800 font-medium">
                      <Check className="size-4 text-emerald-600 font-bold shrink-0 mt-0.5" />
                      <span className={i === 0 ? "font-bold text-slate-900" : ""}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full h-11 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all font-bold text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Choose Annual Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </TiltCard>
          </motion.div>
        </StaggerContainer>

        {/* Enterprise & Custom Chain Note */}
        <FadeIn direction="up" delay={0.25} className="mt-12 text-center bg-white border border-slate-200/90 rounded-2xl p-6 max-w-2xl mx-auto shadow-xs">
          <div className="flex items-center justify-center gap-2 text-slate-900 font-bold text-sm mb-1">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Need Custom Setup for 10+ Outlets or Franchise Chain?</span>
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-3 font-medium">
            Get personalized onboarding, multi-warehouse integrations, tailored GST formats, and dedicated account manager.
          </p>
          <button
            type="button"
            onClick={() => setIsDemoModalOpen(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer bg-transparent border-none"
          >
            Contact Sales for Volume Discount →
          </button>
        </FadeIn>
      </div>

      {/* Demo / Onboarding Modal */}
      <DemoRequestModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </section>
  );
}
