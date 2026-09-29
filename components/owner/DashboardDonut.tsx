"use client";

import React, { useState } from "react";

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
  count?: number;
  percentage?: number;
}

interface DashboardDonutProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerPrimary?: string | number;
  centerSecondary?: string;
  centerPrimaryClass?: string;
  centerSecondaryClass?: string;
  className?: string;
  emptyColor?: string;
  gapAngle?: number;
}

export default function DashboardDonut({
  data,
  size = 130,
  thickness = 16,
  centerPrimary,
  centerSecondary,
  centerPrimaryClass = "text-sm font-extrabold text-slate-800",
  centerSecondaryClass = "text-[9px] font-bold text-slate-400 uppercase tracking-wider",
  className = "",
  emptyColor = "#E2E8F0",
  gapAngle = 2,
}: DashboardDonutProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const validData = data.filter((d) => d.value > 0);
  const totalValue = validData.reduce((acc, d) => acc + d.value, 0);

  // If no data, render an empty subtle ring
  if (totalValue === 0) {
    return (
      <div
        className={`relative inline-flex items-center justify-center select-none ${className}`}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={emptyColor}
            strokeWidth={thickness}
            className="opacity-60"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
          {centerSecondary && (
            <span className={`${centerSecondaryClass} leading-tight`}>
              {centerSecondary}
            </span>
          )}
          {centerPrimary !== undefined && (
            <span className={`${centerPrimaryClass} leading-tight mt-0.5`}>
              {centerPrimary}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Calculate SVG stroke arcs
  let accumulatedAngle = -90; // Start from top (12 o'clock)
  const segments = validData.map((segment, index) => {
    const fraction = segment.value / totalValue;
    const strokeDash = fraction * circumference;
    const offset = -accumulatedAngle * (Math.PI / 180) * radius;

    accumulatedAngle += fraction * 360;

    const isHovered = hoveredIdx === index;
    const strokeWidth = isHovered ? thickness + 2 : thickness;

    return (
      <circle
        key={`seg-${index}-${segment.name}`}
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke={segment.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${Math.max(0, strokeDash - (validData.length > 1 ? gapAngle : 0))} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-200 cursor-pointer"
        onMouseEnter={() => setHoveredIdx(index)}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{
          transformOrigin: `${center}px ${center}px`,
        }}
      />
    );
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#F1F5F9"
          strokeWidth={thickness}
        />
        {/* Segment arcs */}
        {segments}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
        {centerSecondary && (
          <span className={`${centerSecondaryClass} leading-tight`}>
            {centerSecondary}
          </span>
        )}
        {centerPrimary !== undefined && (
          <span className={`${centerPrimaryClass} leading-tight mt-0.5`}>
            {hoveredIdx !== null && validData[hoveredIdx]
              ? validData[hoveredIdx].name
              : centerPrimary}
          </span>
        )}
      </div>
    </div>
  );
}
