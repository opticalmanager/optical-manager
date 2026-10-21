"use client";

import { TrendingUp, CheckCircle, Cloud, Shield, Activity } from "lucide-react";
import { FadeIn, StaggerContainer, staggerItem, AnimatedCounter, TiltCard } from "./motion";
import { motion } from "framer-motion";

const stats = [
  {
    icon: TrendingUp,
    numValue: 30,
    suffix: "%",
    label: "Faster Billing & Checkout",
    caption: "Instant barcode scan & tax calculation",
    tone: "text-blue-600 bg-blue-50 border-blue-100",
  },
  {
    icon: CheckCircle,
    numValue: 100,
    suffix: "%",
    label: "Stock Accuracy",
    caption: "Real-time ledger audit trail",
    tone: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  {
    icon: Cloud,
    numValue: 24,
    prefix: "",
    suffix: "/7",
    label: "Cloud & Offline Access",
    caption: "Continuous local PWA caching",
    tone: "text-indigo-600 bg-indigo-50 border-indigo-100",
  },
  {
    icon: Shield,
    numValue: 99.9,
    decimals: 1,
    suffix: "%",
    label: "Uptime Reliability",
    caption: "Enterprise Supabase PostgreSQL",
    tone: "text-cyan-600 bg-cyan-50 border-cyan-100",
  },
];

export default function StatsSection() {
  return (
    <section
      id="stats"
      className="relative bg-transparent py-20 px-4 border-b border-slate-200/50 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <FadeIn direction="up" className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 mb-3 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
              Measurable Performance
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for Clinical Speed &amp; Accuracy
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Proven metrics observed across live optical showrooms and multi-branch chains.
          </p>
        </FadeIn>

        <StaggerContainer
          staggerDelay={0.12}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} variants={staggerItem}>
                <TiltCard className="h-full bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col items-center justify-between">
                  <div className="space-y-4">
                    <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center mx-auto shadow-2xs ${stat.tone}`}>
                      <Icon className="size-6" />
                    </div>

                    <div>
                      <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        <AnimatedCounter
                          value={stat.numValue}
                          prefix={stat.prefix}
                          suffix={stat.suffix}
                          decimals={stat.decimals || 0}
                        />
                      </p>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mt-1.5">
                        {stat.label}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-semibold mt-4 pt-3 border-t border-slate-100 w-full">
                    {stat.caption}
                  </p>
                </TiltCard>
              </motion.div>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
