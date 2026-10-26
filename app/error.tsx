"use client";

import { useEffect } from "react";
import { ErrorStateView } from "@/components/ui/ErrorStateView";

export default function GlobalRuntimeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to console/telemetry
    console.error("[AppRuntimeError] Uncaught optical application error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
      <ErrorStateView
        variant="error"
        code={500}
        title="Optical Aberration Detected"
        description="Our optical rendering engine encountered an unexpected runtime exception. We have captured the diagnostic signature for immediate resolution."
        error={error}
        reset={reset}
        primaryAction={{
          label: "Recalibrate / Try Again",
          onClick: reset,
        }}
        secondaryAction={{
          label: "Return to Safe Dashboard",
          href: "/shop/dashboard",
        }}
        showQuickLinks={true}
        showDiagnostics={true}
      />
    </main>
  );
}
