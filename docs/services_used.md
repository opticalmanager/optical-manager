# External Services & Cloud Cost Breakdown

This document provides a comprehensive inventory of all external SaaS APIs, cloud infrastructure, third-party services, and database providers integrated into **Optical Manager**, along with their pricing models and estimated monthly operational costs.

---

## Service Inventory & Cost Matrix

| Service Category | Provider / Tool | Used For | Current Tier | Estimated Cost (Monthly) |
| :--- | :--- | :--- | :--- | :--- |
| **Database & Auth** | **Supabase** | PostgreSQL Database (PgBouncer Pooler) & JWT Auth Session Cookies (`@supabase/ssr`). | Pro Plan / Free Tier | **$0.00 – $25.00 / mo** |
| **Email Delivery** | **Gmail SMTP (Nodemailer)** | Transactional invoice dispatches, patient appointment receipts, welcome emails. | Gmail App Password (500/day) | **$0.00 / mo** |
| **Deployment / Hosting**| **AWS Amplify / EC2**| CI/CD build pipelines, SSR edge deployment (`amplify.yml`), domain SSL certificates. | Pay-as-you-go | **~$5.00 – $20.00 / mo** |
| **Deployment (Alt)** | **Vercel** | Edge network hosting for Next.js App Router. | Pro / Hobby | **$0.00 – $20.00 / mo** |
| **Performance RUM** | **Vercel Speed Insights** | Real-time Core Web Vitals and user performance tracking. | Included | **$0.00 / mo** |
| **Web Analytics**   | **Google Analytics 4 (GA4)** | Client-side traffic, visitor telemetry, and conversion analytics (`G-8C5QB8TZ1E`). | Standard Free Tier | **$0.00 / mo** |
| **Offline Databank**| **Dexie.js / IndexedDB** | Local in-browser client database for offline POS checkout & cache. | Browser API (MIT) | **$0.00 / mo** |
| **Typography & Icons** | **Google Fonts / Lucide**| Custom fonts (Inter, Outfit) and UI vector iconography. | Open Source (MIT) | **$0.00** |

---

## Detailed Service Breakdown

### 1. Supabase (PostgreSQL Database & Auth)
- **Primary Function**: Hosts the multi-tenant relational database (24 schemas including `email_configs`, `email_templates`, `email_triggers`, `email_logs`, `invoices`, `inventory`, `customers`, `prescriptions`, `appointments`) and manages auth session cookies.
- **Connection Mode**: Connected via Drizzle ORM using Transaction Pooling (`aws-1-ap-south-1.pooler.supabase.com:6543`) for serverless Next.js route handlers.
- **Cost Analysis**:
  - **Free Tier**: $0/month (up to 500MB database storage, 50,000 monthly active users).
  - **Pro Tier**: $25/month (up to 8GB database, daily automatic backups, dedicated compute).

### 2. Utility Email Communication (Gmail SMTP / Nodemailer)
- **Primary Function**: Dispatches digital invoice links, payment receipts, appointment confirmations, and welcome emails across all store outlets.
- **Implementation**: Managed via `services/email.service.ts` and `services/email-trigger.service.ts` with AES-256 password encryption and 3-tier rate limiting (10/min, 100/hr, 450/day soft cap).

### 3. AWS Amplify / AWS EC2 / Vercel (Hosting Infrastructure)
- **Primary Function**: Builds and serves the Next.js 16 App Router application, managing dynamic SSR routes, static asset caching, and domain SSL certificates.
- **Implementation**: Configured via root `amplify.yml` build specification injecting environment variables into Next.js SSR at runtime.
- **Cost Analysis**:
  - **AWS Amplify Build**: $0.01 per build minute (~$1.00 - $3.00/month).
  - **AWS Data Transfer**: $0.15/GB data transfer out (~$5.00 - $15.00/month for mid-scale optical traffic).
  - **Total Estimated Hosting Cost**: **~$10.00 – $25.00 / month**.

### 4. Vercel Speed Insights
- **Primary Function**: Monitors Real User Monitoring (RUM) metrics, First Contentful Paint (FCP), and Largest Contentful Paint (LCP) across POS tablet devices and desktop terminals.
- **Cost Analysis**: Included in standard Vercel tier ($0.00).

---

## Total Monthly Operational Cost Estimate

| Scale Level | Active Shops | Monthly Emails | Total Estimated Cost |
| :--- | :--- | :--- | :--- |
| **Starter / Single Shop** | 1 Store | < 3,000 emails | **$0.00 / month** (Free Tiers) |
| **Growing Retail Chain** | 3 – 10 Stores | 10,000 – 50,000 emails | **~$35.00 – $55.00 / month** |
| **Enterprise Chain** | 20+ Stores | 100,000+ emails | **~$75.00 – $120.00 / month** |

### 5. Google Gemini AI (Multimodal Vision OCR & AI Growth Copilot)
- **Primary Function**: 
  1. **Multimodal Vision OCR**: Auto-extracts supplier invoice details, HSN codes, product classifications, tax rates, and optical specifications from uploaded bill photos and PDFs on the Add Purchase page.
  2. **AI Growth Copilot**: Refines clinical WhatsApp promotional message templates across 6 optical cohorts (`ANNUAL_RX_EXPIRY`, `VIP_HIGH_SPENDER`, `UNUSED_STORE_CREDIT`, `PROGRESSIVE_UPGRADE`, `HIGH_CYLINDER_CHECKUP`, `DORMANT_LAPSED`), enforcing strict store discount caps and medical ethics guardrails (preventing unverified cure claims).
- **Implementation**: Powered by `@google/generative-ai` via standalone REST API `/api/ai/scan-bill` and pure services `services/bill-scan.service.ts` & `services/ai-growth.service.ts`. Decoupled completely from Server Actions to guarantee immunity against server component render digests. Features structured JSON schema responses, pre-validation MIME normalization, binary magic bytes sniffing, and active high-availability models (`gemini-3.5-flash-lite`, `gemini-3.8-flash`, `gemini-flash-latest`). Defensive optical retail fallback templates guarantee 100% uptime if API key is unconfigured.
- **Credentials & Multi-Tenancy**: Configured per organization in `organizations.settings.ai.geminiApiKey`, with platform fallback to `GEMINI_API_KEY`.
- **Cost Analysis**:
  - **Google AI Studio Free Tier**: 1,500 requests/day, 1M tokens/minute (**$0.00 / month**).
  - **Pay-as-you-go Tier**: ~$0.00015 per 1,000 input tokens (< $1.00/month for retail stores).

### 6. Google Analytics 4 (GA4)
- **Primary Function**: Tracks anonymous web visitor telemetry, marketing landing page traffic, bounce rates, session engagement, and conversion flows on `https://opticalmanager.in`.
- **Implementation**: Implemented via `@/components/analytics/GoogleAnalytics.tsx` using Next.js `next/script` with `strategy="afterInteractive"`. Asynchronously injected post-hydration to protect POS terminal rendering performance.
- **Measurement ID**: `G-8C5QB8TZ1E` (configured via `NEXT_PUBLIC_GA_MEASUREMENT_ID`).
- **Cost Analysis**: Standard Google Analytics free tier (**$0.00 / month**).


### 7. Appyflow GSTIN Verification API
- **Primary Function**: Live verification and taxpayer detail auto-fill for 15-character GST numbers in invoice and customer creation. Auto-populates official legal entity name, trade name, principal place of business (street, city, state, pincode), and active filing status.
- **Implementation**: Powered by `services/gst-lookup.service.ts` and `actions/gst-lookup.actions.ts` via endpoint `https://appyflow.in/api/verifyGST`.
- **Hybrid 3-Tier Optimization**:
  - **Tier 1 (0ms, ₹0)**: Offline structural format validation (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[0-9A-Z]{2}$`) and Luhn Modulo 36 checksum in `utils/gstin.ts`. Typographical errors are detected while permitting sandbox test numbers and government edge cases to reach verification.
  - **Tier 2 (2ms, ₹0)**: Local PostgreSQL cache table `customer_gstin_cache`.
  - **Tier 3 (Live API)**: Appyflow lookup triggered for uncached valid GST numbers.
- **Admin Management**: Managed per-tenant in `/admin/organizations/[id]` with toggle controls, period filters, and consumption analytics.
- **Credentials & Multi-Tenancy**: Secured via server environment variable `APPYFLOW_KEY_SECRET` with automatic trimming and quote/backslash sanitization (never exposed to client browser bundles).
- **Cost Analysis**: Fixed at **₹0.40 per live API lookup**, with ₹0.00 cost on all local database cache hits.

### 8. Official WhatsApp Business Cloud API (Meta Cloud API & Zernio)
- **Primary Function**: Enterprise WhatsApp communication engine for Owner Promotions, automated clinical event triggers (birthdays, Rx renewal reminders, review requests), and bulk marketing broadcasts. Eliminates all phone number ban risks associated with third-party web scrapers.
- **Integration Options**:
  1. **Direct Meta Cloud API (Official Enterprise)**: Direct connection to Meta Graph API v21.0 using System User Access Tokens. Zero middleman markup, includes 1,000 free Meta service conversations per month.
  2. **Zernio (Official WABA with Coexistence)**: Cloud WABA partner integration supporting WhatsApp Coexistence Mode, allowing the optical store's physical smartphone WhatsApp Business app to function simultaneously while cloud broadcasts dispatch in parallel.
- **Implementation**: Managed via `components/owner/promotions/WabaManagementClient.tsx`, `/owner/promotions/waba`, `actions/promotion.actions.ts`, and `services/promotion.service.ts`. Table `whatsapp_configs` stores encrypted tokens, phone number IDs, and live quality telemetry.
- **Cost Analysis**:
  - Meta Free Tier: 1,000 free service conversations per month (**$0.00**).
  - Marketing conversations: Billed at standard Meta country conversation rates (e.g., ~₹0.80 per marketing conversation in India).

