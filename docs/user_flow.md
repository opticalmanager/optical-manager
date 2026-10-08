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
5. **Multi-Shop Executive Dashboard & Reporting**:
   - Owner lands on the main dashboard (`/owner`), displaying multi-store enterprise KPIs (Revenue growth, invoices count, receivables, active customers, total stores), customer bifurcation (Only Frame, Only Lens, Both), 90-day dead stock analysis, stock category valuation donut, return rates, 5-tab sales bifurcation (Lenses, Frames, Brands, Gender, Age), customer retention rates, and recent transactions across the business chain.
   - Interactive timeframe picker (`?timeframe=...`) allows switching between Today, Yesterday, 7 Days, 30 Days, Quarter, 12 Months, YTD, and All Time.
   - Accesses `/owner/analytics` or `/owner/reports` with a top Outlet Filter Context toolbar, defaulting to All Outlets or filtering by specific branch (`?shopId=<uuid>`).
6. **Store & Module Customization Suite (`/owner/settings/customization`)**:
   - System Owner accesses the dedicated Customization suite via `/owner/settings` or deep-links directly via `?tab=<module>`.
   - Two-pane responsive workspace allows navigating between all 8 modules (Dashboard, Inventory, Sales & Orders, Invoices, Vendors, Customers & Clinical, Appointments, Reports).
   - Target Scope switcher allows toggling between Organization-wide defaults and branch-specific shop overrides.
   - Real-time draft tracking and sticky save bar persist configurations to `organizations.settings.customization` or `shops.settings.customization`.

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
2. **Prescription Recording & Past Rx Selection**:
   - **Smart Past Prescription Dropdown**: When an existing patient is loaded from the database or via URL (`?customerId=...`), a high-density prescription selection bar displays all historical exams with date, doctor, and OD/OS power previews. Optometrists can switch between past records to auto-populate refraction inputs or select `+ Blank / Fresh Prescription Exam` to test and save fresh readings.
   - Features the unified high-density **Clinical Prescription Card** (`SPECT(S) RX / CLINICAL PRESCRIPTION`) across `/shop/invoices/new`, `/shop/patients/new`, `/shop/customers/[id]`, and printable invoices.
   - Refraction tabs (`Spect(s) Rx`, `CL Rx`, `Distance`, `Near`) and sequential Rx ID tracking (`Rx #PR-XXXX`).
   - 8-column optometry grid (`EYE/TYPE`, `SPHL. (SPH)`, `CYL. (CYL)`, `AXIS (°)`, `ADDN. (ADD)`, `VISION (V/N)`, `P.D. (MM)`, `CADD`) for Right (`• RE (OD)`) and Left (`• LE (OS)`) eyes.
   - Smart industrial logic: highlighted ADD column, bilateral ADD diopter auto-sync, monocular PD auto-split (`31.5mm / 31.5mm`), lens design selection (`Single Vision`, `Bifocal`, `Progressive`, `Blue-cut`, etc.), and doctor attribution.
   - **Zero-Latency Reactive Syncing**: Removed manual "Apply to Job" button; all prescription data continuously updates form state and commits automatically when saving bills or patients.
3. **Line Item Assembly & Pricing Controls (11-Column ERP Ledger Grid)**:
   - Manager adds optical inventory items (spectacle frames, lenses, contact lenses, accessories) from `/shop/invoices/new` via live search autocomplete or barcode scanner.
   - **Column 1 — Product Search & Item Code**: Search input with instant 0ms IndexedDB local lookup and cloud enrichment. Once an item is chosen, displays exclusively the item code badge (Barcode, Product Code, or SKU) below the input, leaving product names and brands for the description column.
   - **Column 2 — Category Auto-Suggest & State-Aware GST Sync**: Category combobox/dropdown pre-loaded with defaults (`Frames`, `Lenses`, `Sunglasses`, etc.) and custom categories. Selecting a category automatically computes tax rates according to customer state vs shop state (Intra-State: CGST + SGST; Inter-State: IGST).
   - **Column 3 — Item Description**: Clean editable input formatted with product name, brand, model, and specifications, with full hover tooltips (`title`) so long text is never truncated or hidden.
   - **Columns 4 & 5 — Qty & Price (₹)**: Centered integer input for quantity and right-aligned decimal input for unit price, without rupee glyphs inside the input cell.
   - **Columns 6 & 7 — Dual Discount Synchronization**: Supports discount entry in Rupees (`Disc (₹)`) and percentage (`Disc (%)`) with bi-directional syncing, strictly capped to line subtotal and 100%.
   - **Columns 8, 9 & 10 — Dual-Editable Taxes (CGST, SGST, IGST)**: Both the tax amount (top) and percentage rate (bottom) are fully editable with bi-directional recalculation. No rupee symbols inside the inputs.
   - **Column 11 — Direct Editable Total Price & Auto-Backcalculation**: Directly editable numeric cell allowing staff to enter negotiated all-inclusive customer totals (e.g. ₹1,000 flat). The system instantly back-calculates taxable base price and statutory GST amounts according to the selected item category with zero penny discrepancy. Selecting or changing category with an entered total automatically updates base price and tax amounts in zero latency while maintaining the user's total price.
   - **Horizontal Responsiveness**: Table container includes `min-w-[1280px]` and silky horizontal scrolling, ensuring no columns are squeezed or obscured on smaller viewports.
4. **Checkout, Delivery Date & Payment**:
   - **Salesperson Attribution ("Sold By")**: Staff can record the name of the sales representative who completed the order, stamped permanently into the invoice database and printed on tax invoices and payment receipts.
   - **Expected Delivery Scheduling**: Selects or enters estimated dispatch date with zero default assumptions. Supports interactive calendar picker (`showPicker()`), dynamic day interval readout (`X Days (DD MMM YYYY)`), and quick preset pills (`0D Today`, `3D`, `7D`, `✕ Clear`).
   - **Payment Execution & Draft Saving**: Selects payment method (Cash, Card, UPI, Bank Transfer) and payment type (`Full Payment` or `Partial Payment` with auto-calculated balance due). Offers bottom actions `[ Save Draft ]` and `[ Book Order ]`. Clicking `Book Order` executes the atomic booking transaction, generates the customer's optical **Order Form** with complete prescription data, and immediately redirects the user to the Order Form preview (`/shop/receipts/[id]`) for printing or WhatsApp transmission. In partial payment scenarios, the final Tax Invoice is generated once all dues are settled; in full payment scenarios, both the Order Form and Tax Invoice are generated simultaneously and remain accessible in the Orders Table.
   - Generates digital document links and dispatches WhatsApp/Email notifications.

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

## 7. Orders Management Hub & Multi-Criteria Industrial Filtering Workflow

```
┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Orders Hub       │───>│ Filter Popover  │───>│ Active Chips    │───>│ Filtered Table & │
│ /shop/orders     │    │ Multi-Criteria  │    │ 1-Click Remove  │    │ CSV Export Sync  │
└──────────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Interactive Filter Popover (`OrdersFilterPopover`)**:
   - Replaced dead static filter button with a high-density, accessible filter popover modal.
   - Live counter badge (`bg-blue-600 text-white rounded-full`) indicates the number of active filters.
   - Dismisses cleanly via backdrop click or `Escape` keyboard shortcut.
2. **Multi-Dimensional Business Criteria**:
   - **Delivery / Fulfillment Status**: `ALL`, `PENDING`, `READY`, `PROCESSING`, `DELIVERED`, `DELAYED` (overdue beyond estimated delivery date), and `ON_HOLD`.
   - **Payment Status**: `ALL`, `PAID` (`balanceDue <= 0`), `PARTIALLY_PAID` (`balanceDue > 0` and `amountPaid > 0`), and `UNPAID` (`amountPaid == 0`).
   - **Payment Mode / Method**: `ALL`, `CASH`, `UPI`, `CARD`, `BANK_TRANSFER`.
   - **Timeframe / Range**: `24h` (Today), `yesterday`, `7d`, `30d`, `90d`, `12m`, `ytd`, and `all`.
   - **Pending Balance Dues Toggle**: Instant toggle switch isolating orders with outstanding dues (`hasDues=true` where `balanceDue > 0`).
3. **Active Filter Chips Bar (`ActiveOrderFilterChips`)**:
   - Rendered directly above the main table card.
   - Shows active criteria badges with label, value, and interactive `×` removal button.
   - Includes a one-click "Clear All Filters" button.
4. **URL Synchronization & Export Integrity**:
   - All criteria are synchronized bi-directionally with URL query parameters (`searchParams`).
   - Filter state is strictly preserved during pagination, full-text searches, and top KPI selection clicks.
   - CSV export (`/api/orders/export`) accepts `paymentMethod`, `hasDues`, `filter`, `tab`, `timeframe`, and `search`, ensuring downloaded spreadsheets match the exact on-screen filtered dataset.

---

## 8. Order Editing, Stock Re-balancing & Update Audit History Workflow

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

---

## 11. Category GST Rates & Custom Product Categories Master Workflow

```
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│ Settings: Category GST  │───>│ Add Custom Category /   │───>│ Auto-Filled Rates on    │
│ Matrix & 50/50 Sync     │    │ Edit Existing Rates     │    │ Add Product & Ledger    │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

1. **High-Density Category GST Rates Matrix (`/shop/settings`, `/owner/settings`)**:
   - Displays all organization product categories in a compact, structured matrix with editable fields for:
     - **Product Category Name**: Displays default system label or editable text for custom categories.
     - **Category Code**: Uppercase code tag (e.g. `FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SUNGLASSES`).
     - **Default HSN Code**: Standard global or national tax classification (e.g., `90049000`, `90015000`, `90013000`).
     - **CGST (%) & SGST (%)**: Intra-state tax percentages.
     - **IGST (%)**: Inter-state tax percentage.
     - **Smart GST Sync**: Modifying IGST (%) automatically divides 50/50 into CGST (%) and SGST (%) with live bidirectional synchronization.
     - **Category Badges**: Distinguishes between protected `Default` system categories and merchant-created `Custom` categories.
     - **Actions**: Provides a deletion trigger for custom categories with cascade validation.

2. **Custom Product Category Creation**:
   - Operators click **New Category** to open a compact creation dialog.
   - Enter Category Name (e.g. "Sunglasses", "Reading Glasses", "Solutions").
   - Category code is automatically generated in uppercase format.
   - Specify Default HSN Code and IGST percentage (automatically calculating CGST and SGST).
   - Saves immediately to the database via `createCategoryAction` and updates the IndexedDB cache `cached_product_categories`.

3. **Dynamic Add Product Experience (`/shop/inventory/add`)**:
   - The Add Product page dynamically loads all active organization categories and renders dynamic category switcher tabs.
   - Selecting any category automatically pre-fills that category's configured HSN code, CGST, SGST, and IGST percentages.
   - System categories render their dedicated specialization forms (`AddFrameItemForm`, `AddLensItemForm`, `AddContactLensItemForm`, `AddAccessoryItemForm`).
   - Custom categories automatically render the flexible `AddGeneralItemForm`, allowing complete item metadata capture, stock inwarding, and live SKU generation.
   - Operators can still override tax rates or HSN codes per item in the form when needed.

4. **Dynamic Inventory Ledger & Filter Tabs (`/shop/inventory`)**:
   - Category filter pills on the Inventory Ledger dynamically render all custom categories alongside system defaults.
   - Selecting a custom category dynamically updates KPI cards (`Total SKU Count`, `Low Stock Alerts`, `Out of Stock`, `Total Inventory Value`) and filters the product table in 0ms.

---

## 12. Purchases & Inward Supply Navigation Workflow

```
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│ Left Navigation:        │───>│ Hover on Purchases:     │───>│ Route Placeholder      │
│ "Purchases" Below Sales │    │ "Purchases Add" / Vendor│    │ Ready for Page Logic    │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

1. **Sidebar Navigation Placement**:
   - Positioned immediately below "Sales" in the store manager left sidebar.
   - Accessible based on the `purchases` permission in `ModulePermissions` (with graceful fallback to `inventory` permission for existing accounts).

2. **Interactive Hover & Collapsed Flyout Logic**:
   - **Expanded Sidebar**: Hovering on the "Purchases" item automatically reveals sub-menu buttons:
     - **Purchases Add** (links to `/shop/purchases/new` or `/shop/purchases/add`)
     - **Vendors** (links to `/shop/purchases/vendors`)
     - Supported with click-to-pin toggle and automatic expansion when navigating within purchases routes.
   - **Collapsed Sidebar (`isCollapsed === true`)**: Hovering over the Purchases icon displays a floating flyout popover immediately adjacent to the collapsed sidebar with the module title and direct links to both sub-actions.

3. **Purchases Add Interface Workflow (`/shop/purchases/new`)**:
   - **Header Configuration**:
     - Operator sets or reviews the inward **Date** (defaults to current date).
     - Configures **# Tax Rule** (`Exclude` by default, or `Include`).
     - Sets **Tax Type** (`SGST/CGST` for intra-state supplier invoices, or `IGST` for inter-state inward).
     - Selects or creates **Vendor Name** via searchable combobox with live GSTIN preview and inline `+ Add New Vendor` registration modal.
     - Enters supplier **Purchase Bill Number** (e.g. `122` or `INV-9901`).

   - **High-Density Single-Screen Spreadsheet Table Grid**:
     - Proportional column widths fitted to screen without horizontal scrolling: `# (3%) | Product Code (14%) | Category (11%) | Details (10%) | Base Price (8%) | HSN (7%) | GST % (5%) | Purchase Cost (9%) | Qty (6%) | Total Purchase Cost (11%) | Retail Price MRP (12%) | Action (4%)`.
     - Zero-gap spreadsheet styling (`border-collapse`, `border-slate-200`) with keyboard navigation (`Enter` key moves cell-to-cell, and pressing `Enter` on the last cell of the last row automatically creates a new row).
     - **Product Code vs. System SKU Separation**:
       - `Product Code` represents the vendor/user catalog code (e.g., `RB-2132`, `GG0010S`), scoped and checked uniquely per vendor.
       - `SKU` represents the internal system-generated unique stock-keeping unit (e.g. `FRM-RAY213-000-001`), automatically generated by `generateSKU()` and sequential counter upon catalog insertion.
     - **Vendor-Scoped Product Code Autocomplete**:
       - As operator types into `Product Code`, debounced search queries existing catalog items via `/api/inventory/search?q=...&vendor=...`, prioritizing items from the selected vendor.
       - If product exists in database, an instant suggestion dropdown shows matching items. Selecting an item auto-populates `productName`, `category`, `details`, `basePrice`, `hsnCode`, `gstPercent`, `purchaseCost`, and `retailPrice`. The `Quantity` column is intentionally left blank so operator specifies newly inwarded quantity. All fields remain 100% editable.
       - If product code is not found, the `Details` cell displays an amber `{+ Add Product}` action badge.
     - **Enlarged & Category-Rich Product Details Modal**:
       - Clicking `{+ Add Product}` or `Details` opens a spacious `w-[96vw] max-w-5xl h-[92vh] max-h-[780px]` modal dialog designed to comfortably fit laptop screens without border overflow.
       - Top category switcher tabs (`Frames`, `Lenses`, `Contact Lenses`, `Accessories`, `Solutions`, etc.) dynamically switch the category context.
       - Switching category immediately auto-fills configured HSN code and GST rates from the organization's dynamic category tax data (`product_categories`).
       - Features complete category-specific attribute panels:
         - **Frames**: Shape, Rim Type, Material, Color, Size, Gender.
         - **Lenses**: Lens Design, Refractive Index (1.50 to 1.74), Lens Coating (ARC, Blue Cut, Photochromic, Hard Coat, Polarized, Tinted, Uncoated), Power Range, and **Lens Power SPH / CYL Stock Matrix** popup (`[ Open Power Matrix ]`) for entering multi-power stock breakdowns with automatic inward quantity synchronization.
         - **Contact Lenses**: Modality (Daily, Monthly, etc.), Pack Size, Base Curve (BC), Diameter (DIA), Cosmetic Tint, Sphere.
         - **Accessories & Solutions**: Item Type, Size/Volume/Specification.
       - Universal financial summary shows `Basic Price`, `GST Amount Rs`, and `Total Purchase Cost` with live 50/50 tax split.
       - Product code uniqueness is checked specifically for the selected vendor.
       - On confirmation, the product is registered in the database catalog with initial quantity 0 and full category specifications, and the purchase row is immediately populated.

   - **Real-Time Financial Calibrations & Summary**:
     - Bi-directional price recalculation (`Base Price` $\leftrightarrow$ `Purchase Cost` $\times$ `Qty` = `Total Purchase Cost`).
     - Bottom-right summary card calculates:
       - `Total Quantity`: Sum of all inward quantities.
       - `Total Unit Amount`: Sum of unit acquisition costs.
       - `Total Base Price`: Sum of line base amounts.
       - `Total GST Amount`: Sum of tax values.
       - `Total Purchase`: Grand invoice total.
       - `Round Off (+/-)`: Editable adjustment field.
       - `Total Net Purchase`: Final net payable amount.

   - **Order Finalization**:
     - **Save As Draft**: Persists the purchase order with status `DRAFT` in `purchase_orders` and `purchase_order_items`. Does not alter live inventory stock levels.
     - **Add Purchase**: Persists order with status `COMPLETED`, atomically increments inventory stock quantities (`quantity += row.quantity`), updates latest cost price and retail price, links purchase invoice number and inward date, and logs individual `STOCK_IN` movements in `stock_movements`.
     - **Automatic Ledger Redirection**: Automatically redirects the operator to `/shop/purchases` upon successful submission with a confirmation toast.

4. **Purchase Ledger & Transaction Hub (`/shop/purchases`)**:
   - **Real-Time KPI Cards**: Top metrics for Total Purchases count, Net Inward Valuation (₹), Current Month Inward count, and Top Supplier identifier with interactive active selection border states (`border-2 border-[#2563eb]`).
   - **Multi-Condition Filter Bar**: Zero-latency filtering by Vendor, Date Range (From/To), Tax Rule (`INCLUDE`/`EXCLUDE`), Status (`COMPLETED`/`DRAFT`/`CANCELLED`), and keyword search.
   - **High-Density Zero-Scroll Table**: Compact 8-column layout (`Date`, `Bill #`, `Vendor`, `Amount`, `GST Type`, `Inward Qty`, `Status`, `Action`) rendering 20 records per page without horizontal scrolling on standard laptop displays.

5. **Inward Purchase Detail & Barcode Center (`/shop/purchases/[id]`)**:
   - **Streamlined 8-Column Inward Items Table**: Displays `#`, `Product & Code`, `Category & HSN`, `Inward Qty`, `Rate (Purchase Cost & Base Split)`, `Total Amount`, `Retail MRP`, and `Tag / Action Buttons` - completely fitting standard laptop screens with zero horizontal scrolling.
   - **Single Item Barcode Modal (`BarcodeDesignerModal`)**: Clicking the barcode action icon on any row automatically detects and prefills the label count with that item's added inward quantity (`item.quantity`), with an editable number input stepper supporting up to 500 labels.
   - **Vibrant Batch Barcode Center (`PurchaseBulkBarcodeModal`)**:
     - Accessed via the top modern gradient "Print All Barcodes" button (`bg-gradient-to-r from-blue-600 to-indigo-600`).
     - Defaulted to optical gold standard settings: `100x15 mm (Tag)` and `Continuous Roll (Thermal Tag)`.
     - 2-Column responsive split layout featuring a dedicated **Live Barcode Preview Panel on the right side** with carousel item switcher (`< Prev` / `Next >`), realistic dual-wing fold tag mockup, and real-time SVG barcode rendering.
     - Uncluttered inward products summary table on the left with per-item editable quantity steppers and quick batch tools (`Inward Qty`, `+1 All`, `Zero`).
     - Zero-lag isolated hidden iframe print engine dispatching thermal jobs directly to the printer spooler without popup blocking or browser freezes.
   - **In-Place Editing & Atomic Rollback Deletion**: Full edit mode with 5-priority bidirectional calculations, preserving the user's authentic entered supplier bill number on the purchase ledger, and safe invoice deletion with automatic inward stock deduction reversal (`RETURN` stock movements).

---

## 13. Customer Onboarding & Bulk CSV Import Workflow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Customer Records │───>│ Select Add Mode  │───>│ 4-Phase Wizard:  │───>│ Sequential Reg   │
│ (/shop/customers)│    │ (Single vs Bulk) │    │ Upload/Map/Edit  │    │ IDs & Ingestion  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **Customer Records Add Dropdown (`/shop/customers`)**:
   - The top-right header features an interactive primary `+ Add Customer` button with a hover/click dropdown menu:
     - **Add Single**: Navigates to `/shop/patients/new` for full clinical examination and prescription recording.
     - **Add Bulk**: Navigates to `/shop/customers/import` for multi-patient spreadsheet ingestion.

2. **4-Phase Bulk Import Wizard (`/shop/customers/import`)**:
   - **Phase 1: CSV Upload & Template**:
     - Drag-and-drop zone with instant file validation (supports `.csv` up to 5 MB / 5,000 rows).
     - `Download Sample CSV` action generates a standardized template with formatted headers and realistic sample data.
     - Detects total rows and column count.
   - **Phase 2: Intelligent Field Mapping**:
     - Automatically matches CSV headers to customer system fields (`Full Name`, `Phone`, `Email`, `Gender`, `Age`, `Date of Birth`, `Address`, `City`, `State`, `Pincode`, `Referred By`, `Notes`) via fuzzy alias dictionaries.
     - Displays live sample preview chip of the 1st row data for each mapped column.
     - Allows staff to review or change column mappings or set fields to `-- Do Not Import --`.
   - **Phase 3: Interactive Review & In-line Cell Correction**:
     - Displays all customer records in a high-density, editable spreadsheet table.
     - Live error highlighting:
       - Missing or short Name (< 2 chars) flagged with red border and warning text.
       - Invalid Phone (< 10 digits or non-numeric) highlighted with amber/red border.
       - Invalid Email format highlighted.
     - Staff can click directly into any cell to correct data in real time with instant re-validation.
     - KPI counters display `Total Rows`, `Valid Rows`, and `Needs Attention`.
     - `Show Errors Only` toggle isolates problematic rows; individual row trash actions discard corrupt entries.
   - **Phase 4: Summary & Batch Ingestion**:
     - Reviews total valid rows ready for import.
     - Executes `bulkImportCustomersAction` which generates sequential registration IDs (`OP-shopNum-YYYY-NNNN`) in a single query batch.
     - Commits all valid records in a single transactional batch into PostgreSQL `customers` table.
     - Displays celebratory success screen with assigned Registration ID ranges (`OP-1-2026-0001` to `OP-1-2026-0050`) and direct navigation to customer records.

---

## 14. Customer Profile & Orders Management Workflow

```
┌───────────────────────────┐    ┌───────────────────────────┐    ┌───────────────────────────┐
│ Customer Profile Overview │───>│ Orders Parity Table Grid  │───>│ Quick Actions: WhatsApp, │
│ (/shop/customers/[id])    │    │ (Filters, Search & CSV)   │    │ Status, Edit & Receipts   │
└───────────────────────────┘    └───────────────────────────┘    └───────────────────────────┘
```

1. **Profile Layout Structure (`/shop/customers/[id]`)**:
   - **01. Patient Personal & Medical Demographics**: Registration ID, phone, email, age/DOB, address, systemic illnesses, allergies, and automated customer badges.
   - **02. Visual Acuity & Refraction History**: History of clinical refraction visits and visual acuity readouts.
   - **03. Eye Prescription Details & Clinical History**: Smart prescription dropdown selector displaying all recorded clinical visits with date, doctor, and key power summaries (OD/OS Sph), updating `ClinicalPrescriptionCard` with zero latency.
   - **04. Customer Orders & Invoices History (`CustomerOrdersSection`)**: High-density orders table with 100% Orders dashboard parity:
     - **Telemetry Bar**: Displays Total Orders, Paid count, **Total Order Value** (sum of non-cancelled order values with strict currency formatting), and Fulfillment status counts.
     - **Filter Tabs**: Instant filtering by `ALL`, `PAID`, `DUE`, `PROCESSING`, `READY`, and `DELIVERED`.
     - **Live Search & Sort**: Real-time filtering across Order Number, Invoice Number, line item descriptions, and SKUs, with sorting by Newest, Oldest, or Highest Amount.
     - **RFC 4180 CSV Export**: One-click "Export CSV" button generating an Excel-compatible CSV file with UTF-8 BOM, itemized SKU breakdown, tax amounts, and digital bill URLs.
     - **Parity Table Fields**:
       - `Order ID`: Bold sequential identifier linking to order detail.
       - `Date`: Formatted transaction date.
       - `SKU Details`: `SKUDetailsDropdown` popup showing itemized frames, lenses, and accessories.
       - `Amount`: Total price formatted in INR, with balance due callout for unpaid amounts.
       - `Payment Status`: Soft HSL pill badge (`PAID`, `PARTIALLY PAID`, `UNPAID`).
       - `Delivery Status`: Fulfillment badges (`DELIVERED`, `UNDER PROCESSING`, `READY`, `DELAYED`).
       - `Invoice / Receipts`: `ReceiptsDropdown` giving one-click access to download/print the Tax Invoice or individual Payment Receipts.
       - `Actions Column`:
         - **WhatsApp Utility Button**: 1-click dispatch menu sending digital bills, ready-for-pickup notices, or in-progress updates via Optical Manager desktop tool or WhatsApp Web.
         - **Change Status Button**: Launches `QuickEditModal` to update fulfillment status, reschedule delivery, record partial payment, or settle dues with discount.
         - **Edit Order Button**: Navigates to `/shop/orders/[id]/edit` (guarded by `canEditOrders` permission).
   - **05. Store Credit History & Ledger**: Tracks credit additions from product returns and redemptions on sales bills.

---

## 15. Custom Document Numbering & ID Series Configuration Workflow

```
┌────────────────────────────────┐    ┌────────────────────────────────┐    ┌────────────────────────────────┐
│ Owner Portal (/owner/settings) │───>│ Real-Time Live Preview Badge   │───>│ Safe Sequence Resolution &    │
│ or Shop Settings (Store Tab)   │    │ & CGST Rule 46 16-Char Counter │    │ Anti-Collision Guarantee       │
└────────────────────────────────┘    └────────────────────────────────┘    └────────────────────────────────┘
```

1. **Access Locations**:
   - **System Owner**: `/owner/settings` -> click "Series & Custom IDs" tag under Organisation Details or "Invoice Number Series" under Tax & GST. Features a multi-branch selector to customize series individually for any store location.
   - **Store Manager**: `/shop/settings?view=series` -> "Store Details" tab -> "Series & Numbering" sub-tab.

2. **Customizable Sequences**:
   - **Tax Invoices (`invoice`)**:
     - Configurable Prefix (e.g. `INV`, `OM`, `SALE`), separator (`-`, `/`, or None), Year/FY format (`YYYY`, `YY`, Indian FY `24-25`, or `NONE`), Shop Code toggle (`-1-`), digit padding (0 to 6 digits), next starting number (e.g. `1051`), and optional suffix (`/RET`).
     - **Central GST Rule 46(b) Indicator**: Real-time counter validates invoice number length against statutory 16-character limit for Indian tax compliance.
   - **Customer / Patient Registration ID (`customer`)**:
     - Configurable Prefix (e.g. `OP`, `PAT`, `CUST`), separator, Year format, Shop Code toggle, digit padding, next starting number, and optional suffix.
   - **Workshop Job Orders (`order`)**:
     - **Match Invoice # Toggle**: One-click option to make order job slips directly mirror the invoice number (e.g. `INV-1-2026-1051`) for streamlined single-slip workshop management.
     - Independent series option if separate job numbering is preferred.

3. **Smart Safeguards & Migration Guarantees**:
   - **Historical Immutability**: Modifying document sequences only applies to newly created records; past invoices, customers, and orders remain 100% untouched.
   - **Anti-Collision Math**: The sequence generator resolves `nextSerial = max(configuredNext, lastDbSerial + 1)`, ensuring users never encounter duplicate key collisions even when setting a lower starting number.
   - **Input Sanitation**: Enforces uppercase-only alphanumeric characters and valid separators (`[A-Z0-9\-_/]`) with strict numeric controls for padding and serials.

---

## 16. Multi-Option Inventory Ingestion & CSV Bulk Purchase Inwarding Workflow

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│ Store Inventory Dashboard       │───>│ "+ Add Item" Dropdown Selector  │───>│ Choice: Single / Bulk Purchase   │
│ (/shop/inventory)               │    │ (Click or Hover Trigger)        │    │ or 4-Step CSV Inward Wizard     │
└─────────────────────────────────┘    └─────────────────────────────────┘    └─────────────────────────────────┘
```

1. **Top-Right Dynamic Dropdown Trigger**:
   - Store Managers on `/shop/inventory` access the **`+ Add Item`** button in the sticky page header.
   - Hovering or clicking reveals a high-density, accessible action popover with 3 distinct options:
     - **Add Single**: Direct shortcut to `/shop/inventory/add` for adding individual spectacle frames, lenses, or contact lenses.
     - **Add Bulk Purchase**: Direct route to `/shop/purchases/new` for manual supplier purchase invoice entry with tax grids.
     - **Add Bulk (CSV)**: Launches the dedicated 4-step Bulk Purchase Inwarding Wizard at `/shop/inventory/import`.

2. **4-Step CSV Bulk Purchase Inwarding Wizard (`/shop/inventory/import`)**:
   - **Step 1: Upload CSV & Invoice Metadata**:
     - Drag-and-drop or file selector accepting `.csv` files up to 10MB.
     - One-click **Download Sample CSV Template** (`optical_manager_bulk_purchase_sample.csv`) pre-formatted with standard optical columns and specification headers.
     - Inward header controls: Vendor Name (autocomplete or new supplier auto-creation), Purchase Invoice / Bill Number, Invoice Date, Tax Treatment (`Tax Excluded` / `Tax Included`), and GST Type (`CGST + SGST` / `IGST`).
   - **Step 2: Intelligent Column Mapping**:
     - Auto-maps CSV columns against 15+ optical catalog and purchase fields (`productCode`, `productName`, `category`, `brand`, `model`, `quantity`, `unitPrice`, `retailPrice`, `hsnCode`, `gstPercent`, `rackLocation`, etc.).
     - Visual confidence tags showing detected matches with manual re-assignment dropdowns.
   - **Step 3: High-Density Spreadsheet Review & Smart Catalog Verification**:
     - Live validation of all parsed rows with instant duplicate detection and format sanitization.
     - **Smart Catalog Matching (0ms lookup)**:
       - Checks `productCode` against current shop inventory.
       - 🟢 **Refill Stock**: Existing product identified in store. Inwarding will atomically increment stock quantity and update cost/retail rates without duplicating records.
       - 🟡 **New Item**: Unrecognized product code. Inwarding will create a fresh catalog entry with auto-generated SKU sequence.
     - **Inline Data Rectification**: Directly modify quantity, unit cost price, retail price, and rack shelf locations right within the spreadsheet cells.
     - **`+ Specs` Specification Enrichment Drawer**: Allows staff to configure category-specific attributes before saving:
       - *Frames*: Frame shape, size, color, material, gender, model number.
       - *Lenses*: Refractive index, design (single vision/bifocal/progressive), stock power, and coating checkboxes.
       - *Contact Lenses*: Modality, base curve, diameter, sphere, cylinder, axis, box quantity.
   - **Step 4: Atomic Execution & Stock Synchronization**:
     - Dispatches `createPurchaseFromCsvAction` inside an isolated database transaction.
     - Atomically commits:
       1. Master `purchase_orders` record stamped with vendor, invoice number, and calculated tax totals.
       2. Itemized `purchase_order_items` linked to inventory rows.
       3. Catalog inventory entries (inserting new items or updating stock balance on existing products).
       4. Detailed `stock_movements` log entries (`STOCK_IN`) stamped with purchase invoice reference, unit cost price, and performing staff user ID.
     - Auto-invalidates `/shop/inventory` and `/shop/purchases` caches, offering direct buttons to View Purchase Bill or Return to Inventory.

---

## 17. CSV Bulk Invoices Import & Historical Sales Onboarding Workflow

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│ Entry Points:                   │───>│ 4-Step Invoices Wizard          │───>│ Atomic Transaction:             │
│ /shop/customers (Add Dropdown)  │    │ (/shop/invoices/import)         │    │ • Auto-Registers New Patients   │
│ /shop/orders (Billing Dropdown) │    │ Upload -> Map -> Review -> Sync │    │ • Writes Invoices, Items, Rects │
└─────────────────────────────────┘    └─────────────────────────────────┘    └─────────────────────────────────┘
```

1. **Multi-Dashboard Entry Points**:
   - **Customers Dashboard (`/shop/customers`)**:
     - The **`Add Customer`** dropdown includes:
       - `Add Single`: Individual patient registration (`/shop/patients/new`).
       - `Add Bulk (Customers)`: Import customer records via CSV (`/shop/customers/import`).
       - `Add Bulk Invoices (CSV)`: Ingest historical sales and invoices via CSV (`/shop/invoices/import`).
   - **Orders Management Dashboard (`/shop/orders`)**:
     - The **`Invoices & Sales`** top-level action dropdown includes:
       - `+ New Invoice`: Create real-time POS bill (`/shop/invoices/new`).
       - `Import Invoices (CSV)`: Launch 4-step batch import wizard (`/shop/invoices/import`).

2. **4-Step CSV Bulk Invoices Ingestion Wizard (`/shop/invoices/import`)**:
   - **Step 1: Upload CSV & Default Store Settings**:
     - Accepts `.csv` files up to 10MB via drag-and-drop or file selector.
     - One-click **Download Sample CSV Template** (`optical_invoices_import_template.csv`) with realistic optical scenarios (frames, single vision lenses, contact lenses, sunglasses, reading glasses, advance dues, and full payments).
     - Store Default Controls: Default Payment Mode (Cash/UPI/Card), Default Fulfillment Status (pre-set to `DELIVERED` for historical invoices), Default Date, and Auto-register New Patients toggle.
   - **Step 2: Intelligent Column Mapping**:
     - Auto-maps CSV columns against 18+ optical billing and patient fields (`customerName`, `customerPhone`, `invoiceNumber`, `invoiceDate`, `itemDescription`, `quantity`, `unitPrice`, `discountAmount`, `taxPercent`, `taxAmount`, `totalAmount`, `amountPaid`, `paymentMethod`, `paymentStatus`, `fulfillmentStatus`, `soldBy`, `notes`).
     - Real-time confidence tags with dropdown overrides and first-row preview.
   - **Step 3: High-Density Spreadsheet Review & Smart Verification**:
     - **0ms Customer Matching**:
       - Compares 10-digit phone number against the store's patient directory.
       - 🟢 **Existing Patient**: Displays matched patient name and registration ID. The invoice is atomically mapped to their existing profile.
       - 🟡 **New Patient (Auto-Register)**: Unrecognized phone number. The wizard flags the row for automatic customer creation upon import, generating a collision-safe registration ID (`OP-shopNum-YYYY-NNNN`).
     - **Legacy Bill Number Preservation & Collision Checks**:
       - Existing external invoice numbers (`INV-2023-01`, `BILL-1049`, `1249`) are preserved exactly as provided.
       - Rows missing an invoice number are automatically assigned next available sequence numbers from the store's configured series (`INV-shopNum-YYYY-NNNN`).
       - 🔴 **Collision Alert**: If an invoice number already exists in the shop database, it is flagged with an error badge and given a one-click **Fix Dupes** button to auto-suffix numbers with `-OLD`.
     - **Inline Data Rectification**: Directly modify customer names, phone numbers, bill numbers, dates, descriptions, quantities, totals, and paid amounts directly in the spreadsheet grid.
     - **`+ Details` Specification Modal**: Allows staff to review or enrich customer email, city, address, salesperson attribution, and prescription notes.
   - **Step 4: Atomic Execution & Financial Ledger Sync**:
     - Dispatches `bulkImportInvoicesAction` in an isolated Drizzle transaction.
     - Atomically commits:
       1. New `customers` records with sequential registration numbers.
       2. Grouped `invoices` header records with historical timestamps.
       3. Itemized `invoice_items` records for each item description and tax amount.
       4. Sequential `orders` tracking records.
       5. Payment receipts (`receipts`) for paid balances, ensuring audit accuracy.
     - Revalidates `/shop/orders`, `/shop/customers`, `/shop/dashboard`, `/shop/analytics`.
     - Renders completion metrics cards and direct quick-navigation buttons.



---

## 18. AI Bill Scanning & Smart Purchase Inward Flow

```
┌──────────────────────────────┐    ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Add Purchase Page            │───>│ AI Bill Scanner Drawer       │───>│ Form Auto-Fill               │
│ (/shop/purchases/new)        │    │ Client Canvas Downsampling   │    │ • Auto-Matches DB Vendor     │
│ [Scan Bill with AI] CTA      │    │ -> Gemini Vision API Call    │    │ • Populates Line Items & Math│
└──────────────────────────────┘    └──────────────────────────────┘    │ • Enriches Modal Specs       │
                                                                        └──────────────────────────────┘
```

1. **Owner Configuration & API Key Management (`/owner/settings`)**:
   - Store owners navigate to **Owner Settings** and access the **AI & Automations** category card.
   - Owners can configure their private **Google Gemini API Key** and preferred model (`gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-flash-latest`, or custom).
   - "Test Connection" button performs a lightweight round-trip test to verify connectivity and display latency in milliseconds.
   - Credentials are saved securely to the database in `organizations.settings.ai`. Each organization's key remains completely isolated.

2. **Add Purchase Inward Flow (`/shop/purchases/new`)**:
   - Store staff click **"Scan Bill with AI"** in the top action toolbar.
   - A slide-over drawer opens:
     - **Setup Fallback**: If the organization hasn't added a Gemini API key yet, the drawer immediately displays an inline "Connect Google Gemini AI" card with an API key input, Google AI Studio link, and "Test Connection" tool, allowing the user to configure and proceed without leaving the page.
     - **File Upload**: Accepts photo formats (`.jpg`, `.jpeg`, `.png`, `.webp`) and single-page `.pdf` bills or challans up to 15MB.
     - **Client-Side Canvas Downsampling**: High-resolution camera photos (8–15MB) are automatically downscaled to a max dimension of 1800px at 85% JPEG quality via an off-screen HTML5 canvas, reducing transmission size to ~300KB and dropping network transfer latency by up to 70%.
     - **Gemini Vision Extraction**: Calls `extractBillDataAction` with structured JSON schema enforcement (`responseMimeType: "application/json"`).
     - **System-Side Arithmetic Engine**: Gemini extracts raw item names, rates, quantities, and GST rates. The system calculates exact CGST, SGST, IGST, base price, unit purchase price, and item totals without floating-point math hallucinations.
     - **Smart Vendor Matching**:
       - Compares extracted GSTIN against existing vendors in the store's directory.
       - Compares extracted supplier name against normalized vendor names.
       - If matched: auto-selects the existing vendor ID and displays a green `Matched Vendor` badge.
       - If not found: marks as `+ New Vendor (Free text)` so inward entry is never blocked.
     - **Optical Attributes & Modal Specification Enrichment**:
       - Extracts brand, model, color, eye size, frame shape, lens category, contact lens modality, batch number, and expiry date.
       - Automatically maps these into the row's `ProductModalData` structure, so clicking the **Details** (eye) button opens the `PurchaseAddProductModal` with all specifications pre-filled.
     - **Review & Verification**: Staff can inspect extracted items, codes, and totals, remove unwanted rows, and click **"Apply to Purchase Form"**.
     - **Active Banner**: Form displays an auto-fill confirmation banner with instant recalculation of total units, base price, GST, and net payable.

---

## 19. High-Density Optical Store Dashboard Navigation & Analytics Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ High-Density Optical Dashboard Experience                                                   │
│                                                                                             │
│ [ Good morning, User! 👋 ] ───────────────────────── [ Date Range Picker: Apr 1 - Jun 30 ▾ ]│
│                                                                                             │
│ [ 5 KPI Summary Cards ]: Revenue, Invoices, Receivables, Active Customers, Total Stores    │
│                                                                                             │
│ [ Row 2 ]: Customer Bifurcation ─── Dead Stock (90 Days) ─── Stock Valuation                │
│            (Frames/Lenses/Both)     (Count + % Total Stock)  (Category Asset Distribution)  │
│                                                                                             │
│ [ Row 3 ]: Return Rate ──────────── Sales Bifurcation ────── Low Stock Alerts               │
│            (% Products Returned)    (5 Interactive Tabs)     (Compliant / Restock Action)   │
│                                                                                             │
│ [ Row 4 ]: Retention Rate ────────────────────────────────── Recent Transactions            │
│            (Repeat Customers vs Total)                       (High-Density Live Table)      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Date Range Scoping**:
   - Store staff select a time window using the top-right date selector (`Today`, `Yesterday`, `Last 7 Days`, `This Month`, `This Quarter`, `Last 12 Months`, `Year to Date`, `All Time`).
   - Server Component queries parallelized live database aggregates and delivers all bifurcation slices in a single round-trip.
2. **Instant 5-Dimension Sales Exploration**:
   - Staff click between `By Lenses`, `By Frames`, `By Brands`, `By Gender`, and `By Age` tabs on the Sales Bifurcation card.
   - Donut chart and legend update in `0ms` client-side with exact unit counts and percentage contributions.
3. **Dead Stock & Stock Inward Navigation**:
   - Clicking `View all` on the Dead Stock card opens `/shop/inventory?filter=dead-stock` to review slow-moving stock.
   - Clicking `View stock` on Low Stock Alerts opens `/shop/inventory?filter=low-stock` for immediate stock replenishing.
4. **Recent Transactions Inspection**:
   - Clicking `View Customers` or `View Invoices` routes staff to `/shop/orders` for order tracking, fulfillment, and digital receipt generation.

---

## 10. High-Speed "Enter-as-Tab" Keyboard Form Navigation Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Active Input    │───>│ Next Focusable  │───>│ Submit / Action │───>│ Save / Form      │
│ [Enter]         │    │ Control (Auto-  │    │ Primary Button  │    │ Execution        │
│                 │    │ Selected Text)  │    │ [Enter]         │    │                  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
```

1. **Continuous Touch-Type Ingestion**:
   - Staff types customer details, inventory specifications, or prescription readings and presses `Enter`.
   - The focus instantly advances to the next logical field (`input`, `select`, `[contenteditable]`), automatically highlighting all text inside the target element so the user can immediately overwrite or accept the value without backspacing.
2. **Reverse Navigation (`Shift+Enter`)**:
   - Pressing `Shift+Enter` shifts focus backward to the preceding field, allowing rapid back-and-forth data verification without touching the mouse.
3. **Multiline Textarea Context (`Ctrl+Enter` / `Cmd+Enter`)**:
   - While entering clinical complaint notes, patient medical history, or internal remarks in `<textarea>`, pressing `Enter` creates a new line.
   - Pressing `Ctrl+Enter` or `Cmd+Enter` advances focus to the subsequent input element.
4. **Instant Action Execution**:
   - When the cursor reaches the final primary action button (`[data-enter-submit="true"]` or `type="submit"`), pressing `Enter` initiates validation and executes the form submission handler seamlessly.

---

## 11. Add Purchase, AI Bill Scanning & Auto-Vendor Onboarding Flow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Upload Bill      │───>│ Review & Confirm │───>│ Bidirectional    │───>│ Auto-Create New  │
│ (Image / PDF)    │    │ AI Extraction    │    │ Table Editing    │    │ Vendor & Finalize│
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **AI Bill Scanning (`/shop/purchases/new` -> "Insert with AI")**:
   - Staff uploads an optical supplier bill/tax invoice (JPG, PNG, WEBP, or PDF).
   - Gemini multimodal AI extracts header details (supplier name, GSTIN, invoice number, invoice date) and purchase line items.
   - **Fallback Product Code Extraction**: If the bill does not have a dedicated "Product Code" / "Article" column, structured codes printed inside "Description of Goods" (e.g. `SI-20050,50-15-135,F900`) are automatically extracted as `productCode` with the full string preserved to prevent SKU collisions.
   - **HSN-to-Category Auto-Detection**: Extracted HSN codes (e.g., `90031100`, `90041000`, `90015000`, `3307`) are matched against the store's saved Category Master settings to auto-assign the category and its statutory GST rate.
   - **Purchase Cost as Primary Rate**: The supplier's final net billed rate is assigned as unit **Purchase Cost** (`purchasePrice`). **Base Price** is back-calculated ($\text{unitPrice} = \frac{\text{purchasePrice}}{1 + \text{gstPercent}/100}$). Retail Price / MRP is strictly left blank (0.00).
2. **Review & Import Preview Drawer**:
   - Staff reviews the extracted vendor info and line items table with real-time category badges and purchase cost rates.
   - Clicking **Apply to Purchase Form** populates the entire purchase ledger grid in 0ms.
3. **Universal Interactive Table Editing**:
   - **Interactive Column 10 (Total Purchase Cost)**: Staff can directly type into the Total Cost column (e.g. ₹32,400 with Qty 10), which automatically computes unit Purchase Cost (₹3,240), Base Price (₹2,892.86), and GST amounts down to the exact paise.
   - **Purchase Cost & Base Price Editing**: Typing in Purchase Cost auto-derives Base Price; typing in Base Price auto-derives Purchase Cost.
   - **Dynamic HSN & Category Updates**: Typing an HSN code auto-detects and switches the category; changing the category preserves user Purchase Cost and recalculates Base Price with the new category GST rate.
4. **Auto-Detect & Auto-Save New Vendors**:
   - If the supplier's name or GSTIN does not exist in the organization's vendor master, the system automatically detects it as a new vendor upon clicking **Add Purchase** or **Save As Draft**.
   - The system creates the new vendor in the `vendors` database table (with `shopId`, `organizationId`, `name`, `gstin`, `isActive = true`) and seamlessly links the purchase order.

---

## 12. Purchase Ledger, Transaction Details & Barcode Printing Workflow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Purchase Ledger  │───>│ Transaction Card │───>│ Multi-Preset     │───>│ Inline Edit or   │
│ KPI & Filters    │    │ & Items Ledger   │    │ Barcode Printing │    │ Atomic Reversal  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **Browsing the Purchase Ledger (`/shop/purchases`)**:
   - Accessed directly via **Purchases -> Purchase Ledger** in the left navigation sidebar.
   - **Interactive KPI Deck**: Displays real-time aggregate metrics for Total Purchases count, Net Inward Valuation (₹), Current Month Inward count, and Top Supplier name. Clicking KPI cards activates an active selection border (`border-2 border-[#2563eb]`) and instantaneously filters the transactions table.
   - **Multi-Filter Bar**: Enables zero-latency filtering by Vendor, GST Pricing Rule (Inclusive/Exclusive), Status (Draft/Completed/Cancelled), Date Range (From/To), and full-text search across invoice numbers and vendor names.
   - **High-Density Table**: 8-column layout (Date, Bill #, Vendor with GSTIN, Amount, GST Type pill badge, Item Quantity, Payment Status, and Status Badge) rendering 20 records per page with zero mock data.
   - **Post-Purchase Auto-Navigation**: Completing an inward purchase form or saving a draft on `/shop/purchases/new` automatically navigates staff to `/shop/purchases` with immediate visibility of the newly recorded transaction.

2. **Full-Page Transaction Detail View (`/shop/purchases/[id]`)**:
   - Clicking any transaction row navigates to its dedicated full-page audit route (`/shop/purchases/[id]`).
   - **Supplier & Bill Metadata Card**: Displays vendor name, GSTIN, invoice number, purchase date, GST inclusion model, tax regime (SGST+CGST / IGST), status, and remarks.
   - **12-Column Inward Items Ledger**: Comprehensive breakdown of S.No, Product Name, SKU / Product Code, Category color pill badge, HSN Code, Quantity, Base Price, GST %, Purchase Cost, Total Cost, Retail Price, and per-row barcode actions.
   - **Tax Breakdown & Valuation Summary Card**: Itemizes taxable base, total GST, gross inward supply value, round-off adjustments, and net payable supplier amount.

3. **High-Precision Barcode Printing & Unified SKU Engine**:
   - **Unified Internal SKU = Barcode Standard**:
     - All inward products without a manual code automatically receive a guaranteed-unique, canonical optical SKU formatted as `[CAT]-[BRAND]-[SEQ]` (strictly 13 characters, e.g. `FRM-RAY-00042` or `FRM-GEN-00001`).
     - **Missing Metadata Fallbacks**: Automatically falls back to vendor name prefix or `"GEN"` (Generic) when brand/model is omitted by the user, ensuring unbranded frames or budget inward items always receive a structured, professional barcode. When product name/description is omitted, the tag left-wing display automatically prioritizes the user-written productCode (e.g. SI-20050), falling back to category (Optical Frame) so tags never display blank gaps.
     - **Database & Inventory Synchronization**: Canonical SKU is saved into `inventory.sku`, `inventory.product_code`, and `purchase_order_items.product_code`, linking seamlessly with physical inventory and POS scanner lookup.
   - **Batch "Print All Barcodes" (`PurchaseBulkBarcodeModal`)**:
     - Pre-populated with authentic inward product quantities editable in real-time with quick actions (`Inward Qty`, `+1 All`, `Zero`).
     - **Dual Segmented Preview Tabs**: Features `Single Label` (carousel through individual product labels with butterfly tag fold line or retail box mockup) and `Sheet Preview` (realistic A4/A5 sticker sheet grid miniature with `aspect-[1/1.414]` proportions, numbered cell highlights, and multi-page pagination controls).
     - **Authentic Labels-Per-Page Calculations**: Clearly displays exact sheet capacity (e.g., A4: 36 labels/page on 2×18 grid for 100×15 mm Tag; 30 labels/page on 3×10 grid for 50×25 mm) and total physical sheets required.
     - **Industrial Standard Defaults**: Out-of-the-box defaults to `100x15 mm (Tag)` and `A4 Sheet` layout for standard desktop sticker sheet printers, with seamless one-click switching to Continuous Thermal Roll mode (TSC/Zebra).
     - **Zero-Lag Hidden IFrame Spooling**: Dispatches print jobs directly through an isolated hidden iframe with CSS page-break prevention and `table` row flow, eliminating popup blocking and lag.
   - **Individual Product Barcode Designer (`BarcodeDesignerModal`)**:
     - Pre-populated with the row item's inward quantity, canonical optical SKU, category, and retail price.
     - Defaults to A4 Sheet layout and 100×15 mm butterfly optical tag, with instant sheet vs single label preview and zero-lag printing matching the bulk barcode system.

4. **Inward Transaction Editing & Stock Reversal**:
   - **In-Place Editing**: Clicking "Edit" enables bidirectional inline editing across supplier details, invoice metadata, and line-item prices with automatic recalculation. Saving changes updates the purchase order and re-calibrates inventory stock.
   - **Safe Transaction Deletion**: Deleting a purchase prompts a confirmation modal with clear warnings. For `COMPLETED` transactions, the system atomically reverses inward inventory stock increments via `RETURN` stock movement entries before deleting the order.

---

## 13. Offline Invoicing, Outbox Hub & Multi-Device Orders Hydration Workflow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Offline Billing  │───>│ Dexie Outbox     │───>│ Dual-Source      │───>│ Auto / 1-Click   │
│ & Local Storage  │    │ Queue Storage    │    │ Orders Table     │    │ Cloud Push       │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **Uninterrupted Offline Billing (`/shop/invoices/new`)**:
   - When network connectivity is intermittent, degraded, or completely offline, billing staff can continue creating invoices, recording prescriptions, and taking payments without interruption.
   - The transaction generates a local queue ID (`off-inv-...` / `OFF-2026-XXXX`) and writes the complete invoice payload into Dexie IndexedDB `offline_invoices_queue` with status `PENDING`.
   - Local databanks (`cached_invoices`, `cached_orders`, `cached_inventory`) are updated immediately in zero latency, decrementing local stock and recording customer history.

2. **Dual-Source Orders Hydration (`/shop/orders`)**:
   - Whether the user is currently online or offline, `/shop/orders` merges live cloud database orders with unsynced local bills from `offlineDB.offline_invoices_queue`.
   - Local bills are prepended at the top of the Orders table with distinctive `[Device]` badges.
   - Real-time status badges reflect sync progress:
     - `Stored in Device` (Soft amber pill with Clock icon): queued and awaiting transmission.
     - `Syncing...` (Soft blue pill with spinning Refresh icon): active transmission in progress.
     - `Sync Paused` (Soft rose pill with Alert icon & error tooltip): validation issue or temporary network block.
   - Staff can click **"View Bill"** in the Documents column to inspect or print the bill via `/shop/invoices/offline/[id]`.
   - Staff can click the inline **"Sync"** button in the Actions column to trigger immediate single-invoice transmission to the cloud.

3. **Dedicated Offline Invoices Outbox (`/shop/invoices/offline`)**:
   - Accessible via the Orders table header action menu (*Offline Outbox* with database icon).
   - **High-Density KPI Deck**: 4 real-time stat cards (*Total in Device*, *Synced to Cloud*, *Pending Sync*, *Attention Needed*) with active selection states for instantaneous filtering.
   - **Filter Tabs & Search**: Tabs for `ALL`, `PENDING`, `FAILED`, and `SYNCED` with instant search by invoice number, customer name, and phone.
   - **Row-Level Actions**:
     - **Sync**: Push individual offline bill to cloud database.
     - **Print**: Open official thermal or A4 document preview for customer handover.
     - **Discard**: Discard invalid or duplicate test bills with double-confirmation dialog.
   - **Global Action**: Header button **"Sync All to Cloud Now"** triggers batch synchronization across all pending records.

4. **Self-Healing Sync & Seamless Transition**:
   - `recoverStaleSyncLocks()` automatically resolves any bills stuck in `"SYNCING"` status for >30 seconds and resets them to `"PENDING"`.
   - Upon successful cloud reconciliation:
     - The permanent cloud invoice number (`INV-2026-XXXX`) and server order ID replace temporary device IDs.
     - `cached_invoices` and `cached_orders` are updated in IndexedDB.
     - The topbar sync pill updates smoothly to `[Synced]` once zero pending bills remain.
     - Custom event `"offline-databank-updated"` triggers instant re-hydration of the Orders table with zero page reloads.

---

## 20. Industrial Vertical Roll Barcode Printing & Add Purchase Integration Workflow

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│ Entry Points:                   │───>│ Barcode Modal (Single/Batch)    │───>│ Industrial Thermal Output:      │
│ • Add Purchase (/purchases/new) │    │ • Select Preset: Vertical 3-Up ⭐│    │ • Exact Page Size: 50×100mm     │
│ • Purchase Detail (/[id])       │    │ • Auto-Set Continuous Roll      │    │ • Razor-Sharp Code 128 (Subset B)│
│ • Inventory Designer Modal      │    │ • Live Dumbbell Tag Preview     │    │ • Spool to Hidden Iframe        │
└─────────────────────────────────┘    └─────────────────────────────────┘    └─────────────────────────────────┘
```

1. **Multi-Column & Vertical Continuous Roll Support**:
   - Eyewear and jewelry barbell tags typically come on **multi-column vertical rolls** (e.g. 3 tags side-by-side on a continuous web, 50mm web width × 100mm feed length).
   - The engine provides specialized vertical roll presets:
     - **`100x15 mm (Vertical 3-Up)` ⭐**: Exact 3-across eyewear barbell tag roll (`50mm` web width × `100mm` feed length).
     - **`100x15 mm (Vertical 1-Up)`**: Single-column vertical roll (`15mm` width × `100mm` feed length).
     - **`100x15 mm (Vertical 2-Up)`**: Two-across vertical roll (`34mm` width × `100mm` feed length). Features two 15×100mm labels rendered strictly side-by-side horizontally across the 34mm roll web (`1.5mm left margin + 15mm Col 1 + 1mm center slit gap + 15mm Col 2 + 1.5mm right margin = 34mm`). Enforces `flex-wrap: nowrap !important;` and `flex-shrink: 0 !important;` in print spool CSS to ensure labels are never vertically stacked by thermal printer drivers.
     - **`100x15 mm (Tag)`**: Horizontal tag layout for 4" continuous rolls or A4/A5 laser/inkjet sticker sheets.
     - **`50x25 mm`**, **`38x25 mm`**, **`40x30 mm`**, **`50x50 mm`**: Standard retail boxes and frame case labels.

2. **Dumbbell Tag Geometry & 15×100mm Narrow Strip Physical Proportions**:
   - The barbell tag format is strictly proportioned as a **15mm wide × 100mm long narrow strip** (`1:6.67` aspect ratio), eliminating square flap distortion.
   - Divided symmetrically into **two 50mm folded sections** via a narrow center fold bridge:
     - **Top Flap (~38mm length × 15mm width)**: Vertical slender flap (`2.53:1` length-to-width ratio, not a square). Rotated 90° along the 38mm length to provide 36mm of horizontal text width (`width: 36mm; height: 13mm; transform: rotate(90deg);`). Displays store header (`CLINICAL OPTICAL`) on the left, bold retail price on the right, and brand name + model/item description running along the flap length without text clipping.
     - **Narrow Center Bridge (~24mm length × 5mm width)**: Narrow 5mm fold-around strap with dashed borders, a dashed center fold guideline at the exact 50mm midpoint, and a rotated `FOLD` indicator matching the reading direction. When folded in half around an optical frame bridge, each side measures exactly 50mm (38mm flap + 12mm strap half).
     - **Bottom Barcode Flap (~38mm length × 15mm width)**: Vertical slender flap (`2.53:1` ratio). Rotated 90° along the 38mm length (`width: 36mm; height: 13mm; transform: rotate(90deg);`). Renders a high-density 34mm-wide Code 128 (Subset B) native vector SVG barcode with 8.5mm bar height across the tag width, paired with a parallel monospace SKU beneath. This prevents barcode distortion and ensures 100% reliable scanner reads compared to squeezing across a 15mm width.
   - Code 128 (Subset B) uses 11 modules per character, ensuring crisp vector bars rendered along the 34mm length at standard 203 DPI and 300 DPI thermal resolutions.
   - **Continuous Roll Representation**: On the 50×100mm thermal web (`100x15 mm (Vertical 3-Up Roll)`), three narrow strips (40px wide × 270px long each) render side-by-side with 1.5mm liner margins and 1mm center slit gaps, accurately mirroring the physical 3-across continuous roll feed.

3. **Direct Add Purchase Header Action (`/shop/purchases/new`)**:
   - In the top action bar of the Add Purchase page, staff can click **`Print Barcodes`** (`Barcode` icon).
   - Validates that at least 1 product item with a name or code is present.
   - Opens the `PurchaseBulkBarcodeModal` populated with all inward items from the table:
     - Pre-fills item quantities, retail prices (or purchase cost if retail price is omitted), and codes.
     - Provides quantity steppers (`-`, `+`, or direct numeric input) to print exact label counts per product.
     - Features interactive Single Label (dumbbell tag zoom) and Continuous Roll Feed previews.
     - Embeds a helpful thermal printer configuration tip (Paper size matching and `Margins: None`).

4. **Zero-Lag Print Spooler & Driver Compatibility**:
   - Sets exact CSS `@page { size: ${rollWidth}mm ${rollHeight}mm; margin: 0; }` preventing thermal printer gap sensors from skipping or ejecting blank paper.
   - Multi-column rolls (3-Up, 2-Up) group tags across rows and trigger `@media print { page-break-after: always; }` at each row boundary.
   - Spools through a hidden `iframe` with fallback to a print popup window, delivering instantaneous print output with zero layout reflows.





