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
import { SocialReviewPills } from "@/components/shop/SocialReviewLinks";

interface SharedInvoiceViewerProps {
  data: DocumentData;
  mode?: "INVOICE" | "RECEIPT";
}

export function SharedInvoiceViewer({ data, mode = "INVOICE" }: SharedInvoiceViewerProps) {
  const isReceiptMode = mode === "RECEIPT";
  const shopDetails = getShopBusinessDetails(data?.shop);
  const storeName = shopDetails.name || (data?.shop as any)?.organizationName || "Optical_Store";
  const docNumber = isReceiptMode
    ? (data?.receipt?.receiptNumber || data?.order?.orderNumber || data?.invoice?.invoiceNumber || "Order_Form")
    : (data?.invoice?.invoiceNumber || "Invoice");

  // Build clean downloadable filename: [Store/Org_Name]_[Doc_Number].pdf
  const cleanStore = storeName.trim().replace(/[\/\\:*?"<>|#\s]+/g, "_").replace(/^_+|_+$/g, "");
  const cleanDoc = docNumber.trim().replace(/[\/\\:*?"<>|#\s]+/g, "_").replace(/^_+|_+$/g, "");
  const pdfFileName = `${cleanStore}_${cleanDoc}.pdf`;

  const [scale, setScale] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(1);
  const [docHeight, setDocHeight] = useState<number>(1150);
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
    document.title = `${cleanStore}_${cleanDoc}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  // Download PDF file directly to client device without triggering browser print preview or toasts
  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    let tempContainer: HTMLDivElement | null = null;

    try {
      const printArea = document.getElementById("invoice-print-area");
      if (!printArea) {
        console.error("Invoice print element not found");
        return;
      }

      // Dynamically import html2canvas-pro and jsPDF on client to keep initial bundle ultra-light
      // html2canvas-pro natively supports modern CSS color functions (oklab, oklch, lab, etc.)
      const [html2canvasModule, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default || html2canvasModule;

      // 1. Create an off-screen sandbox container at exact A4 width (794px)
      // This completely decouples capture from user's current touch zoom/scale on mobile/desktop
      tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-99999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "794px";
      tempContainer.style.minWidth = "794px";
      tempContainer.style.maxWidth = "794px";
      tempContainer.style.margin = "0";
      tempContainer.style.padding = "0";
      tempContainer.style.background = "#ffffff";
      tempContainer.style.zIndex = "-9999";
      tempContainer.style.opacity = "1";
      tempContainer.style.pointerEvents = "none";

      // 2. Clone print area to avoid any DOM layout shifts or zooming artifacts
      const clone = printArea.cloneNode(true) as HTMLElement;
      clone.style.transform = "none";
      clone.style.margin = "0";
      clone.style.boxShadow = "none";
      clone.style.borderRadius = "0";

      // Ensure all child pages have no exterior shadows or responsive margins in export
      const innerCards = clone.querySelectorAll<HTMLElement>(".print-page, .print-container");
      innerCards.forEach((card) => {
        card.style.boxShadow = "none";
        card.style.margin = "0 auto";
      });

      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      // Allow a brief frame for font metrics and SVGs to compute
      await new Promise((resolve) => setTimeout(resolve, 80));

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // 3. Check if multiple distinct pages are present (.print-page)
      const pageElements = Array.from(clone.querySelectorAll<HTMLElement>(".print-page"));

      if (pageElements.length > 0) {
        for (let i = 0; i < pageElements.length; i++) {
          const pageEl = pageElements[i];
          const canvas = await html2canvas(pageEl, {
            scale: 2, // Crisp 2x retina rendering
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            windowWidth: 794,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.98);
          if (i > 0) {
            pdf.addPage("a4", "portrait");
          }
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        }
      } else {
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 794,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;

        while (heightLeft > 2) {
          position -= pageHeight;
          pdf.addPage("a4", "portrait");
          pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
          heightLeft -= pageHeight;
        }
      }

      // 4. Directly trigger PDF download to the customer's device (no print preview panel)
      pdf.save(pdfFileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error("Direct PDF download error:", err);
      // Fallback: If device or browser security blocks client canvas creation, gracefully fallback to window.print()
      window.print();
    } finally {
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
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
                {isReceiptMode ? "Order Form / Receipt" : "Tax Invoice"}
              </span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                {storeName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {isReceiptMode ? "Order Form / Receipt No: " : "Invoice No: "}
              <span className="font-bold text-slate-900">{docNumber}</span>
            </p>
          </div>

          {/* Action Buttons: Print & Download PDF */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial h-10 px-4 font-bold text-xs uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 shadow-2xs"
              title={isReceiptMode ? "Print Order Form" : "Print Invoice"}
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
      {/* SOCIAL ENGAGEMENT & REVIEW BUTTONS (Rate on Google & Follow Instagram) */}
      {/* ========================================================================= */}
      <SocialReviewPills
        settings={data?.shop?.settings?.socialReviewLinks}
        mode={mode}
        storeName={storeName}
        className="mb-3 sm:mb-4"
      />

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
