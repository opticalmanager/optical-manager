"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, CheckCircle, Cloud, Shield } from "lucide-react";

const stats = [
  {
    icon: TrendingUp,
    value: "30%",
    label: "Faster Billing & Checkout",
  },
  {
    icon: CheckCircle,
    value: "100%",
    label: "Stock Accuracy",
  },
  {
    icon: Cloud,
    value: "24/7",
    label: "Cloud Access",
  },
  {
    icon: Shield,
    value: "99.9%",
    label: "Uptime Reliability",
  },
] as const;

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      observer.unobserve(node);
    };
  }, []);

  return (
    <section
      id="stats"
      ref={sectionRef}
      className="bg-gradient-to-b from-blue-50 to-white py-20 px-4"
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-text-main mb-12">
          Business Value & Stats
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-all duration-300"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible
                    ? "translateY(0)"
                    : "translateY(24px)",
                  transition: `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`,
                }}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="size-6 text-primary" />
                </div>
                <p className="text-3xl font-bold text-text-main mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-text-muted">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
