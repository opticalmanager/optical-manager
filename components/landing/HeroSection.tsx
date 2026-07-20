"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, Sparkles } from "lucide-react";
import DemoRequestModal from "./DemoRequestModal";

export default function HeroSection() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white pt-10 pb-16 lg:pt-16 lg:pb-24">
      {/* Premium Fading Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-extrabold leading-[1.15] tracking-tight text-text-main">
              Everything Your <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                Optical Store
              </span>{" "}
              Needs.
            </h1>

            <p className="mt-6 text-lg text-text-muted leading-relaxed max-w-xl">
              The ultimate all-in-one operating system for modern opticians. Streamline billing, manage inventory with precision, and strengthen patient relationships.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button 
                size="lg" 
                onClick={() => setIsDemoModalOpen(true)}
                className="px-6 py-3 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 gap-2 cursor-pointer"
              >
                Request 14-Day Access <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsDemoModalOpen(true)}
                className="px-6 py-3 text-base font-semibold group border-slate-200 hover:border-slate-300 cursor-pointer"
              >
                <Play className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                Book Live Demo
              </Button>
            </div>

            {/* Trusted by / Social proof */}
            <div className="mt-12 pt-8 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted/80 mb-4">
                Trusted by leading optical retailers across India
              </p>
              <div className="flex flex-wrap gap-x-8 gap-y-4 items-center opacity-60">
                <span className="text-sm font-extrabold text-slate-500 tracking-wider">VISION CARE</span>
                <span className="text-sm font-extrabold text-slate-500 tracking-wider">OPTI-STYLE</span>
                <span className="text-sm font-extrabold text-slate-500 tracking-wider">SPECTRA</span>
                <span className="text-sm font-extrabold text-slate-500 tracking-wider">CLEAR VIEW</span>
              </div>
            </div>
          </div>

          {/* Right: Dashboard preview */}
          <div className="animate-fade-in-up animate-delay-300 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-200/60 bg-white p-2">
              <div className="rounded-xl overflow-hidden border border-slate-100">
                <Image
                  src="/landing/dashboard-preview.png"
                  alt="Optical Manager Dashboard Preview"
                  width={700}
                  height={480}
                  className="w-full h-auto"
                  priority
                />
              </div>
              {/* Overlay gradient for polish */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-md rounded-xl shadow-xl px-4 py-3 border border-slate-100/80 animate-fade-in animate-delay-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-bold text-text-main">SaaS Operating System</span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">for modern optical retail</p>
            </div>
          </div>
        </div>
      </div>

      <DemoRequestModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </section>
  );
}
