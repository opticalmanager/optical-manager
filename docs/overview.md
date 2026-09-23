# Optical Manager — System Overview

**Optical Manager** is a state-of-the-art, enterprise-grade multi-tenant B2B SaaS platform engineered specifically for optical retail chains, optometry practices, spectacle dispensaries, and eyewear networks. It unifies store management, specialized optical inventory tracking, point-of-sale (POS) billing, eye prescription records, patient appointment scheduling, and granular dual-period financial analytics into a zero-latency, high-density dashboard experience.

---

## 🌟 Core Business Capabilities

### 1. Super Admin Platform Control Panel & Lead CRM (`admin.opticalmanager.in`)
- **Restricted Admin Authentication**: Dedicated dark glassmorphic login (`/admin/login`) with zero public signup option and standalone full-screen layout.
- **CLI Account Seeding (Method 1)**: Super Admin accounts are seeded securely via command line (`scripts/seed-super-admin.ts`) using Supabase Service Role APIs.
- **SaaS Platform Telemetry**: 4 core SaaS telemetry metrics (Platform B2B Revenue, Active Outlets, Subscription Health, Approved Lead Conversions). Patient clinical counts are strictly isolated from platform admins.
- **Tenant Store Detail View (`/admin/organizations/[id]`)**: Deep-dive administrative page showing tenant profile, subscription LTV, physical branch outlets directory, assigned managers, and subscription extension/suspension controls.
- **Verified Demo Requests CRM (`/admin/leads`)**: Captures landing page store access requests, featuring 1-click WhatsApp messaging (`wa.me/+91...`) and status tracking (`PENDING` ➔ `CONTACTED` ➔ `DEMO_SCHEDULED` ➔ `APPROVED`).
- **Subscription Extensions & Store Pause**: Super Admins can add +1, +3, +6, or +12 months to any tenant's subscription and toggle instant store access suspension (`SUSPENDED`).

### 2. Multi-Tenant & Multi-Branch Hierarchy
- **Organization Management**: System Owners can manage multi-branch optical retail networks under a single clinical organization profile (`organizationId`).
- **Strict Shop Isolation**: Store managers and optical technicians are scoped to specific physical store branches (`shopId`), ensuring complete tenant data isolation without cross-shop leakage.
- **Role-Based Access Control (RBAC)**: Enforces role-based permissions (`SUPER_ADMIN`, `OWNER`, `SHOP_MANAGER`).

### 3. Specialized Optical Inventory Taxonomy, Barcode Designer & Lens Power Matrix
- **Category-Specific Taxonomies & Dynamic Categories**: Built-in support for default categories (`FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SOLUTION`) and unlimited custom merchant-defined categories.
- **Dynamic Category & GST Rates Master Matrix**: Organizations can configure custom product categories (e.g. Sunglasses, Reading Glasses, Solutions) alongside defaults, customize HSN codes and GST percentages (`CGST`, `SGST`, `IGST`) with smart 50/50 split calculation in Settings (`/shop/settings`, `/owner/settings`), and auto-fill these tax rates during product ingestion (`/shop/inventory/add`) and filtering (`/shop/inventory`).
- **Optical Metadata Tracking**: Supports frame dimensions (`52-18-140`), lens refractive indices (1.56, 1.61, 1.67, 1.74), HSN codes (`9004` frames, `9001` optical lenses), batch numbers, and expiry dates.
- **Interactive Lens Power SPH/CYL Stock Matrix**: High-density optical power chart with `(-) Minus Power Sphere Chart` and `(+) Plus Power Sphere Chart` toggle modes, standard/extended power ranges (0.00 to ±6.00 SPH, 0.00 to -3.00 CYL in 0.25 steps), per-cell unit count inputs with active cell highlighting, and real-time total stock quantity aggregation.
- **Interactive Multi-Format Barcode Designer**: Client-side zero-latency Code 39 barcode engine supporting 4 production paper/label size presets:
  - `100×15 mm (Tag)`: Specialized optical butterfly/barbell tag with left wing (Brand, Model, Price), center fold-around bridge, and right wing (Barcode SVG, SKU).
  - `50×25 mm (Standard)`: Standard 2"×1" retail box and spectacle case label.
  - `38×25 mm (Compact Jewel)`: Compact 1.5"×1" contact lens blister pack and small tag.
  - `40×30 mm (Medium Box)`: Medium 40×30mm optical accessory box label.
- **Cross-Printer Output**: Supports both single continuous thermal roll printers and multi-grid A4/A5 sheet printing with zero layout reflows.

### 4. POS Billing, Eye Prescriptions & Dues Management
- **Single-Screen High-Density POS Billing (`/shop/invoices/new`)**: Ultra-compact SaaS interface engineered for laptop viewport fit without vertical fatigue. Features a minimal inline header, compact `h-8` form controls, real-time customer search with 0ms local hydration, and streamlined bottom action placement (`[ Save Draft ]` and `[ Create Invoice ]` / `[ Generate Receipt ]`).
- **Interactive Expected Delivery Management**: Clean delivery scheduling without arbitrary default dates. Provides a native calendar date picker with instant days calculation (`X Days (DD MMM YYYY)`), quick preset pills (`0D Today`, `3D`, `7D`, `✕ Clear`), and seamless backdated/future invoice alignment.
- **GST Billing Engine**: Automated CGST/SGST/IGST tax calculation (12% for spectacles/lenses, 18% for solutions), HSN code mapping, dual discounts (% & ₹), and salesperson attribution ("Sold By").
- **Clinical Eye Prescriptions & Smart Industrial Refraction**: Pixel-perfect clinical prescription card format featuring 8-column high-density layout (`EYE / TYPE`, `SPHL. (SPH)`, `CYL. (CYL)`, `AXIS (°)`, `ADDN. (ADD)`, `VISION (V/N)`, `P.D. (MM)`, `CADD`), category tabs (`Spect(s) Rx`, `CL Rx`, `Distance`, `Near`), auto-generated Rx numbering (`Rx #PR-XXXX`), highlighted ADD diopter columns, smart optometry datalists (0.25D steps, Snellen V/N, Monocular PD 25-40mm), bilateral ADD auto-sync, monocular PD auto-split, doctor attribution, and automated zero-latency syncing upon invoice/patient creation.
- **Public Shareable Invoices**: Generates secure public digital invoice view links (`/share/invoice/[id]`) with printable PDF support.
- **Sales Returns & Store Credit Management**: Flexible merchandise returns supporting Cash Refunds (with real-time revenue deduction) and Store Credit issuance (added to customer profile and tracked in immutable credit ledgers), official printable Return Receipts / Credit Notes, and seamless store credit redemption on new invoices.

### 5. Purchases & Inward Supply Architecture
- **Inward Supply Navigation**: Positioned directly below "Sales" in the store manager left sidebar, featuring hover-triggered sub-menus for "Purchases Add" (`/shop/purchases/new`) and "Vendors" (`/shop/purchases/vendors`).
- **Collapsible Floating Flyout**: When the sidebar is collapsed, hovering over the Purchases icon dynamically triggers a floating flyout menu displaying the module header and action links with zero latency.
- **Granular RBAC Module Permission**: Backed by the `purchases` permission key in `ModulePermissions` and configurable within Owner Outlet Access Roles (`OutletConfigurePanel.tsx`).

### 6. PWA Offline-First Operating Architecture & Local Databank Synchronization
- **Zero-Downtime Offline POS & Dashboard Access**: If internet connectivity is lost, store managers, optometrists, and system owners can continue creating new bills, registering new patients, updating patient details, creating prescriptions, adding stock, adjusting inventory, booking appointments, changing appointment statuses, updating order delivery details, recording partial payments, settling dues, processing returns, looking up patient records, inspecting multi-branch inventory, reviewing returns, configuring outlet settings, and downloading/printing invoices with zero latency.
- **Offline Session Preservation ("Remembered Login") & Resilient API Auth**: Client credentials, user profile, and active shop context are safely retained via `opt_session_profile` cookies, IndexedDB metadata, and localStorage. All offline and sync API endpoints (`/api/offline/sync-all`, `/api/offline/customers`, `/api/offline/inventory`, `/api/search`, `/api/sync/offline-invoices`, `/api/sync/offline-mutations`) utilize `getCurrentUser()` from `services/auth.service`, eliminating 401 Unauthorized errors caused by expired Supabase token handshakes and supporting both `OWNER` and `SHOP_MANAGER` roles.
- **Owner & Manager Dual Precache Circuit Breaker (SW v16 - Fail-Safe Zero-Latency Engine)**: Service worker runs an origin-isolated network passthrough for page navigations and RSC flight streams, prioritizing live online responses for any HTTP status code (200, 301, 302, 304, 307, 308, 401, 404) and ensuring proxy/auth redirects seamlessly reach the browser. Pre-caches static shell assets (`/`, manifest, icons, logo) on install into `optical-manager-cache-v16` without heavy SSR routes, eliminating concurrent server compilation storms on startup while caching visited pages dynamically at runtime with `.catch()` guards against redirected cache storage errors (eliminating `ERR_FAILED` crashes). All `event.respondWith` promises are safeguarded with top-level error boundaries that never reject. Uncached dynamic RSC flight requests (`headers.get("RSC") === "1"` or `_rsc`) return clean `503` status responses instead of `307` Location redirects, completely preventing raw RSC flight JSON payloads from displaying on blank screens. The offline HTML fallback strictly includes `charset=utf-8` to ensure correct rendering of icons and symbols (`⚡`).
- **Resilient Server Component & Session Timeouts**: Database and profile queries across all Shop and Owner server routes and `auth.service.ts` execute with generous 8,000ms timeout guards, ensuring server rendering and session profile retrieval reliably succeed even after prolonged browser inactivity or Neon serverless connection cold starts. Zod schemas and PostgreSQL UUID handlers permit non-UUID client IDs (`pat_off_...`, `off-inv-...`) and nullable empty fields, eliminating generic "Validation failed" errors.
- **Client-Side Multi-Tenant IndexedDB Databank (Dexie.js v5) & Instant 0ms Patient & Product Hydration**: Local browser database mirroring customer profiles, clinical medical history, active stock records, appointment schedules, order records, invoices, returns, store profile metadata, WhatsApp notification templates, and organization branches. Customer selection in `NewInvoiceForm` hydrates patient data into all input fields in 0ms from local memory/IndexedDB, executing past prescription lookups in a non-blocking background task. Product search in the items ledger instantly queries local IndexedDB in 0ms on first keystroke, asynchronously enriching suggestions with fresh cloud items when online. Supports billing custom non-inventory items and services without inventory records.
- **Accurate Online/Offline State Verification & WAN Reachability**: Active lightweight HEAD probe against `/api/offline/ping?db=1` on `online` and `focus` events strictly verifies WAN internet and cloud database reachability, eliminating false-positive "Online" indicators when connected to routers or local dev environments without external connectivity. Features a 4,000ms pooler timeout and a graceful 1,000ms initial retry on mount to eliminate transient false-offline flashes when the server or routes are cold.
- **Unified Local Invoice & Order Storage**: Enqueuing offline invoices atomically records the transaction across `offline_invoices_queue`, `cached_invoices`, `cached_orders`, `cached_inventory` (stock decrement), and `cached_customers` (store credit deduction and local patient registration), ensuring instant visibility in order tables, KPI counters, and overview widgets with zero latency.
- **Offline Order Updates, Returns & Stock Management**: Delivery date rescheduling, order status transitions, partial payments, dues settlements, inventory updates, stock quick adjustments, and returns are saved immediately to local IndexedDB (`cached_orders`, `cached_invoices`, `cached_inventory`, `cached_returns`) and automatically reconciled to cloud via `/api/sync/offline-mutations` once connected.
- **Local Stock Decrementing & Adjustments**: Immediate local deduction of stock for billed line items and real-time local updates for restocked inventory to prevent offline overselling across consecutive transactions.
- **Offline Invoices Viewing & PDF Printing**: View, retrieve, and print/download any invoice directly from local device memory (`offlineDB.cached_invoices` or `offline_invoices_queue`) with zero server connectivity.
- **Offline WhatsApp Templates**: Notification templates are cached locally in IndexedDB with standardized optical fallbacks, eliminating "can't get template data" errors.
- **Clean Printable Offline Bills**: Offline bills print officially with the physical shop's name, address, telephone, and GSTIN number with zero offline watermarks.
- **Background Cloud Synchronization (Dual-Role Unblocked)**: Automatic sync worker and online event triggers push queued offline mutations (`PATIENT_CREATE`, `PATIENT_UPDATE`, `APPOINTMENT_CREATE`, `APPOINTMENT_STATUS`, `ORDER_STATUS_UPDATE`, `ORDER_PAYMENT_RECORD`, `ORDER_SETTLE_DUES`, `INVENTORY_CREATE`, `INVENTORY_UPDATE`, `STOCK_ADJUST`, `PRESCRIPTION_CREATE`, `RETURN_CREATE`) and queued offline invoices (`OFF-2026-XXXX`) with idempotency for both `SHOP_MANAGER` and `OWNER` sessions, assigning official sequential invoice numbers and reconciling server inventory without permission errors.
- **Desktop Operating System PWA Terminal**: Standard Web App Manifest (`manifest.ts`) and Service Worker (`sw.js`) configured for standalone desktop terminal mode with window controls overlay, wide desktop screenshots, and automatic shell caching.
- **Optical Manager Desktop WhatsApp Assistant (1-Click Utility Messaging)**: Standalone Electron & Baileys desktop tool distributing native `.exe` installers via `/downloads/Optical-Manager-WhatsApp-Assistant-Setup.exe`. Pairs deterministically with individual store counters (`OM_WA_...`), listening via Realtime Supabase WebSockets and 8s fallback polling to `whatsapp_dispatch_queue`. Enables 1-click silent background dispatching of invoices, payment receipts, order pickup alerts, and delivery delay notifications directly from the store counter's paired WhatsApp account without leaving the POS interface.

---

## 👤 User Persona & Access Matrix

| Feature Module | Super Admin (`SUPER_ADMIN`) | System Owner (`OWNER`) | Store Manager (`SHOP_MANAGER`) | Public Patient |
| :--- | :---: | :---: | :---: | :---: |
| Super Admin Control Panel (`/admin/*`) | ✅ | ❌ | ❌ | ❌ |
| Tenant Store Detail Page (`/admin/organizations/[id]`) | ✅ | ❌ | ❌ | ❌ |
| Manage Tenant Subscriptions & Pause | ✅ | ❌ | ❌ | ❌ |
| Lead CRM & WhatsApp Demo Calls | ✅ | ❌ | ❌ | ❌ |
| Multi-Shop Organization Admin | ❌ | ✅ | ❌ | ❌ |
| Shop POS Billing & Invoicing | ❌ | ✅ | ✅ | ❌ |
| Purchases & Inward Supply Bills | ❌ | ✅ | ✅ | ❌ |
| Eye Prescription Records | ❌ | ✅ | ✅ | ❌ |
| Public Online Appointment Booking | ❌ | ❌ | ❌ | ✅ |

---

## 5. Purchases & Inward Supply System Architecture

Optical Manager includes a complete, high-density Inward Supply & Purchases module (`/shop/purchases`) with:
- **Dedicated Vendor Directory (`vendors` table)**: Structured vendor management tracking GSTIN compliance, company address, and contact points.
- **Inward Purchase Orders (`purchase_orders` & `purchase_order_items` tables)**: Full tracking of vendor bills, tax rules (`EXCLUDE`/`INCLUDE`), tax types (`SGST/CGST` vs `IGST`), line-level unit pricing, base amounts, HSN codes, and GST rates.
- **Vendor-Scoped Product Autocomplete & Ingestion**: Product code search autocomplete queries existing inventory with prioritization/scoping per selected vendor. Codes are unique per vendor rather than globally.
- **Spacious Category-Rich Product Details Modal**: Unknown or edited codes open a `max-w-4xl` modal with dynamic category switcher tabs (`Frames`, `Lenses`, `Contact Lenses`, `Accessories`, `Solutions`), full category-specific spec panels (shapes, dimensions, lens design, index, coatings, contact lens BC/DIA, solution volumes, expiry tracking), and auto-filled HSN/GST rates from `product_categories`.
- **Atomic Stock Increments & Ledger Auditing**: Completing a purchase order atomically increments inventory stock count (`+qty`), updates recent cost and retail prices, links vendor invoice references, and logs `STOCK_IN` movements in `stock_movements`.

---

## 6. Shop Dashboard Intelligence & Real-Time Operational Activity Feed (`/shop/dashboard`)

Optical Manager's store dashboard combines zero-latency operational metrics with a unified cross-table activity stream:
- **Exact Operational KPIs**: Replaced static/estimated metrics with exact live database queries:
  - *Pending Orders*: Invoices not marked `DELIVERED` and not `CANCELLED`.
  - *Ready for Pickup*: Orders in `READY` or `PROCESSING` status awaiting patient collection.
  - *Delayed Deliveries*: Non-delivered, non-cancelled orders with an estimated delivery date in the past.
  - *Today's Appointments*: Scheduled patient checkups and eye tests within the current day (00:00:00 to 23:59:59).
  - *Low Stock & Pending Payments*: Real-time inventory alerts and outstanding customer receivable balances.
- **Zero-Latency Interactive KPI Table Filtering**: Clicking any operational KPI card instantly (0ms) updates the table below with the corresponding scoped dataset (`pendingOrders`, `pickupOrders`, `delayedOrders`, `todayAppointments`) with active selection borders (`border-2 border-[#2563eb] shadow-md scale-[1.01]`).
- **Unified Recent Activity Feed**:
  - Live aggregated audit feed consolidating 6 mission-critical operational tables:
    1. **Invoices**: Creations, payments, and cancellations with direct links to `/shop/orders`.
    2. **Purchases**: Inward vendor purchases and stock receipts with direct links to `/shop/purchases`.
    3. **Sales Returns**: Customer returns and refunds with direct links to `/shop/returns`.
    4. **Stock Movements**: Inward stock, sales deductions, adjustments, and damaged items with direct links to `/shop/inventory`.
    5. **Appointments**: Patient eye test bookings and status transitions with direct links to `/shop/appointments`.
    6. **WhatsApp Notifications**: Outgoing customer dispatches (invoices, pickup alerts, delay updates) with status tags.
  - **Type-Specific Filter Pills**: Quick toggle filters (`All Activities`, `Invoices`, `Purchases`, `Returns`, `Stock`, `Appointments`, `WhatsApp`) with category badge counts.
  - **Full Offline Resilience**: Dashboard seamlessly falls back to client-side IndexedDB caching (`cached_orders`, `cached_invoices`, `cached_inventory`, `cached_appointments`) when disconnected from the cloud.

