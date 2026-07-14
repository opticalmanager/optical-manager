import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Optical Manager",
  description:
    "Privacy Policy for Optical Manager SaaS platform. Learn how we collect, protect, process, and respect personal and optical shop data under Indian and international regulations.",
};

export default function PrivacyPolicyPage() {
  const effectiveDate = "July 14, 2026";

  return (
    <article className="prose prose-slate max-w-none bg-white rounded-2xl p-6 sm:p-10 border border-slate-200/80 shadow-sm">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm font-medium text-slate-500">
          Last Updated: <time dateTime="2026-07-14">{effectiveDate}</time>
        </p>
      </div>

      <div className="space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
          <p>
            Welcome to <strong>Optical Manager</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), a multi-tenant Software-as-a-Service (SaaS) CRM, inventory, and billing platform operated from New Delhi, India. Our platform is designed specifically for physical optical retail stores, eye clinics, opticians, and vision centers to streamline inventory, prescriptions, patient records, and point-of-sale invoicing.
          </p>
          <p className="mt-3">
            We respect your privacy and are committed to protecting all personal and operational data processed through our platform. This Privacy Policy outlines how we collect, use, store, share, and protect information when you visit our website (<strong>https://opticalmanager.in</strong>), register as a tenant, or interact with our system.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Regulatory Compliance Framework</h2>
          <p>
            Optical Manager operates in full compliance with applicable national and international data privacy and protection laws, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>
              <strong>Digital Personal Data Protection Act (DPDPA), 2023 (India)</strong> — Operating as a Data Fiduciary and Processor with strict consent, purpose limitation, and data minimization mechanisms.
            </li>
            <li>
              <strong>Information Technology Act, 2000 & Reasonable Security Practices Rules</strong> (India).
            </li>
            <li>
              <strong>CAN-SPAM Act & International Anti-Spam Guidelines</strong> — Strictly transactional electronic communication with verified domain sending authentication (SPF, DKIM, DMARC).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Information We Collect</h2>
          <p>We collect information across two distinct categories of data subjects:</p>
          
          <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">A. Information from SaaS Tenants (Optical Store Owners & Managers)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Data:</strong> Full name, professional email address, phone number, business name, GST number, store address.</li>
            <li><strong>Authentication Data:</strong> Password hashes, login logs, session tokens managed via Supabase Authentication.</li>
            <li><strong>Billing Data:</strong> Plan selection (Monthly/Yearly), subscription history, payment transaction reference IDs.</li>
          </ul>

          <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">B. Information Collected on Behalf of Stores (Patients & Customers)</h3>
          <p>
            When optical store managers record sales or eye checkups, the following patient information is stored in our secured, multi-tenant database:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Patient Contact Information:</strong> Name, phone number, email address (provided voluntarily in-person during checkout).</li>
            <li><strong>Optical Prescription Records:</strong> Spherical (SPH), Cylindrical (CYL), Axis (AXIS), Addition (ADD), Pupillary Distance (PD) for right and left eyes.</li>
            <li><strong>Purchase History:</strong> Frame specs, lens choices, order history, GST invoice details, balance due.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. How We Use Information</h2>
          <p>We use the collected data exclusively for explicit, legitimate business purposes:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Providing multi-tenant store management, inventory tracking, and tax-compliant invoicing.</li>
            <li>Authenticating users and protecting account security via double opt-in verification and OTP password resets.</li>
            <li>Dispatching 100% transactional notifications (digital receipts, eye prescriptions, account credentials) requested by store managers or patients.</li>
            <li>Generating aggregate analytics and reports for store owners to monitor sales and stock replenishment.</li>
            <li>Complying with statutory GST and financial reporting obligations under Indian tax law.</li>
          </ul>
          <p className="mt-3 font-medium text-slate-900">
            We do NOT send marketing newsletters, unsolicited promotional campaigns, or third-party advertisements. We do NOT sell, rent, trade, or monetize personal or store data under any circumstances.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Electronic Communications & Email Policy</h2>
          <p>
            All electronic mail dispatched from our verified domain (<code>opticalmanager.in</code>) is processed through high-reputation cloud infrastructure, including Amazon Web Services (AWS SES) and MailerSend.
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Explicit Triggering:</strong> Emails are sent only when triggered by specific actions (e.g., user clicking &quot;Forgot Password&quot; or store manager clicking &quot;Send Digital Receipt&quot;).</li>
            <li><strong>Suppression & Bounce Handling:</strong> We maintain automated Amazon SNS feedback loops and account-level suppression lists. Any hard bounce or complaint automatically suppresses the recipient email address to prevent subsequent dispatches.</li>
            <li><strong>Opt-Out Mechanism:</strong> Patients who prefer non-digital receipts can opt out directly at the store counter or request removal via store management. Store managers can also toggle email notifications off in patient CRM profiles.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Third-Party Service Providers</h2>
          <p>
            We partner with reliable, industry-leading infrastructure providers to host and run our services:
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-left text-sm border border-slate-200 rounded-lg">
              <thead className="bg-slate-100 text-slate-900 font-semibold">
                <tr>
                  <th className="p-3 border-b">Provider</th>
                  <th className="p-3 border-b">Purpose</th>
                  <th className="p-3 border-b">Privacy Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 font-medium">Amazon Web Services (AWS)</td>
                  <td className="p-3">Transactional Email Delivery (SES) & Hosting</td>
                  <td className="p-3"><a href="https://aws.amazon.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">AWS Privacy</a></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Supabase</td>
                  <td className="p-3">Managed PostgreSQL Database & Authentication (Mumbai Region)</td>
                  <td className="p-3"><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Privacy</a></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">MailerSend</td>
                  <td className="p-3">Store Notification Relays</td>
                  <td className="p-3"><a href="https://www.mailersend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">MailerSend Privacy</a></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Vercel</td>
                  <td className="p-3">Frontend Application Deployment & Analytics</td>
                  <td className="p-3"><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Vercel Privacy</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Data Security & Multi-Tenant Isolation</h2>
          <p>
            We implement defense-in-depth security measures to protect store and patient records:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Row Level Security (RLS):</strong> Database-level tenant isolation ensuring no store can view or modify data belonging to another store.</li>
            <li><strong>Encryption in Transit & Rest:</strong> All web traffic is encrypted using standard TLS 1.3. Database volumes and backups are encrypted at rest.</li>
            <li><strong>Access Controls:</strong> Strict role-based access control (RBAC) separating Store Owners from Shop Managers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">8. Data Retention & User Rights</h2>
          <p>
            We retain account and transaction data for as long as your subscription is active, or as required by law for statutory tax auditing (typically up to 7 years for billing records).
          </p>
          <p className="mt-3">Under the DPDPA 2023, you have rights to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Request access to your personal data processed on our platform.</li>
            <li>Request correction or updating of inaccurate records.</li>
            <li>Request erasure of personal data, subject to legal retention obligations.</li>
            <li>Withdraw consent for optional data processing.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">9. Contact Information & Data Protection Grievances</h2>
          <p>
            If you have questions, concerns, or grievance requests regarding this Privacy Policy or data processing practices, please contact our Data Protection Officer:
          </p>
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 text-slate-800 text-sm">
            <div>
              <p className="font-bold text-slate-900">Gaurav Tiwari</p>
              <p className="text-slate-600 text-xs">Co-Founder & Head of Technology / Data Protection Officer</p>
              <p className="mt-1">Phone: <a href="tel:+918178962366" className="text-blue-600 hover:underline">+91 81789 62366</a></p>
            </div>
            
            <div className="border-t border-slate-200 pt-3">
              <p className="font-bold text-slate-900">Deepak Mishra</p>
              <p className="text-slate-600 text-xs">Co-Founder & Head of Research & Product UI/UX / Data Protection Officer</p>
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
