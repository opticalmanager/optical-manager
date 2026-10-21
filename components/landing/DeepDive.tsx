"use client";

import Image from "next/image";
import { FadeIn, TiltCard } from "./motion";
import { ClipboardList, Calculator, CheckCircle, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function DeepDive() {
  return (
    <section
      id="about"
      className="relative py-20 lg:py-28 bg-transparent border-b border-slate-200/50 overflow-hidden"
    >
      {/* Decorative ambient blurred spots */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <FadeIn direction="up" className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 mb-3.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
              Functional Deep-Dive
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-slate-900 max-w-2xl mx-auto tracking-tight leading-tight">
            Deep Functionality for Every Aspect of Your Practice
          </h2>
          <p className="mt-3.5 text-base text-slate-600 font-medium max-w-xl mx-auto">
            From clinical refractive measurements to multi-rate Indian GST compliance, everything is tuned for daily optical precision.
          </p>
        </FadeIn>

        {/* Content: Image left + Features right */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left: Industrial Styled Screenshot (7 Cols) */}
          <div className="lg:col-span-7">
            <FadeIn direction="right" duration={0.8}>
              <TiltCard className="p-2 sm:p-2.5 bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950/5 border border-slate-200/70">
                  {/* Mock Window Topbar */}
                  <div className="bg-slate-100/90 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Optical Manager • Clinical Eye Exam &amp; Tax Suite
                    </span>
                    <div className="w-10" />
                  </div>

                  <Image
                    src="/landing/deepdive-screenshot.png"
                    alt="Optical Manager Deep Dive — Prescription Tracking and Tax Compliance"
                    width={680}
                    height={440}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </TiltCard>
            </FadeIn>
          </div>

          {/* Right: Feature descriptions with staggered reveals (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Feature 1 */}
            <FadeIn direction="left" delay={0.15}>
              <div className="group bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-blue-200 shadow-xs hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      Accurate Prescription Tracking
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Maintain comprehensive records of every patient&apos;s eye prescriptions including SPH, CYL, AXIS, ADD values for both eyes. Track prescription history over time for better patient care and informed recommendations.
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-xs font-bold text-blue-700">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>OD &amp; OS Full Diopter Split</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Feature 2 */}
            <FadeIn direction="left" delay={0.3}>
              <div className="group bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-emerald-200 shadow-xs hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      Simplified Tax &amp; GST Compliance
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Automate your financial records. Our system computes CGST, SGST, and IGST calculations instantly for every item sold, ensuring seamless billing and worry-free tax reporting.
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Inclusive &amp; Exclusive GST Mode</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
