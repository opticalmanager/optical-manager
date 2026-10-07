# 👓 Optical Manager

<div align="center">

**The Operating System for Modern Optical Retail Chains & Optometry Practices**

*A production-ready, ultra-high-density Multi-Tenant SaaS platform engineered for clinical eye care, intelligent optical inventory taxonomy, multimodal AI procurement, and zero-latency point-of-sale billing.*

---

[![Next.js](https://img.shields.io/badge/Next.js-16.2%20(App%20Router)-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2%20(Server%20Components)-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.40-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini)
[![Dexie.js](https://img.shields.io/badge/Offline_PWA-IndexedDB_v5-FFA500?style=for-the-badge&logo=pwa&logoColor=white)](https://dexie.org)

[Explore Documentation](./docs/overview.md) • [System Architecture](./docs/architecture.md) • [User Flows](./docs/user_flow.md) • [Database Schema](./docs/database_schema.md)

</div>

---

## 📑 Table of Contents

- [1. Executive Product Overview](#1-executive-product-overview)
- [2. System Architecture & Engineering Blueprint](#2-system-architecture--engineering-blueprint)
- [3. Master Optical Modules & Feature Matrix](#3-master-optical-modules--feature-matrix)
  - [3.1 AI Multimodal Bill Scanner & Procurement Ledger](#31-ai-multimodal-bill-scanner--procurement-ledger)
  - [3.2 Single-Screen High-Density POS Billing & Dual Pricing](#32-single-screen-high-density-pos-billing--dual-pricing)
  - [3.3 Specialized Optical Taxonomy, Lens Matrix & Barcode Tag Designer](#33-specialized-optical-taxonomy-lens-matrix--barcode-tag-designer)
  - [3.4 Clinical Optometry Refraction & Prescription Engine](#34-clinical-optometry-refraction--prescription-engine)
  - [3.5 Order Tracking, WhatsApp Notification Suite & Document Series](#35-order-tracking-whatsapp-notification-suite--document-series)
  - [3.6 Authentic A4 Digital Document Viewer & High-Res PDF Engine](#36-authentic-a4-digital-document-viewer--high-res-pdf-engine)
  - [3.7 Sales Returns, Customer Store Credit & Restocking Ledger](#37-sales-returns-customer-store-credit--restocking-ledger)
  - [3.8 Enterprise 4-Stage Bulk CSV Ingestion Wizards](#38-enterprise-4-stage-bulk-csv-ingestion-wizards)
  - [3.9 Offline-First Desktop PWA & Resilient Delta Sync](#39-offline-first-desktop-pwa--resilient-delta-sync)
  - [3.10 Super Admin Control Center, Multi-Branch RBAC & Permission Matrix](#310-super-admin-control-center-multi-branch-rbac--permission-matrix)
- [4. Core End-to-End User Workflows](#4-core-end-to-end-user-workflows)
- [5. Master UI/UX & High-Density Design Standards](#5-master-uiux--high-density-design-standards)
- [6. Directory Structure](#6-directory-structure)
- [7. Quick Start & Developer Setup](#7-quick-start--developer-setup)
- [8. Synchronized System Documentation Index](#8-synchronized-system-documentation-index)

---

## 1. Executive Product Overview

Optical businesses operate at the intersection of **clinical optometry** and **high-velocity retail commerce**. Conventional generic ERPs and retail POS software fail because they lack support for:
- Complex optical refraction data (diopters, cylinders, axes, pupillary distance, addition).
- Specialized optical inventory taxonomies (frame dimensions, lens coatings, refractive indices, contact lens base curves).
- Multi-installment order lifecycles (advance deposits, optical lab processing, pickup readiness, final tax invoices).
- Fragmented supplier invoicing with unstructured product codes and statutory HSN tax codes.

**Optical Manager** solves this natively. Designed from the ground up to **Stripe / Linear / Vercel** industrial density standards, it serves single-outlet optometrists up to 100+ outlet retail chains with:
1. **0ms Latency Touch-Type Interactions**: Full "Enter-as-Tab" keyboard navigation across all financial grids.
2. **AI Multimodal Ingestion**: Automated supplier invoice reading powered by Google Gemini Vision.
3. **Zero-Data-Loss Pricing Math**: Bidirectional recalculation algorithms ensuring zero paise rounding discrepancies.
4. **Offline Resilience**: Complete store continuity during internet outages via IndexedDB mirroring and Service Worker caching.

---

## 2. System Architecture & Engineering Blueprint

### High-Level Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION & CLIENT LAYER                         │
│   Next.js 16 App Router • React 19 Client/Server Components • Tailwind CSS v4 │
│   Touch-Screen Viewports • Desktop PWA • IndexedDB (Dexie.js v5) Databank   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Server Actions & Fast Next.js RSC)
┌─────────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION & BUSINESS LOGIC LAYER                     │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐ │
│  │   Auth & Proxy Guard  │ │  Pricing Math Engine │ │   Gemini AI Vision  │ │
│  │     (proxy.ts SSR)    │ │ (Bidirectional GST)  │ │ (Bill Scanner API)  │ │
│  └───────────────────────┘ └──────────────────────┘ └─────────────────────┘ │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐ │
│  │ Sequential Series Gen │ │ WhatsApp Dispatches  │ │  Delta Sync Queues  │ │
│  │ (Collision Probing)   │ │  (Optical Templates) │ │ (Offline Mutation)  │ │
│  └───────────────────────┘ └──────────────────────┘ └─────────────────────┘ │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Type-Safe Query API)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE & PERSISTENCE LAYER                       │
│     Drizzle ORM (PostgreSQL) • Connection Pooling (Supabase PgBouncer :6543)│
│     Row-Level Security (RLS) • Multi-Tenant Isolation (`organizationId`)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Matrix

| Layer | Technology | Key Capabilities & Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | High-speed React Server Components (RSC), Turbopack compilation, and modern `proxy.ts` middleware. |
| **Runtime** | **React 19** | Zero-latency Server Actions, optimistic UI state transitions (`useTransition`), and client-side streaming. |
| **Styling** | **Tailwind CSS v4** | CSS-first configuration, curated HSL token system, sub-pixel borders, and high-density SaaS spacing. |
| **Database** | **Supabase PostgreSQL** | Robust relational ACID guarantees, real-time webhooks, and enterprise connection pooling. |
| **ORM** | **Drizzle ORM v0.40** | Pure TypeScript schema definitions, zero runtime overhead, and atomic transaction handling. |
| **AI Vision** | **Google Gemini 2.5 / 3.5** | High-precision visual document parsing for supplier bills, paper challans, and camera photos. |
| **Offline Cache**| **Dexie.js v5 (IndexedDB)**| Client-side offline databank storing catalogs, customers, orders, and offline transaction queues. |
| **Service Worker**| **PWA Service Worker (v16)**| Zero-latency navigation passthrough, fail-safe offline asset serving, and background sync. |
| **Validation** | **Zod Schema Engine** | Deep structural validation on both client inputs and server action mutation payloads. |

---

## 3. Master Optical Modules & Feature Matrix

### 3.1 AI Multimodal Bill Scanner & Procurement Ledger

The **Add Purchase** engine (`/shop/purchases/new`) eliminates manual supplier data entry through an integrated Gemini multimodal AI bill parser:

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Upload Bill     │ ────> │ Gemini AI Vision │ ────> │ Bidirectional   │ ────> │ Auto-Save Vendor│
│ (Image / PDF)   │       │ Structured Parse │       │ Grid Review     │       │ & Inward Stock  │
└─────────────────┘       └──────────────────┘       └─────────────────┘       └─────────────────┘
```

- **Fallback Product Code Extraction**: When a bill lacks a dedicated "Item Code" column, the AI extracts structured alphanumeric model codes directly from "Description of Goods" (e.g. `SI-20050,50-15-135,F900`). The full string is preserved intact to guarantee zero SKU collisions across frame colors and sizes.
- **Purchase Cost as Primary Price**: The supplier's final net rate is ingested as unit **Purchase Cost** (`purchasePrice`). The **Base Price** before tax is automatically back-calculated:
  $$\text{unitPrice} = \frac{\text{purchasePrice}}{1 + \frac{\text{gstPercent}}{100}}$$
- **HSN-to-Category Auto-Detection**: Extracted HSN codes automatically map against store Category Master settings using Indian Optical Statutory Chapters:
  - `9003` $\to$ **Frames** (`FRAME`, 12% GST)
  - `900410` $\to$ **Sunglasses** (`SUNGLASSES`, 18% or store GST)
  - `9001` $\to$ **Lenses** (`LENS`, 12% GST)
  - `900130` $\to$ **Contact Lenses** (`CONTACT_LENS`, 12% GST)
  - `3307` $\to$ **Solutions** (`SOLUTION`, 18% GST)
- **Interactive Column 10 (Total Purchase Cost)**: Column 10 is an editable numeric input. Typing a row total (e.g. ₹32,400 with Qty 10) dynamically derives unit Purchase Cost (₹3,240.00), Base Price (₹2,892.86), and exact tax splits down to the paise.
- **Auto-Detect & Auto-Save New Vendors**: If a supplier name or GSTIN does not exist in the database, the system automatically creates the vendor record in `vendors` upon saving the purchase order.
- **Zero Retail Price Assumption**: Retail selling prices (MRP) are strictly left blank (`0.00`) during AI import, preventing wholesale bills from dictating store selling prices.

---

### 3.2 Single-Screen High-Density POS Billing & Dual Pricing

Engineered to fit standard 13-15" laptop screens without vertical scroll fatigue (`/shop/invoices/new`):

- **High-Density 11-Column ERP Grid**: `Product Search`, `Category`, `Item Description`, `Qty`, `Price (₹)`, `Discount (₹)`, `Discount (%)`, `CGST (₹)`, `SGST (₹)`, `IGST (₹)`, `Total (₹)`.
- **Dual Direct Pricing Engine**: Typing directly into the Total Price cell automatically back-calculates unit base price, line discounts, and GST rates according to the selected category.
- **State-Aware Automated GST Distribution**: Dynamically calculates intra-state (CGST + SGST 50/50 split) vs inter-state (IGST) based on customer state matching the store location.
- **Multi-Tender Payment Ledger**: Records partial deposits, split payments (Cash, Card, UPI, Bank Transfer), and tracks outstanding balance dues with real-time mathematical validation.
- **Store Credit Redemption**: 1-click redemption of customer store credit balance earned from previous sales returns.

---

### 3.3 Specialized Optical Taxonomy, Lens Matrix & Barcode Tag Designer

- **Optical Taxonomy System**: Native attributes for frame bridge width, lens diameter, temple length, lens index (1.56, 1.61, 1.67, 1.74), coatings (Blue Cut, Anti-Reflective, Photochromic), and contact lens base curves.
- **Interactive SPH / CYL Lens Power Matrix**: High-density diopter chart featuring:
  - Toggle between **(-) Minus Power** and **(+) Plus Power** spheres.
  - Granular 0.25D incremental grid across standard and extended ranges (0.00 to ±6.00 SPH, 0.00 to -3.00 CYL).
  - Per-cell unit count input with active cell focus and aggregated stock totals.
- **Multi-Format Optical Barcode Designer**: Client-side zero-latency Code 39 SVG engine supporting 4 production label presets:
  1. `100×15 mm Butterfly / Barbell Tag`: Fold-around jewelry tag for spectacles (Left: Brand/Price; Center: Bridge fold; Right: Barcode SVG/SKU).
  2. `50×25 mm Standard Retail Label`: 2"×1" box and optical case tag.
  3. `38×25 mm Compact Jewel Label`: 1.5"×1" contact lens blister pack label.
  4. `40×30 mm Accessory Box Label`: Medium accessory and lens solution carton label.
- **Continuous & Sheet Printing**: Flawless output on thermal barcode printers (TSC, Zebra, TVS) and standard A4 laser sticker sheets.

---

### 3.4 Clinical Optometry Refraction & Prescription Engine

Dedicated optometric refraction module (`/shop/prescriptions`):

- **Comprehensive Refraction Matrix**: Detailed OD (Right Eye) and OS (Left Eye) data:
  - Spherical (`SPH`), Cylindrical (`CYL`), `AXIS` (0°–180°), Addition (`ADD`), Visual Acuity (`VA`), Pupillary Distance (`PD`), Prism, and Base.
- **Smart Clinical Shortcuts**:
  - Bilateral `ADD` auto-synchronization.
  - Monocular Pupillary Distance auto-split from binocular measurements.
  - Quick diopter datalists in 0.25D increments.
- **Multi-Category Tabs**: Dedicated views for Spectacles Rx, Contact Lens Rx, Distance Rx, and Near/Reading Rx.
- **Chronological Audit History**: Every consultation is linked to customer profiles and automatically attached to POS invoice printouts.

---

### 3.5 Order Tracking, WhatsApp Notification Suite & Document Series

- **Standardized Order Booking Workflow**: Booking an order generates an official **Order Form** (`/shop/receipts/[id]`) embedding the clinical prescription and deposit status.
- **Proactive Document Series Generator**:
  - Outlets customize document formats (`PPS-shopNum-YYYY-NNNN`) with Indian Financial Year (`FY25-26`) rules.
  - Numerical length-first sorting (`sql'length(invoice_number) DESC'`) prevents serial rollover collisions.
  - Active collision probing and retry transaction loops protect against race conditions.
- **Interactive Multi-Template WhatsApp Suite**:
  - 1-click dispatch to customer WhatsApp (`wa.me/+91...`) with 5 standardized optical retail templates:
    1. 📋 **Order Form Confirmation**: Booking details, clinical Rx, advance deposit, and balance due.
    2. 🧾 **Tax Invoice & Digital Bill**: PDF link and payment settlement badge.
    3. 👁️ **Eye Prescription Card**: Refraction metrics, PD, and examining optometrist name.
    4. 📦 **Ready for Pickup Alert**: Informs customer their spectacles are crafted and ready.
    5. 💰 **Payment Balance Reminder**: Highlights outstanding dues with payment details.

---

### 3.6 Authentic A4 Digital Document Viewer & High-Res PDF Engine

Universal document viewer (`/share/invoice/[id]`):

- **Authentic Physical A4 Layout (`210mm × 297mm`)**: Renders the exact legal GST Tax Invoice conforming to Indian GST requirements with zero layout reflows between devices.
- **Multi-Touch Pinch-to-Zoom Engine**: Fluid zoom from 0.35x to 2.5x with double-tap toggle, pan gestures, and dynamic container sizing.
- **300 DPI Vector PDF Generation**: Uses `html2pdf.js` with client-side canvas scaling to produce high-resolution, vector-crisp PDF documents.
- **Standardized Enterprise File Naming**: Auto-generates filenames as `[Store_Name]_[Invoice_Number].pdf` across browser downloads and native print dialogs.

---

### 3.7 Sales Returns, Customer Store Credit & Restocking Ledger

Merchandise return processing (`/shop/returns`):

- **Itemized Return Ingestion**: Select individual invoice line items, specify returned quantities, and flag restock condition.
- **Dual Resolution Modes**:
  - **Cash Refund**: Deducts refunded value from invoice totals and updates daily register collections.
  - **Store Credit Issuance**: Credits the customer profile (`customers.storeCredit`) and writes an immutable entry to `customer_credit_ledger`.
- **Restocking Ledger**: Automatically creates `stock_movements` entries (`RETURN_RESTOCK`) to return products to available store inventory.
- **Printable Credit Note / Return Receipt**: Generates formal A4 credit notes with customer signature lines.

---

### 3.8 Enterprise 4-Stage Bulk CSV Ingestion Wizards

High-volume data migration tools for optical store onboarding:

- **Bulk Purchases Wizard (`/shop/inventory/import`)**:
  1. *Upload*: RFC-4180 compliant CSV parser with sample template generator.
  2. *Mapping*: Smart header auto-detection (`productCode`, `category`, `unitPrice`, `retailPrice`, etc.).
  3. *Review*: 0ms catalog matching identifying existing products (🟢 Refill Stock) vs new products (🟡 New Item), with live totals preview.
  4. *Commit*: Atomic database insertion creating inventory records, stock movements, and purchase orders.
- **Bulk Invoices Wizard (`/shop/invoices/import`)**:
  - Migrates historical customer transactions with phone-number-based patient matching, legacy invoice number preservation, and multi-item grouping.

---

### 3.9 Offline-First Desktop PWA & Resilient Delta Sync

Uninterrupted POS billing during internet outages:

- **Dual-Role Service Worker (`public/sw.js` - v16)**:
  - Precaches immutable static shell assets (`/`, `/manifest.webmanifest`, SVG icons).
  - Clean `503 Service Unavailable (Offline)` handling for uncached RSC streams, preventing raw JSON crashes.
  - Zero-latency navigation passthrough for all live HTTP responses.
- **Dexie.js v5 IndexedDB Databank**:
  - Local caching of `cached_customers`, `cached_inventory`, `cached_orders`, and `cached_invoices`.
  - Scoped by `shopId` for store managers and `organizationId` for owners.
- **Offline Mutation & Invoice Queues**:
  - Offline transactions receive client-side UUIDs (`OFF-2026-XXXX`).
  - Automatic background synchronization via `/api/sync/offline-invoices` upon network reconnection.

---

### 3.10 Super Admin Control Center, Multi-Branch RBAC & Permission Matrix

- **Super Admin Platform Control Panel (`admin.opticalmanager.in`)**:
  - Dark glassmorphic portal (`/admin/login`) with platform B2B revenue telemetry, outlet counts, and subscription status.
  - Lead CRM (`/admin/leads`) capturing store demo requests with 1-click WhatsApp follow-ups.
  - Remote subscription management (+1, +3, +6, +12 month extensions and store suspension toggles).
- **Multi-Branch Hierarchy**:
  - Organization owner dashboard with consolidated revenue metrics and inter-branch performance comparisons.
  - Strict branch isolation for store managers (`shopId`).
- **Granular 12-Module Permission Matrix**:
  - Custom permissions configured per staff account: `dashboard`, `inventory`, `sales`, `returns`, `customers`, `appointments`, `analytics`, `reports`, `settings`, `support`, `edit_orders`, `delete_orders`.

---

## 4. Core End-to-End User Workflows

```mermaid
flowchart TD
    subgraph "Clinical POS & Patient Checkout Flow"
        A[Patient Walk-in] --> B[Customer Lookup / New Patient]
        B --> C[Clinical Refraction: SPH / CYL / ADD / PD]
        C --> D[POS Grid: Select Frames / Lenses]
        D --> E[Dual Pricing & Automated GST Calculation]
        E --> F[Payment Tender: Advance Deposit / Full]
        F --> G[Generate Official Order Form]
        G --> H[1-Click WhatsApp Booking Confirmation]
    end

    subgraph "Procurement & AI Bill Ingestion Flow"
        I[Supplier Paper Invoice / PDF] --> J[Upload to 'Insert with AI']
        J --> K[Gemini Vision Structured Parsing]
        K --> L[HSN-to-Category & GST Rate Match]
        L --> M[Product Code Fallback from Description]
        M --> N[Purchase Cost Math & Base Price Split]
        N --> O[Interactive Total Cost Review]
        O --> P[Auto-Save New Vendor & Inward Stock]
    end

    subgraph "Sales Returns & Store Credit Redemption"
        Q[Customer Return Request] --> R[Select Invoice & Items to Return]
        R --> S{Refund Mode?}
        S -->|Cash| T[Deduct Register Cash & Print Receipt]
        S -->|Store Credit| U[Credit Ledger Entry & Print Credit Note]
        U --> V[Future Invoice: 1-Click Credit Redemption]
    end
```

---

## 5. Master UI/UX & High-Density Design Standards

Optical Manager adheres to strict design and interaction guidelines defined in [`AGENTS.md`](./AGENTS.md):

| Standard | Rule & Specification | Implementation Impact |
| :--- | :--- | :--- |
| **High-Density Proportions** | Standard laptop screens must display key tables and KPIs without vertical scroll fatigue. | `p-3.5` to `p-4` padding for KPI cards; `py-2.5 px-4` for table rows; compact `gap-3.5` section spacing. |
| **No Duplicate CTAs** | Never duplicate primary call-to-action buttons across headers. | Sticky Topbar is the single primary source for top-level quick actions (`+ New Invoice`, `+ Add Item`). |
| **Interactive KPI States** | Metric cards must feature active selection feedback. | Selected cards feature `border-2 border-[#2563eb] shadow-md scale-[1.01]` with zero-latency table filtering. |
| **Typography & Pill Hierarchy** | Crisp titles, bold numbers, and soft HSL badges. | Headers: `text-xl font-bold tracking-tight text-slate-900`; Badges: `bg-blue-50 text-[#2563eb] font-bold text-xs`. |
| **Keyboard "Enter-as-Tab"** | High-speed data entry without mouse usage. | Pressing `Enter` advances to the next cell with text pre-selected; `Shift+Enter` moves backward; `Enter` on last cell submits. |
| **Universal Multi-Device** | Responsive across mobile, tablet, laptop, and desktop. | Horizontal scrolling tables with `min-w-[1280px]` wrapper, mobile drawer actions, and responsive A4 pinch zoom. |
| **Zero Mock Data Policy** | Strict authentic data integration. | Zero hardcoded placeholder arrays or stub responses. All components bind to live PostgreSQL queries and multi-tenant context. |

---

## 6. Directory Structure

```
optical-manager/
├── actions/                  # Mutative Server Actions (Auth, Bill Scan, Invoices, Purchases, etc.)
│   ├── bill-scan.actions.ts  # Gemini AI Vision document extraction engine
│   ├── purchase.actions.ts   # Purchase orders and automatic vendor onboarding
│   ├── invoice.actions.ts    # Sequential POS billing & invoice generation
│   └── ...
├── app/                      # Next.js 16 App Router
│   ├── (auth)/               # Authentication views (Login, Signup, Forgot Password)
│   ├── (dashboard)/          # Authenticated workspaces
│   │   ├── admin/            # Super Admin Platform Panel & Leads CRM
│   │   ├── owner/            # Organization-wide multi-shop analytics & settings
│   │   └── shop/             # Store-level operations (Inventory, POS, Prescriptions, Purchases)
│   ├── api/                  # Edge API routes (AI check, offline sync endpoints)
│   └── share/                # Public shareable A4 tax invoices (/share/invoice/[id])
├── components/               # Modular UI component architecture
│   ├── layout/               # Sticky Topbars, Sidebars, and Organization switchers
│   ├── shop/                 # High-density operational forms & tables
│   │   ├── BillScanDrawer.tsx      # AI Bill scanner drawer with preview table
│   │   ├── PurchaseAddForm.tsx     # Bidirectional purchase ledger grid
│   │   ├── NewInvoiceForm.tsx      # Single-screen high-density POS invoice form
│   │   ├── InvoiceDocument.tsx     # Authentic pixel-perfect A4 tax invoice
│   │   └── SharedInvoiceViewer.tsx # Touch-responsive pinch-to-zoom A4 viewer
│   └── ui/                   # High-density UI primitives (Button, Input, Badge, Dialog)
├── db/                       # Drizzle ORM database definitions
│   └── schema/               # 20 Relational PostgreSQL tables (organizations, shops, inventory, invoices, etc.)
├── docs/                     # Comprehensive synchronized engineering documentation
├── lib/                      # Core utility libraries, Drizzle instance, Supabase client
│   └── offline/              # Dexie v5 IndexedDB databank & mutation sync queues
├── services/                 # Server-only database read services (auth, dashboard, inventory, purchase)
├── types/                    # Global TypeScript interfaces & contract definitions
├── utils/                    # Zod schemas, document series formatters, HSL token helpers
└── proxy.ts                  # Next.js 16 Proxy Middleware route protection
```

---

## 7. Quick Start & Developer Setup

### 1. Prerequisites
- **Node.js**: v18.18 or higher (v20+ recommended).
- **PostgreSQL Database**: Active Supabase project or PostgreSQL instance.
- **Google Gemini API Key**: For multimodal bill scanning (obtained via Google AI Studio).

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Transaction Pooler (Port 6543 with pgbouncer=true is required)
DATABASE_URL=postgres://postgres.your-project:[password]@aws-0-pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Default Google Gemini API Key (or configure per organization in UI)
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Push Database Schema
Compile Drizzle ORM schemas and sync table structures to PostgreSQL:
```bash
npm run db:push
```

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 6. Verify Production Type Safety
```bash
npx tsc --noEmit
npm run build
```

---

## 8. Synchronized System Documentation Index

The system maintains 100% synchronization between code and technical documentation in the [`docs/`](./docs) directory:

| Document | Description |
| :--- | :--- |
| [**`docs/overview.md`**](./docs/overview.md) | High-level business overview, tenant models, and optical capabilities. |
| [**`docs/architecture.md`**](./docs/architecture.md) | Deep system architecture, caching topologies, and procurement engines. |
| [**`docs/user_flow.md`**](./docs/user_flow.md) | Step-by-step user journeys for billing, purchases, prescriptions, and returns. |
| [**`docs/database_schema.md`**](./docs/database_schema.md) | Schema definitions for all 20 relational PostgreSQL tables and ENUMs. |
| [**`docs/tech_stack.md`**](./docs/tech_stack.md) | Comprehensive library versions, dependencies, and rationale. |
| [**`docs/ai_spec.md`**](./docs/ai_spec.md) | Gemini multimodal AI document parsing prompt specifications and schemas. |
| [**`docs/api_routes.md`**](./docs/api_routes.md) | REST API contract, offline delta sync endpoints, and Server Action schemas. |
| [**`docs/requirements.md`**](./docs/requirements.md) | Functional, regulatory, and statutory compliance requirements (Indian GST). |
| [**`docs/services_used.md`**](./docs/services_used.md) | External third-party integrations (Supabase, Gemini, Nodemailer, WhatsApp). |

---

<div align="center">

**Built with precision for the optical retail industry.**  
*Continuous High-Density Design • Zero-Loss Pricing Mathematics • Offline-First Reliability*

</div>
