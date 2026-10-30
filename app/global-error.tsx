"use client";

import { useEffect, useState } from "react";
import { RotateCw, RefreshCw, AlertTriangle, LifeBuoy, Download, ShieldCheck } from "lucide-react";

export default function GlobalLayoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isClearing, setIsClearing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    console.error("[GlobalLayoutError] Critical root layout exception caught:", error);
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }
  }, [error]);

  const handleHardReset = async () => {
    setIsClearing(true);
    try {
      if (typeof window !== "undefined") {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        sessionStorage.clear();
        window.location.href = "/";
      }
    } catch {
      window.location.reload();
    } finally {
      setIsClearing(false);
    }
  };

  const handleDownloadEmergencyLog = () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        errorName: error?.name || "GlobalLayoutException",
        errorMessage: error?.message || "Root layout rendering failed",
        errorDigest: error?.digest || "N/A",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `optical-manager-emergency-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback
    }
  };

  return (
    <html lang="en">
      <head>
        <title>Emergency Optical Safeguard | Optical Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          @keyframes rotateAxis {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.25; transform: scale(1); }
            50% { opacity: 0.45; transform: scale(1.05); }
          }
          .reticle-ring {
            transform-origin: 50px 50px;
            animation: rotateAxis 20s linear infinite;
          }
          .glow-pulse {
            animation: pulseGlow 3s ease-in-out infinite;
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          padding: "16px",
          backgroundColor: "#F6F7F9",
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: "#111827",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "540px",
            width: "100%",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "24px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            padding: "32px 24px",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          {/* Animated SVG Reticle Header */}
          <div style={{ position: "relative", width: "80px", height: "80px", margin: "0 auto 16px auto" }}>
            <div
              className="glow-pulse"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backgroundColor: "#F43F5E",
                filter: "blur(16px)",
              }}
            />
            <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <circle cx="50" cy="50" r="44" stroke="#FECACA" strokeWidth="1.5" strokeDasharray="3 3" />
              <g className="reticle-ring">
                <circle cx="50" cy="50" r="34" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="6 6" />
                <line x1="50" y1="10" x2="50" y2="16" stroke="#DC2626" strokeWidth="2" />
                <line x1="50" y1="84" x2="50" y2="90" stroke="#DC2626" strokeWidth="2" />
                <line x1="10" y1="50" x2="16" y2="50" stroke="#DC2626" strokeWidth="2" />
                <line x1="84" y1="50" x2="90" y2="50" stroke="#DC2626" strokeWidth="2" />
              </g>
              <circle cx="50" cy="50" r="16" fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="1.5" />
            </svg>
            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                color: "#DC2626",
              }}
            >
              <AlertTriangle style={{ width: "24px", height: "24px" }} />
            </div>
          </div>

          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "9999px",
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "monospace",
              marginBottom: "12px",
              border: "1px solid #FECACA",
            }}
          >
            ROOT LAYOUT EXCEPTION • CODE 500
          </div>

          <h1
            style={{
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "#0F172A",
              margin: "0 0 8px 0",
            }}
          >
            Optical Manager Emergency Safeguard
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#64748B",
              lineHeight: 1.5,
              margin: "0 auto 16px auto",
              maxWidth: "440px",
            }}
          >
            A root-level layout aberration occurred. Your local offline database and client session data remain preserved. You can reconnect or run an emergency cache recalibration.
          </p>

          {/* Data Protection Banner */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "10px",
              backgroundColor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontSize: "11px",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            <ShieldCheck style={{ width: "14px", height: "14px", color: "#059669" }} />
            <span>Local IndexedDB data & offline bills are 100% secure</span>
          </div>

          {/* Diagnostic Box */}
          {error?.digest && (
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#475569",
                marginBottom: "20px",
                textAlign: "left",
              }}
            >
              <strong style={{ color: "#1E293B" }}>Diagnostic ID:</strong> {error.digest}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                height: "36px",
                padding: "0 18px",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RotateCw style={{ width: "14px", height: "14px" }} />
              <span>Try Again</span>
            </button>

            <button
              onClick={handleHardReset}
              disabled={isClearing}
              style={{
                height: "36px",
                padding: "0 16px",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "#FFFFFF",
                color: "#334155",
                border: "1px solid #CBD5E1",
                borderRadius: "10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw style={{ width: "14px", height: "14px" }} />
              <span>{isClearing ? "Resetting..." : "Clear Cache & Recover"}</span>
            </button>

            <button
              onClick={handleDownloadEmergencyLog}
              style={{
                height: "36px",
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "#FFFFFF",
                color: "#334155",
                border: "1px solid #CBD5E1",
                borderRadius: "10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Download style={{ width: "14px", height: "14px" }} />
              <span>Log .json</span>
            </button>

            <a
              href="https://wa.me/918178962366?text=Optical%20Manager%20Root%20Layout%20Exception"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: "36px",
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "#ECFDF5",
                color: "#059669",
                border: "1px solid #A7F3D0",
                borderRadius: "10px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <LifeBuoy style={{ width: "14px", height: "14px" }} />
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
