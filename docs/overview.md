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
- **Interactive Top-Right "+ Add Item" 3-Option Dropdown**: Store Inventory header features a hover/click dropdown with 3 dedicated ingestion pathways:
  - `Add Single`: Direct navigation to single-product ingestion (`/shop/inventory/add`).
  - `Add Bulk Purchase`: Direct navigation to standard manual vendor purchase bill entry (`/shop/purchases/new`).
  - `Add Bulk (CSV)`: Direct navigation to the 4-step CSV Bulk Purchase Inward wizard (`/shop/inventory/import`).
- **Optical Metadata Tracking**: Supports frame dimensions (`52-18-140`), lens refractive indices (1.56, 1.61, 1.67, 1.74), HSN codes (`9004` frames, `9001` optical lenses), batch numbers, and expiry dates.
- **Interactive Lens Power SPH/CYL Stock Matrix**: High-density optical power chart with `(-) Minus Power Sphere Chart` and `(+) Plus Power Sphere Chart` toggle modes, standard/extended power ranges (0.00 to ±6.00 SPH, 0.00 to -3.00 CYL in 0.25 steps), per-cell unit count inputs with active cell highlighting, and real-time total stock quantity aggregation.
- **Interactive Multi-Format Barcode Designer**: Client-side zero-latency Code 39 barcode engine supporting 4 production paper/label size presets:
  - `100×15 mm (Tag)`: Specialized optical butterfly/barbell tag with left wing (Brand, Model, Price), center fold-around bridge, and right wing (Barcode SVG, SKU).
  - `50×25 mm (Standard)`: Standard 2"×1" retail box and spectacle case label.
  - `38×25 mm (Compact Jewel)`: Compact 1.5"×1" contact lens blister pack and small tag.
  - `40×30 mm (Medium Box)`: Medium 40×30mm optical accessory box label.
- **Cross-Printer Output**: Supports both single continuous thermal roll printers and multi-grid A4/A5 sheet printing with zero layout reflows.

### 4. POS Billing, Eye Prescriptions & Dues Management
- **Single-Screen High-Density POS Billing (`/shop/invoices/new`)**: Ultra-compact SaaS interface engineered for laptop viewport fit without vertical fatigue. Features a minimal inline header, compact `h-8` form controls, real-time customer search with 0ms local hydration, and streamlined bottom action placement (`[ Save Draft ]` and `[ Book Order ]`).
- **Standardized Order Booking & Order Form Workflow**: Clicking `Book Order` always generates an official optical **Order Form** (`/shop/receipts/[id]`) that embeds the patient's optical prescription (Distance & Near SPH, CYL, AXIS, ADD, PD, Doctor, Lens Type) and routes immediately to the Order Form view with top action buttons (Print Order Form, Back to Orders, Send on WhatsApp). In partial payment scenarios, the order remains pending dues and unlocks the final Tax Invoice upon full settlement; in full payment scenarios, both the Order Form and final Tax Invoice are generated simultaneously, with dual document access cleanly maintained in the Orders Table (`/shop/orders`).
- **Orders Table Direct Action Toolbar & Low-Stress Industrial UI**: The Orders Table (`/shop/orders`) features silky hairline dividers (`divide-y divide-slate-100/80`), subtle headers, and a zero-dropdown direct action toolbar:
  - **Direct Documents Access (`DOCUMENTS`)**: Side-by-side 1-click icon buttons for **Order Form** (blue `Receipt` icon) and **Tax Invoice** (emerald `FileCheck` icon, with dues alert indicator if unpaid), plus a subtle `+N` badge for multi-installment receipts.
  - **Direct Actions (`ACTION`)**: Side-by-side 1-click icon buttons for **WhatsApp** (emerald brand icon) and **Edit** (amber `Pencil` icon).
- **Interactive Multi-Template WhatsApp Dispatcher**: Clicking the WhatsApp icon on any order row presents a high-density popover card offering 5 dedicated optical message dispatches:
  - 📋 *Send Order Form*: Booking confirmation with amounts paid, remaining balance, and digital Order Form link.
  - 🧾 *Send Tax Invoice*: Digital bill PDF link with payment settlement status.
  - 👁️ *Send Eye Prescription*: Clinical optometry refraction details (OD/OS sphere, cylinder, axis, add, vision, PD, doctor).
  - 📦 *Ready for Pickup*: Alerting that spectacles/lenses are ready in-store.
  - 💰 *Payment Reminder*: Highlighted dues notification when `balanceDue > 0` with payment link.
  - *Shop Settings Customizer*: 7 customizable WhatsApp templates (`order_form_sent`, `invoice_sent`, `prescription_sent`, `payment_reminder`, `order_complete`, `delivery_sent`, `delivery_delay`) with optometry variable insertion chips (`{{re_sph}}`, `{{le_sph}}`, `{{pd}}`, `{{doctor_name}}`, `{{order_form_url}}`) and live smartphone preview.
- **GST Billing Engine & Dual Editable Taxes**: Automated CGST/SGST/IGST tax calculation (12% for spectacles/lenses, 18% for solutions), HSN code mapping, dual discounts (% & ₹), bi-directional editable CGST/SGST/IGST (₹ amount and % percentage inputs per item row), and salesperson attribution ("Sold By").
- **Zero-Latency Product Search & Autocomplete**: Instant search querying product name, code, SKU, brand, and model across IndexedDB (0ms) and cloud API with un-clipped suggestion dropdowns and live stock counts.
- **Clinical Eye Prescriptions & Smart Industrial Refraction**: Pixel-perfect clinical prescription card format featuring 8-column high-density layout (`EYE / TYPE`, `SPHL. (SPH)`, `CYL. (CYL)`, `AXIS (°)`, `ADDN. (ADD)`, `VISION (V/N)`, `P.D. (MM)`, `CADD`), category tabs (`Spect(s) Rx`, `CL Rx`, `Distance`, `Near`), auto-generated Rx numbering (`Rx #PR-XXXX`), highlighted ADD diopter columns, smart optometry datalists (0.25D steps, Snellen V/N, Monocular PD 25-40mm), bilateral ADD auto-sync, monocular PD auto-split, doctor attribution, and automated zero-latency syncing upon invoice/patient creation.
- **Public Shareable Invoices**: Generates secure public digital invoice view links (`/share/invoice/[id]`) with printable PDF support.
- **Sales Returns & Store Credit Management**: Flexible merchandise returns supporting Cash Refunds (with real-time revenue deduction) and Store Credit issuance (added to customer profile and tracked in immutable credit ledgers), official printable Return Receipts / Credit Notes, and seamless store credit redemption on new invoices.
- **4-Stage CSV Bulk Invoices Ingestion Wizard (`/shop/invoices/import`)**: Production-grade historical sales onboarding wizard with 0ms client-side customer matching by 10-digit phone, automatic patient profile creation with auto-sequenced registration IDs (`OP-shopNum-YYYY-NNNN`), external legacy bill number preservation (`INV-2023-01`, `BILL-1049`, etc.) or series generation (`generateBatchInvoiceNumbers`), multi-item bill grouping, inline spreadsheet editing, and atomic database commits across `invoices`, `invoiceItems`, `orders`, and `receipts`.
- **Multi-Dashboard Inward Triggers**: Direct access via the high-density action dropdowns on the Customers directory (`/shop/customers` -> `Add Bulk Invoices (CSV)`) and Orders management hub (`/shop/orders` -> `Invoices & Sales` -> `Import Invoices (CSV)`).

### 5. Purchases, Inward Supply & 4-Step Bulk CSV Ingestion Architecture
- **Inward Supply Navigation**: Positioned directly below "Sales" in the store manager left sidebar, featuring hover-triggered sub-menus for "Purchases Add" (`/shop/purchases/new`) and "Vendors" (`/shop/purchases/vendors`).
- **4-Phase Bulk Purchase Inward Wizard (`/shop/inventory/import`)**:
  - *Phase 1 (Upload)*: Drag-and-drop CSV uploader with RFC-4180 parsing and standardized sample template generator (`downloadSamplePurchaseCSV()`).
  - *Phase 2 (Mapping)*: Intelligent auto-mapping of CSV headers to system fields (`productCode`, `productName`, `quantity`, `unitPrice`, `retailPrice`, `category`, `gstPercent`, `hsnCode`, `brand`, `model`, `rackLocation`, `details`) with live first-row preview chips.
  - *Phase 3 (Review & Catalog Verification)*: High-density spreadsheet-like review table with instant 0ms catalog check against existing shop inventory. Identifies existing products (🟢 Refill Stock) vs new products (🟡 New Item). Provides a quick `+ Specs` / `Edit Details` action modal to enter frame dimensions, lens index/coatings, or contact lens modalities before inwarding. Live totals calculation for taxable base, GST, and net purchase valuation.
  - *Phase 4 (Ingestion & Confirmation)*: Atomic database transaction executing stock refills, new product creation, stock movements (`STOCK_IN`), and official purchase order recording (`purchase_orders` + `purchase_order_items`) with direct navigation links.
- **Collapsible Floating Flyout**: When the sidebar is collapsed, hovering over the Purchases icon dynamically triggers a floating flyout menu displaying the module header and action links with zero latency.
- **Granular RBAC Module Permission**: Backed by the `purchases` permission key in `ModulePermissions` and configurable within Owner Outlet Access Roles (`OutletConfigurePanel.tsx`).

### 6. PWA Offline-First Operating Architecture & Local Databank Synchronization
- **Zero-Downtime Offline POS & Dashboard Access**: If internet connectivity is lost, store managers, optometrists, and system owners can continue creating new bills, registering new patients, updating patient details, creating prescriptions, adding stock, adjusting inventory, booking appointments, changing appointment statuses, updating order delivery details, recording partial payments, settling dues, processing returns, looking up patient records, inspecting multi-branch inventory, reviewing returns, configuring outlet settings, and downloading/printing invoices with zero latency.
- **Offline Session Preservation ("Remembered Login") & Resilient API Auth**: Client credentials, user profile, and active shop context are safely retained via `opt_session_profile` cookies, IndexedDB metadata, and localStorage. All offline and sync API endpoints (`/api/offline/sync-all`, `/api/offline/customers`, `/api/offline/inventory`, `/api/search`, `/api/sync/offline-invoices`, `/api/sync/offline-mutations`) utilize `getCurrentUser()` from `services/auth.service`, eliminating 401 Unauthorized errors caused by expired Supabase token handshakes and supporting both `OWNER` and `SHOP_MANAGER` roles.
- **Owner & Manager Dual Precache Circuit Breaker (SW v18 - Fail-Safe Isolated RSC & Offline Engine)**: Service worker runs an origin-isolated network passthrough for page navigations and RSC flight streams, separating caches into strictly isolated buckets (`optical-manager-html-v18`, `optical-manager-rsc-v18`, `optical-manager-static-v18`). Prioritizes live online responses for all HTTP status codes (200, 301, 302, 304, 307, 308, 401, 404). Pre-caches static shell assets (`/`, `/offline`, manifest, icons, logo) on install. Enforces strict `Content-Type` gating: navigation requests (`request.mode === "navigate"`) only match cached responses with `text/html`, completely eliminating raw React Server Component (RSC) Flight streams (`1:"$Sreact.fragment"`) from ever displaying on screen when offline. Uncached dynamic RSC flight requests (`headers.get("RSC") === "1"` or `_rsc`) return clean `503` status responses instead of `307` redirects or HTML, allowing the Next.js client router to gracefully fall back without throwing React JSON syntax errors. Serves a dedicated, branded Next.js `/offline` fallback page with live IndexedDB stats, POS quick-actions, and connection retry controls.
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

### 7. Secure Optical Workspace Gateway (`/login`)
- **High-Density Authentication Hero**: Left-hand clinical gateway panel featuring a self-contained, hardware-accelerated Lottie security animation rendered via pure vector SVG (`public/animations/secure-login.json`).
- **Zero-Latency Dynamic Loading & Fail-Safe Error Boundary**: Implemented via dynamic client-side loading, asynchronous SVG animation parsing, and a resilient React Error Boundary with instant fallback to guarantee 0ms blocking time on the login form inputs and prevent any blank screen crashes.
- **Enterprise Practice Credentialing**: Replaced promotional and marketing clutter with focused clinical workspace credentials, real-time cloud operational indicators, 256-bit SSL encryption, and role-scoped session guards.

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

## 6. High-Density Optical Store Dashboard Architecture (`/shop/dashboard`)

Optical Manager features a production-grade, zero-latency, high-density **Optical Dashboard** designed specifically for standard laptop viewports to eliminate vertical scrolling fatigue while providing 100% live database insights:
- **5 Top-Row KPI Metrics Grid**:
  - *Total Revenue*: Net collected revenue with live comparative growth percentage (`↑ %`) vs baseline time window.
  - *Sales Invoices*: Total invoice slips generated with volume growth indicator.
  - *Accounts Receivable*: Outstanding customer balances due with comparative growth rate.
  - *Active Customers*: Distinct customer count transacting within the active date range.
  - *Total Stores*: Total active branches connected under the organization hierarchy.
- **Row 2 Analytics (3 Columns)**:
  - *Customer Bifurcation*: High-density pure SVG donut breakdown categorizing customers into `🟣 Only Frame`, `🔵 Only Lense`, and `🟢 Both Frame & Lense` with exact counts and percentages.
  - *Dead Stock (90 Days)*: Real-time identification of inventory items with active positive stock that have had zero sales or stock movements in the past 90 days, showing item count and percentage of total stock.
  - *Stock Valuation*: Asset value distribution across optical inventory categories (`Frames`, `Lenses`, `Contact Lenses`, `Sunglasses`, `Accessories`, `Solutions`, `Other`) with interactive SVG donut visualization.
- **Row 3 Analytics (3 Columns)**:
  - *Return Rate*: Radial gauge visualizing merchandise return percentage alongside total sales, returned items, and net return rate.
  - *Sales Bifurcation (5 Dynamic Tabs)*: Instant `0ms` client-side switcher breaking down sales by `By Lenses` (Single Vision, Bifocal, Progressive, Other), `By Frames` (Full Rim, Half Rim, Rimless, Sunglasses, Other), `By Brands` (top brands + other), `By Gender` (Male, Female, Unisex, Other), and `By Age` (<18, 18-35, 36-55, 55+, Unspecified).
  - *Low Stock Alerts*: Clean state badge when stock is fully compliant, or compact actionable list of items below threshold with direct restock links to `/shop/inventory`.
- **Row 4 Analytics (2 Columns)**:
  - *Retention Rate (1/3 Col)*: Donut gauge showing repeat customer percentage alongside total customers and returning customer counts.
  - *Recent Transactions Table (2/3 Col)*: High-density live ledger displaying recent invoices with formatted timestamps, patient name, item summary strings (e.g. `1 × Ray-Ban Frame`, `2 × Single Vision Lenses`), total bill amount, and soft HSL status pills (`✓ Completed`, `Partial`, `Pending`).
- **Dynamic Date Range Controls**: Sticky top-right date selector with presets (`Today`, `Yesterday`, `Last 7 Days`, `This Month`, `This Quarter`, `Last 12 Months`, `Year to Date`, `All Time`).
- **Zero Mock Data & 100% Live Aggregations**: All numbers, slices, and tables query Neon PostgreSQL tables (`invoices`, `invoice_items`, `customers`, `inventory`, `sales_returns`, `stock_movements`, `shops`) via Drizzle ORM in parallel.

---

## 7. Industrial-Grade "Enter-as-Tab" Keyboard Form Navigation Architecture
- **Zero-Latency Keyboard Progression**: Built for rapid touch typing during billing, inventory ingestion, purchase inwarding, and clinical refraction entry. Pressing `Enter` in any field instantly shifts focus to the next logical interactive control while automatically highlighting/selecting text for quick overwriting.
- **Bi-Directional Support (`Shift+Enter`)**: Pressing `Shift+Enter` shifts focus backward to the previous active field.
- **Multiline Textarea Protection**: Native `<textarea>` elements preserve multi-line typing on standard `Enter` (useful for medical history and notes) while supporting `Ctrl+Enter` or `Cmd+Enter` to advance navigation.
- **Smart Autocomplete Gating**: When dropdown lists or search suggestion popovers are active, `Enter` selects the highlighted item without erroneously advancing the form.
- **Universal Production Coverage**: Integrated across all core store workflows including `NewInvoiceForm`, `PatientRegistrationForm`, `Add/EditFrameItemForm`, `Add/EditLensItemForm`, `Add/EditContactLensItemForm`, `Add/EditAccessoryItemForm`, `AddGeneralItemForm`, `PurchaseAddForm`, `PurchaseAddProductModal`, `NewReturnForm`, `AddPrescriptionModal`, `EditOrderForm`, `NewAppointmentModal`, and `PurchaseVendorCombobox`.
