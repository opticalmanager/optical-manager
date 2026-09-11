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
│            SUPABASE AUTH              │ │       GMAIL SMTP SERVICE        │
│ SSR Cookie Sessions • JWT Tokens      │ │ Nodemailer • Rate Limiter       │
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
  - `email.service.ts`: Nodemailer Gmail SMTP client with 3-tier rate limiting and AES-256 password encryption.
  - `email-trigger.service.ts`: Non-blocking fire-and-forget event trigger service for automated email dispatches.
- **Action Layer (`actions/*.actions.ts`)**: Next.js Server Actions invoked by client forms for data mutations. Executes validation (`zod`) and invalidates Next.js cache using `revalidatePath`.

### 3. Database Connection & Pooling (`lib/drizzle.ts`)
Database interactions use Drizzle ORM over a pooled PostgreSQL connection managed by Supabase PgBouncer:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL!;

declare global {
  var __postgresClient: postgres.Sql | undefined;
}

const client =
  globalThis.__postgresClient ||
  postgres(connectionString, {
    prepare: false, // Required for Supabase pgbouncer in transaction mode
    max: 10,        // Cap connections per process to prevent connection exhaustion
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__postgresClient = client;
}

export const db = drizzle(client, { schema });
```
- `prepare: false` is required for PgBouncer transaction pooling mode (`port 6543`).
- `globalThis.__postgresClient` singleton prevents connection leaks across Next.js Hot Module Replacement (HMR) reloads, eliminating `(EMAXCONN) max client connections reached` errors.
- `DIRECT_DATABASE_URL` (`port 5432`) is used for schema migrations via `drizzle-kit`.

### 4. PWA & Offline-First Storage Architecture (`lib/offline/`)

Optical Manager implements an enterprise-grade client-side offline layer allowing POS checkout, patient onboarding, appointment scheduling, dues settlement, and full shop operations to survive network drops without interruption:

- **Dexie.js IndexedDB Databank (`lib/offline/db.ts`) (Schema Version 5)**:
  - `cached_customers`: Mirrored patient records scoped to active `shopId` or entire `organizationId` with compound multi-index query support.
  - `cached_inventory`: Mirrored active inventory items with instant SKU, brand, and name lookup.
  - `cached_appointments`: Mirrored scheduled and walk-in appointment records.
  - `cached_orders`: Mirrored store orders, billing statuses, and fulfillment tracking records.
  - `cached_invoices`: Mirrored clinical invoices for offline viewing, printing, and PDF downloading.
  - `cached_returns`: Mirrored return authorizations, refund records, and credit ledger.
  - `cached_shop_profile`: Mirrored store metadata, address, contact numbers, GSTIN, and WhatsApp notification templates (stores all branches for `OWNER`).
  - `cached_organization`: Mirrored organizational configuration, multi-branch listings with rich outlet settings, appointment booking config, subscription status, and currency settings.
  - `offline_invoices_queue`: Queue storing offline transactions with status `PENDING`, `SYNCING`, `SYNCED`, `FAILED`.
  - `offline_mutations_queue`: Queue storing offline entity mutations (`PATIENT_CREATE`, `PATIENT_UPDATE`, `APPOINTMENT_CREATE`, `APPOINTMENT_STATUS`, `ORDER_STATUS_UPDATE`, `ORDER_PAYMENT_RECORD`, `ORDER_SETTLE_DUES`, `INVENTORY_CREATE`, `INVENTORY_UPDATE`, `STOCK_ADJUST`, `PRESCRIPTION_CREATE`, `RETURN_CREATE`) with optimistic local updates.
  - `sync_metadata`: Tracks cache warming timestamps, sequence counters, and active tenant IDs.
- **Offline Mutation Queue (`lib/offline/mutation-queue.ts`)**:
  - Automatically captures patient registration/updates, prescriptions, appointment booking, stock item creation, stock adjustments, order status updates, partial payments, dues settlements, and sales returns in IndexedDB when offline.
  - Synchronizes to `POST /api/sync/offline-mutations` prior to invoice sync so newly created customers, appointments, inventory items, and order updates exist before dependent invoices are committed. Reconciles local temporary IDs with server-assigned UUIDs and official sequential SKUs upon sync.
- **Data Isolation Guard (`ensureShopDataIsolation`)**: Automatically purges client cache if a different shop or user logs into the device for `SHOP_MANAGER` role. For `OWNER` users with multi-branch networks, cross-shop data is preserved across all branches.
- **Service Worker (`public/sw.js`) (v12) & Native Web Manifest (`app/manifest.ts`)**:
  - **Cross-Origin Security & WAN Isolation**: Restricts interception strictly to same-origin requests (`url.origin === self.location.origin`), preventing synthetic response poisoning on external probes (e.g. `gstatic.com` network ping, Supabase API).
  - **Fast Network-Race Engine (800ms - 2,500ms Timeout)**: Navigations and React Server Component (`_rsc`) requests race against adaptive network timeouts. If network is slow or dropping, worker serves the cached page shell immediately in 0ms without hanging the browser.
  - **Cache-First Static Asset Delivery**: Immutable hashed chunks (`/_next/static/*`) serve instantly in 0ms from Cache Storage.
  - **Zero-Crash Offline App Router Transitions**: Dynamic Next.js flight requests (`_rsc`) are served from cached flight streams using `ignoreSearch: true`. If uncached, the worker responds with a `307 Temporary Redirect` (`x-nextjs-redirect`) back to the clean pathname, triggering Next.js to render the cached HTML document shell smoothly without throwing 504 errors or halting navigation.
  - **Comprehensive Route Precaching (`lib/offline/cache-warmer.ts`)**: Automatically pre-caches HTML shells and RSC flight payloads for both Shop (`/shop/dashboard`, `/shop/orders`, `/shop/customers`, `/shop/inventory`, `/shop/appointments`, `/shop/returns`, `/shop/invoices`, `/shop/invoices/new`, `/shop/patients/new`, `/shop/returns/new`, `/shop/inventory/add`) and Owner routes (`/owner`, `/owner/shops`, `/owner/reports`, `/owner/analytics`, `/owner/promotions`, `/owner/settings`, `/owner/settings/appointments`, `/owner/settings/email`, `/owner/shop-managers`, `/owner/support`).
  - **Module-Specific Offline Navigation Fallbacks**: Offline navigations fall back cleanly to module section hubs (e.g. `/shop/customers/*` -> `/shop/customers`, `/shop/invoices/*` -> `/shop/invoices`, `/shop/orders/*` -> `/shop/orders`) rather than hijacking the user back to the dashboard.
  - Handles background sync (`sync-offline-invoices`) events.
- **Strict Online/Offline Execution Separation & Real-Time Topbar Status**:
  - **Online Mode**: Server components execute natural database queries directly with fast-fail 500ms–1,000ms timeout races (`Promise.race`), falling back gracefully to empty defaults if DB is unreachable.
  - **Offline Mode**: Client components (`InventoryDashboardClient`, `CustomerRecordsClient`, `AppointmentsWorkspaceClient`, `OrdersTableClient`, `OwnerShopsClient`, `OwnerSettingsClient`) strictly activate and render from local IndexedDB databanks, auto-updating on `offline-databank-updated` window events.
  - **Accurate Online/Offline State Verification**: `OfflineProvider` runs lightweight HEAD probe against `/api/offline/ping?db=1` (with a 4,000ms timeout race and single cold-start retry) on `online` and `focus` events, eliminating false-positive "Online" status when Wi-Fi is connected but WAN internet is absent.
  - **Real-Time Topbar Controls (`SyncStatusControls`)**: Rendered next to the primary action buttons in both Shop Manager (`topbar.tsx`) and Owner (`OwnerHeader.tsx`) headers:
    - **Online / Offline Pill**: Green badge with pulsing dot when online; amber badge when offline.
    - **Syncing... / Synced Indicator**: Green badge showing `Syncing...` with animated spinner during databank sync, transitioning to `Synced` with checkmark once synchronized (with one-click manual re-sync).
    - **Pending Records Badge**: Displays count of uncommitted offline invoices and mutations with one-click push to cloud.
- **Offline Invoices & Receipts Viewing**:
  - Offline invoice detail viewer (`/shop/invoices/offline/[id]`) and fallback handler in `/shop/invoices/[id]` dynamically load invoices from `offlineDB.cached_invoices` or `offlineDB.offline_invoices_queue` with 0ms latency. Allows full viewing, printing, and offline PDF generation (`window.print()`).
- **Offline WhatsApp Notification Templates**:
  - `QuickEditModal` loads notification templates from `offlineDB.cached_shop_profile` with built-in optical fallbacks, eliminating "can't get template data" errors when disconnected.
- **Unified Cloud Sync Endpoints (Resilient Auth via `getCurrentUser`)**:
  - `GET /api/offline/sync-all`: Unified bulk exporter for store profile, organization, WhatsApp templates, customers, inventory, appointments, orders, invoices, and returns with `?since=` incremental delta support. Role-aware: exports multi-branch organization data, appointment config, and subscription info for `OWNER`.
  - `GET /api/offline/customers` & `GET /api/offline/inventory`: Resilient role-aware databank warming endpoints.
  - `GET /api/offline/ping` / `HEAD /api/offline/ping`: Ultra-lightweight endpoint for client-side connection verification with zero database overhead (or `?db=1` for cloud reachability check).
  - `POST /api/sync/offline-mutations`: Batch reconciliation for offline patient registrations, appointment creation, order status updates, partial payments, and dues settlements.
  - `POST /api/sync/offline-invoices`: Uses client-generated idempotency markers (`[OFFLINE_QUEUE_ID:uuid]`) in invoice metadata to prevent duplicate billing. Atomically commits customers, prescriptions, sequential invoices, inventory stock decrements, orders, and receipts.

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
│   ├── (admin)/              # Super Admin control panel (/admin, /admin/leads, /admin/organizations/[id])
│   ├── (auth)/               # Auth routes (/login, /signup, /forgot-password)
│   ├── (dashboard)/          # Dashboard routes (/shop/*, /owner/*)
│   ├── (legal)/              # Legal pages (/privacy-policy, /terms-of-service)
│   ├── api/                  # REST endpoints (/api/orders/export, /api/offline/*, /api/sync/*)
│   ├── book/[slug]/          # Public appointment booking page
│   └── share/invoice/[id]/   # Public digital invoice viewer
├── components/               # UI components & client views
│   ├── admin/                # Super Admin Client components (Dashboard, Leads, Organizations, Detail)
│   ├── layout/               # Sidebar, Topbar, Layout Client wrappers, SyncStatusControls
│   ├── providers/            # OfflineProvider, ServiceWorkerRegistrar
│   ├── shop/                 # Analytics, Inventory, Invoices, Support Client components
│   └── ui/                   # Primitive design system components (buttons, badges)
├── db/                       # Drizzle ORM database setup
│   └── schema/               # 20 Relational schema table definitions (including demo_requests)
├── docs/                     # Comprehensive system documentation
├── lib/                      # Drizzle instance, Supabase client, offline Dexie DB, utility helpers
│   └── offline/              # db.ts (Dexie v4 schema), cache-warmer.ts, invoice-queue.ts, mutation-queue.ts, search.ts
├── proxy.ts                  # Route protection middleware logic & subdomain routing
├── services/                 # Core business services & Drizzle queries (admin, auth, inventory, etc.)
└── types/                    # TypeScript type interfaces
```

---

## 8. ⚡ Offline Databank & Desktop PWA Architecture

Optical Manager features an offline-first architecture designed for uninterrupted clinical POS billing, inventory lookups, and customer search during internet outages.

### Core Components:
1. **Dual-Role Service Worker (`public/sw.js` - v12)**:
   - **Online**: Directly passes all navigation, RSC flight data (`_rsc`), and API requests to network with zero synthetic timeouts or abort delays. Network responses are cloned into cache asynchronously for offline availability.
   - **Offline Navigation & Zero-Crash RSC Handling**: Serves precached desktop shell when disconnected. When Next.js App Router client navigation requests dynamic React Server Component (`RSC: 1` / `?_rsc=...`) chunks while offline:
     - First attempts direct match and match with `ignoreSearch: true` to match cached flight streams regardless of build hashes.
     - If only the HTML document is cached, returns a `307 Temporary Redirect` with `x-nextjs-redirect`, prompting Next.js client router to perform an instant clean page transition without throwing `504 Gateway Timeout` or crashing error boundaries.
     - Navigating to un-cached subroutes (e.g. `/shop/customers/*`, `/shop/invoices/*`, `/shop/orders/*`, `/shop/returns/*`, `/shop/inventory/*`) falls back cleanly to their respective section listings rather than hijacking the user to `/shop/dashboard`.
   - **Cache Busting**: Versioned registration (`/sw.js?v=20260911_v12`) with automatic older cache bucket purging (`optical-manager-cache-v1` through `v11`) ensures instant client upgrades without stale worker persistence.

2. **Fast-Fail Server Component Timeouts (`services/*`, `app/(dashboard)/*`)**:
   - All shop and owner dashboard pages wrap database queries in a `Promise.race` with 1,200ms–2,500ms timeout guards.
   - If PostgreSQL or Supabase cloud connections stall or drop, server components immediately return clean fallback objects within 1.2–2.5s rather than hanging the browser or throwing uncaught `ENOTFOUND` exceptions.
   - Client views (`OrdersTableClient`, `CustomerRecordsClient`, `InventoryDashboardClient`, `AppointmentsWorkspaceClient`, `StoreOverviewClient`, `OwnerShopsClient`, `OwnerSettingsClient`) automatically detect offline state or empty initial data and seamlessly hydrate from IndexedDB with zero latency.

3. **Background Route Precaching (`lib/offline/cache-warmer.ts`)**:
   - As soon as a user logs in, `warmCache(shopId)` synchronizes the databank into IndexedDB and triggers `precacheAppRoutes(role)`.
   - Pre-caches both the HTML document shells and RSC flight streams (`headers: { RSC: "1" }`) for Shop routes (`/shop/dashboard`, `/shop/orders`, `/shop/customers`, `/shop/inventory`, `/shop/appointments`, `/shop/returns`, `/shop/invoices`, `/shop/invoices/new`, `/shop/patients/new`, `/shop/returns/new`, `/shop/inventory/add`) and Owner routes (`/owner`, `/owner/shops`, `/owner/reports`, `/owner/analytics`, `/owner/promotions`, `/owner/settings`, `/owner/settings/appointments`, `/owner/settings/email`, `/owner/shop-managers`, `/owner/support`), ensuring 100% offline availability across all primary tabs.

4. **Dexie v5 IndexedDB Databanks (`lib/offline/db.ts`)**:
   - Stores `cached_customers`, `cached_inventory`, `cached_appointments`, `cached_orders`, `cached_invoices`, `cached_returns`, `cached_shop_profile`, `cached_organization`, and `offline_invoices_queue`.
   - Indexed by both `shopId` and `organizationId` for high-performance multi-index querying.
   - Strictly isolated by `shopId` for `SHOP_MANAGER` accounts while preserving multi-branch networks for `OWNER` accounts.
   - **Persistent across browser restarts**: Cached data remains intact in IndexedDB when the user closes and reopens the browser.
   - Non-blocking writes: Table writes yield micro-ticks to the browser event loop to prevent UI stutter during large sync operations.

5. **Incremental / Delta Synchronization (`lib/offline/cache-warmer.ts`)**:
   - Uses `?since=ISO_TIMESTAMP` on `/api/offline/sync-all`.
   - When local records already exist, the server queries only records where `table.updatedAt > sinceDate` via Drizzle ORM.
   - Merges delta updates via `Dexie.bulkPut` without wiping existing patient or catalog tables.

6. **Bi-Directional Resilient Invoicing & Mutations (`components/shop/NewInvoiceForm.tsx`, `lib/offline/mutation-queue.ts`)**:
   - Online creation attempts direct PostgreSQL server action.
   - When offline or upon network drop, transactions write to `offline_invoices_queue` with client UUIDs (`OFF-2026-XXXX`) and mutations write to `offline_mutations_queue`.
   - Automatically synchronizes queued mutations and invoices via `/api/sync/offline-mutations` and `/api/sync/offline-invoices` upon reconnect with idempotent conflict handling.

