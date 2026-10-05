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
  - `dashboard.service.ts`: Multi-period KPI telemetry, exact live operational metrics (pending orders, pickup-ready, delayed deliveries, today's appointments), and unified cross-table operational activity aggregation (`getShopRecentActivities` across invoices, purchases, returns, stock movements, appointments, and WhatsApp dispatches).
  - `inventory.service.ts`: Low stock query logic and SKU CRUD.
  - `email.service.ts`: Nodemailer Gmail SMTP client with 3-tier rate limiting and AES-256 password encryption.
  - `email-trigger.service.ts`: Non-blocking fire-and-forget event trigger service for automated email dispatches.
  - `invoice.service.ts`: Sequential invoice generation (`generateInvoiceNumber`) using store-specific document series templates, financial year formats, numerical length-first sorting (`sql'length(invoice_number) DESC', invoice_number DESC`), active organization-scoped collision probing, and transaction-level retry protection against unique constraint collisions.
  - `customer.service.ts`: Profile aggregations, lifetime order values, clinical history grouping, store credit ledgers, sequential registration ID generation (`generateRegistrationId`) with numerical length sorting and proactive collision probing, and strictly bounded temporal visit calculations (`max(...) <= NOW()`) ensuring future order/prescription bookings never inflate customer visit history.
  - `customization.service.ts`: Organization-wide defaults and shop-level override configurations for the 8 core optical modules (Dashboard, Inventory, Sales & Orders, Invoices, Vendors & Purchases, Customers & Clinical, Appointments, Reports & Analytics) stored in JSONB settings.
  - `receipt.service.ts`: Sequential receipt (`generateReceiptNumber`) and order number generation (`generateOrderNumber`) supporting numerical length sorting, active collision probing, and synchronized invoice matching (`matchInvoice`).
  - `order.service.ts`: Order fulfillment telemetry, payment balancing, and customer order history.
- **Action Layer (`actions/*.actions.ts`)**: Next.js Server Actions invoked by client forms for data mutations. Executes validation (`zod`), concurrency retry loops (handling Postgres `23505` conflicts gracefully), and invalidates Next.js cache using `revalidatePath`. Example: `registerPatientAndInvoiceAction` and `updateShopDocumentSeriesAction`.
- **Utility Layer (`utils/document-series.ts`)**: Pure TypeScript helper routines for formatting document numbers, calculating Indian financial years (`getIndianFinancialYear`), and extracting trailing serial integers (`extractTrailingSerial`).

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

### 3.1 POS Line Item Ledger & Tax Computation Architecture (`NewInvoiceForm.tsx`)
The POS billing engine features an 11-column high-density ERP ledger grid designed for multi-device responsiveness and seamless tax compliance:
- **State-Aware Automated GST Engine**: Dynamically calculates whether an order is Intra-State (CGST + SGST) or Inter-State (IGST) by comparing the patient's state against the store's state (extracted from settings, address, or GSTIN state code). If patient state is missing or identical to the store state, CGST + SGST is applied by default. If patient state differs, IGST is applied. Live re-balancing recomputes line item tax splits in 0ms when the patient state is modified.
- **Bi-Directional Dual-Editable Tax Ledger**: CGST, SGST, and IGST fields are completely editable per row item. Both the calculated Rupee amount (`amount`) and rate (`percent`) feature bi-directional reactivity (changing percent recalculates amount, and changing amount recalculates percent). No currency glyphs (`₹`) appear inside input fields, preventing visual clutter and typing obstructions.
- **Separation of Item Code & Description**: The Product Search column cleanly displays the search input and exclusively the active item code badge (Barcode, Product Code, or SKU). Product name, brand, model, and clinical specifications are formatted into the Item Description column with `title` hover tooltips to avoid text clipping.
- **Bi-Directional Discount & Price Engine**: Computes row totals reactively from `unitPrice`, `quantity`, `discountPercent`, `discountAmount`, `cgstPercent`, `sgstPercent`, and `igstPercent`. Discount percentage is strictly clamped between 0% and 100%, and discount amount cannot exceed line subtotal.
- **Bi-Directional Total Price Entry & Reverse Tax Back-Calculation**: The Row Total column (`Column 11`) is an interactive, directly editable decimal input. Entering a total price directly (e.g. ₹1,000 all-inclusive retail price) automatically back-calculates the taxable base price (`unitPrice` / `taxableSubtotal`) and breaks down statutory GST amounts (`cgstAmount`, `sgstAmount`, `igstAmount`) based on the selected category's GST rate and intra-state/inter-state rules with 0-paisa rounding precision (`taxableSubtotal + taxes === rowTotal`). If the category is switched after entering the total price, the total price is preserved while base price and GST amounts re-adjust automatically. Entering unit price directly preserves traditional forward calculation.
- **Strict Input Constraints & Multi-Device Responsiveness**: Numerical enforcement via `inputMode="numeric"` / `inputMode="decimal"` and clean integer/decimal parsing. The table wrapper enforces `min-w-[1280px]` with horizontal scrolling, guaranteeing that no columns or input texts become clipped on smaller viewports.

### 3.2 Negative Inventory (Backordering) & Stock Movement Architecture
Optical retail counters frequently book customer orders for frames or ophthalmic lenses that are physically present in clinic trays or en route from optical labs before the purchase inward receipt is formally registered. Optical Manager implements an industry-standard 3-tier backordering cascade:

1. **3-Tier Cascade Permission Engine (`services/inventory.service.ts` -> `resolveNegativeStockPermission`)**:
   - **Tier 1 (Item Override)**: `inventory.allowNegativeStock` (`null`: inherit from category, `true`: always allow, `false`: disallow). Configurable in all product edit and creation forms.
   - **Tier 2 (Category Default)**: `product_categories.allowNegativeStock` (default `true` for all categories). Configurable per category in Category GST & HSN Master (`CategoryGstRatesSettings.tsx`) and Add Category modal.
   - **Tier 3 (Organization Customization)**: Global store-wide fallback configured under `/owner/settings/customization?tab=inventory` (`allow_negative_stock` toggle).
2. **Atomic Uncapped Stock Decrements**:
   - Replaced restrictive `GREATEST(0, ...)` clamping in `decrementInventoryStock` with atomic SQL `quantity - qty`, enabling inventory counts to transition into negative numbers (`0 - 1 = -1`) without data loss or blocking.
3. **Audit Trail & Stock Ledger (`stock_movements`)**:
   - Every stock movement records exact `balanceAfter`. When `balanceAfter < 0`, movements are automatically annotated with `(Backordered / Negative Stock)` for audit visibility.
4. **Billing UI & POS Backorder Badging (`NewInvoiceForm.tsx`)**:
   - When adding an item with `stock <= 0` or exceeding available stock: if permitted by the 3-tier cascade, the billing form issues a non-blocking amber warning toast and displays an amber pill badge `⚠️ Backorder (X on hand)`. Submission is permitted without interruption. If disallowed, strict hard blocking is enforced.
5. **Real-Time Inventory Dashboard & Filtering (`InventoryDashboardClient.tsx`)**:
   - Identifies negative inventory units (`quantity < 0`), renders high-density purple pill badges (`BACKORDERED (-X Units)`), and provides a 1-click `Backordered` KPI counter and filter state alongside Low Stock and Out of Stock.

### 3.3 Category Master & Commercial Defaults Architecture (`CategoryGstRatesSettings.tsx`)
Store managers and owners configure standardized optical taxonomy rules via the Category Master:
1. **Curated Commercial & Inventory Attributes**:
   - **Unified Category Name**: Eliminates redundant "Print Name" inputs by synchronizing display and invoice printing names 1-to-1.
   - **Track as Stockable (`isStockable`)**: Classifies category items as physical inventory (e.g. Frames, Contact Lenses) versus services or non-stock lab charges (e.g. Fitting Charges, Consultation, Frame Repairs).
   - **Default Commercial Discounts**: Pre-populates category-specific selling discounts (`defaultSaleDiscount`) and purchase inward discounts (`defaultPurchaseDiscount`).
   - **Smart 50/50 GST Tax Split**: Single-click tax presets (`0% Exempt`, `5%`, `12%`, `18%`, `28%`) automatically divide into statutory CGST and SGST rates with instant re-calculation.
2. **Retroactive Product Synchronization**:
   - When modifying category tax rates, HSN codes, or discounts, users can toggle `applyToExistingProducts`, triggering transactional propagation across all active items cataloged under that category code.
3. **High-Density, Zero-Scroll Ergonomics**:
   - **Zero Vertical Scroll Modal (`max-w-xl`)**: Proportional 2-column layout fits all required inputs comfortably within ~420px height on standard laptop viewports without scrolling.
   - **Zero Horizontal Scroll Table**: Streamlined into 7 high-density columns with combined Name/Code badges, removing redundant CGST, SGST, and Tax Slab columns so the table naturally fits within standard screen containers without horizontal scrollbars.

### 3.4 On-Demand Custom Product Ingestion Architecture (`services/inventory.service.ts` -> `ingestCustomProductToInventory`)
When billing products on new invoices (`/shop/invoices/new` and offline invoice sync) that do not already exist in the inventory catalog (`inventoryId: null`):
1. **Intelligent Deduplication**: Checks within the shop for any existing inventory item matching the exact trimmed description and category (or custom barcode/code). If found, reuses the item and decrements its stock quantity.
2. **Auto-Catalog Provisioning**: If not found, generates a collision-free unique product code (`CUST-XXXXXXXX-XXX`), inserts a new product record in `inventory` with initial stock equal to `-quantitySold` (e.g. `-1` or `-2`), and sets `allowNegativeStock = true`.
3. **Immutable Audit Movement Ledger**: Inserts a `SOLD` movement into `stock_movements` with `quantityChange: -quantity`, `balanceAfter: -quantity`, reference to the sale invoice, customer name, and user ID.
4. **Relational Integrity**: Links `invoice_items.inventoryId` directly to the newly provisioned/updated inventory item, eliminating orphaned non-inventory line items and maintaining 100% catalog integrity across sales reports, order forms, and inventory valuations.

### 3.5 POS Category Normalization & 2-Tier GST Rate Hierarchy (`NewInvoiceForm.tsx`)
During invoice creation (`/shop/invoices/new`), line items adhere to an enterprise-grade taxonomy and tax calculation hierarchy:
1. **Dynamic Category Default Rates**:
   - Initial blank rows and added rows dynamically pull active tax rates from Category Master settings for the default category ("Frames" or organization-configured default) rather than relying on hardcoded percentages.
   - Synchronizes seamlessly whenever store categories finish loading from local IndexedDB or remote server.
2. **Canonical Category Code-to-Name Normalization**:
   - Database catalog records store category codes (`FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SUNGLASSES`, `SOLUTION`) while user interfaces display localized names (`Frames`, `Lenses`, `Contact Lenses`, `Accessories`, `Sunglasses`).
   - The canonical category resolver normalizes uppercase codes, singulars, and plurals to the matching category's display name, guaranteeing that selecting any product via autocomplete search or barcode scanning immediately and accurately selects its category in the table dropdown.
3. **2-Tier GST Rate Inheritance Hierarchy**:
   - **Tier 1 (Product-Level Specific GST)**: When an item is selected from inventory, the billing engine inspects `product.cgstPercent`, `product.sgstPercent`, and `product.igstPercent`. If the item has explicitly configured non-zero GST rates, those item-specific rates take precedence.
   - **Tier 2 (Category-Level Fallback GST)**: If the item does not have specific GST rates defined (or set to 0.00), the billing engine falls back to the configured rates of that product's category in the store's Category Master.
   - **Statutory Distribution**: For intra-state transactions, total tax is divided equally into CGST and SGST (`igstPercent = 0`). For inter-state transactions, the total tax applies entirely to IGST (`cgstPercent = 0`, `sgstPercent = 0`).

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
- **Universal WhatsApp Utility Routing & Optical Manager Tool Integration**:
  - **3-Way Dispatch Routing (`utils/whatsapp-parser.ts` -> `sendUniversalWhatsAppMessage`)**: Checks active store configuration (`whatsappDispatchMode`: `desktop_assistant` | `whatsapp_web` | `official_api`) across all UI triggers (`DocumentActionBar`, `QuickEditModal`, order status transitions, dues settlements, and payment updates).
  - **Optical Manager Desktop Assistant (`desktop_assistant`)**: 1-click background dispatch engine. Enqueues messages to `whatsapp_dispatch_queue` via `dispatchWhatsAppMessageAction`, which the local counter Electron/Baileys assistant picks up in real-time over Supabase WebSocket + 8s polling and silently dispatches to customer WhatsApp without leaving the POS screen.
  - **Accurate 3-State Connection Health Architecture**: Evaluates heartbeats within a 45-second threshold and confirms active socket authentication (`metadata.isWaConnected`):
    - 🟢 `CONNECTED_READY`: Desktop app running (< 45s heartbeat) AND WhatsApp socket actively authenticated with verified phone number.
    - 🟡 `APP_ONLINE_WA_DISCONNECTED`: Desktop assistant process open, but awaiting mobile WhatsApp QR code scan.
    - ⚪ `OFFLINE`: Desktop app not running or disconnected.
  - **Bi-Directional State Synchronization & Remote Disconnect**: Synchronizes live connection status to both `whatsapp_dispatch_queue` and `whatsapp_configs`. Clicking "Disconnect" on the web app issues an atomic `CMD_DISCONNECT` command via Supabase Realtime, immediately triggering `baileysEngine.logout()` and resetting the assistant to QR scan mode.
  - **Anti-Flapping & Signal Integrity Engine**: Clean socket teardown with WebSocket termination to prevent duplicate session collisions (`440 Connection Replaced`), standardized `Browsers.windows("Desktop")` identity, serialized credential persistence queue (`saveCredsQueue`) preventing file corruption, passive keep-alive (eliminating invasive presence ping conflicts with mobile devices), fault-tolerant `onWhatsApp` checks with normalized JID fallback, and 10s timeout protection on media downloads.
  - **WhatsApp Web Fallback (`whatsapp_web`)**: Direct browser/app launcher with pre-filled variables via `openWhatsAppChat`.
  - **Official Cloud API (`official_api`)**: Enterprise Meta WhatsApp Cloud API gateway integration.
  - **Resilient Document Resolvers**: `getInvoiceById`, `getReceiptById`, and public share routes support both database UUIDs and human-readable identifiers (`INV-1-2026-0001`, `PPS-1-2026-0001`) with strict null-safety for walk-in transactions.

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

## 🛡️ Role-Based Access Control (RBAC) & Module Permission Architecture

Optical Manager implements strict, multi-tiered authorization spanning navigation UI, direct URL navigation, Server Components, and Server Actions.

### 1. Permission Matrix & Granular Modules
User profiles store custom module access within the `permissions` JSONB column:
- `inventory`: Frame catalog, lens stock, inventory adjustments, and SKU management.
- `sales`: Invoice POS creation, orders table, invoice viewing, and payment settlements.
- `customers`: Customer directory, clinical history, prescription cards, and patient onboarding.
- `appointments`: Consultation booking, clinical queue, and appointment schedules.
- `purchases`: Purchase bills, vendor directory, supplier purchase orders.
- `returns`: Customer returns, credit notes, item restocks.
- `reports`: Financial reports, GST tax breakdowns, and cash summaries.
- `analytics`: Multi-period KPI analytics, revenue trajectories, lens category distribution.
- `settings`: Store compliance, invoice headers/footers, banking details, and WhatsApp utility settings.
- `support`: Helpdesk tickets and live customer assistance.

### 2. Centralized Permission Helpers (`utils/permissions.ts`)
- `hasModulePermission(user, moduleKey)`: Automatically grants full access to `OWNER` and `SUPER_ADMIN` roles. For `SHOP_MANAGER` and other staff roles, validates against `user.permissions[moduleKey]`. Sensitive modules (`settings`, `edit_orders`, `delete_orders`) strictly default to `false` unless explicitly granted.
- `canAccessRoute(user, pathname)`: Resolves any shop route path to its respective module key and validates access.

### 3. Server Component Route Guards (`AccessDenied.tsx`)
Every module page under `app/(dashboard)/shop/*` executes a server-side permission check. If unauthorized:
- Renders the high-density, branded `<AccessDenied />` component.
- Displays an active role indicator badge, clear permission notice, and intuitive "Return to Dashboard" / "Go Back" recovery buttons.
- Prevents leaking confidential business data, inventory metrics, or financial revenue reports.

### 4. Server Action Safeguards (`actions/*.actions.ts`)
Mutating Server Actions (e.g. `updateShopProfileAction`, `updateShopSettingsConfigAction`) enforce `hasModulePermission(user, "moduleKey")` on execution, rejecting unauthorized client mutations even if invoked directly.

### 5. Shorthand Route Normalizer (`proxy.ts`)
The proxy middleware intercepts top-level shorthand URLs (such as `/setting`, `/settings`, `/inventory`, `/orders`, `/reports`) and normalizes them to their canonical protected paths (e.g. `/shop/settings` or `/owner/settings`), guaranteeing they pass through server authorization checks.

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
1. **Dual-Role Service Worker (`public/sw.js` - v16 - Fail-Safe Zero-Latency Engine)**:
   - **Static Shell Precaching**: On install, the Service Worker strictly precaches only immutable static shell assets (`/`, `/manifest.webmanifest`, app icons, SVG logo). Heavy SSR routes are never precached on install, completely preventing 35+ concurrent server compilation storms, CPU lockup, and database connection pool starvation on server startup.
   - **Dynamic Runtime Caching & Fail-Safe Navigation Passthrough**: When online, page navigations and RSC requests pass through directly to the live server for all HTTP status codes (200, 301, 302, 304, 307, 308, 401, 404), ensuring auth redirects (`proxy.ts`) and headers function unimpeded. Caching is guarded with `.catch()` to prevent `TypeError: Redirected response cannot be stored`, and all `event.respondWith` execution is protected by top-level fallback handlers that guarantee the fetch promise NEVER rejects (completely preventing `ERR_FAILED` crashes).
   - **Offline Navigation & Zero-Crash RSC Handling**: Serves precached desktop shell when disconnected. When Next.js App Router client navigation requests dynamic React Server Component (`RSC: 1` / `?_rsc=...`) chunks while offline:
     - First attempts direct match and match with `ignoreSearch: true` to match cached flight streams regardless of build hashes.
     - If uncached in offline mode, returns a clean `503 Service Unavailable (Offline)` response instead of a `307` redirect with Location, preventing the client router from dumping raw RSC flight JSON payloads (`0:{"f":...}`) on a blank screen.
     - Navigating to un-cached subroutes falls back cleanly to their respective section listings rather than hijacking the user to `/shop/dashboard`.
     - Offline HTML fallback explicitly provides `charset=utf-8` header to guarantee correct unicode symbol rendering (`⚡`).
   - **Cache Busting**: Versioned registration (`/sw.js?v=20260914_v16`) with automatic older cache bucket purging (`optical-manager-cache-v1` through `v15`) ensures instant client upgrades without stale worker persistence.

2. **Resilient Server Component & Session Timeouts (`services/*`, `app/(dashboard)/*`)**:
   - All shop and owner dashboard pages wrap database queries in a `Promise.race` with generous 8,000ms timeout guards.
   - `services/auth.service.ts` uses 8,000ms timeout guards for Supabase `getUser()` and profile lookups, ensuring session profiles and active shop context (`shopId`) are never prematurely stripped after inactivity or cold starts.
   - Zod validators (`utils/validators.ts`) and server actions (`actions/patient.actions.ts`, `actions/inventory.actions.ts`, `app/api/sync/offline-invoices/route.ts`) accept nullable DB columns and sanitize client non-UUID IDs (`pat_off_...`, `off-inv-...`, `""`), ensuring zero validation crashes.

3. **Development-Safe Sequential Route Warming (`lib/offline/cache-warmer.ts`)**:
   - In development mode (`NODE_ENV === "development"`), background route pre-fetching is completely bypassed to prevent Turbopack from triggering simultaneous on-demand route compilations.
   - In production environments, routes are warmed sequentially with an 800ms idle delay between requests, ensuring zero strain on server memory and Neon Postgres connection pools.

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

---

## 9. 📄 Responsive A4 Document Rendering & PDF Generation (`/share/invoice/[id]`)

Optical Manager renders official tax invoices and receipts as authentic A4 physical documents (`210mm x 297mm`) accessible directly across both desktop and mobile viewports with zero layout shifts or separate simplified mobile views.

### Architectural Highlights:
1. **Direct Authentic A4 Rendering (`components/shop/InvoiceDocument.tsx`)**:
   - Renders the exact legal GST Tax Invoice layout conforming to Indian GST specifications (Tax Summary table by category, SAC/HSN codes, buyer/seller details, lens prescriptions).
   - Eliminates redundant card-based mobile summaries in favor of the actual legal document.

2. **Touch-Responsive Pinch-to-Zoom & Pan Viewer (`components/shop/SharedInvoiceViewer.tsx`)**:
   - **Auto-Fit Viewport Scaling**: On mount and window resize, calculates screen width relative to A4 (794px). On mobile devices, automatically scales the document (e.g. 0.46x on ~390px screens) so the full A4 sheet fits horizontally with comfortable padding.
   - **Multi-Touch Gestures**: Listens to 2-finger touch events (`touchstart`, `touchmove`, `touchend`) to calculate real-time hypotenuse distances, enabling fluid pinch-to-zoom (0.35x to 2.5x).
   - **Double-Tap Quick Toggle**: Double tapping seamlessly toggles between fit-to-screen and 100% full scale.
   - **Interactive Quick Zoom Toolbar**: Floating sticky controls for Zoom In (`+`), Zoom Out (`-`), Zoom percentage pill, `Fit`, and `100%`.
   - **Dynamic Sizer Geometry**: Parent container measures unscaled document dimensions via `ResizeObserver` and adjusts parent bounds dynamically (`width: contentWidth * scale`, `height: contentHeight * scale`), eliminating phantom vertical scrolling or clipping.

3. **High-Resolution PDF Download & Print**:
   - **Client-Side High-Res Export**: Uses `html2pdf.js` with `html2canvas` 2x scale and jsPDF A4 portrait specifications.
   - **Automatic Scale Reset During Export**: Temporarily un-zooms the document during canvas capture to guarantee pristine vector-like 300 DPI resolution, then restores user zoom scale seamlessly.
   - **Standardized Enterprise File Naming**: Generated PDF files are strictly formatted as `[Organization_Or_Store_Name]_[Invoice_Number].pdf` (e.g. `Eye_Care_Opticals_INV-2026-0042.pdf`).
   - **Native Print Integration**: `handlePrint()` updates `document.title` to the standardized filename before calling `window.print()`, so browser "Save as PDF" dialogs also pre-populate the exact standardized file name. In `@media print`, all transforms and zoom controls are bypassed for 100% physical A4 printing.

---

## 10. 📦 Add Purchase Ledger, AI Bill Extraction & Auto-Vendor Onboarding Engine

The **Add Purchase** workflow (`/shop/purchases/new`) integrates Gemini multimodal AI bill parsing with a zero-loss bidirectional purchase calculation engine and automatic vendor master onboarding.

### Architectural Highlights:
1. **Purchase Cost Driven Math Engine (`components/shop/PurchaseAddForm.tsx`)**:
   - Treats supplier billed rates as net **Purchase Cost** (`purchasePrice`) per unit.
   - Automatically back-calculates **Base Price** ($\text{unitPrice} = \frac{\text{purchasePrice}}{1 + \text{gstPercent}/100}$) and exact CGST/SGST/IGST tax splits, ensuring zero fractional round-off error between line totals and sum of base + taxes.
   - Bidirectional recalculation vectors:
     - User edits **Total Purchase Cost** (Column 10): $\text{purchasePrice} = \frac{\text{Total Cost}}{\text{Qty}} \to \text{unitPrice} \to \text{Taxes}$.
     - User edits **Purchase Cost** (Column 8): $\text{unitPrice} \to \text{Total Cost}$.
     - User edits **Base Price** (Column 5): $\text{purchasePrice} \to \text{Total Cost}$.
     - User switches Category / HSN: Keeps `purchasePrice` constant and recalculates `unitPrice` with new statutory GST rate.
2. **AI Bill Extraction & Fallback Rules (`actions/bill-scan.actions.ts`)**:
   - Injects store's live Category Master (`productCategories`) into Gemini prompts with statutory HSN codes and GST rates.
   - **Product Code Fallback**: If an uploaded bill lacks an explicit "Product Code" column, extracts structured codes from "Description of Goods" (e.g. `SI-20050,50-15-135,F900`) and preserves the full string to avoid variant collisions.
   - **HSN Auto-Detection**: Matches 4/6/8-digit HSN codes against store categories (e.g., `9003` $\to$ Frames, `900410` $\to$ Sunglasses, `9001` $\to$ Lenses, `3307` $\to$ Solutions).
   - **Retail Price Isolation**: Strictly keeps retail price blank (0), preventing supplier bills from polluting retail selling prices.
3. **Automated Vendor Master Onboarding (`actions/purchase.actions.ts`)**:
   - In both `createPurchaseAction` and `savePurchaseDraftAction`, vendor names are checked against `vendors`.
   - If a vendor does not yet exist in the organization, it is automatically created with `shopId`, `organizationId`, name, GSTIN, and active status, linking the purchase order seamlessly without manual master entry.


