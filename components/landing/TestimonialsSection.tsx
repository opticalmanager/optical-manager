"use client";

import { Star, Quote, Building2, MapPin } from "lucide-react";
import { FadeIn, StaggerContainer, staggerItem, TiltCard } from "./motion";
import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    name: "Vikram Malhotra",
    role: "Managing Director & Optometrist",
    store: "Spectra Vision Retail",
    city: "Connaught Place, New Delhi",
    review:
      "Managing over 4,500 frame items and 1,200+ billing records used to cause checkout delays every evening. With Optical Manager's barcode scanning and WhatsApp receipts, our counter speed tripled.",
    rating: 5,
    tag: "High-Volume Multi-Brand Store",
  },
  {
    name: "Arjun Singhal",
    role: "Senior Optician & Practice Head",
    store: "ClearView Eye Studio",
    city: "Sector 18, Noida",
    review:
      "The eye prescription diopter split (SPH, CYL, AXIS) and instant GST breakdown make billing flawless. Even when internet fluctuates, the local offline mode keeps invoices printing smoothly without missing a beat.",
    rating: 5,
    tag: "Clinical Practice & Showroom",
  },
  {
    name: "Rajesh Oberoi",
    role: "Founder & Chief Refractionist",
    store: "Apex Optical Works",
    city: "Gurugram, Haryana",
    review:
      "The automated Google Review pill on shared digital invoices boosted our store rating to 4.9 stars. Customers love getting instant digital receipts on WhatsApp instead of waiting for bulky paper slips.",
    rating: 5,
    tag: "Customer Experience & Growth",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-gradient-to-b from-white via-slate-50/60 to-white border-b border-slate-100 overflow-hidden">
      {/* Subtle Light Ambient Glow */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn direction="up" className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 mb-3.5 shadow-2xs">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
              Validated in Real Showrooms
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-slate-900 tracking-tight leading-tight">
            Trusted by Daily Power Opticians
          </h2>
          <p className="mt-3.5 text-base text-slate-600 font-medium leading-relaxed">
            See how optical store owners and clinical managers eliminate counter congestion, simplify GST audits, and modernize customer communication.
          </p>
        </FadeIn>

        {/* Testimonials Cards Grid */}
        <StaggerContainer
          staggerDelay={0.15}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div key={t.name} variants={staggerItem}>
              <TiltCard className="h-full bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  {/* Top: Star rating and Quote icon */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <Quote className="w-5 h-5 text-slate-300" />
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed italic">
                    &ldquo;{t.review}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        {t.role}
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100/80">
                      Verified Store
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 pt-1">
                    <span className="flex items-center gap-1 text-slate-700 font-bold">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      {t.store}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {t.city}
                    </span>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
