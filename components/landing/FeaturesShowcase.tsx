"use client";

import Image from "next/image";
import { FadeIn, StaggerContainer, staggerItem, TiltCard } from "./motion";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Zap } from "lucide-react";

const FEATURES = [
  {
    title: "Smart Billing & Invoicing",
    badge: "Lightning Fast POS",
    description:
      "Generate compliant invoices, manage payments, and track dues effortlessly, maximizing the speed and efficiency of your billing workflow.",
    image: "/landing/feature-billing.png",
    perks: ["GST-compliant tax split", "Thermal tag printing", "Instant receipt dispatch"],
  },
  {
    title: "Precision Inventory Management",
    badge: "Barcodes & Ledger",
    description:
      "Track frames, lenses, and accessories with real-time stock updates, low-stock alerts, and seamless restocking operations.",
    image: "/landing/feature-inventory.png",
    perks: ["1-Bit thermal tag barcodes", "Bulk CSV inwarding", "Automated reorder alerts"],
  },
  {
    title: "Comprehensive Patient CRM",
    badge: "Rx & History",
    description:
      "Maintain detailed patient databases, prescription histories, and automated communication logs for personalized care.",
    image: "/landing/feature-crm.png",
    perks: ["Eye Rx diopter matrix", "WhatsApp appointment reminders", "Customer credit ledger"],
  },
];

export default function FeaturesShowcase() {
  return (
    <section
      id="features"
      className="relative py-20 lg:py-28 bg-transparent border-b border-slate-200/50 overflow-hidden"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <FadeIn direction="up" className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 mb-3.5 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
              Core Architecture
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-slate-900 tracking-tight leading-tight">
            Designed for High-Volume Optical Stores
          </h2>
          <p className="mt-3.5 text-base text-slate-600 font-medium leading-relaxed">
            Engineered from ground up with real opticians to eliminate counter bottlenecks, prevent stock leakage, and modernize patient consultations.
          </p>
        </FadeIn>

        {/* Feature cards with 3D Tilt & Stagger entrance */}
        <StaggerContainer
          staggerDelay={0.15}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7"
        >
          {FEATURES.map((feature) => (
            <motion.div key={feature.title} variants={staggerItem}>
              <TiltCard className="h-full bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between">
                <div>
                  {/* Image container with subtle inner zoom on hover */}
                  <div className="relative overflow-hidden bg-slate-50/80 border-b border-slate-100 group/img">
                    <div className="absolute top-3.5 left-3.5 z-20">
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-white/95 backdrop-blur-md text-blue-700 rounded-md border border-slate-200/80 shadow-2xs">
                        {feature.badge}
                      </span>
                    </div>

                    <Image
                      src={feature.image}
                      alt={feature.title}
                      width={400}
                      height={240}
                      className="w-full h-52 object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-3">
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      {feature.description}
                    </p>

                    {/* Quick Specs List */}
                    <ul className="pt-2 space-y-2 border-t border-slate-100">
                      {feature.perks.map((perk, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card footer indicator */}
                <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-blue-600 group-hover:text-blue-700">
                  <span>Explore Module</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
