"use client";

import { useEffect } from "react";
import { ErrorStateView } from "@/components/ui/ErrorStateView";

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError] Uncaught dashboard workspace exception:", error);
  }, [error]);

  return (
    <div className="w-full h-full min-h-[calc(100vh-5rem)] flex items-center justify-center p-2 sm:p-4">
      <ErrorStateView
        variant="dashboard-error"
        code={500}
        title="Optical Workspace Hiccup"
        description="An unexpected error occurred in your current optical screen. Your offline local database, patient profiles, and stored drafts remain 100% safe."
        error={error}
        reset={reset}
        primaryAction={{
          label: "Try Again",
          onClick: reset,
        }}
        secondaryAction={{
          label: "Go to POS Billing",
          href: "/shop/invoices/new",
        }}
        showQuickLinks={true}
        showDiagnostics={true}
      />
    </div>
  );
}
