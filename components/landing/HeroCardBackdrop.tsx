"use client";

import { motion } from "framer-motion";

/**
 * HeroCardBackdrop
 * 
 * Provides a stylish, modern SaaS background behind the floating hero video/device card:
 * 1. Layered fluid organic wave shapes in soft pastel sky/ice blues (#E0F2FE, #DBEAFE, #BFDBFE).
 * 2. Radiating energetic doodle sparks (\ | /) bursting at the top-right corner.
 * 3. Playful floating accent circles/dots on the left and right flanks.
 * 4. Atmospheric radial backlight glow.
 * 5. Elevated 3D grounding drop shadow underneath the card.
 */
export default function HeroCardBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute -inset-6 sm:-inset-10 lg:-inset-14 pointer-events-none -z-10 select-none overflow-visible"
    >
      {/* Atmospheric Soft Radial Lighting Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,rgba(59,130,246,0.18),rgba(147,197,253,0.12)_45%,transparent_70%)]" />

      {/* Layered Organic Fluid Waves SVG Canvas */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 1000 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Main Top-Right Wave Gradient */}
          <linearGradient id="heroWaveGrad1" x1="400" y1="40" x2="980" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#E0F2FE" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.35" />
          </linearGradient>

          {/* Accent Upper Wave Gradient */}
          <linearGradient id="heroWaveGrad2" x1="560" y1="0" x2="980" y2="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BFDBFE" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.35" />
          </linearGradient>

          {/* Left Flank Soft Wave Gradient */}
          <linearGradient id="heroWaveGrad3" x1="0" y1="140" x2="220" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* 1. Outer Soft Wave Shape (Top-Right Sweeping Down Behind Frame) */}
        <path
          d="M 380 0 C 520 -15, 700 15, 840 65 C 950 105, 1020 190, 990 310 C 960 420, 980 520, 930 620 C 890 690, 790 680, 710 650 C 650 620, 670 510, 660 410 C 640 310, 560 230, 480 160 C 410 100, 360 40, 380 0 Z"
          fill="url(#heroWaveGrad1)"
        />

        {/* 2. Secondary Upper Wave Crest (Accent layer framing top right) */}
        <path
          d="M 560 0 C 690 5, 830 30, 930 90 C 1000 140, 1010 230, 970 310 C 935 375, 870 330, 840 260 C 800 180, 740 100, 660 40 C 620 15, 590 5, 560 0 Z"
          fill="url(#heroWaveGrad2)"
        />

        {/* 3. Left Side Fluid Organic Wave Curve */}
        <path
          d="M 0 130 C 90 145, 180 205, 160 310 C 140 410, 75 460, 25 530 C -5 570, -20 590, 0 610 L 0 130 Z"
          fill="url(#heroWaveGrad3)"
        />
      </svg>

      {/* Radiating Energetic Doodle Sparks (Top-Right Burst Rays) */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, 1.5, -1.5, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-5 -right-2 sm:-top-7 sm:-right-4 z-20 pointer-events-none"
      >
        <svg
          className="w-9 h-9 sm:w-11 sm:h-11 text-blue-600 overflow-visible"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Left angled spark ray */}
          <path
            d="M 17 25 L 7 15"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Center energetic burst ray */}
          <path
            d="M 25 19 L 29 4"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Right angled spark ray */}
          <path
            d="M 31 27 L 44 21"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      {/* Left Flank Floating Accent Circles */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-2 sm:-left-5 top-[36%] w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-blue-600 shadow-sm shadow-blue-500/40 pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -left-5 sm:-left-9 top-[47%] w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-400 pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden sm:block absolute -left-1 top-[22%] w-2 h-2 rounded-full bg-blue-400/70 pointer-events-none"
      />

      {/* Right Flank Floating Accent Circles */}
      <motion.div
        animate={{ y: [0, 3, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        className="absolute -right-2 sm:-right-5 top-[32%] w-2.5 h-2.5 rounded-full bg-blue-500/80 pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="hidden sm:block absolute -right-6 top-[62%] w-1.5 h-1.5 rounded-full bg-sky-400/80 pointer-events-none"
      />

      {/* 3D Elevated Grounding Drop Shadow Beneath Frame */}
      <div className="absolute -bottom-5 sm:-bottom-7 left-6 right-6 sm:left-10 sm:right-10 h-7 sm:h-9 bg-slate-900/18 blur-xl rounded-[100%] pointer-events-none" />
    </div>
  );
}
