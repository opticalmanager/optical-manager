import { ErrorStateView } from "@/components/ui/ErrorStateView";
import { NotFoundSearchClient } from "@/components/ui/NotFoundSearchClient";

export default function DashboardNotFound() {
  return (
    <div className="w-full h-full min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-xl">
        <ErrorStateView
          variant="dashboard-not-found"
          code={404}
          title="Optical Record Not Found"
          description="The invoice, patient profile, inward purchase, or inventory item you requested could not be located in this organization database."
          primaryAction={{
            label: "View Invoices Ledger",
            href: "/shop/invoices",
          }}
          secondaryAction={{
            label: "Return to Dashboard",
            href: "/shop/dashboard",
          }}
          showQuickLinks={true}
          showDiagnostics={false}
          showHealthStrip={true}
        />
        <NotFoundSearchClient />
      </div>
    </div>
  );
}
