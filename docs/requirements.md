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
- Low-stress, high-density industrial table styling adhering to Linear/Stripe design standards with silky hairline dividers (`divide-y divide-slate-100/80`) and soft HSL status badges.

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
