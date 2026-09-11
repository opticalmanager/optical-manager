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

### FR-3: Patient Prescriptions
- Record optical prescriptions containing SPH, CYL, Axis, and ADD for both OD (Right) and OS (Left) eyes along with Pupil Distance (PD).
- Link eye prescriptions directly to customer profiles and customer invoices.

### FR-4: Inventory & Low Stock Alerts
- Real-time stock decrementing on invoice generation.
- Automated low stock alert badges when quantity falls below `minQuantity`.
- CSV bulk import and export capabilities.

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
