# External Services & Cloud Cost Breakdown

This document provides a comprehensive inventory of all external SaaS APIs, cloud infrastructure, third-party services, and database providers integrated into **Optical Manager**, along with their pricing models and estimated monthly operational costs.

---

## Service Inventory & Cost Matrix

| Service Category | Provider / Tool | Used For | Current Tier | Estimated Cost (Monthly) |
| :--- | :--- | :--- | :--- | :--- |
| **Database & Auth** | **Supabase** | PostgreSQL Database (PgBouncer Pooler) & JWT Auth Session Cookies (`@supabase/ssr`). | Pro Plan / Free Tier | **$0.00 – $25.00 / mo** |
| **Email Delivery** | **MailerSend** | Transactional invoice dispatches, patient appointment reminders, system alerts. | Starter / Pay-as-you-go | **$0.00 – $14.00 / mo** |
| **Email Delivery (Alt)** | **AWS SES** | High-volume production transactional email dispatches. | Pay-as-you-go | **~$0.10 per 1,000 emails** (~$1.00 / mo) |
| **Deployment / Hosting**| **AWS Amplify / EC2**| CI/CD build pipelines, SSR edge deployment (`amplify.yml`), domain SSL certificates. | Pay-as-you-go | **~$5.00 – $20.00 / mo** |
| **Deployment (Alt)** | **Vercel** | Edge network hosting for Next.js App Router. | Pro / Hobby | **$0.00 – $20.00 / mo** |
| **Performance RUM** | **Vercel Speed Insights** | Real-time Core Web Vitals and user performance tracking. | Included | **$0.00 / mo** |
| **Typography & Icons** | **Google Fonts / Lucide**| Custom fonts (Inter, Outfit) and UI vector iconography. | Open Source (MIT) | **$0.00** |

---

## Detailed Service Breakdown

### 1. Supabase (PostgreSQL Database & Auth)
- **Primary Function**: Hosts the multi-tenant relational database (19 schemas including `invoices`, `inventory`, `customers`, `prescriptions`, `appointments`) and manages auth session cookies.
- **Connection Mode**: Connected via Drizzle ORM using Transaction Pooling (`aws-1-ap-south-1.pooler.supabase.com:6543`) for serverless Next.js route handlers.
- **Cost Analysis**:
  - **Free Tier**: $0/month (up to 500MB database storage, 50,000 monthly active users).
  - **Pro Tier**: $25/month (up to 8GB database, daily automatic backups, dedicated compute).

### 2. MailerSend / AWS SES (Transactional Email Services)
- **Primary Function**: Dispatches digital invoice links (`/share/invoice/[id]`), appointment reminders, and support ticket notifications.
- **Implementation**: Managed via `services/email.service.ts` singleton client.
- **Cost Analysis**:
  - **MailerSend Free**: $0/month (up to 3,000 emails/month).
  - **MailerSend Starter**: $14/month (up to 50,000 emails/month).
  - **AWS SES**: $0.10 per 1,000 emails (highly cost-effective for large-scale chains sending 100,000+ patient emails/month = ~$10/month).

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
