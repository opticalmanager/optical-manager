"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { DocumentData } from "@/services/document.service";
import { InvoiceDocument } from "@/components/shop/InvoiceDocument";
import { getShopBusinessDetails } from "@/lib/document-config";
import {
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface SharedInvoiceViewerProps {
  data: DocumentData;
  mode?: "INVOICE" | "RECEIPT";
}

export function SharedInvoiceViewer({ data, mode = "INVOICE" }: SharedInvoiceViewerProps) {
  const shopDetails = getShopBusinessDetails(data?.shop);
  const storeName = shopDetails.name || (data?.shop as any)?.organizationName || "Optical_Store";
  const invoiceNumber = data?.invoice?.invoiceNumber || "Invoice";

  // Build clean downloadable filename: [Store/Org_Name]_[Invoice_Number].pdf
  const cleanStore = storeName.trim().replace(/[\/\\:*?"<>|#\s]+/g, "_").replace(/^_+|_+$/g, "");
  const cleanInv = invoiceNumber.trim().replace(/[\/\\:*?"<>|#\s]+/g, "_").replace(/^_+|_+$/g, "");
  const pdfFileName = `${cleanStore}_${cleanInv}.pdf`;

  const [scale, setScale] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(1);
  const [docHeight, setDocHeight] = useState<number>(2300);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);
  const hasUserZoomedRef = useRef<boolean>(false);

  // Measure unscaled document height from fixed 794px canvas
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
  }, [data, mode]);

  // Auto-calculate fit scale on mount and on resize
  const calculateFitScale = useCallback(() => {
    if (typeof window === "undefined") return;
    const screenWidth = window.innerWidth;
    const isSmallScreen = screenWidth < 850;

    // Standard A4 width in standard CSS pixels
    const a4WidthPx = 794;
    // Mobile leaves 16px total horizontal margins (8px each side)
    const availableWidth = Math.max(280, screenWidth - (isSmallScreen ? 16 : 48));
    const calculatedFit = Number((availableWidth / a4WidthPx).toFixed(3));

    setFitScale(calculatedFit);

    // If user hasn't explicitly chosen custom zoom, auto-adjust scale
    if (!hasUserZoomedRef.current) {
      if (isSmallScreen) {
        setScale(calculatedFit);
      } else {
        setScale(1);
      }
    }
  }, []);

  useEffect(() => {
    calculateFitScale();
    window.addEventListener("resize", calculateFitScale);
    return () => window.removeEventListener("resize", calculateFitScale);
  }, [calculateFitScale]);

  // Touch pinch-to-zoom handlers
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

    // Double tap to toggle zoom between fit and 100%
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

  // Print with customized document title for default save name
  const handlePrint = () => {
    if (typeof window === "undefined") return;
    const originalTitle = document.title;
    document.title = `${cleanStore}_${cleanInv}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  // Download PDF file
  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const originalTitle = document.title;
    document.title = `${cleanStore}_${cleanInv}`;

    // Temporarily reset zoom scale to 1 for high-res unscaled canvas capture
    const currentScale = scale;
    if (currentScale !== 1) {
      setScale(1);
      await new Promise((r) => setTimeout(r, 80));
    }

    try {
      const printArea = document.getElementById("invoice-print-area");
      if (!printArea) {
        window.print();
        return;
      }

      toast.info(`Preparing ${pdfFileName}...`, { duration: 2000 });

      // Dynamically import html2pdf on client
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;

      const opt = {
        margin: [0, 0, 0, 0],
        filename: pdfFileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(printArea).save();

      setDownloadSuccess(true);
      toast.success(`Downloaded: ${pdfFileName}`);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.warn("Direct PDF download fallback to print:", err);
      // Seamless browser print-to-PDF fallback
      window.print();
    } finally {
      document.title = originalTitle;
      if (currentScale !== 1) {
        setScale(currentScale);
      }
      setIsDownloading(false);
    }
  };

  const isZoomedBeyondFit = scale > fitScale + 0.02;

  return (
    <div className="w-full flex flex-col items-center">
      {/* ========================================================================= */}
      {/* TOP ACTION & ZOOM TOOLBAR (Sticky & responsive) */}
      {/* ========================================================================= */}
      <div className="w-full max-w-4xl print:hidden mb-4 sm:mb-6 px-2 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Document Identifier */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#2563eb] tracking-wider">
                {mode === "RECEIPT" ? "Order Form / Receipt" : "Tax Invoice"}
              </span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                {storeName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Invoice No: <span className="font-bold text-slate-900">{invoiceNumber}</span>
            </p>
          </div>

          {/* Action Buttons: Print & Download PDF */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial h-10 px-4 font-bold text-xs uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 shadow-2xs"
              title="Print Invoice"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial h-10 px-4 font-bold text-xs uppercase tracking-wider text-white bg-[#0a52c3] hover:bg-[#004bb5] active:scale-[0.98] rounded-xl shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none disabled:opacity-70"
              title={`Download ${pdfFileName}`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>Saved ✓</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-white" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Desktop Interactive Zoom Controls */}
        <div className="mt-2.5 flex items-center justify-between gap-2 px-1 text-xs">
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

          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium">
            💡 Touch screen: Pinch to zoom in/out or double-tap to toggle fit
          </span>
          <span className="inline-block sm:hidden text-[10px] text-slate-400 font-medium truncate">
            💡 Pinch or double-tap to zoom
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESPONSIVE TOUCH & PINCH-ZOOM A4 DOCUMENT CONTAINER */}
      {/* ========================================================================= */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full overflow-x-auto overflow-y-visible py-2 px-1 sm:px-4"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Dynamic Sizer Stage: sized precisely to scaled dimensions */}
        <div
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
          {/* Rigid 794px Document Canvas: scaled from top-left */}
          <div
            ref={contentRef}
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
            <InvoiceDocument data={data} mode={mode} />
          </div>
        </div>
      </div>
    </div>
  );
}
