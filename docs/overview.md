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
- **Category-Specific Taxonomies**: Built-in support for 5 distinct optical product categories: `FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SOLUTION`.
- **Optical Metadata Tracking**: Supports frame dimensions (`52-18-140`), lens refractive indices (1.56, 1.61, 1.67, 1.74), HSN codes (`9004` frames, `9001` optical lenses), batch numbers, and expiry dates.
- **Interactive Lens Power SPH/CYL Stock Matrix**: High-density optical power chart with `(-) Minus Power Sphere Chart` and `(+) Plus Power Sphere Chart` toggle modes, standard/extended power ranges (0.00 to ±6.00 SPH, 0.00 to -3.00 CYL in 0.25 steps), per-cell unit count inputs with active cell highlighting, and real-time total stock quantity aggregation.
- **Interactive Multi-Format Barcode Designer**: Client-side zero-latency Code 39 barcode engine supporting 4 production paper/label size presets:
  - `100×15 mm (Tag)`: Specialized optical butterfly/barbell tag with left wing (Brand, Model, Price), center fold-around bridge, and right wing (Barcode SVG, SKU).
  - `50×25 mm (Standard)`: Standard 2"×1" retail box and spectacle case label.
  - `38×25 mm (Compact Jewel)`: Compact 1.5"×1" contact lens blister pack and small tag.
  - `40×30 mm (Medium Box)`: Medium 40×30mm optical accessory box label.
- **Cross-Printer Output**: Supports both single continuous thermal roll printers and multi-grid A4/A5 sheet printing with zero layout reflows.

### 4. POS Billing, Eye Prescriptions & Dues Management
- **GST Billing Engine**: Automated CGST/SGST/IGST tax calculation (12% for spectacles/lenses, 18% for solutions), HSN code mapping, dual discounts (% & ₹), and salesperson attribution ("Sold By").
- **Patient Eye Prescriptions**: Integrated SPH, CYL, Axis, and ADD prescription entry for Right Eye (OD) and Left Eye (OS) along with Pupillary Distance (PD).
- **Public Shareable Invoices**: Generates secure public digital invoice view links (`/share/invoice/[id]`) with printable PDF support.
- **Sales Returns & Store Credit Management**: Flexible merchandise returns supporting Cash Refunds (with real-time revenue deduction) and Store Credit issuance (added to customer profile and tracked in immutable credit ledgers), official printable Return Receipts / Credit Notes, and seamless store credit redemption on new invoices.

### 5. PWA Offline-First Operating Architecture & Local Databank Synchronization
- **Zero-Downtime Offline POS & Dashboard Access**: If internet connectivity is lost, store managers, optometrists, and system owners can continue creating new bills, registering new patients, updating patient details, creating prescriptions, adding stock, adjusting inventory, booking appointments, changing appointment statuses, updating order delivery details, recording partial payments, settling dues, processing returns, looking up patient records, inspecting multi-branch inventory, reviewing returns, configuring outlet settings, and downloading/printing invoices with zero latency.
- **Offline Session Preservation ("Remembered Login") & Resilient API Auth**: Client credentials, user profile, and active shop context are safely retained via `opt_session_profile` cookies, IndexedDB metadata, and localStorage. All offline and sync API endpoints (`/api/offline/sync-all`, `/api/offline/customers`, `/api/offline/inventory`, `/api/search`, `/api/sync/offline-invoices`, `/api/sync/offline-mutations`) utilize `getCurrentUser()` from `services/auth.service`, eliminating 401 Unauthorized errors caused by expired Supabase token handshakes and supporting both `OWNER` and `SHOP_MANAGER` roles.
- **Owner & Manager Dual Precache Circuit Breaker (SW v13)**: Service worker runs an origin-isolated network timeout race for page navigations and RSC flight streams, serving cached application shells in 0ms if the network drops or stalls. Dynamically precaches both core shop routes (`/shop/*`) and owner routes into `optical-manager-cache-v13` using `Promise.allSettled`, guaranteeing that individual route redirects never crash precaching. Uncached dynamic RSC requests (`_rsc`) emit safe `307` redirects via `x-nextjs-redirect` rather than `504` errors, guaranteeing zero router lockups, while module navigation routes safely fall back to section hubs rather than hijacking to dashboard.
- **Fast-Fail Server Component Timeouts & Concurrent Queries**: Database queries across both Shop and Owner server routes execute concurrently with 500ms - 1,000ms timeout guards and try/catch fallback datasets, ensuring server rendering never hangs or throws uncaught `ENOTFOUND` exceptions during connection outages.
- **Client-Side Multi-Tenant IndexedDB Databank (Dexie.js v5) & Instant 0ms Patient Hydration**: Local browser database mirroring customer profiles, clinical medical history, active stock records, appointment schedules, order records, invoices, returns, store profile metadata, WhatsApp notification templates, and organization branches. Customer selection in `NewInvoiceForm` hydrates patient data into all input fields in 0ms from local memory/IndexedDB, executing past prescription lookups in a non-blocking background task.
- **Accurate Online/Offline State Verification & WAN Reachability**: Active lightweight HEAD probe against `/api/offline/ping?db=1` on `online` and `focus` events strictly verifies WAN internet and cloud database reachability, eliminating false-positive "Online" indicators when connected to routers or local dev environments without external connectivity. Features a 4,000ms pooler timeout and a graceful 1,000ms initial retry on mount to eliminate transient false-offline flashes when the server or routes are cold.
- **Unified Local Invoice & Order Storage**: Enqueuing offline invoices atomically records the transaction across `offline_invoices_queue`, `cached_invoices`, `cached_orders`, `cached_inventory` (stock decrement), and `cached_customers` (store credit deduction and local patient registration), ensuring instant visibility in order tables, KPI counters, and overview widgets with zero latency.
- **Offline Order Updates, Returns & Stock Management**: Delivery date rescheduling, order status transitions, partial payments, dues settlements, inventory updates, stock quick adjustments, and returns are saved immediately to local IndexedDB (`cached_orders`, `cached_invoices`, `cached_inventory`, `cached_returns`) and automatically reconciled to cloud via `/api/sync/offline-mutations` once connected.
- **Local Stock Decrementing & Adjustments**: Immediate local deduction of stock for billed line items and real-time local updates for restocked inventory to prevent offline overselling across consecutive transactions.
- **Offline Invoices Viewing & PDF Printing**: View, retrieve, and print/download any invoice directly from local device memory (`offlineDB.cached_invoices` or `offline_invoices_queue`) with zero server connectivity.
- **Offline WhatsApp Templates**: Notification templates are cached locally in IndexedDB with standardized optical fallbacks, eliminating "can't get template data" errors.
- **Clean Printable Offline Bills**: Offline bills print officially with the physical shop's name, address, telephone, and GSTIN number with zero offline watermarks.
- **Background Cloud Synchronization (Dual-Role Unblocked)**: Automatic sync worker and online event triggers push queued offline mutations (`PATIENT_CREATE`, `PATIENT_UPDATE`, `APPOINTMENT_CREATE`, `APPOINTMENT_STATUS`, `ORDER_STATUS_UPDATE`, `ORDER_PAYMENT_RECORD`, `ORDER_SETTLE_DUES`, `INVENTORY_CREATE`, `INVENTORY_UPDATE`, `STOCK_ADJUST`, `PRESCRIPTION_CREATE`, `RETURN_CREATE`) and queued offline invoices (`OFF-2026-XXXX`) with idempotency for both `SHOP_MANAGER` and `OWNER` sessions, assigning official sequential invoice numbers and reconciling server inventory without permission errors.
- **Desktop Operating System PWA Terminal**: Standard Web App Manifest (`manifest.ts`) and Service Worker (`sw.js`) configured for standalone desktop terminal mode with window controls overlay, wide desktop screenshots, and automatic shell caching.

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
| Eye Prescription Records | ❌ | ✅ | ✅ | ❌ |
| Public Online Appointment Booking | ❌ | ❌ | ❌ | ✅ |
