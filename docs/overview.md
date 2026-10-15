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
- **Category-Specific Taxonomies & Dynamic Categories**: Built-in support for default categories (`FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SOLUTION`, `SUNGLASSES`) and unlimited custom merchant-defined categories.
- **Dynamic Category & GST Rates Master Matrix**: Organizations can configure custom product categories (e.g. Sunglasses, Reading Glasses, Solutions) alongside defaults, customize HSN codes and GST percentages (`CGST`, `SGST`, `IGST`) with smart 50/50 split calculation in Settings (`/shop/settings`, `/owner/settings`), and auto-fill these tax rates during product ingestion (`/shop/inventory/add`) and filtering (`/shop/inventory`).
- **Interactive Top-Right "+ Add Item" 3-Option Dropdown**: Store Inventory header features a hover/click dropdown with 3 dedicated ingestion pathways:
  - `Add Single`: Direct navigation to single-product ingestion (`/shop/inventory/add`).
  - `Add Bulk Purchase`: Direct navigation to standard manual vendor purchase bill entry (`/shop/purchases/new`).
  - `Add Bulk (CSV)`: Direct navigation to the 4-step CSV Bulk Purchase Inward wizard (`/shop/inventory/import`).
- **Optical Metadata Tracking**: Supports frame dimensions (`52-18-140`), lens refractive indices (1.56, 1.61, 1.67, 1.74), HSN codes (`9004` frames, `9001` optical lenses), batch numbers, and expiry dates.
- **Interactive Lens Power SPH/CYL Stock Matrix**: High-density optical power chart with `(-) Minus Power Sphere Chart` and `(+) Plus Power Sphere Chart` toggle modes, standard/extended power ranges (0.00 to ±6.00 SPH, 0.00 to -3.00 CYL in 0.25 steps), per-cell unit count inputs with active cell highlighting, and real-time total stock quantity aggregation.
- **Interactive Multi-Format Industrial Barcode Engine**: High-density native vector SVG barcode engine (Code 128 Subset B & Code 39) calibrated for standard 203/300 DPI thermal barcode printers (TSC, Zebra, TVS, Godex, Xprinter, Citizen) and multi-grid sheets:
  - `81×12 mm (D-Gum Flap Tag)` ⭐: Production-standard optical frame barbell tag (TSC TTP-244 Plus / 203.2 DPI = 8 dots/mm, 648 × 96 dots). Features a strict 3-zone horizontal architecture:
    * **Zone 1: Left Text Flap (0.0 – 25.0 mm / 0 – 200 dots)**: Shop Name (5.5pt bold), Category (7.0pt extra bold), Model/Variant (5.2pt bold), and Price (7.5pt extra bold) with ≥0.8 mm bottom clearance.
    * **Fold Perforation Line (X = 25.0 mm)**: 0.25mm dashed divider separating Zone 1 and Zone 2.
    * **Zone 2: Middle Barcode Flap (25.0 – 50.0 mm / 200 – 400 dots)**: Integer-dot crisp vector SVG Code 128 barcode (1 module = 1 printer dot = 0.125 mm; exactly 145 modules = 18.125 mm wide × 6.5 mm / 52 dots high for 10-char SKUs; Subset C auto-compression for >12 chars) + human-readable monospace SKU below.
    * **Zone 3: Right Unprinted Rat-Tail (50.0 – 81.0 mm / 400 – 648 dots)**: 31mm unprinted adhesive-free loop strap.
    * **Anti-Rotation Print Engine**: `@media print { @page { size: 81mm 12mm; margin: 0mm !important; } }` without landscape keywords, preventing Chromium 90° CCW auto-rotation.
    * **Direct Hardware TSPL2 Generation (`generateOpticalTagTSPL`)**: Outputs native TSPL2 `.PRN` files bypassing Windows GDI drivers for direct thermal printing with `GAP 2 mm, 0 mm`.
    * **Driver Direction Toggle**: One-click "Flip 180° (Direction 0,0)" toggle supporting standard 0° and 180° workstation driver feeds.
  - `100×15 mm (Vertical 3-Up Roll)` ⭐: Exact 3-across eyewear barbell tag roll (`50mm` web width × `100mm` feed length). Renders 3 narrow labels side-by-side across the 50×100mm roll, each representing an authentic 15mm wide × 100mm long narrow strip (1:6.67 aspect ratio, not a square). Divided symmetrically into two 50mm folded halves via the narrow center bridge strap and fold indicator (Top flap ~38mm: Header + Price + Brand/Model; Center strap ~24mm: 5mm fold-around strap with 50mm center fold line; Bottom flap ~38mm: 34mm-wide high-density Code 128 barcode + parallel monospace SKU), matching real-world optical hanging tags.
  - `100×15 mm (Vertical 1-Up Roll)`: Single-column vertical roll (`15mm` width × `100mm` feed length) with 15×100mm narrow strip geometry and 90° rotated layout.
  - `100×15 mm (Vertical 2-Up Roll)`: Two-across vertical roll (`34mm` width × `100mm` feed length) with two 15×100mm narrow strips rendered side-by-side across the 34mm roll web.
  - `100×15 mm (Horizontal Tag)`: Dual-wing horizontal barbell tag for 4" continuous rolls or A4/A5 laser/inkjet sticker sheets.
  - `50×25 mm (Standard Box)`: Standard 2"×1" retail box and spectacle case label.
  - `38×25 mm (Compact Jewel)`: Compact 1.5"×1" contact lens blister pack and small accessory tag.
  - `40×30 mm (Medium Box)`: Medium optical case label.
  - `50×50 mm (Square Label)`: Large square frame carton and case label.
- **Cross-Printer Output & Industrial Page Sizing**: Applies exact roll geometry (`@page { size: ${rollWidth}mm ${rollHeight}mm; margin: 0; }`) to ensure thermal printer gap sensors track labels correctly, completely eliminating blank prints, label choking, and page overflow issues. Multi-column rolls automatically group labels into row sets with page breaks. Also supports A4/A5 multi-grid sticker sheets with zero layout reflows.

### 4. POS Billing, Eye Prescriptions & Dues Management
- **Single-Screen High-Density POS Billing (`/shop/invoices/new`)**: Ultra-compact SaaS interface engineered for laptop viewport fit without vertical fatigue. Features a minimal inline header, compact `h-8` form controls, real-time customer search with 0ms local hydration, and streamlined bottom action placement (`[ Save Draft ]` and `[ Book Order ]`).
- **ERP-Grade High-Density Product Selection Table (`/shop/invoices/new`)**: Production-grade 11-column industrial grid ledger (`Product Search`, `Category`, `Item Description`, `Qty`, `Price (₹)`, `Discount (₹)`, `Discount (%)`, `CGST (₹)`, `SGST (₹)`, `IGST (₹)`, `Total (₹)`) with universal responsiveness and horizontal scrolling on smaller viewports (`min-w-[1280px]`):
  - *Flush Integrated Grid Cells*: Replaces floating bubble cards with crisp ERP grid borders (`border-collapse`, `border-r border-slate-700` on dark headers, `border-r border-b border-slate-200` on cells).
  - *Separation of Code & Description*: Product search displays exclusively item code badges (Barcode, Product Code, or SKU) beneath the search input; product name, brand, model & specs are cleanly formatted in the Item Description column.
  - *State-Aware Automated GST Distribution*: Smart tax engine calculates intra-state (CGST + SGST) vs inter-state (IGST): applies CGST + SGST if customer state matches store state or if customer state is unspecified, and applies IGST if customer state differs from store state. Supports live re-balancing when customer state changes.
  - *All Fields Fully Editable & No Rupee Glyphs in Inputs*: Every field including CGST, SGST, IGST rates and amounts are dual-line editable with bi-directional syncing (`rate%` and `amount`). Rupee indicators (`₹`) are cleanly moved to column headers, eliminating visual clutter and input parsing issues.
  - *Discount Engine Capping*: Discount percentage is strictly clamped to 100%, and discount amount is capped to line subtotal.
  - *Smart Hover Tooltips & Zero Text Clipping*: All input fields include dynamic `title` attributes and full-cell width allocation to prevent text loss when long product names or descriptions are entered.
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
  - *Centralized Industrial WhatsApp Utility Suite (`utils/whatsapp-templates.ts`)*: 7 customizable optical notification templates (`order_form_sent`, `invoice_sent`, `prescription_sent`, `payment_reminder`, `order_complete`, `delivery_sent`, `delivery_delay`) standardized to Indian optical retail copy (Lenskart/Titan Eye+ standard with bold details, emojis, store address, and clinical prescription details) with optometry variable insertion chips (`{{re_sph}}`, `{{le_sph}}`, `{{pd}}`, `{{doctor_name}}`, `{{order_form_url}}`, `{{shop_address}}`), 1-click "Reset to Recommended" template capability, and live smartphone preview.
- **GST Billing Engine, Dual Editable Taxes & Category-Based Tax Summary Table**: Automated CGST/SGST/IGST tax calculation (12% for spectacles/lenses, 18% for sunglasses/solutions/accessories), HSN code mapping, dual discounts (% & ₹), bi-directional editable CGST/SGST/IGST per item row, and an **Optical Tax Summary Table** grouping items by `Category + GST Rate` (`Frames`, `Sunglasses`, `Lenses`, `Contact Lenses`, `Solutions`, `Accessories`, `Reading Glasses`, custom categories) displaying exact Taxable Value, CGST, SGST, IGST, and Total Tax under the "Particular Name" column.
- **Bulletproof Date & Time Parsing Engine (`lib/invoice-helpers.ts`)**: Universal, error-free date parsing and formatting (`safeParseDate`, `safeToISODate`, `safeToISOTimestamp`, `safeFormatDateLocale`, `formatDateDMY`, `formatDateDMonthY`, `formatReceiptDate`, `formatReceiptTime`) supporting multi-format inputs (ISO 8601 strings, Indian DD/MM/YYYY, space-delimited timestamps, Unix numeric epoch milliseconds, and legacy dates), completely eliminating `RangeError: Invalid time value` crashes across invoice creation (`/shop/invoices/new`), order editing (`/shop/orders/[id]/edit`), public sharing (`/share/invoice/[id]`), and multi-template WhatsApp notifications.
- **Zero-Latency Product Search & Autocomplete**: Instant search querying product name, code, SKU, brand, and model across IndexedDB (0ms) and cloud API with un-clipped suggestion dropdowns and live stock counts.
- **Clinical Eye Prescriptions & Smart Industrial Refraction**: Pixel-perfect clinical prescription card format featuring 8-column high-density layout (`EYE / TYPE`, `SPHL. (SPH)`, `CYL. (CYL)`, `AXIS (°)`, `ADDN. (ADD)`, `VISION (V/N)`, `P.D. (MM)`, `CADD`), category tabs (`Spect(s) Rx`, `CL Rx`, `Distance`, `Near`), auto-generated Rx numbering (`Rx #PR-XXXX`), highlighted ADD diopter columns, smart optometry datalists (0.25D steps, Snellen V/N, Monocular PD 25-40mm), bilateral ADD auto-sync, monocular PD auto-split, doctor attribution, and automated zero-latency syncing upon invoice/patient creation.
- **Public Shareable Invoices & Universal Mobile-First Digital Bill (`/share/invoice/[id]`)**: Generates secure public digital invoice links with dual-mode presentation: a mobile-optimized customer digital bill for smartphone screens (`block md:hidden print:hidden`) featuring store branding, direct call/WhatsApp buttons, payment settlement pill, clinical prescription matrix, itemized breakdown, categorized tax overview, and financial totals; seamlessly toggling to or printing the official pixel-perfect A4 tax invoice on desktop and printer output (`@media print`).
- **Sales Returns & Store Credit Management**: Flexible merchandise returns supporting Cash Refunds (with real-time revenue deduction) and Store Credit issuance (added to customer profile and tracked in immutable credit ledgers), official printable Return Receipts / Credit Notes, and seamless store credit redemption on new invoices.
- **4-Stage CSV Bulk Invoices Ingestion Wizard (`/shop/invoices/import`)**: Production-grade historical sales onboarding wizard with 0ms client-side customer matching by 10-digit phone, automatic patient profile creation with auto-sequenced registration IDs (`OP-shopNum-YYYY-NNNN`), external legacy bill number preservation (`INV-2023-01`, `BILL-1049`, etc.) or series generation (`generateBatchInvoiceNumbers`), multi-item bill grouping, inline spreadsheet editing, and atomic database commits across `invoices`, `invoiceItems`, `orders`, and `receipts`.
- **Shop Interface Data Integrity & Strict Logical Calculations**:
  - *Precise Payment Badging*: Orders Table strictly differentiates between `PAID` (balanceDue $\le 0$), `PARTIALLY PAID` (balanceDue $> 0$ and amountPaid $> 0$), and `UNPAID` (amountPaid $= 0$).
  - *Customer Dues Isolation*: Customer dashboard and profile aggregates strictly filter out soft-deleted and `CANCELLED` invoices and scope by `shopId`, eliminating phantom dues from cancelled bills or cross-shop transactions.
  - *Harmonized Revenue & Collections*: Financial KPIs define Revenue as total billed sales across valid invoices in the period, Collections as actual cash inflow (`amountPaid`), and Accounts Receivable as active outstanding dues (`balanceDue`), maintaining mathematical harmony ($Revenue = Collections + Receivables$).
  - *Chronological Prescription Ordering*: Prescriptions query in descending order (`createdAt DESC`), ensuring index `[0]` consistently refers to the customer's latest clinical refraction test across printing, profile, and WhatsApp templates.
  - *Guaranteed Order Form Receipt Linking*: Every booked order (online or offline sync) generates an official booking receipt record linked via `orders.receiptId`, and full order edits maintain and update this receipt without receipt loss or null reference crashes.
- **Industrial Multi-Criteria Orders Filter Engine (`/shop/orders`)**:
  - *Interactive Filter Popover (`OrdersFilterPopover`)*: Replaces static buttons with an industrial, accessible popover modal featuring live active filter counter badges, backdrop click/ESC dismissal, and quick reset controls.
  - *Multi-Dimensional Business Criteria*: Supports filtering across Delivery Status (`ALL`, `PENDING`, `READY`, `PROCESSING`, `DELIVERED`, `DELAYED` [overdue delivery dates], `ON_HOLD`), Payment Status (`ALL`, `PAID`, `PARTIALLY_PAID`, `UNPAID`), Payment Mode (`ALL`, `CASH`, `UPI`, `CARD`, `BANK_TRANSFER`), Timeframe (`24h`, `yesterday`, `7d`, `30d`, `90d`, `12m`, `ytd`, `all`), and an instant Pending Dues Toggle (`hasDues=true` where `balanceDue > 0`).
  - *Active Filter Chips Bar (`ActiveOrderFilterChips`)*: Displays removable pill badges above the table for all active query parameters with 1-click individual removal and "Clear All".
  - *Full Query State Preservation*: Seamless URL query parameter synchronization (`searchParams`) preserved across full-text search, pagination, KPI filter cards, and CSV export (`/api/orders/export`).
- **Multi-Dashboard Inward Triggers**: Direct access via the high-density action dropdowns on the Customers directory (`/shop/customers` -> `Add Bulk Invoices (CSV)`) and Orders management hub (`/shop/orders` -> `Invoices & Sales` -> `Import Invoices (CSV)`).

### 5. Purchases, Inward Supply & 4-Step Bulk CSV Ingestion Architecture
- **Inward Supply Navigation**: Positioned directly below "Sales" in the store manager left sidebar, featuring hover-triggered sub-menus for "Purchase Ledger" (`/shop/purchases`), "Purchases Add" (`/shop/purchases/new`), and "Vendors" (`/shop/purchases/vendors`).
- **Comprehensive Purchase Ledger Hub (`/shop/purchases`)**:
  - *Real-time KPI Metrics*: Instant 1-query aggregation for Total Purchases count, Net Inward Valuation (₹), Current Month Inward count, and Top Supplier identifier with interactive active-selection filter states.
  - *Multi-Condition Filter Bar*: Zero-latency filtering by Vendor, Date Range (From/To), GST Pricing Model (Inclusive/Exclusive), Status (Draft/Completed/Cancelled), and full-text invoice # / vendor name search.
  - *High-Density Zero-Scroll Table*: 9-column layout (Date, Bill #, Vendor with GSTIN, Amount, GST Type pill badge, Inward Qty, Status Badge with payment indicator, Quick Barcode Print button with automated item retrieval, and View Action) with zero horizontal scrolling on standard laptop displays.
  - *Full-Page Transaction Detail (`/shop/purchases/[id]`)*: Streamlined 8-column high-density table displaying `#`, `Product & Code`, `Category & HSN`, `Inward Qty`, `Rate (Purchase Cost & Base Split)`, `Total Amount`, `Retail MRP`, and `Tag / Delete Actions` - completely eliminating horizontal scrollbars in both View and Edit modes.
  - *Multi-Format Barcode Printing & Batch Modal*: Individual item barcode modal (`BarcodeDesignerModal`) and batch modal (`PurchaseBulkBarcodeModal`) accessible directly from the Purchase Ledger table (`/shop/purchases`), Purchase Details page (`/shop/purchases/[id]`), and Add Purchase page header (`/shop/purchases/new`). Defaults out-of-the-box to the production-accurate **81×12 mm Optical Dumbbell Tag** (`81x12 mm (D-Gum Flap Tag)`) on **Continuous Thermal Roll** (`paperSize: "continuous"`), with automatic `localStorage` preference memory (`optical_barcode_preferences_v1`) that auto-persists and restores any operator format, size, or styling selection. Features the strict 3-zone architecture: Zone 1 (25.0mm Text flap: Shop Name, Category, Model, Price with ≥0.8mm bottom clearance), Fold perforation divider (at 25.0mm), Zone 2 (25.0mm Barcode flap: integer-dot crisp SVG Code 128 barcode at 1 dot = 0.125mm with 145 modules = 18.125mm width, 52 dots = 6.5mm height, and monospace SKU below), and Zone 3 (31.0mm unprinted adhesive-free loop rat-tail). Includes dual-mode print output: browser-based printing locked to `@media print { @page { size: 81mm 12mm; margin: 0mm !important; } html, body { height: auto !important; overflow: visible !important; } }` guaranteeing seamless multi-page pagination for large batches (e.g. 73+ items) without clipping, and Direct Hardware TSPL2 `.PRN` generation (`generateOpticalTagTSPL` and `generateBulkOpticalTagsTSPL`) with one-click download buttons. Supports industrial vertical rolls (`100x15 mm Vertical 3-Up Roll ⭐`, `1-Up`, `2-Up`), and retail boxes. Specialized 2-across continuous thermal rolls (`100x15 mm Vertical 2-Up Roll` on a 34×100mm web) render strictly side-by-side horizontally with authentic 1.5mm liner margins and 1mm slit gap. Features interactive live preview (die-cut dumbbell vertical tag, authentic NTK flap die-cut contour with dimension rulers, scrollable continuous roll feed mockup rendering all queued products, and single label zoom), in-table product search filter for rapid lookups across large inward batches, calibration inspector, per-item quantity steppers, thermal driver setup guidance banner, and one-click "Flip 180° (Direction 0,0)" driver compensation.
  - *Inward Editing & Atomic Deletion*: Supports full in-place editing with 5-priority bidirectional calculations (Purchase Cost ↔ Base Price ↔ GST% ↔ Qty), preserving the user's authentic entered supplier bill number on the purchase ledger, and safe transaction deletion with automatic stock deduction reversal (`STOCK_OUT`/`RETURN` movements).
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
- **AI Bill Scanner & Multi-Image Batch OCR (`Scan Bill with AI`)**:
  - High-density AI drawer powered by Google Gemini (`gemini-3.5-flash-lite` and `gemini-2.5-flash` with multi-tier fallbacks and 503 spike resilience) for zero-latency invoice extraction.
  - Multi-Image & Multi-Page Queue: select multiple invoice images/PDFs simultaneously with "+ Add More Images" appending to the batch at any time. Badge labeled cleanly as "Images".
  - Resilient Sequential OCR Pipeline: processes queued bills one by one with failure isolation (one blurry or unreadable image does not abort the batch; successful items are merged and failed images can be retried individually).
  - Smart Inward Append Mode: extracted line items append cleanly below existing table rows without overwriting previously entered products or supplier headers.
  - Automated GST calculation, optical frame specs extraction (brand, model, size, color), HSN detection, and zero-hallucinated retail pricing (strictly blank in inward forms).
- **Unified Internal SKU = Barcode Standard (`[CAT]-[BRAND]-[SEQ]`)**:
  - Unifies internal SKU and barcode into a single, canonical, collision-free identifier across inventory, purchases, barcode printing, and POS checkout.
  - Optical 3-letter category prefixes: `FRM` (Frames), `SNG` (Sunglasses), `LNS` (Ophthalmic Lenses), `CTL` (Contact Lenses), `ACC` (Accessories), and `SOL` (Solutions).
  - Robust Missing Metadata Hierarchy: Brand fallback derives first 3 alphanumeric characters from brand, falls back to vendor name, and defaults to `"GEN"` (Universal Generic, e.g. `FRM-GEN-00042`) for unbranded inward products.
  - Zero-Collision Shop Sequences: Backed by `getNextSkuSequenceBatch` and `ensureUniqueShopSku`, guaranteeing 100% uniqueness in PostgreSQL `inventory_shop_product_code_idx`.
  - Strict 13-Character Tag Optimization: Constrained to 13 characters to ensure crisp Code 39/Code 128 barcode rendering on 100×15 mm optical butterfly frame tags.
  - Full POS Barcode Scanner Interoperability: Scanned at checkout via `/api/search`, matching either `sku` or `productCode` with 0ms latency.

---

## 6. Dashboard Architecture: Owner Enterprise Portal vs Store Overview

Optical Manager provides two specialized, role-tailored dashboard experiences engineered to provide zero-latency database insights without vertical scroll fatigue:

### A. Store Manager Daily Overview Dashboard (`/shop/dashboard`)
Designed specifically for in-store branch staff, optometrists, and counter managers focusing on daily operational tasks:
- **Today's Queue & Store Operations (`StoreOverviewClient`)**: Scoped to the individual branch outlet (`shopId`), defaulting to a `"24h"` daily window.
- **Priority Action Center**: Instant alerts on urgent tasks—low stock reorders, delivery deadlines, and pending partial payment collections.
- **Today's Patient Visits & Appointments**: Live appointment schedule, patient contact numbers, visit purpose (consultation, refraction, frame selection), and status toggles.
- **Delivery Fulfillment Tracking**: Real-time counter of Ready for Pickup orders and Delayed deliveries requiring customer communication.
- **Recent In-Store Activity Feed**: Chronological ledger of the latest invoices, stock movements, and customer communications.

### B. Owner Multi-Branch Enterprise Analytics Dashboard (`/owner`)
Designed for System Owners and C-level optical executives managing multi-branch retail networks (`OwnerDashboardClient`):
- **Universal Multi-Branch / Outlet Scope Selector**: Integrated header control allowing owners to toggle telemetry between `All Branches (Combined Chain)` and any specific individual store outlet (`shopId`), re-querying all database aggregations dynamically with zero latency.
- **5 Top-Row Enterprise KPI Metrics Grid (Fully Responsive)**:
  - *Total Revenue*: Net collected revenue across outlets with comparative growth badge (`+X%` / `-X%`) vs baseline time window.
  - *Sales Invoices*: Total invoice slips generated with volume growth indicator.
  - *Accounts Receivable*: Outstanding customer balances due with inverted direction-aware growth indicator (green when receivables decrease).
  - *Active Customers*: Distinct customer count transacting within the active date range.
  - *Total Stores*: Total active branches connected under the organization hierarchy with `Chain Network` pill badge.
- **Row 2 Analytics (3 Columns)**:
  - *Customer Bifurcation*: High-density pure SVG donut breakdown categorizing customers into `🟣 Only Frame`, `🔵 Only Lens`, and `🟢 Both Frame & Lens` with exact counts and percentages, accurately omitting non-optical accessories.
  - *Dead Stock (90 Days)*: Real-time identification of inventory items with active positive stock that have had zero sales or stock movements in the past 90 days, showing item count and percentage of total catalog.
  - *Stock Valuation*: Asset value distribution across optical inventory categories (`Frames`, `Lenses`, `Contact Lenses`, `Sunglasses`, `Accessories`, `Solutions`, `Other`) with interactive SVG donut visualization and clean category distribution legend.
- **Row 3 Analytics (3 Columns)**:
  - *Return Rate*: Radial gauge visualizing merchandise return percentage alongside total sales, returned items, and net return rate.
  - *Sales Bifurcation (5 Dynamic Tabs)*: Instant `0ms` client-side switcher breaking down sales by `By Lenses` (Single Vision, Bifocal, Progressive, Other), `By Frames` (Full Rim, Half Rim, Rimless, Sunglasses, Other), `By Brands` (top brands + other), `By Gender` (Male, Female, Unisex, Other), and `By Age` (<18, 18-35, 36-55, 55+, Unspecified).
  - *Low Stock Alerts*: Clean state badge when stock is fully compliant, or compact actionable list of items below threshold across all branches.
- **Row 4 Analytics (2 Columns)**:
  - *Retention Rate (1/3 Col)*: Donut gauge showing repeat customer percentage alongside total customers and returning customer counts.
  - *Recent Transactions Table (2/3 Col)*: High-density live ledger displaying recent invoices with formatted timestamps, patient name, item summary strings (e.g. `1 × Ray-Ban Frame`, `2 × Single Vision Lenses`), total bill amount, and soft HSL status pills (`✓ Completed`, `Partial`, `Pending`), featuring responsive horizontal scrolling for mobile devices.
- **Dynamic Multi-Window Timeframe Controls**: Sticky top-right date selector with presets (`Today`, `Yesterday`, `Last 7 Days`, `This Month`, `This Quarter`, `Last 12 Months`, `Year to Date`, `All Time`), seamlessly routing to `/owner?timeframe=...` while maintaining the active outlet scope.
- **Zero Mock Data & 100% Live Aggregations**: All numbers, slices, and tables query Neon PostgreSQL tables (`invoices`, `invoice_items`, `customers`, `inventory`, `sales_returns`, `stock_movements`, `shops`) via Drizzle ORM in parallel. Empty states display genuine zero indicators and clean empty rings rather than placeholder/mock data.

---

## 7. Industrial-Grade "Enter-as-Tab" Keyboard Form Navigation Architecture
- **Zero-Latency Keyboard Progression**: Built for rapid touch typing during billing, inventory ingestion, purchase inwarding, and clinical refraction entry. Pressing `Enter` in any field instantly shifts focus to the next logical interactive control while automatically highlighting/selecting text for quick overwriting.
- **Bi-Directional Support (`Shift+Enter`)**: Pressing `Shift+Enter` shifts focus backward to the previous active field.
- **Multiline Textarea Protection**: Native `<textarea>` elements preserve multi-line typing on standard `Enter` (useful for medical history and notes) while supporting `Ctrl+Enter` or `Cmd+Enter` to advance navigation.
- **Smart Autocomplete Gating**: When dropdown lists or search suggestion popovers are active, `Enter` selects the highlighted item without erroneously advancing the form.
- **Universal Production Coverage**: Integrated across all core store workflows including `NewInvoiceForm`, `PatientRegistrationForm`, `Add/EditFrameItemForm`, `Add/EditLensItemForm`, `Add/EditContactLensItemForm`, `Add/EditAccessoryItemForm`, `AddGeneralItemForm`, `PurchaseAddForm`, `PurchaseAddProductModal`, `NewReturnForm`, `AddPrescriptionModal`, `EditOrderForm`, `NewAppointmentModal`, and `PurchaseVendorCombobox`.

---

## 8. Landing Page Interactive Video Showcase (`/`)
- **Self-Hosted Zero-Latency Media**: The public landing page hero section features an embedded high-density product demonstration video (`public/videos/hero-intro.mp4`), eliminating third-party iframe latency and rate limiting.
- **Browser-Compliant Smart Autoplay & Audio Management**: Starts playing immediately on load with browser-compliant muted autoplay; features an animated floating glassmorphism pill (`🔊 Sound Off • Click to Unmute`) and full-frame click-to-unmute interaction.
- **Cinematic Micro-Controls**: Custom hover overlay with progress scrubber, time counter (`MM:SS`), play/pause toggle, volume controls, and native fullscreen support.

---

## 9. Industrial Thermal Barcode & Label Printing Engine
- **Dedicated Multi-Roll Architecture**:
  - *81×12 mm Optical Dumbbell Tag (TSC TTP-244 Plus / 1-Across Roll) ⭐ (Primary Default)*: Standard 81×12 mm horizontal continuous roll for TSC TTP-244 Plus, TE244, Zebra, TVS, Godex, and Xprinter 203 DPI printers. Uses standard 81mm web width across printer head × 12mm feed pitch per label:
    - Wing 1 (0 to 25.5 mm): Store Name (Row 1), Brand & Model Description (Row 2), Bold Retail Price (Row 3, `MRP: ₹...`).
    - Fold Divider (25.5 mm): Hairline dashed fold guideline for wrapping around eyeglass frame temples.
    - Wing 2 (25.5 to 51.0 mm): High-density horizontal Code 128 (Subset B) barcode in picket-fence orientation (bars vertical) + human-readable monospace SKU code.
    - Non-Printable Tail (51.0 to 81.0 mm): 30 mm adhesive-free tail loop, printed completely borderless/ink-free so glasses frames stay pristine.
    - Feed Flip (180° Inversion Support): One-click orientation toggle (`0°` normal vs `180°` inverted) to adapt to reversed media loading or upside-down feed mechanisms.
  - *TSC TTP-244 Plus & Windows Thermal Driver Integration*:
    - Requires Windows printer driver stock setting: **Width: 81.0 mm**, **Height: 12.0 mm**, **Orientation: Portrait (0°)**, **Type: Labels with gaps (Die-cut 2.0 mm)**.
    - Eliminates the classic 12mm driver clipping bug where Chrome downscaled/rotated prints onto a 12×81mm portrait spool.
    - Chrome Print Dialog rules: Paper size = `81x12` (or custom stock), Margins = `None`, Scale = `100% (Default)` (disabling "Fit to page width").
  - *100×15 mm Vertical (3-Across Roll)*: 3-column optical tag roll (50mm web width × 100mm feed length).
  - *Continuous Thermal Roll Print Spooler*: Direct zero-lag `@page { size: 81mm 12mm; margin: 0; }` styling with last-label feed prevention (`break-after: avoid`), eliminating browser blank pages.
- **1-Bit Thermal Monochrome Pure Black Policy (`#000000`)**:
  - Direct thermal and thermal transfer printheads operate strictly in binary 1-bit mode. All typography, prices, store headers, borders, and barcodes use pure `#000000` with bold weights (`700`–`900`), eliminating driver halftoning and invisible blue/gray text.
- **Run-Length Vector Barcode Architecture**:
  - Code 128 and Code 39 engines synthesize consolidated integer-module `<rect>` vectors with `shape-rendering: crispEdges`, eliminating sub-pixel anti-aliasing blur and solid black smears.
- **Automatic Preference Persistence (`localStorage`)**:
  - Operator preset, paper size, store header, and rotation preferences auto-persist under `optical_barcode_preferences_v1`, with automated migration from legacy vertical presets to the horizontal 81×12 mm standard.

---

## 10. High-Density Day-Wise Collection Ledger & Daily Cash Drawer Report (`/shop/reports`, `/shop/reports/daily`)
- **Auto-Scroll Navigation & Deep Linking**:
  - Selecting "Day-Wise Collection" from the top category cards automatically triggers a smooth scroll (`scrollIntoView({ behavior: 'smooth' })`) directly to the active workspace ledger below, bypassing manual viewport scrolling.
  - Deep-linking with URL parameter `?sub=daywise` automatically selects the Day-Wise Collection view and scrolls to the ledger table.
- **True Multi-Source Cash Accounting**:
  - Reconciles both `invoices` (for billed sales totals, tax, invoice counts) and `receipts` (for actual timestamped cash, UPI, card, and bank collections).
  - Correctly captures payments from newly issued orders, advance bookings, and subsequent balance dues settlements on older invoices without double counting.
- **Table Header Period Toolbar (Month/Year/Date Controls)**:
  - Direct Month dropdown (January through December) and Year selector (2024–2027) mounted directly on the table header.
  - Quick action shortcuts (`This Month`, `Last Month`, `Custom Dates`) for instant zero-latency recalculation of daily rows.
- **High-Density Period KPI Cards**:
  - Displays 5 compact KPI metrics: **Total Collected** (with Cash & UPI breakdown subtext), **Total Sales Billed**, **Invoices Issued**, **Balance Dues Pending**, and **Avg Daily Inflow**.
- **Interactive Daily Drilldown (`/shop/reports/daily?date=YYYY-MM-DD`)**:
  - Clicking any date row in the Day-Wise ledger navigates to a dedicated daily customer transaction report.
  - Features a top Date Switcher toolbar (`[← Previous Day]`, HTML5 Date Picker, `[Next Day →]`, `[Today]`).
  - Top daily cash drawer reconciliation KPIs: **Total Inflow Today**, **Cash in Hand / Drawer**, **UPI & QR Digital**, **Card & Bank POS**.
  - Secondary summary badges: New Bills Issued, Advances on New Orders, Old Dues Recovered, Uncollected Balance Due, Distinct Customers.
  - Filter pills: `All Collections`, `Cash`, `UPI / QR`, `Card / POS`, `New Orders`, `Dues Settled`.
  - Full Customer Collection Ledger Table: Displays Time, Customer Name, Phone (with 1-click copy), Invoice & Receipt links, Collection Type badge (`Advance Booking`, `Full Payment`, `Balance Settlement`, `New Sale`), Items Ordered summary, Payment Method & Txn ID, Bill Total, Amount Paid Today, and Balance Remaining.
  - **End-of-Day (EOD) Register Slip Print**: Features `@media print` styling specifically optimized for store closing cash drawer handover and register balance verification.
  - **Single-Day CSV Export**: Direct CSV export via `/api/reports/export?type=daily&date=YYYY-MM-DD`.


