"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ClipboardList, Calculator } from "lucide-react";

export default function DeepDive() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="py-20 lg:py-28 bg-slate-50/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">
            Functional Deep-Dive
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-main max-w-lg mx-auto">
            Deep Functionality for Every Aspect of Your Practice
          </h2>
        </div>

        {/* Content: Image left + Features right */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Screenshot */}
          <div
            className={`transition-all duration-700 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-8"
            }`}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/60">
              <Image
                src="/landing/deepdive-screenshot.png"
                alt="Optical Manager Deep Dive — Prescription Tracking and Tax Compliance"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Right: Feature descriptions */}
          <div
            className={`space-y-10 transition-all duration-700 delay-200 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8"
            }`}
          >
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-main mb-2">
                  Accurate Prescription Tracking
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Maintain comprehensive records of every patient&apos;s eye
                  prescriptions including SPH, CYL, AXIS, ADD values for
                  both eyes. Track prescription history over time for better
                  patient care and informed recommendations.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-main mb-2">
                  Simplified Tax & GST Compliance
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Automate your financial records. Our system computes CGST, SGST, and IGST calculations instantly for every item sold, ensuring seamless billing and worry-free tax reporting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
