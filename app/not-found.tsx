import type { Metadata } from "next";
import { ErrorStateView } from "@/components/ui/ErrorStateView";
import { NotFoundSearchClient } from "@/components/ui/NotFoundSearchClient";

export const metadata: Metadata = {
  title: "404 — Focal Point Lost | Optical Manager",
  description: "The optical page or resource you are looking for is out of alignment.",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-xl">
        <ErrorStateView
          variant="not-found"
          code={404}
          title="Focal Point Lost (404)"
          description="The optical route or resource you are seeking has been shifted or is out of focal alignment. Verify the URL, search below, or return to your optical workspace."
          primaryAction={{
            label: "Return to Dashboard",
            href: "/shop/dashboard",
          }}
          secondaryAction={{
            label: "Go to Home",
            href: "/",
          }}
          showQuickLinks={true}
          showDiagnostics={false}
          showHealthStrip={false}
        />
        {/* Interactive Instant Route Search Command Bar */}
        <NotFoundSearchClient />
      </div>
    </main>
  );
}
