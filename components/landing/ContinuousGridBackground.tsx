"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Continuous Industrial Grid Canvas for the entire Landing Page.
 * Unbroken 3.5rem (56px) precision grid with interactive cursor spotlight
 * and scroll-synchronized lighting beam across all sections.
 */
export default function ContinuousGridBackground() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track global page scroll progress for the ambient lighting beam
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001,
  });

  // Calculate dynamic vertical position for the scroll spotlight beam (from 5% to 92% of page height)
  const beamY = useTransform(smoothProgress, [0, 1], ["5%", "92%"]);

  useEffect(() => {
    // Only bind mouse tracker on desktop pointing devices
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      setMousePos({ x: e.clientX, y: e.clientY });
      if (!isHovering) setIsHovering(true);
    };

    const handlePointerLeave = () => {
      setIsHovering(false);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [isHovering]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
    >
      {/* Precision 56px (3.5rem) Continuous Industrial Grid Canvas */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-45" />

      {/* Dynamic Cursor Spotlight (Follows mouse on desktop viewport) */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-500 z-0"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, rgba(37,99,235,0.07), transparent 70%)`,
        }}
      />

      {/* Scroll-Driven Atmospheric Traveling Light Beam */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-[46rem] h-[32rem] rounded-full blur-3xl pointer-events-none opacity-40 bg-gradient-to-r from-blue-400/20 via-cyan-400/25 to-indigo-400/20"
        style={{ top: beamY }}
      />

      {/* Atmospheric Section Accent Washes */}
      {/* 1. Hero / Header Glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-50/60 via-transparent to-transparent pointer-events-none" />

      {/* 2. Mid-Page Features / Deep Dive Soft Accent Orbs */}
      <div className="absolute top-[20%] left-[-10rem] w-[32rem] h-[32rem] rounded-full bg-blue-300/10 blur-3xl pointer-events-none" />
      <div className="absolute top-[35%] right-[-10rem] w-[34rem] h-[34rem] rounded-full bg-indigo-300/10 blur-3xl pointer-events-none" />

      {/* 3. Stats / Metrics Soft Emerald Wash */}
      <div className="absolute top-[52%] left-1/2 -translate-x-1/2 w-[42rem] h-[26rem] rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />

      {/* 4. Pricing / Social Proof Soft Violet Wash */}
      <div className="absolute top-[70%] right-[-5rem] w-[36rem] h-[36rem] rounded-full bg-violet-300/10 blur-3xl pointer-events-none" />

      {/* Bottom Gentle Fadeout into Dark Footer */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-slate-100/70 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
