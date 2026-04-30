import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Glasses, Activity, Package, Building2, ChevronRight, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-md">
              <Glasses className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-text-main tracking-tight">Optical Manager</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-semibold text-text-muted hover:text-text-main hidden sm:flex">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="font-bold shadow-sm">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-24 md:py-32 flex flex-col items-center text-center space-y-8 bg-gradient-to-b from-primary/5 to-surface">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary mb-4">
            ✨ Version 2.0 is now live
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-text-main tracking-tight max-w-4xl leading-tight">
            The operating system for modern <span className="text-primary">optical stores</span>.
          </h1>
          <p className="text-lg md:text-xl text-text-muted max-w-2xl font-medium leading-relaxed">
            Manage your patients, clinical prescriptions, dynamic inventory, and multi-shop financial ledgers seamlessly from a single, high-fidelity platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8 text-base font-bold shadow-md">
                Start your free trial <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-bold bg-white">
                Sign in to Dashboard
              </Button>
            </Link>
          </div>
          
          {/* Trust/Feature Badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm font-semibold text-text-muted">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> HIPAA Compliant Ready</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Multi-Tenant Architecture</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Zero Lock-in</span>
          </div>
        </section>

        {/* Core Features Grid */}
        <section className="px-4 py-20 bg-white border-t border-border">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-4">Everything you need to run your clinic</h2>
              <p className="text-text-muted text-lg max-w-2xl mx-auto">Built by optical professionals, for optical professionals. Ditch the spreadsheets and upgrade to an enterprise-grade solution.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Prescription Ledger</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-text-muted">
                    Maintain high-fidelity clinical records. Track Spherical, Cylindrical, Axis, and PD data for every patient visit over time.
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Stock Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-text-muted">
                    Real-time inventory tracking for frames, bespoke lenses, and accessories with automatic low-stock alerts.
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow lg:col-span-1 md:col-span-2">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Multi-Shop Scaling</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-text-muted">
                    Own multiple branches? Manage all your stores from a single organization dashboard. Consolidate financial metrics instantly.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-4 py-20 bg-surface">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-center text-text-main mb-12">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <details className="group bg-white rounded-lg border border-border shadow-sm p-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-text-main font-bold text-lg">
                  Is my clinical data secure?
                  <span className="shrink-0 rounded-sm bg-surface p-1.5 text-text-muted sm:p-3 group-open:-rotate-180 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 leading-relaxed text-text-muted">
                  Absolutely. We use Supabase and PostgreSQL with Row-Level Security (RLS) to ensure that your patient prescriptions and shop financials are strictly isolated and securely encrypted.
                </p>
              </details>

              <details className="group bg-white rounded-lg border border-border shadow-sm p-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-text-main font-bold text-lg">
                  Can I manage multiple store locations?
                  <span className="shrink-0 rounded-sm bg-surface p-1.5 text-text-muted sm:p-3 group-open:-rotate-180 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 leading-relaxed text-text-muted">
                  Yes! Our multi-tenant architecture allows you to create one "Organization" and attach multiple "Shops" beneath it. You can track inventory and invoices per store while maintaining a top-level view.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-8 text-center text-sm text-text-muted font-medium">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} Optical Manager. Built for clinical excellence.</p>
        </div>
      </footer>
    </div>
  );
}
