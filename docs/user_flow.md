# User Journeys & Workflows

This document outlines the end-to-end user workflows for System Owners, Store Managers, and Public Patients in Optical Manager.

---

## 1. System Owner Onboarding & Multi-Shop Setup

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Sign Up /    │───>│ Create          │───>│ Add Shop        │───>│ Invite & Assign  │
│ Login        │    │ Organization    │    │ Outlets         │    │ Shop Managers    │
└──────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Owner Registration**: System Owner registers via `/signup` or authenticates via `/login`.
2. **Organization Creation**: If no organization exists, owner is guided through `/onboarding` to set up their clinical organization profile.
3. **Shop Outlet Configuration**: Owner adds store locations (`/owner/shops`) with store names, addresses, phone numbers, and GST details.
4. **Manager Delegation**: Owner invites shop managers (`/owner/shop-managers`) and assigns them to specific store branches.

---

## 2. Store POS Billing & Patient Prescription Workflow

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Select / Add │───>│ Record Eye      │───>│ Add Frame &     │───>│ Generate GST     │
│ Patient      │    │ Prescription    │    │ Lens Items      │    │ Invoice          │
└──────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Customer Selection**: Store Manager searches existing patients or registers a new patient in `/shop/patients/new`.
2. **Prescription Recording**: Manager inputs SPH, CYL, Axis, and Addition values for Right (OD) and Left (OS) eyes under `/shop/prescriptions`.
3. **Line Item Assembly**: Manager adds optical inventory items (spectacle frame, anti-reflective lenses, cleaning kit) from `/shop/invoices/new`.
4. **Checkout & Partial Payment**:
   - Applies GST rates (12% / 18%) and HSN codes (`9004` / `9001`).
   - Selects payment mode (`FULL_PAID` or `PARTIALLY_PAID` deposit).
   - Generates digital invoice link (`/share/invoice/[id]`) and dispatches email receipt.

---

## 3. Public Patient Appointment Booking

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Visit        │───>│ Select Date &   │───>│ Enter Patient   │───>│ Instant Slot     │
│ /book/[slug] │    │ Time Slot       │    │ Details         │    │ Confirmation     │
└──────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Public Landing**: Patient accesses store booking URL (`/book/sarita-vihar-optical`).
2. **Slot Selection**: Patient picks an available date and consultation slot based on store operational hours.
3. **Information Entry**: Patient enters full name, mobile number, email address, and reason for visit (Eye Exam / Frame Fitting).
4. **Confirmation & Sync**: Booking is saved directly to store database (`appointments` table) and appears on the shop's `/shop/appointments` calendar.

---

## 4. Dual-Period Granularity Analytics Workflow

1. **Access Telemetry**: Store Manager navigates to `/shop/analytics`.
2. **Configure Comparison**: Click **Compare Periods...** to open the `CompareModal`.
3. **Select Granularity**: Choose granularity (**Day**, **Week**, **Month**, **Quarter**, **Year**).
4. **Pick Dual Windows**:
   - Select **Primary Period (A)** (e.g. `Week 29 (Jul 13 - Jul 19)`).
   - Select **Baseline Period (B)** (e.g. `Week 28 (Jul 6 - Jul 12)`).
5. **Analyze Telemetry**: Review side-by-side KPI values, growth percentages (`↑ +14.2%`), and dual-line revenue trajectory charts.
