# OpticalManager Ecosystem - Project Context

**Document Purpose:** This document serves as the "Brain" of the OpticalManager ecosystem. It is an exhaustive, detailed reference designed to allow AI agents and developers to fully understand the CRM architecture, product features, user roles, and technology stack without needing to read the source code.

---

## 1. Executive Summary

**OpticalManager** is a **multi-tenant SaaS CRM platform** engineered specifically for optical retail chains and individual optical stores. 

* **Product Name:** Optical Manager
* **Tagline:** "Multi-tenant SaaS CRM for optical stores — manage shops, customers, prescriptions, inventory, and invoices."
* **Production Deployment:** [https://www.opticalmanager.in](https://www.opticalmanager.in)
* **Hosting:** AWS Amplify

---

## 2. Primary Users & Roles

The system is built around three primary user roles, each with distinct access scopes and capabilities:

1. **SUPER_ADMIN**
   * **Role:** Platform-level administrator.
   * **Access:** Dedicated admin panel hosted at `admin.opticalmanager.in`. Cannot log in via the main SaaS site.
   * **Capabilities:** View all organizations, manage demo requests, lead management, and handle subscriptions (extend, suspend, activate).

2. **OWNER**
   * **Role:** Store chain owner (Primary Tenant).
   * **Access:** Main application under `/owner/*` routes.
   * **Capabilities:** Account creation, organization setup, shop management, and full read/write access across *all* shops within their organization. Owners can impersonate specific shop contexts using a cookie-based mechanism (`active_shop_context_id`).

3. **SHOP_MANAGER & Staff Access Roles (RBAC)**
   * **Role:** Individual store staff, optometrists, cashiers, and shop managers.
   * **Access:** Main application under `/shop/*` routes. Scoped strictly to their assigned shop.
   * **Capabilities:** Created and configured by the Owner under `/owner/shops` (Configure Outlet > Access & Roles). The Owner can create multiple staff accounts per store, assign custom role titles (e.g. "Store Manager", "Optometrist", "Sales & Billing", "Cashier"), and toggle granular navigation module permissions (`dashboard`, `inventory`, `sales`, `returns`, `customers`, `appointments`, `analytics`, `reports`, `settings`, `support`). Sidebar items and route permissions dynamically adjust based on assigned permissions.


---

## 3. Multi-Tenancy Architecture

Data isolation is a critical architectural pillar for OpticalManager.
* **Hierarchy:** 
  * Every **Organization** has completely isolated data.
  * An Organization has many **Shops** (branches).
  * Each Shop manages its own Customers, Inventory, Invoices, Orders, and Prescriptions.
* **Customer Mapping:** Each Customer belongs to exactly *one* Shop and *one* Organization.
* **Foreign Keys:** All major database tables feature both `shop_id` and `organization_id` foreign keys to enforce strict data isolation.
* **Security Enforcement:** Data isolation is enforced at the application layer (within service/action logic) rather than via PostgreSQL Row Level Security (RLS).

---

## 4. Modules & Core Features

### 4.1. Customer Management (Patients)
* **Registration:** Comprehensive patient registration including clinical fields (chief complaint, family history, systemic illness, allergies).
* **Demographics:** Name, email, phone, DOB, gender, blood group, address (city, state, pincode).
* **Auto-generation:** Registration IDs follow the format: `OP-{shopNum}-{YYYY}-{NNNN}`.
* **Tracking:** Tracks "Referred-by" and features doctor name autocomplete based on historical data.
* **Profiles:** Customer profile pages aggregate full history, including prescriptions, invoices, and pending dues.

### 4.2. Prescription Management
* **Comprehensive Metrics:** Records full ophthalmic prescriptions for OD (right eye) and OS (left eye).
* **Fields:** Sphere, Cylinder, Axis, Add, NV per eye.
* **Pupillary Distance (PD):** Supports combined PD or split PD (Right/Left).
* **Types:** DISTANCE, NEAR.
* **Metadata:** Captures doctor name, party name, frame name, estimated delivery, and special instructions. Linked via `customer_id`.

### 4.3. Inventory Management
* **Categories:** 5 primary categories — FRAME, LENS, CONTACT_LENS, ACCESSORY, SOLUTION.
* **Category-Specific Details:**
  * *Frames:* Model number, color code, size, material, frame shape, target demographic.
  * *Lenses:* Design, refractive index, material, blank diameter, stock power, coatings (anti-reflective, blue control, tinted, polarized, hard coat, photochromic).
  * *Contact Lenses:* Modality, box quantity, base curve, diameter, color, sphere, cylinder, axis, add power.
  * *Accessories:* Type, size/volume, color/pattern.
* **Financials:** Full GST tax support (CGST%, SGST%, IGST%, HSN code).
* **Stock Tracking:** Quantity, minimum quantity alerts, vendor, rack location, batch number, expiry date. SKU auto-generation.
* **Stock Ledger:** Full audit trail tracking STOCK_IN, SOLD, ADJUSTMENT, RETURN, INITIAL movements. Tracks purchase invoices (number, inward date).

### 4.4. Invoicing & Billing
* **Auto-generation:** Invoice numbers format: `INV-{shopNum}-{YYYY}-{NNNN}`.
* **Line Items:** Granular control per item (quantity, unit price, discount%, discount amount, CGST%,/amount, SGST%/amount, IGST%/amount).
* **Statuses:** DRAFT, PENDING, PAID, CANCELLED.
* **Fulfillment:** PROCESSING, READY, DELIVERED, ON_HOLD.
* **Payments:** Supports CASH, CARD, UPI, BANK_TRANSFER. Handles partial payments (`amount_paid`, `balance_due`).
* **Deliverables:** Estimated delivery dates with rescheduling flags, PDF invoice generation, and public shareable invoice links at `/share/invoice/[id]`.

### 4.5. Orders & Receipts
* **Orders:** Auto-created upon invoice finalization. Format: `ORD-{shopNum}-{YYYY}-{NNNN}`.
* **Receipts:** Individual payment trackers per invoice (supporting partial payment flows). Format: `PPS-{shopNum}-{YYYY}-{NNNN}`. Captures amount paid, balance due, payment method, and transaction ID.

### 4.6. Product Returns & Credit Notes
* **Workflow:** 5-step return wizard matching clinical retail workflow.
* **Invoice Lookup:** Search by invoice number with live debounced autocomplete or customer phone number.
* **Inspection Reasons:** LOOKS_NEW, MINOR_WEAR, DAMAGED, WRONG_PRODUCT, MANUFACTURING_DEFECT, WARRANTY_CLAIM.
* **Final Actions:** RESTOCK_INVENTORY (adds stock back + logs RETURN movement), REPAIR_AT_STORE, SEND_TO_VENDOR, SCRAP_DAMAGE, HOLD_FOR_INSPECTION.
* **Financials:** Automatic credit calculation, subtraction from invoice total, balance recalculation.
* **Documentation:** Sequential return credit notes (`RET-{shopNum}-{YYYY}-{NNNN}`) with printable credit note vouchers.


### 4.6. Appointments & Booking
* **Public Booking:** Dedicated public page at `/book/{organization-slug}`.
* **Customization:** Configurable fields, visit purposes, page title/subtitle, primary color, button text.
* **Management:** Walk-in appointment creation for staff. Statuses: PENDING, CONFIRMED, COMPLETED, CANCELLED.
* **Workspace:** Calendar view with KPI tracking (today's count, upcoming, pending, completed, cancelled).

### 4.7. Reports & Analytics
* **Dashboards:** 
  * *Shop-level:* Revenue charts, delivery donut, category sales.
  * *Owner-level:* Multi-shop aggregation.
* **Exports:** CSV export functionality for orders and reports.
* **Types:** Sales, Inventory, Customer reports with robust date-range filtering.

### 4.8. Email System
* **Integration:** Gmail SMTP with encrypted app passwords. Configured *per organization*.
* **Rate Limiting:** Enforces limits of 30/minute, 250/hour, 490/day.
* **Templates:** Categories (INVOICE, RECEIPT, REMINDER, WELCOME, APPOINTMENT, CUSTOM) with variable substitution (`{{variable_name}}`).
* **Automation:** Triggered on events (CUSTOMER_CREATED, INVOICE_CREATED, PAYMENT_RECEIVED, APPOINTMENT_BOOKED, APPOINTMENT_REMINDER).
* **Logging:** Status tracking (SENT, FAILED, RATE_LIMITED, QUEUED) and SMTP self-verification testing.

### 4.9. WhatsApp Promotions (Planned Feature)
* **Integration:** WhatsApp Business API per organization.
* **Templates:** MARKETING, UTILITY, AUTHENTICATION.
* **Automation:** Triggers for BIRTHDAY, PURCHASE, APPOINTMENT, RE_ENGAGEMENT.
* **Campaigns:** Audience targeting and analytics (total sent, delivered, read, replied).

### 4.10. Admin Panel (Platform Telemetry)
* **Subdomain:** `admin.opticalmanager.in`
* **Metrics:** Tracks total organizations, shops, active subscriptions, pending leads, revenue.
* **Management:** View org details, shops, and managers. Handle subscriptions (extend, suspend, activate).
* **CRM:** Demo request pipeline (PENDING → CONTACTED → DEMO_SCHEDULED → APPROVED/REJECTED) and lead management.

### 4.11. Onboarding Flow
* **Step 1:** Organization details (name, slug, email, phone, address).
* **Step 2:** First shop setup with optional manager credentials.
* **Provisioning:** Creates Supabase auth account for the shop manager via Admin API and flags `onboarding_completed = true`.

### 4.12. Subscriptions
* **Plans:** TRIAL (14 days), BASIC, PRO, ENTERPRISE.
* **Billing Cycles:** MONTHLY, YEARLY.
* **Statuses:** ACTIVE, EXPIRED, SUSPENDED, CANCELLED.
* **Enforcement:** Limits on max shops and users based on plan tier. Automatic trial initiation upon signup.

---

## 5. Technology Stack

* **Framework:** Next.js 16.2.4 (App Router, React 19.2.4)
* **Language:** TypeScript 5
* **Database:** PostgreSQL (Supabase-hosted, Neon-compatible)
* **ORM:** Drizzle ORM 0.40.1
* **Authentication:** Supabase Auth (Email/Password + Google OAuth)
* **Styling & UI:** TailwindCSS 4, shadcn/ui (base-nova style)
* **Forms & Validation:** react-hook-form + Zod
* **Data Visualization:** Recharts 3.9.2
* **Email:** Nodemailer (Gmail SMTP)
* **Hosting / Infrastructure:** AWS Amplify
* **Icons:** lucide-react
* **Notifications:** sonner
* **Analytics:** Vercel Speed Insights

---

## 6. Future Planned Ecosystem Products

1. **OpticalManager Broadcast:** A dedicated WhatsApp/Email broadcasting SaaS scheduled to be hosted at `broadcasting.opticalmanager.in`.
2. **AI Calling:** Automated patient follow-up calls integration.
3. **Advanced Analytics:** Comprehensive business intelligence dashboards for chain owners.

---

## 7. Domain & URLs Reference

* **Main Application:** `https://www.opticalmanager.in`
* **Admin Panel:** `https://admin.opticalmanager.in`
* **Public Booking URLs:** `https://www.opticalmanager.in/book/{slug}`
* **Public Invoice URLs:** `https://www.opticalmanager.in/share/invoice/{id}`

---

## 8. Team Structure

* **Gaurav Tiwari** — Head of Tech
* **Deepak Mishra** — Head of Research & UI/UX
