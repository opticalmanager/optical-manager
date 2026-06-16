import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const monthlyFeatures = [
  "Advanced billing & invoicing (GST compliant)",
  "Detailed patient prescription records",
  "Comprehensive inventory tracking",
  "Single store dashboard",
  "Standard email & WhatsApp support",
];

const yearlyFeatures = [
  "Everything in Monthly Plan, plus:",
  "Multi-store unified dashboard & analytics",
  "Barcode scanning integration",
  "Automated low-stock alerts & reorders",
  "Priority WhatsApp & phone support (24/7)",
  "Automated patient follow-up campaigns",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-white py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-text-main mb-3">
          Pricing & Plans
        </h2>
        <p className="text-center text-text-muted mb-12">
          Choose the perfect plan for your business growth
        </p>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Monthly Plan */}
          <div className="bg-white border border-border rounded-2xl p-8 flex flex-col hover:border-slate-300 transition-colors duration-300">
            <h3 className="font-bold text-xl text-text-main mb-4">
              Monthly Plan
            </h3>
            <div className="mb-2">
              <span className="text-4xl font-bold text-text-main">₹ 899</span>
              <span className="text-sm text-text-muted ml-1">/per month</span>
            </div>
            <p className="text-text-muted text-sm mb-6">
              Essential features for single stores
            </p>

            <ul className="space-y-3 mb-8 flex-1">
              {monthlyFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-text-main">{feature}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full h-10 border-slate-200 hover:border-slate-300 hover:bg-slate-50">
              Select Plan
            </Button>
          </div>

          {/* Yearly Plan */}
          <div className="bg-white border-2 border-primary rounded-2xl p-8 relative flex flex-col shadow-xl shadow-blue-500/5">
            <span className="absolute -top-3 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Best Value
            </span>

            <h3 className="font-bold text-xl text-text-main mb-4">
              Yearly Plan
            </h3>
            <div className="mb-2">
              <span className="text-4xl font-bold text-text-main">₹ 9,999</span>
              <span className="text-sm text-text-muted ml-1">/per year</span>
            </div>
            <p className="text-text-muted text-sm mb-6">
              For serious & growing businesses
            </p>

            <ul className="space-y-3 mb-8 flex-1">
              {yearlyFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <span className={i === 0 ? "font-semibold text-text-main" : "text-text-main"}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <Button variant="default" className="w-full h-10 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
              Select Plan
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
