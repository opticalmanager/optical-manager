"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const FEATURES = [
  {
    title: "Smart Billing & Invoicing",
    description:
      "Generate compliant invoices, manage payments, and track dues effortlessly, maximizing the speed and efficiency of your billing workflow.",
    image: "/landing/feature-billing.png",
  },
  {
    title: "Precision Inventory Management",
    description:
      "Track frames, lenses, and accessories with real-time stock updates, low-stock alerts, and seamless restocking operations.",
    image: "/landing/feature-inventory.png",
  },
  {
    title: "Comprehensive Patient CRM",
    description:
      "Maintain detailed patient databases, prescription histories, and automated communication logs for personalized care.",
    image: "/landing/feature-crm.png",
  },
];

export default function FeaturesShowcase() {
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
      id="features"
      ref={sectionRef}
      className="py-20 lg:py-28 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">
            What we offer
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-main">
            Features Showcase
          </h2>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className={`group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${(index + 1) * 150}ms` : "0ms",
              }}
            >
              {/* Image */}
              <div className="relative overflow-hidden bg-slate-50">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  width={400}
                  height={240}
                  className="w-full h-48 object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-text-main mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
