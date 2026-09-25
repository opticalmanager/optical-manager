"use client";

import React, { useEffect, useRef, useState, Component, type ReactNode } from "react";
import lottie, { type AnimationItem } from "lottie-web";
import { ShieldCheck } from "lucide-react";
import secureLoginAnimationData from "./secure-login-data";

// Robust React Error Boundary ensuring the login page NEVER crashes
interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SafeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("SecureLoginAnimation caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface SecureLoginAnimationProps {
  className?: string;
  size?: number;
}

function LottiePlayer({ className = "", size = 260 }: SecureLoginAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let animInstance: AnimationItem | null = null;

    try {
      if (!containerRef.current) return;

      // Clean any existing SVG nodes if component re-mounted in React StrictMode
      containerRef.current.innerHTML = "";

      animInstance = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg", // High-DPI crisp vector rendering with browser GPU compositing
        loop: true,
        autoplay: true,
        animationData: secureLoginAnimationData as any,
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: false,
          hideOnTransparent: false,
        },
      });

      animInstance.addEventListener("error", (e: any) => {
        console.warn("Lottie player error:", e);
        setHasError(true);
      });
    } catch (err) {
      console.warn("Could not initialize secure login animation:", err);
      setHasError(true);
    }

    return () => {
      if (animInstance) {
        try {
          animInstance.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  if (hasError) {
    return (
      <div
        className={`relative flex items-center justify-center select-none ${className}`}
        style={{ width: size, height: size, maxWidth: "100%" }}
      >
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/40 border border-blue-100/60 flex flex-col items-center justify-center p-6 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-100/80 border border-blue-200/70 flex items-center justify-center text-[#2563eb] shadow-sm mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-tight">Protected Practice Gateway</span>
          <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            256-Bit Encrypted Cloud
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size, maxWidth: "100%" }}
    >
      {/* Pure SVG Animated Container with immediate visibility */}
      <div
        ref={containerRef}
        className="w-full h-full relative z-10 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full"
      />
    </div>
  );
}

export default function SecureLoginAnimation(props: SecureLoginAnimationProps) {
  const fallback = (
    <div
      className={`relative flex items-center justify-center select-none ${props.className || ""}`}
      style={{ width: props.size || 260, height: props.size || 260, maxWidth: "100%" }}
    >
      <div className="w-full h-full rounded-2xl bg-blue-50/50 border border-blue-100/60 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-100/80 border border-blue-200/70 flex items-center justify-center text-[#2563eb] mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <span className="text-xs font-bold text-slate-800">Protected Gateway</span>
      </div>
    </div>
  );

  return (
    <SafeErrorBoundary fallback={fallback}>
      <LottiePlayer {...props} />
    </SafeErrorBoundary>
  );
}
