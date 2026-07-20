# System Architecture & Technical Design

**Optical Manager** is architected as a modern Next.js 16 App Router enterprise web application built on React 19, Supabase PostgreSQL, Drizzle ORM, and Supabase Auth.

---

## 🏗️ High-Level Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                               CLIENT LAYER                                │
│  React 19 Server & Client Components • TailwindCSS v4 • Recharts Telemetry │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS 16 APP ROUTER                             │
│   Server Actions (actions/) • Server Services (services/) • Proxy Auth    │
└───────────────────┬───────────────────────────────────┬───────────────────┘
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────────────┐ ┌─────────────────────────────────┐
│            SUPABASE AUTH              │ │         MAILERSEND API          │
│ SSR Cookie Sessions • JWT Tokens      │ │ Transactional Invoices & Alerts │
└───────────────────────────────────────┘ └─────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                       DRIZZLE ORM / POSTGRESQL LAYER                      │
│     Type-Safe SQL Queries • Migrations • Supabase PgBouncer Connection    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Core Architectural Layers

### 1. App Router & Route Protection Layer (`proxy.ts`)
Routing and authentication handshakes are managed by Next.js 16 middleware (`proxy.ts`) using `@supabase/ssr`:

```ts
// Public routes bypassing session authentication:
const PUBLIC_ROUTES = [
  "/login", "/signup", "/forgot-password", "/reset-password",
  "/privacy-policy", "/terms-of-service"
];

// Dynamic public pattern routes:
// - /share/invoice/[id]
// - /book/[slug]
```

When a request arrives:
1. `proxy.ts` inspects the request cookies using `@supabase/ssr`.
2. If the user accesses protected dashboard routes (`/shop/*`, `/owner/*`) without a valid session cookie, they are redirected to `/login`.
3. If an authenticated user visits `/login` or `/signup`, they are redirected to their active workspace dashboard.

### 2. Service & Action Layer Architecture

The codebase cleanly separates mutation handling from data fetching:

- **Service Layer (`services/*.service.ts`)**: Server-only modules (`"use server"`) containing database queries using Drizzle ORM. Examples:
  - `auth.service.ts`: User session retrieval (`getCurrentUser`) and profile verification.
  - `dashboard.service.ts`: Multi-period KPI telemetry calculations and revenue trajectory aggregations.
  - `inventory.service.ts`: Low stock query logic and SKU CRUD.
  - `email.service.ts`: MailerSend API singleton client dispatching shop emails.
- **Action Layer (`actions/*.actions.ts`)**: Next.js Server Actions invoked by client forms for data mutations. Executes validation (`zod`) and invalidates Next.js cache using `revalidatePath`.

### 3. Database Connection & Pooling (`lib/drizzle.ts`)
Database interactions use Drizzle ORM over a pooled PostgreSQL connection managed by Supabase PgBouncer:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```
- `prepare: false` is required for PgBouncer transaction pooling mode (`port 6543`).
- `DIRECT_DATABASE_URL` (`port 5432`) is used for schema migrations via `drizzle-kit`.

---

## 🔒 Multi-Tenant Security & Isolation Model

Data isolation is guaranteed at the database service layer by embedding mandatory `organizationId` and `shopId` scoping parameters into all Drizzle query conditions:

```ts
// Multi-Tenant Query Isolation Example
export async function getShopInvoices(shopId: string, organizationId: string) {
  return db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      status: invoices.status,
      customerName: customers.fullName,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(invoices.shopId, shopId),
        eq(invoices.organizationId, organizationId)
      )
    )
    .orderBy(desc(invoices.createdAt));
}
```

---

## 📁 Complete Directory Structure

```
optical-manager/
├── actions/                  # Next.js Server Actions (auth, inventory, invoice, etc.)
├── app/                      # Next.js App Router routes & API endpoints
│   ├── (auth)/               # Auth routes (/login, /signup, /forgot-password)
│   ├── (dashboard)/          # Dashboard routes (/shop/*, /owner/*)
│   ├── (legal)/              # Legal pages (/privacy-policy, /terms-of-service)
│   ├── api/                  # REST endpoints (/api/orders/export, /api/search)
│   ├── book/[slug]/          # Public appointment booking page
│   └── share/invoice/[id]/   # Public digital invoice viewer
├── components/               # UI components & client views
│   ├── layout/               # Sidebar, Topbar, Layout Client wrappers
│   ├── shop/                 # Analytics, Inventory, Invoices, Support Client components
│   └── ui/                   # Primitive design system components (buttons, badges)
├── db/                       # Drizzle ORM database setup
│   └── schema/               # 19 Relational schema table definitions
├── docs/                     # Comprehensive system documentation
├── lib/                      # Drizzle instance, Supabase client, utility helpers
├── proxy.ts                  # Route protection middleware logic
├── services/                 # Core business services & Drizzle queries
└── types/                    # TypeScript type interfaces
```
