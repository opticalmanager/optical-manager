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
5. **Multi-Shop Analytics & Reporting**:
   - Owner accesses `/owner/analytics` or `/owner/reports` with a top Outlet Filter Context toolbar.
   - Defaults to **All Outlets (Combined)** aggregated across all branches, or switches to isolate specific store locations (`?shopId=<uuid>`).

---

## 2. Store POS Billing & Patient Prescription Workflow

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Select / Add │───>│ Record Eye      │───>│ Add Frame &     │───>│ Generate GST     │
│ Patient      │    │ Prescription    │    │ Lens Items      │    │ Invoice          │
└──────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Customer Selection & Billing Timestamp**:
   - Store Manager searches existing patients or registers a new patient in `/shop/invoices/new` with bi-directional Date of Birth & Age (Years) auto-calculation.
   - **Editable Invoice Date & Time**: By default, populates with the store's current local date and time. Staff can freely select any past or future billing timestamp with live indicator badges (`Live Billing Time`, `Backdated Invoice`, or `Future Billing Date`) and a one-click `Reset` control.
   - Prescriptions, invoices, payment receipts, fulfillment orders, and inventory stock movements are atomically synchronized with the selected timestamp for accurate accounting and historical audit trails.
2. **Prescription Recording**: Manager inputs SPH, CYL, Axis, V/N, and Addition diopter values for Right (OD) and Left (OS) eyes with smart optometry datalist suggestions, prescribing date tracking, and doctor attribution under `/shop/prescriptions`.
3. **Line Item Assembly & Pricing Controls**:
   - Manager adds optical inventory items (spectacle frame, anti-reflective lenses, cleaning kit) from `/shop/invoices/new` via live search autocomplete or barcode scanner.
   - **Dual Discount Synchronization**: Supports discount entry in percentage (`DISC %`) and in Rupees (`DISC ₹`) with real-time bi-directional recalculation.
   - **Editable GST Taxes**: CGST, SGST, and IGST percentages are fully editable per row with real-time rupee tax calculations displayed underneath, supporting intra-state and inter-state GST rates (0%, 5%, 12%, 18%, 28%).
4. **Checkout, Attribution & Payment**:
   - **Salesperson Attribution ("Sold By")**: Staff can record the name of the sales representative who completed the order, stamped permanently into the invoice database and printed on tax invoices and payment receipts.
   - Selects payment mode (`FULL_PAID` or `PARTIALLY_PAID` deposit) with configurable delivery schedule presets.
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

---

## 5. Promotion & WhatsApp Automation Workflow

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Configure    │───>│ Create WhatsApp │───>│ Set Event       │───>│ Monitor Sent,    │
│ Connection   │    │ Template        │    │ Trigger Rules   │    │ Delivered & Read │
└──────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Access Promotion Portal**: System Owner navigates to `/owner/promotions`.
2. **Review Overview Telemetry**: Views 4 delivery metrics (Total Sent, Delivered, Read, Replied), recent campaigns, and active triggers.
3. **Automated Trigger Rule Setup**:
   - Accesses `/owner/promotions/triggers/new` or Triggers subview.
   - Configures event type (Birthday, Post Purchase, Appointment Reminder, Re-engagement).
   - Sets relative timing (e.g. 1 Day Before, 3 Days After) and trigger time (09:00 AM).
   - Previews real-time message text rendering with variable tags (`{{1}}`, `{{2}}`) inside the live WhatsApp smartphone mockup frame.
4. **Mass Broadcast Campaigns**: Schedules promotional offer broadcasts to targeted recipient patient lists under `/owner/promotions?tab=campaigns`.

---

## 6. Super Admin Store Provisioning & Branch Management Workflow

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Admin Panel  │───>│ Input Store &   │───>│ Auto Auth User  │───>│ Live Dashboard   │
│ /admin/orgs  │    │ Owner Details   │    │ & Branch Setup  │    │ Instant Access   │
└──────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Access Tenant Stores**: Super Admin navigates to `/admin/organizations`.
2. **Click `+ Add New Store`**: Opens the comprehensive Store Provisioning modal.
3. **Input Store Profile**:
   - Enters Store/Organization Name, Main Outlet Name, Contact Mobile (10-digit validation), and City Address.
4. **Configure Owner Credentials**:
   - Sets Owner Name, Login Email, and Password with real-time match validation.
5. **Set Plan & Quotas**:
   - Selects plan tier (`TRIAL`, `BASIC`, `PRO`, `ENTERPRISE`), validity duration, and maximum allowed branch outlets.
6. **Zero-Latency Creation & Sync**:
   - Automatically registers Supabase Auth user with confirmed email, inserts organization, owner profile, main shop branch, and active subscription.
   - Optimistically updates the admin table and presents immediate confirmation.
7. **Branch Outlet Expansion**:
   - Admin can navigate to any organization (`/admin/organizations/[id]`) and click `+ Add Store Outlet` to append physical branches.
8. **Lead Conversion**:
   - Under `/admin/leads`, click `Provision Store` to convert demo requests directly into active tenant stores.
9. **Granular Shop Outlet Deletion**:
   - Inside `/admin/organizations/[id]`, click `Delete` on any branch row.
   - Requires typing `"CONFIRM"` into the verification dialog.
   - Permanently wipes only that outlet's records (inventory, invoices, appointments) while leaving the tenant organization and other branches completely unharmed.

---

## 7. Order Editing, Stock Re-balancing & Update Audit History Workflow

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Orders Table │───>│ Edit Order Page │───>│ Modify Items,   │───>│ Save, Rebalance  │
│ Click "Edit" │    │ Permissions Chk │    │ Customer & Dues │    │ & Audit History  │
└──────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Access & Permissions**:
   - Authorized operators (`OWNER`, `SUPER_ADMIN`, or staff accounts with `edit_orders === true` enabled in shop credentials) see an active **Edit** button on each row in `/shop/orders`.
   - Unauthorized staff see a locked badge indicator and are blocked server-side from accessing `/shop/orders/[id]/edit`.
2. **Comprehensive Order Modification**:
   - Operator clicks **Edit** on any order row to open `/shop/orders/[id]/edit`.
   - **Customer Details**: Edit Full Name, 10-digit Phone Number, Email, Address, City, State, and Pincode.
   - **Order & Staff Attribution**: Change salesperson attribution (`Sold By`), order date & time (with backdating picker), delivery presets (Same Day to 7 Days), and fulfillment status (`PROCESSING`, `READY`, `DELIVERED`, `ON_HOLD`).
   - **Products & Line Items**:
     - Pre-populated with current order items.
     - Add new products via real-time autocomplete search or create custom fee/repair items.
     - Delete line items or adjust quantities and unit prices.
     - Edit dual discounts (`DISC %` and `DISC ₹`) with real-time bi-directional recalculation.
     - Edit CGST, SGST, and IGST percentages with live rupee tax amount recalculations.
3. **Payment Settlement & Invoice / Receipt Regeneration**:
   - **Paid in Full**: Sets balance due to ₹0.00, marks invoice `PAID`, removes old receipts, and regenerates full Tax Invoice.
   - **Partial Advance**: User inputs amount paid, computes remaining balance due, marks invoice `PENDING`, replaces old receipts, and generates a fresh sequential payment receipt (`PPS-shopNum-YYYY-NNNN`).
4. **Automated Inventory Stock Re-balancing**:
   - Reconciled atomically within a database transaction:
     - Deleted items or decreased quantities are immediately restocked into inventory with movement type `ADJUSTMENT` (`ORDER_EDIT_RESTOCK`).
     - Added items or increased quantities are debited from inventory with movement type `SOLD` (`ORDER_EDIT_SALE`).
5. **Permanent Update Audit Trail**:
   - Every edit writes an immutable audit record to `order_edit_history` with the exact timestamp, editor's full name, role badge, human-readable modification summary, and JSON snapshot of previous vs. updated financial state.
   - The **History of Updates** section at the bottom of `/shop/orders/[id]/edit` renders the full chronological timeline of all changes made to the order.

---

## 8. Order Record Deletion & Deleted Records Retrieval Workflow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Order Edit Page  │───>│ In-Theme Warning │───>│ Soft-Delete &    │───>│ "Deleted Records"│
│ Delete Trigger   │    │ Confirmation     │    │ Auto Restock Inv │    │ Retrieve/Restore │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **Permissions & Access Control**:
   - Only System Owners, Super Admins, or staff accounts with `delete_orders` permission enabled in the outlet configuration can delete order records or access the Deleted Records panel.
   - Store owners can toggle `delete_orders` on any staff profile in `/owner/shops` (Outlet Configuration -> Access & Roles -> Store Modules).
2. **Order Record Deletion**:
   - On `/shop/orders/[id]/edit`, authorized operators find the **Danger Zone: Delete Order Record** section at the bottom of the page.
   - Clicking **Delete Order Record** triggers a custom modal built inside the application's design theme (amber warning icon, clear synchronization notes, cancellation/confirmation buttons).
   - Upon confirmation:
     - The order and linked invoice are soft-deleted (`deleted_at = NOW()`, `deleted_by = profile.id`).
     - Linked invoice status is set to `CANCELLED` so all dashboard KPIs, revenue analytics, and reports are immediately resynced.
     - All line items are automatically restocked back into store inventory (`quantity + item.quantity`), and an `ADJUSTMENT` movement is recorded in `stock_movements` (`ORDER_DELETED_RESTOCK`).
     - An audit log entry is written to `order_edit_history`.
3. **Viewing Soft-Deleted Records**:
   - On `/shop/orders` (Orders listing), authorized users see a top-right **Deleted Records** button styled in a clean, neutral SaaS theme (not red) with a dynamic record count badge.
   - Clicking opens the **Deleted Records** modal featuring live search filtering by Order Number, Invoice Number, Patient Name, or Phone Number.
   - Displays all soft-deleted records with deletion timestamps, author attribution, patient contact info, financial totals, and item counts.
4. **Record Retrieval / Restoration**:
   - In the Deleted Records modal, clicking **Retrieve** opens an in-theme confirmation prompt detailing the reverse synchronization.
   - Upon confirmation:
     - Clears soft-delete timestamps (`deleted_at = NULL`, `deleted_by = NULL`).
     - Restores invoice status to `PAID` (if balance is ₹0) or `PENDING`.
     - Automatically deducts items from current inventory stock (`quantity - item.quantity`) and logs a `SOLD` movement (`ORDER_RESTORED_SALE`).
     - An audit log entry records the restoration.
     - Telemetry, order tables, and inventory counts update with zero latency.

---

## 9. Sales Returns & Store Credit Management Workflow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Select Invoice   │───>│ Select Items to  │───>│ Refund Method:   │───>│ Generate Return  │
│ & Patient        │    │ Return & Restock │    │ Cash vs Credit   │    │ Receipt / Note   │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **Processing Sales Return (`/shop/returns/new`)**:
   - Operator selects the target invoice and specifies quantities to return with optional restock toggles and line-item condition reasons.
   - **Step 06. Return Credit & Refund Resolution**:
     - Operator chooses between **Cash Refund** (`CASH`) or **Store Credit** (`STORE_CREDIT`).
     - Real-time balance calculator displays calculated return value, allowing manual edits if required.
     - **Cash Refund**: Directly deducts refunded cash from the original invoice `total` and `amountPaid`, recalibrating revenue telemetry and cash collections across the store.
     - **Store Credit**: Preserves store cash intact and credits the refund value to the customer's account (`customers.storeCredit`), recording an immutable audit entry in `customer_credit_ledger` (`CREDIT_ISSUED`).
2. **Sales Return Receipt / Credit Note (`/shop/returns/[id]`)**:
   - Generates an official, printable A4 document (`SALES RETURN & CREDIT NOTE` when store credit is chosen, or `SALES RETURN & REFUND RECEIPT` when cash is refunded).
   - Features dynamic refund summary, mode badges, restocked items breakdown, and updated customer store credit balance.
   - A dedicated **Receipt** button on the `/shop/returns` table allows immediate one-click access and printing of return receipts.
3. **Patient Store Credit Tracking (`/shop/customers/[id]`)**:
   - In **Patient Snapshot (Section 04)**, **Pending Dues** and **Available Store Credit** are rendered side-by-side in high-density KPI cards.
   - The **Store Credit Ledger History** section displays a comprehensive timeline of every credit issued and redeemed, including reference return/invoice numbers and running balances.
4. **Redeeming Store Credit on New Invoices (`/shop/invoices/new`)**:
   - When a patient with available credit is selected, a credit badge appears in the Basic Details header and search results.
   - In **Section 5 (Payments & Summary)**, an interactive **Use Available Store Credit** card is presented with available balance, checkbox toggle, and editable amount input (with a **Max** shortcut button).
   - Credit amount is strictly validated to not exceed available credit nor the order grand total.
   - Deducts credit from net payable amount and updates the live order summary ledger.
   - Upon invoice creation, atomically decrements `customers.storeCredit`, records a `CREDIT_REDEEMED` entry in `customer_credit_ledger`, logs `creditApplied` on the invoice, and reflects the credit deduction on printable tax invoices and payment receipts.

---

## 10. PWA Offline Billing & Device Synchronization Workflow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Network Drops /  │───>│ Search Cached    │───>│ Save to Local    │───>│ Reconnect & Sync│
│ Go Offline       │    │ Patients & Stock │    │ Device Queue     │    │ to Cloud Engine  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **Automatic Offline Detection & Session Retention**:
   - When the store device loses internet connectivity, the user remains fully authenticated. Local session cookies and IndexedDB profile metadata ensure the application never kicks the user out to `/login` or triggers infinite redirect loops.
   - The Service Worker features an **Instant Offline Circuit Breaker** that detects `!navigator.onLine` and serves cached application shells in 0ms without waiting for slow, failing cloud network connections, eliminating 59-second browser timeout hangs.
    - The topbar (in both Shop Manager and Owner portals) features dedicated, real-time controls beside the primary action buttons:
      - **Online / Offline Pill**: Displays green `Online` with a pulsing dot when connected; switches to amber `Offline` when disconnected.
      - **Syncing... / Synced Indicator**: Displays green `Syncing...` with an animated spinner while data syncing is in progress; switches to green `Synced` with a checkmark when complete (allowing manual one-click re-sync).
      - **Pending Bills Badge**: Displays count of uncommitted offline invoices with one-click cloud upload.
2. **Full Offline Store Operations (Zero-Latency Navigation)**:
   - **New Invoices (`/shop/invoices/new`)**: Patient search queries local `cached_customers`, line item search queries `cached_inventory`, auto-populating brand, model, SKU, price, and GST rates directly from local device cache.
   - **Customer Records (`/shop/customers`)**: Automatically renders cached patient list from IndexedDB with fast search and status filters.
   - **Inventory Catalog (`/shop/inventory`)**: Displays full stock matrix, SKU quantities, and category filters from local device memory with 0ms latency.
   - **Appointments Calendar (`/shop/appointments`)**: Renders day, week, and month appointment views from local IndexedDB databank.
   - **Orders Management (`/shop/orders`)**: Merges locally queued offline invoices and cached cloud orders into the main order tracking table.
3. **Local Queueing & Immediate Printing**:
   - Submitting an invoice offline assigns a temporary sequential number (`OFF-2026-XXXX`) and persists the payload into `offline_invoices_queue`.
   - The line item quantities are deducted immediately from local stock cache so subsequent offline bills accurately reflect inventory counts.
   - Staff is redirected to the offline invoice viewer (`/shop/invoices/offline/[id]`), where the bill can be printed immediately via `window.print()` using standard invoice formatting (with shop name, address, contact, and GSTIN, and without any watermarks).
4. **Seamless Cloud Synchronization & Persistent Delta Sync**:
   - When network connectivity is restored, the `OfflineProvider` automatically triggers batch synchronization with `POST /api/sync/offline-invoices`.
   - Cloud backend validates the invoices, generates official sequential invoice numbers (`INV-2026-XXXX`), creates order/receipt records, and reconciles PostgreSQL stock.
   - After synchronization, `GET /api/offline/sync-all?since=...` runs an incremental delta synchronization returning only records modified since the previous sync timestamp, saving bandwidth and merging updates seamlessly via `Dexie.bulkPut` without wiping existing records.
   - All customer, product, appointment, and order data persists safely in local IndexedDB across browser reboots and restarts for the same shop account.
   - Once synced, local queue items update to `SYNCED` and the topbar status displays green `Synced`.
5. **Universal Desktop PWA Installation & Terminal Experience**:
   - Users can install Optical Manager as a native desktop application on Windows, macOS, Chrome OS, Android, and iOS using the desktop installation button in the topbar or landing page.
   - Launching the desktop application opens directly into the active store POS terminal, bypassing marketing pages and landing views.

