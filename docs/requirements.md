# Functional & Non-Functional Requirements

This document details the functional, non-functional, and compliance requirements for Optical Manager.

---

## 1. Functional Requirements

### FR-1: Multi-Tenant Tenant Isolation
- The system must isolate data by `organizationId` and `shopId`.
- Users assigned as `SHOP_MANAGER` must only view data belonging to their assigned shop branch.

### FR-2: Point-of-Sale (POS) & Invoice Checkout
- POS billing must support items from 4 categories (`FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`).
- Automated GST calculation (12% / 18%) and HSN mapping (`9004` / `9001`).
- Support for advance partial deposits (`PARTIALLY_PAID`) and tracking remaining balance in 'Pending Receivables'.
- Standardized `Book Order` workflow: Form submission always generates an official optical **Order Form** (`/shop/receipts/[id]`) embedding the patient's optical prescription (Distance & Near SPH, CYL, AXIS, ADD, PD, Doctor, Lens Type) and immediately routes the user to the Order Form view for printing or WhatsApp delivery.
- Dues Settlement & Dual Document Access: Partial payments register orders with pending balance, unlocking the final Tax Invoice upon full dues settlement; full payments generate both Order Form and Tax Invoice simultaneously. Both documents remain permanently linked, accessible, and toggleable in the Orders Table (`/shop/orders`).
- Dedicated 4-stage CSV Bulk Invoices Import Wizard (`/shop/invoices/import`) supporting historical sales ingestion, external bill number preservation or series auto-generation, automatic patient profile matching/registration, and payment receipt ledger synchronization.
- Multi-dashboard inward triggers across `/shop/customers` (`Add Bulk Invoices (CSV)`) and `/shop/orders` (`Invoices & Sales` -> `Import Invoices (CSV)`).

### FR-3: Patient Prescriptions & Clinical Refraction
- 8-column high-density Clinical Prescription format (`EYE/TYPE`, `SPHL. (SPH)`, `CYL. (CYL)`, `AXIS (°)`, `ADDN. (ADD)`, `VISION (V/N)`, `P.D. (MM)`, `CADD`) for OD (Right Eye) and OS (Left Eye).
- Refraction tabs (`Spect(s) Rx`, `CL Rx`, `Distance`, `Near`), unique sequential Rx tracking (`Rx #PR-XXXX`), and lens design classification (`Single Vision`, `Bifocal`, `Progressive`, etc.).
- Smart clinical optometry logic: highlighted ADD column, auto-bilateral ADD inheritance, monocular PD auto-split, datalists for ±0.25 diopters, and doctor attribution.
- Zero-latency auto-syncing across New Invoice (`/shop/invoices/new`), Patient Registration & Edit (`/shop/patients/new`), Customer Profile & Add Modal (`/shop/customers/[id]`), and Generated / Printable Invoices.

### FR-4: Inventory & Purchase Ingestion
- Real-time stock decrementing on invoice generation.
- Automated low stock alert badges when quantity falls below `minQuantity`.
- High-density multi-option `+ Add Item` dropdown selector (`Add Single`, `Add Bulk Purchase`, `Add Bulk (CSV)`).
- 4-step CSV Bulk Purchase Inwarding Wizard (`/shop/inventory/import`) with automated column mapping, smart catalog verification (🟢 Refill Stock vs 🟡 New Item by product code), inline data rectification, category specification drawer (`+ Specs`), and atomic stock movement ledger creation.
- CSV bulk import and export capabilities across inventory and purchase orders.

### FR-5: Dual-Period Granularity Telemetry
- Compare any two time windows across Day, ISO Week, Month, Quarter, or Year granularity.
- Render side-by-side KPI values, growth deltas (`↑ +14.2%`), and dual-line trajectory charts.

### FR-6: Patient Appointment Scheduling
- Public online appointment booking page (`/book/[slug]`).
- Internal clinical booking management (`/shop/appointments`).

### FR-7: Sales Returns, Credit Notes & Customer Store Credit
- Merchandise returns with itemized condition reasons and inventory restock options.
- Refund resolution supporting Cash (deducted from sales telemetry) or Store Credit (added to customer profile).
- Dedicated customer credit ledger with immutable transaction logs.
- Printable Sales Return Receipt & Credit Note documents with instant access from return listings.
- Ability to redeem customer store credit against new invoices with strict input validation.

### FR-8: PWA Offline-First POS Billing & Cloud Synchronization
- Offline data must be isolated strictly per `shopId` for `SHOP_MANAGER` roles using Dexie IndexedDB to prevent cross-shop data leakage, while `OWNER` accounts maintain multi-branch data caching across all physical outlets in their organization.
- Offline invoices and all entity CRUD operations (patients, inventory, appointments, orders, returns) must be operable offline and auto-synced with idempotency upon network recovery.
- The web app must be installable as a standalone PWA across desktop and mobile devices, caching both Shop and Owner view suites.

### FR-9: High-Density Optical Store Dashboard & Multi-Dimensional Category Analytics
- The dashboard (`/shop/dashboard`) must present a non-stretching, high-density layout designed for standard laptop screens without vertical scroll fatigue.
- Must display 5 KPI cards (Total Revenue, Sales Invoices, Accounts Receivable, Active Customers, Total Stores) with comparative growth percentages.
- Must feature pure SVG interactive Donut charts for Customer Bifurcation (Only Frame, Only Lens, Both Frame & Lens), Stock Valuation (Category Asset Distribution), and Return / Retention rates.
- Must provide instant 0ms client-side switching across 5 sales dimensions: `By Lenses`, `By Frames`, `By Brands`, `By Gender`, and `By Age`.
- Must track 90-day Dead Stock and Low Stock Alerts with direct inward links.
- Must render a live high-density Recent Transactions ledger with item summary strings and soft status badges.

### FR-10: Industrial-Grade "Enter-as-Tab" Keyboard Form Navigation
- Seamless Enter-as-Tab progression across all data-entry forms (POS Invoices, Patient Registration & Edit, Add/Edit Frame/Lens/Contact Lens/Accessory, Purchase Inwarding, Sales Returns, Prescriptions, Orders, Appointments, Vendors).
- Auto-selection of field text on focus advance for immediate overwriting without backspacing.
- Safe reverse navigation on `Shift+Enter`.
- Gated textarea multiline entry on standard `Enter` and form advance on `Ctrl+Enter` / `Cmd+Enter`.
- Protected autocomplete popovers to prevent accidental jumps during suggestion selection.
- Automatic form execution on submission triggers (`[data-enter-submit="true"]`, `type="submit"`).
### FR-11: Customer GSTIN & B2B Tax Compliance
- Customer profiles support optional 15-character uppercase GSTIN registration numbers (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`).
- Form support across POS Billing (`/shop/invoices/new`) and Patient Registration/Edit (`/shop/patients/new`) with strict alphanumeric uppercase input constraints.
- Customer GSTIN is indexed for zero-latency lookups and synchronized across Dexie IndexedDB offline caching, CSV bulk customer imports, and printed Tax Invoices / Order Forms under `BILL TO`.

### FR-12: Orders Table Direct Action Toolbar & Multi-Template WhatsApp Dispatcher
- Direct 1-click icon buttons under `DOCUMENTS` (Order Form and Tax Invoice) and `ACTION` (WhatsApp and Edit) eliminating cumbersome nested dropdowns.
- WhatsApp multi-template contextual popover supporting 5 optical message actions (Send Order Form, Send Tax Invoice, Send Clinical Eye Prescription with OD/OS powers & PD, Order Ready for Pickup, and Outstanding Payment Reminder).
- Dedicated Shop Settings WhatsApp Customizer supporting 7 customizable message templates with clinical optometry token variables (`re_sph`, `re_cyl`, `re_axis`, `re_add`, `le_sph`, `le_cyl`, `le_axis`, `le_add`, `pd`, `doctor_name`, `order_form_url`) and live smartphone preview.
### FR-13: Production-Accurate D-Gum Flap Label Printing (81×12 mm NTK Standard) & Thermal Barcode Engine
- **81×12 mm NTK D-Gum Flap Optical Tag (Industry Standard for Spectacle Frames)**:
  - *Physical Geometry*: 81 mm total unfolded length × 12 mm tag body height.
  - *51 mm Foldable Head (Printable Wings)*: Located on the left side of the tag, divided symmetrically by a 25.5 mm dotted center fold line into two 25.5×12 mm wings:
    - *Wing 1 (Front)*: 25.5×12 mm printable area displaying Brand name, category, model/specs, and retail MRP.
    - *Wing 2 (Back)*: 25.5×12 mm printable area rendering high-density vector Code 128 barcode (with required quiet zones) and human-readable monospace SKU. Supports both **Vertical (Ladder 90° Rotated)** and **Horizontal (Picket-Fence)** barcode orientations.
  - *30 mm Adhesive-Free Tail (Loop Strap)*: Centered vertically on the right side (~2.8 mm thick), engineered completely adhesive-free within the 12 mm height boundary. Wraps around spectacle temple arm and is sealed between Wing 1 and Wing 2 when the 51 mm head is folded in half at 25.5 mm.
  - *Content Scaling Rules*: Automatic refitting of all internal block variables (`ORGANIZATION/STORE HEADER`, `PRICE`, `BARCODE`, `FRAME TEXT`) within the 25.5×12 mm wing boundaries with zero bleeding across the 25.5 mm central fold divider.
- **Hardware & Thermal Printer Engine Specifications**:
  - *Dynamic Multi-Tenant Organization Store Header Policy*: All barcode label tags (both individual and bulk batch inwarding spools) dynamically resolve and print the authenticated store's real business name (e.g. `PUNJAB OPTICS`, `PRECISION OPTICS`) fetched from `organizations.name` / cached session profile (`om_organization_name`), strictly eliminating hardcoded dummy placeholders like `CLINICAL OPTICAL`. Operators retain full freedom to edit or override the header in the barcode modal at any time. Legacy browser localStorage values of `"CLINICAL OPTICAL"` are automatically migrated to the real organization name on mount.
  - *Smart Adaptive Store Header Compacting & Abbreviation Algorithm (`formatStoreHeaderForLabel`)*:
    - Micro frame tags allocate at most ~14 mm physical width for the store header alongside the retail price badge (approx 15 characters at 4.8px bold).
    - Automatically cleans URL protocols and domain extensions (e.g., `https://`, `.store`, `www.`), auto-generated metadata fluff (`'s Organization`, `Organization`), and corporate legal entity suffixes (`Pvt Ltd`, `Private Limited`, `LLP`, `Enterprises`).
    - Standard 1-to-2 word store names up to 15 characters (e.g. `PUNJAB OPTICS` [13 chars], `PUNJAB OPTICALS` [15 chars], `ROYAL EYEWEAR` [13 chars], `GAURAV TIWARI` [13 chars]) print completely intact in uppercase.
    - Names exceeding 15 characters undergo intelligent optical industry compression: `OPTICALS`/`OPTICIANS` $\to$ `OPTICS` or `OPT`, `EYEWEAR`/`EYECARE` $\to$ `EYE`, `CLINIC` $\to$ `CLN`, and `STORE`/`SHOP`/`CENTRE` are stripped.
    - Multi-word long names condense secondary words (`CHANDIGARH OPT.`) or acronymize initial honorifics (`S.V. OPT` for `Sri Venkateshwara Optical Store`).
    - Enforces a hard fallback cap $\le 15$ characters with a period indicator (`MAX HEALTHCAR.`), guaranteeing zero collision with the retail price badge.
  - *1-Bit Thermal Monochrome Pure Black Policy (`#000000`)*: Direct thermal and thermal transfer printheads operate strictly in binary 1-bit mode (burn or don't burn). All label text, retail prices, store headers, borders, and barcodes strictly use pure `#000000` with bold/black font weights (`700`–`900`), eliminating color halftoning/dithering where non-black CSS colors (e.g., `#2563eb` blue or `#64748b` gray) caused dropped text, invisible prices, or broken printouts.
  - *Run-Length Vector Barcode Architecture*: Code 128 and Code 39 engines synthesize consolidated integer-module `<rect>` vectors with `shape-rendering: crispEdges` rather than sub-pixel 1-bit slices, preventing browser anti-aliasing blur and solid black smear in thermal drivers.
  - *Multi-Column Continuous Thermal Roll Support*:
    - **`81x12 mm (Vertical 2-Up)`**: 2-Across continuous roll (28×81 mm thermal web) feeding longitudinally in the 81 mm direction. Features 90°-rotated Wing 1 (Brand/Price) and Wing 2 (Barcode/SKU) along the 25.5 mm flaps, perfectly matching 2-column optical roll stock.
    - **`81x12 mm (Vertical 1-Up)`**: Single-column continuous roll (12×81 mm web).
    - **`81x12 mm (D-Gum Flap Tag)`**: Horizontal continuous roll (81×12 mm web).
  - *Continuous Thermal Roll Engine*: Top-level `@page { size: ${rollWidth}mm ${rollHeight}mm; margin: 0mm; }`, zero fixed body heights allowing clean multi-label stream pagination, and `:last-child` page-break avoidance to eliminate trailing blank feeds.
  - *Modernized Offscreen Layout Iframe*: Replaces 0×0 hidden iframes with active-layout offscreen nodes (`left: -9999px; width: 400px; height: 200px; opacity: 0`) ensuring Chromium accurately evaluates media page dimensions instead of falling back to parent viewport Letter/A4 defaults.
  - *Blank Title Suppression*: Emits clean `<title></title>` to eliminate accidental browser title header printing.
  - *Interactive In-Modal Thermal Roll Checklist*: Visual step-by-step guidance reminding operators to select their Thermal Printer destination, set Margins to "None", uncheck Headers & Footers, and maintain 100% scale.
  - *Interactive Calibration Inspector with real-time sliders and geometric validation readout ($25.5 + 25.5 + 30.0 = 81.0\text{ mm ✅}$).
  - *Full support in both individual label designer (`BarcodeDesignerModal`) and purchase inwarding batch printer (`PurchaseBulkBarcodeModal`).
  - **Default Format & Media**: Out-of-the-box system default is set to **`81x12 mm (Vertical 2-Up)`** on **Continuous Thermal Roll** (`DEFAULT_BARCODE_PRESET` and `DEFAULT_PAPER_SIZE = "continuous"`), while preserving full flexibility for users to select any other preset or paper size.
  - **Automatic User Preference Persistence (`localStorage`)**: Any operator selection—such as barcode preset, paper size (`continuous`, `A4`, `A5`), barcode orientation (`vertical` vs `horizontal`), element visibility toggles (Brand, Price, SKU, Barcode Text), typography sizes, borders, and custom header—is automatically saved to `localStorage` under `optical_barcode_preferences_v1` and restored automatically on subsequent visits across both single-item and bulk batch printing interfaces.

---

## 2. Non-Functional Requirements

### NFR-1: Performance & Zero Latency
- Dashboard load time < 1.2s on 3G network connections.
- Client-side table filtering and pagination < 100ms.

### NFR-2: Responsiveness
- 100% responsive across mobile devices (375px+), tablets, laptops, and 4K desktop POS terminals.

### NFR-3: Reliability & Build Quality
- Production builds must pass with **0 TypeScript errors** and **0 compilation errors**.
- Type-safe database queries managed via Drizzle ORM.
