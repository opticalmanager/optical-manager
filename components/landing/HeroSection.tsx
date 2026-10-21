"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, ShieldCheck } from "lucide-react";
import DemoRequestModal from "./DemoRequestModal";
import { InstallAppButton } from "./InstallAppButton";
import HeroVideoPlayer from "./HeroVideoPlayer";
import { motion } from "framer-motion";

export default function HeroSection() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white pt-4 pb-12 sm:pt-6 sm:pb-16 lg:pt-8 lg:pb-20">
      {/* Precision Industrial Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Floating Gentle Depth Ambient Orbs */}
      <div className="absolute top-0 right-10 w-[28rem] h-[28rem] bg-blue-400/10 rounded-full blur-3xl pointer-events-none animate-orb-1" />
      <div className="absolute bottom-6 left-10 w-[22rem] h-[22rem] bg-indigo-300/15 rounded-full blur-3xl pointer-events-none animate-orb-2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Text content with entrance stagger */}
          <div className="space-y-4 sm:space-y-5">
            {/* Top Micro-Pill Tag */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 shadow-2xs"
            >
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                Enterprise Optical POS &amp; CRM 2.0
              </span>
            </motion.div>

            {/* Main Headline with Word Blur-In Polish */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.12] tracking-tight text-slate-900"
            >
              Everything Your <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                Optical Store
              </span>{" "}
              Needs.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl font-medium"
            >
              The ultimate all-in-one operating system for modern opticians. Streamline billing, manage inventory with precision, and strengthen patient relationships.
            </motion.p>

            {/* CTA Buttons Row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="pt-1 flex flex-wrap items-center gap-3"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  size="lg" 
                  onClick={() => setIsDemoModalOpen(true)}
                  className="px-5 py-3 text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all gap-2 cursor-pointer h-11"
                >
                  <span>Request 14-Day Access</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="px-4.5 py-3 text-sm font-bold bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs group cursor-pointer h-11"
                >
                  <Play className="w-4 h-4 mr-2 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span>Book Live Demo</span>
                </Button>
              </motion.div>

              <InstallAppButton variant="hero" />
            </motion.div>

            {/* Trusted by / Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="pt-6 border-t border-slate-200/70"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Trusted by leading optical retailers across India
                </p>
              </div>

              {/* High-Tech Marquee Brand Strip */}
              <div className="flex flex-wrap gap-2 sm:gap-2.5 items-center">
                {["VISION CARE", "OPTI-STYLE", "SPECTRA", "CLEAR VIEW", "APEX OPTICS"].map((brand, i) => (
                  <div
                    key={i}
                    className="px-3 py-1 rounded-lg bg-slate-100/80 border border-slate-200/60 text-slate-650 hover:text-slate-900 text-[11px] font-black tracking-wider transition-colors shadow-2xs cursor-default"
                  >
                    {brand}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Interactive Product Video Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <HeroVideoPlayer />
          </motion.div>
        </div>
      </div>

      <DemoRequestModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </section>
  );
}
