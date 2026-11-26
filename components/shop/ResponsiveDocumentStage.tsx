"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

interface ResponsiveDocumentStageProps {
  children: React.ReactNode;
  showControls?: boolean;
  controlsExtra?: React.ReactNode;
  dependencyKey?: string | number;
}

/**
 * Shared responsive A4 viewport scaler (794px canvas) with mobile pinch-to-zoom,
 * double-tap zoom toggle, fit-to-screen scaling, and clean @media print resets.
 */
export function ResponsiveDocumentStage({
  children,
  showControls = true,
  controlsExtra,
  dependencyKey,
}: ResponsiveDocumentStageProps) {
  const [scale, setScale] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(1);
  const [docHeight, setDocHeight] = useState<number>(1123);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);
  const hasUserZoomedRef = useRef<boolean>(false);

  useEffect(() => {
    const measureHeight = () => {
      if (contentRef.current) {
        const h = contentRef.current.offsetHeight;
        if (h > 200) {
          setDocHeight(h);
        }
      }
    };
    measureHeight();
    const t1 = setTimeout(measureHeight, 100);
    const t2 = setTimeout(measureHeight, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [dependencyKey, children]);

  const calculateFitScale = useCallback(() => {
    if (typeof window === "undefined") return;
    const screenWidth = window.innerWidth;
    const isSmallScreen = screenWidth < 850;
    const a4WidthPx = 794;
    const availableWidth = Math.max(280, screenWidth - (isSmallScreen ? 16 : 48));
    const calculatedFit = Number((availableWidth / a4WidthPx).toFixed(3));

    setFitScale(calculatedFit);

    if (!hasUserZoomedRef.current) {
      setScale(isSmallScreen ? calculatedFit : 1);
    }
  }, []);

  useEffect(() => {
    calculateFitScale();
    window.addEventListener("resize", calculateFitScale);
    return () => window.removeEventListener("resize", calculateFitScale);
  }, [calculateFitScale]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
      hasUserZoomedRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / touchStartDistRef.current;
      const minScale = Math.min(fitScale * 0.7, 0.3);
      const newScale = Math.min(2.5, Math.max(minScale, touchStartScaleRef.current * ratio));
      setScale(Number(newScale.toFixed(2)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      touchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        hasUserZoomedRef.current = true;
        setScale((prev) => (Math.abs(prev - 1) < 0.08 ? fitScale : 1));
      }
      lastTapRef.current = now;
    }
  };

  const zoomIn = () => {
    hasUserZoomedRef.current = true;
    setScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
  };

  const zoomOut = () => {
    hasUserZoomedRef.current = true;
    const minScale = Math.min(fitScale * 0.7, 0.3);
    setScale((prev) => Math.max(minScale, Number((prev - 0.15).toFixed(2))));
  };

  const resetToFit = () => {
    hasUserZoomedRef.current = false;
    setScale(fitScale);
  };

  const resetTo100 = () => {
    hasUserZoomedRef.current = true;
    setScale(1);
  };

  const isZoomedBeyondFit = scale > fitScale + 0.02;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Strict Print CSS Overrides via data attributes (Rule 15 safe) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              [data-shared-sizer] {
                width: auto !important;
                min-width: 0 !important;
                height: auto !important;
                margin: 0 auto !important;
                position: static !important;
              }
              [data-shared-canvas] {
                width: 100% !important;
                min-width: 0 !important;
                max-width: none !important;
                transform: none !important;
                position: static !important;
                top: auto !important;
                left: auto !important;
              }
            }
          `,
        }}
      />

      {showControls && (
        <div className="w-full max-w-4xl print:hidden mb-2.5 flex items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={zoomOut}
              aria-label="Zoom out"
              className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>

            <span className="text-[11px] font-bold text-slate-700 w-12 text-center select-none">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={zoomIn}
              aria-label="Zoom in"
              className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={resetToFit}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 text-[10px] font-bold text-slate-600 cursor-pointer transition-colors flex items-center gap-1"
              title="Fit to Screen Width"
            >
              <Maximize2 className="h-3 w-3" /> Fit
            </button>

            <button
              type="button"
              onClick={resetTo100}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 text-[10px] font-bold text-slate-600 cursor-pointer transition-colors flex items-center gap-1"
              title="Actual 100% Size"
            >
              <RotateCcw className="h-3 w-3" /> 100%
            </button>
          </div>

          {controlsExtra ? (
            controlsExtra
          ) : (
            <>
              <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium">
                💡 Touch screen: Pinch to zoom in/out or double-tap to toggle fit
              </span>
              <span className="inline-block sm:hidden text-[10px] text-slate-400 font-medium truncate">
                💡 Pinch or double-tap to zoom
              </span>
            </>
          )}
        </div>
      )}

      {/* Responsive Touch & Pinch-Zoom A4 Document Stage */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full overflow-x-auto overflow-y-visible py-2 px-1 sm:px-4 print:overflow-visible print:p-0"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          data-shared-sizer="true"
          style={{
            width: `${Math.round(794 * scale)}px`,
            minWidth: `${Math.round(794 * scale)}px`,
            height: `${Math.round(docHeight * scale)}px`,
            position: "relative",
            marginLeft: isZoomedBeyondFit ? "0" : "auto",
            marginRight: isZoomedBeyondFit ? "0" : "auto",
          }}
          className="print:w-auto print:h-auto print:min-w-0"
        >
          <div
            ref={contentRef}
            data-shared-canvas="true"
            style={{
              width: "794px",
              minWidth: "794px",
              maxWidth: "794px",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
            className="print:static print:transform-none print:w-auto print:min-w-0 print:max-w-none"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
