import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Optical Manager",
  description:
    "Terms of Service for Optical Manager SaaS platform. Understand the terms, acceptable use, billing policies, and legal agreements governing the platform.",
};

export default function TermsOfServicePage() {
  const effectiveDate = "July 14, 2026";

  return (
    <article className="prose prose-slate max-w-none bg-white rounded-2xl p-6 sm:p-10 border border-slate-200/80 shadow-sm">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-sm font-medium text-slate-500">
          Last Updated: <time dateTime="2026-07-14">{effectiveDate}</time>
        </p>
      </div>

      <div className="space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Agreement to Terms</h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;Tenant,&quot; &quot;User,&quot; or &quot;Customer&quot;) and <strong>Optical Manager</strong> (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), governing your access to and use of the website located at <strong>https://opticalmanager.in</strong> and associated web applications, APIs, and multi-tenant software services.
          </p>
          <p className="mt-3">
            By registering an account, subscribing to a plan, or using the platform, you agree to be bound by these Terms and our <a href="/privacy-policy" className="text-blue-600 hover:underline font-medium">Privacy Policy</a>. If you do not agree to these Terms, you must not access or use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Service Description</h2>
          <p>
            Optical Manager is a cloud-based B2B Software-as-a-Service (SaaS) management solution designed for physical optical retail stores, optometry practices, and eye care clinics. Features include:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Multi-tenant shop dashboard & inventory tracking (frames, lenses, optical accessories).</li>
            <li>Patient database and eye prescription history tracking (SPH, CYL, AXIS, ADD, PD).</li>
            <li>GST-compliant point-of-sale invoicing, receipts, and revenue reporting.</li>
            <li>Automated transactional communication (digital receipts, appointment details, authentication notifications).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Account Eligibility & Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Eligibility:</strong> You must be at least 18 years of age and authorized to act on behalf of the registered business entity.</li>
            <li><strong>Accuracy:</strong> You agree to provide accurate, complete, and updated registration details (business name, GSTIN, contact information).</li>
            <li><strong>Security:</strong> You are responsible for maintaining the confidentiality of your account login credentials and for all activities conducted under your tenant account.</li>
            <li><strong>Notification:</strong> You must notify us immediately at <code>support@opticalmanager.in</code> if you suspect unauthorized access to your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Acceptable Use Policy</h2>
          <p>You agree to use Optical Manager solely for lawful business operations. You agree NOT to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Use the system to send unsolicited commercial electronic mail (spam), marketing newsletters, or unauthorized bulk communications.</li>
            <li>Input fraudulent patient records, illegitimate prescription metrics, or false tax invoicing numbers.</li>
            <li>Attempt to bypass database Row Level Security (RLS), inspect other tenant accounts, or access non-public APIs.</li>
            <li>Reverse engineer, decompile, or copy any software architecture, design tokens, or source code of Optical Manager.</li>
            <li>Use the platform in violation of Indian laws, including the Information Technology Act, 2000, DPDPA 2023, or GST Regulations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Subscription Terms & Billing</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Subscription Plans:</strong> Optical Manager offers Monthly (₹899/month) and Yearly (₹9,999/year) subscription plans as published on our website.</li>
            <li><strong>Payment Processing:</strong> Fees are billed in advance in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.</li>
            <li><strong>Renewals:</strong> Subscriptions renew automatically at the end of the billing cycle unless canceled prior to the renewal date.</li>
            <li><strong>Refunds:</strong> Payments are non-refundable once processed, except as required by applicable Indian consumer laws or explicit written agreements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Intellectual Property & Data Ownership</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Platform Rights:</strong> Optical Manager retains all rights, titles, and interests in the platform architecture, software code, UI designs, brand logos, and documentation.</li>
            <li><strong>Customer Data Ownership:</strong> You retain complete ownership of all data, inventory logs, customer files, and prescription records entered by your store into the system.</li>
            <li><strong>Data Export:</strong> Upon cancellation or request, you may export your store data in standard digital formats (JSON/CSV) prior to account termination.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Service Availability & Support</h2>
          <p>
            We strive to maintain a 99.9% uptime target for cloud access. Scheduled system maintenance will be communicated in advance whenever feasible. Technical and platform support is available via phone and email:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Standard Email Support: <code>support@opticalmanager.in</code></li>
            <li>Phone Support: <code>+91 81789 62366</code> / <code>+91 76781 06554</code> (Monday through Saturday, 9:00 AM – 7:00 PM IST)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, Optical Manager and its founder, employees, or affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data loss, business interruption, or financial errors arising from optical calculations or store invoicing.
          </p>
          <p className="mt-3">
            Our total aggregate liability for any claims under these Terms shall not exceed the total amount paid by you to Optical Manager during the three (3) months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">9. Termination</h2>
          <p>
            You may terminate your account at any time via account settings or by contacting customer support. We reserve the right to suspend or terminate accounts that breach these Terms, exhibit spam activity, or engage in unauthorized system access. Upon termination, your right to access the service will cease immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">10. Governing Law & Dispute Resolution</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any legal action or dispute arising out of or related to these Terms shall be subject to the exclusive jurisdiction of the courts located in New Delhi, India.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">11. Contact Us</h2>
          <p>If you have any questions or require clarification regarding these Terms of Service, please reach out to us:</p>
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 text-slate-800 text-sm">
            <div>
              <p className="font-bold text-slate-900">Gaurav Tiwari</p>
              <p className="text-slate-600 text-xs">Co-Founder & Head of Technology</p>
              <p className="mt-1">Phone: <a href="tel:+918178962366" className="text-blue-600 hover:underline">+91 81789 62366</a></p>
            </div>
            
            <div className="border-t border-slate-200 pt-3">
              <p className="font-bold text-slate-900">Deepak Mishra</p>
              <p className="text-slate-600 text-xs">Co-Founder & Head of Research & Product UI/UX</p>
              <p className="mt-1">Phone: <a href="tel:+917678106554" className="text-blue-600 hover:underline">+91 76781 06554</a></p>
            </div>

            <div className="border-t border-slate-200 pt-3 text-xs text-slate-500 space-y-0.5">
              <p>Location: New Delhi, India</p>
              <p>Email: <a href="mailto:support@opticalmanager.in" className="text-blue-600 hover:underline font-medium">support@opticalmanager.in</a></p>
              <p>Website: <a href="https://opticalmanager.in" className="text-blue-600 hover:underline font-medium">https://opticalmanager.in</a></p>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
