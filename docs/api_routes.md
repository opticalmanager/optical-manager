# API Endpoints Documentation

Optical Manager exposes RESTful API endpoints for data exporting, inventory quick search, global search, and public appointment booking.

---

## Endpoint Inventory

### 1. CSV Data Export APIs

#### `GET /api/orders/export`
- **Description**: Generates and downloads a CSV spreadsheet of orders and customer billing history matching the active multi-criteria filters. Supports smart search across order numbers, invoice numbers, customer names, mobile phone numbers, and product SKU/descriptions.
- **Query Parameters**:
  - `search` (optional): Free-text multi-criteria search keyword (strips leading `#`, matches digits or text).
  - `tab` (optional): `ALL` | `PAID` | `PARTIALLY_PAID`.
  - `timeframe`: `24h` | `7d` | `30d` | `90d` | `12m` | `ytd` | `all` (bypassed for all-time matching when `search` is provided).
  - `filter` (optional): `ALL` | `DELIVERED` | `PENDING` | `DELAYED`.
- **Response**: `200 OK` with `Content-Type: text/csv` download header.

#### `GET /api/reports/export`
- **Description**: Exports detailed financial revenue reports, GST tax breakdowns, and payment collection telemetry.
- **Query Parameters**:
  - `timeframe`: Date window filter.
- **Response**: `200 OK` with CSV binary payload.

---

### 2. POS & Global Search APIs

#### `GET /api/inventory/check-code`
- **Description**: Real-time uniqueness verification endpoint for product codes within the authenticated user's organization or scoped to a specific vendor.
- **Query Parameters**:
  - `code`: Product code string to check for uniqueness.
  - `vendor` / `vendorName` (optional): Vendor name to scope code uniqueness per vendor.
  - `excludeId` (optional): Inventory item ID to exclude from duplicate checks (used when editing existing items).
- **Authentication**: Session authenticated via `getCurrentUser()`.
- **Response**: `200 OK` JSON `{ exists: boolean }`.

#### `GET /api/inventory/search`
- **Description**: Fast dynamic search endpoint for POS checkout, invoice generation, and purchase bill ingestion.
- **Query Parameters**:
  - `q`: Search query string (`productCode`, `productName`, `name`, `brand`, `model`, `sku`).
  - `vendor` (optional): Vendor name to prioritize/filter items associated with the selected vendor.
- **Response**: `200 OK` JSON array of matching inventory items with stock levels and prices.

#### `GET /api/search`
- **Description**: Omnibox global search endpoint querying customers, orders, inventory SKUs, and appointments simultaneously.
- **Query Parameters**:
  - `q`: Global search keyword.
- **Response**: `200 OK` JSON object grouped by entity type.

---

### 3. Public Patient & Authentication APIs

#### `GET /api/auth/callback`
- **Description**: Handles Supabase OAuth and magic link authentication callbacks, setting SSR session cookies and redirecting to `/shop/dashboard` or `/onboarding`.

#### `POST /api/auth/logout` & `GET /api/auth/logout`
- **Description**: Robust cloud & session logout handler that invalidates Supabase authentication tokens, explicitly destroys server cookies (`opt_session_profile`, `active_shop_context_id`, and `sb-*-auth-token`), and redirects to the landing page `/`.

#### `GET /book/[slug]`
- **Description**: Public store appointment booking interface for patients to view branch locations, operating hours, and schedule consultations.
- **Slug Resolution**: Dynamically matches organization by `organizations.slug` (or `organizations.id` if UUID), prioritizing active accounts with associated user profiles over legacy or archived organizations.
- **Branch Scoping**: Automatically retrieves and displays active store branches (`where(and(eq(shops.organizationId, org.id), eq(shops.isActive, true)))`) with authentic branch names, addresses, and contact numbers.
- **Submission Action**: `submitAppointmentAction` persists booking records scoped to the selected `shopId` and `organizationId`, with automatic cache revalidation for `/shop/appointments` and `/shop/dashboard`.

#### Shorthand Route Normalizer (`proxy.ts`)
- **Description**: Middleware normalizes root-level convenience endpoints (`/setting`, `/settings`, `/inventory`, `/orders`, `/customers`, `/patients`, `/reports`, `/analytics`, `/purchases`, `/returns`, `/appointments`, `/support`, `/dashboard`) to their canonical workspace routes based on the authenticated session role (`/owner/*` vs `/shop/*`), enforcing authorization guards on destination pages.

#### Server Action Authorization Guards (`actions/*.actions.ts`)
- **Description**: Mutating Server Actions enforce `hasModulePermission(user, moduleKey)` checks to prevent unauthorized data updates (e.g. `updateShopProfileAction` and `updateShopSettingsConfigAction` enforce `"settings"` permission). Returns `{ success: false, message: "Access denied." }` when unauthorized.

---

### 4. Offline Databank & Cloud Sync APIs

#### `GET /api/offline/customers`
- **Description**: Safely returns all customer profiles scoped to the authenticated user's active `shopId` (or all organization customers if `OWNER` without a specific shop) for local IndexedDB cache warming. Includes clinical medical history fields (`chiefComplaint`, `familyHistory`, `systemicIllness`, `allergies`).
- **Authentication**: Resilient auth via `getCurrentUser()` from `services/auth.service` supporting both `SHOP_MANAGER` and `OWNER` roles with cookie and token fallback.
- **Response**: `200 OK` JSON containing `{ shopId, customers: [...], timestamp }`.

#### `GET /api/offline/inventory`
- **Description**: Returns all active inventory items scoped to the authenticated user's active `shopId` (or all organization inventory if `OWNER` without a specific shop) for local IndexedDB cache warming.
- **Authentication**: Resilient auth via `getCurrentUser()` from `services/auth.service` supporting both `SHOP_MANAGER` and `OWNER` roles with cookie and token fallback.
- **Response**: `200 OK` JSON containing `{ shopId, inventory: [...], timestamp }`.

#### `GET /api/offline/sync-all`
- **Description**: High-performance unified offline databank export powering client-side IndexedDB caching. Authenticated via resilient `getCurrentUser()`. Dynamically adapts query scoping based on the user's authenticated role:
  - **`OWNER`**: Organization-wide multi-branch aggregation across all physical outlets (`organizationId`). Queries and exports all customers, inventory items, appointments, recent orders, invoices, and sales returns across all stores. Also bundles organization metadata, brand logo, full branch outlets directory (with GSTIN, CIN, MSME, bank accounts, and settings), appointment configuration rules, and active SaaS subscription tiers.
  - **`SHOP_MANAGER`**: Strictly scoped to the manager's assigned branch (`shopId`) and parent `organizationId` for tenant security and memory efficiency.
- **Query Parameters**:
  - `since` (Optional): ISO 8601 timestamp (e.g. `2026-09-11T05:30:00.000Z`). When provided, executes incremental/delta sync returning only records updated after this timestamp via `gt(table.updatedAt, sinceDate)`, saving client bandwidth and eliminating redundant IndexedDB rewrites.
- **Authentication**: Mandatory authenticated session with active shop manager or owner profile.
- **Response Structure**: `200 OK` JSON:
  - `success`: `true`
  - `isIncremental`: `boolean`
  - `shopId`: Active store identifier (or `"owner-all-shops"` when viewing multi-branch organization level).
  - `organizationId`: Parent organization UUID.
  - `shop`: Active branch profile, invoice terms, receipt headers/footers, and WhatsApp notification templates.
  - `organization`: Full organization entity containing `email`, `phone`, `address`, `logoUrl`, `shops` (all physical branch outlets with settings, contact info, and tax IDs), `appointmentConfig` (store hours, slot intervals, booking buffers), and `subscription` (plan status, cycle, limits).
  - `customers`: Array of customer profiles with DOB, contact details, and store credits.
  - `inventory`: Catalog of frames, lenses, contacts, and accessories with stock levels and GST slabs.
  - `appointments`: Scheduled and past appointments with patient associations and doctor details.
  - `orders`: Prescription sales orders with fulfillment status, items, and prescription links.
  - `invoices`: Tax invoices with payment receipts, tax breakdowns, and balance tracking.
  - `returns`: Sales returns and credit notes with itemized restock status.
  - `timestamp`: Current sync ISO timestamp saved as `lastSyncTimestamp` in client IndexedDB.

#### `GET /api/offline/ping` & `HEAD /api/offline/ping`
- **Description**: Zero-overhead lightweight probe endpoint used by the client-side `OfflineProvider` and service worker to verify active internet/server and database connectivity.
- **Query Parameters**:
  - `db=1` (Optional): Executes an end-to-end database probe (`SELECT 1`) with an extended 3,500ms timeout race to accommodate server cold-start compilation and Supabase pooler TLS handshakes without tripping false-offline states.
- **Client Resilience**: `OfflineProvider` performs a graceful 1,200ms retry during initial app mount before declaring offline, preventing UI flashing.
- **Response**: `200 OK` JSON `{ status: "ok", timestamp }` with `Cache-Control: no-store` headers.

#### `POST /api/sync/offline-invoices`
- **Description**: Batch cloud reconciliation endpoint accepting offline invoices stored in client device memory.
- **Dual-Role Support**: Supports both `SHOP_MANAGER` and `OWNER` roles. For owners, dynamically resolves `effectiveShopId` from the payload or session context rather than requiring a static `profile.shopId`.
- **Payload**: `{ shopId, invoices: [{ offlineQueueId, offlineInvoiceNumber, payload, createdAt }] }`.
- **Idempotency**: Embeds `[OFFLINE_QUEUE_ID:uuid]` into invoice metadata; duplicate submissions return the existing invoice record without re-billing or double-decrementing stock.
- **Local Integration**: When enqueued locally, atomically populates `offlineDB.cached_invoices` and `offlineDB.cached_orders`, decrements stock in `cached_inventory`, and updates customer store credit.
- **Response**: `200 OK` JSON containing `{ results: [{ offlineQueueId, success, serverInvoiceId, serverInvoiceNumber }] }`.

#### `POST /api/sync/offline-mutations`
- **Description**: Batch cloud reconciliation endpoint for offline entity mutations created while disconnected (`PATIENT_CREATE`, `PATIENT_UPDATE`, `APPOINTMENT_CREATE`, `APPOINTMENT_STATUS`, `ORDER_STATUS_UPDATE`, `ORDER_PAYMENT_RECORD`, `ORDER_SETTLE_DUES`, `INVENTORY_CREATE`, `INVENTORY_UPDATE`, `STOCK_ADJUST`, `PRESCRIPTION_CREATE`, `RETURN_CREATE`).
- **Payload**: `{ shopId, mutations: [{ id, type, payload, createdAt }] }`.
- **Processing Logic**:
  - `PATIENT_CREATE`: Auto-deduplicates by patient phone number against existing database customers; generates clean registration ID (`OP-XXXX`); inserts customer profile.
  - `PATIENT_UPDATE`: Updates patient demographic details, contact info, clinical history, and notes offline, syncing cleanly to database.
  - `APPOINTMENT_CREATE`: Resolves or onboards patient, schedules appointment slot with store doctor.
  - `APPOINTMENT_STATUS`: Updates appointment status (`COMPLETED`, `CANCELLED`, `CONFIRMED`) with optimistic status reconciliation.
  - `ORDER_STATUS_UPDATE`: Reconciles order fulfillment status (`PROCESSING`, `READY`, `DELIVERED`, `ON_HOLD`) and estimated delivery date.
  - `ORDER_PAYMENT_RECORD`: Applies partial payment, generates formal receipt, updates invoice amount paid and balance due.
  - `ORDER_SETTLE_DUES`: Settles outstanding balance with optional discount waiver, marks invoice `PAID`, and generates corresponding receipt.
  - `INVENTORY_CREATE`: Ingests frame, lens, contact lens, or accessory stock items cataloged offline; assigns official sequential SKU; records initial stock movement.
  - `INVENTORY_UPDATE`: Updates item pricing, brand, model, and minimum alert thresholds offline without full-page reloads.
  - `STOCK_ADJUST`: Reconciles manual stock quantity adjustments (+/-) and writes audit stock movements.
  - `PRESCRIPTION_CREATE`: Saves comprehensive clinical refraction values (Distance & Near OD/OS SPH, CYL, AXIS, ADD, V/N, monocular PD, CADD, Rx number, Rx category, lens type, doctor attribution, and notes) offline and syncs atomically.
  - `RETURN_CREATE`: Processes product returns, restocks inventory, adjusts customer store credit ledgers, and logs non-restock audit movements.
- **Response**: `200 OK` JSON containing `{ results: [{ id, type, success, serverResultId, sku, registrationId, returnNumber, error }] }`.

---

### Category & Dynamic GST Server Actions (`actions/category.actions.ts`)

#### `getOrganizationCategoriesAction()`
- **Description**: Retrieves all active product categories configured for the authenticated user's organization (`FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SOLUTION`, and any custom categories).
- **Return Type**: `{ success: boolean, categories: CategoryItem[], error?: string }`.

#### `saveCategoryGstRatesAction(categoriesData)`
- **Description**: Updates HSN codes and GST taxation percentages (`CGST`, `SGST`, `IGST`) across all categories for the organization. Revalidates paths `/shop/settings`, `/owner/settings`, `/shop/inventory/add`, `/shop/inventory`.
- **Payload**: `Array<{ id, name?, hsnCode?, cgstPercent, sgstPercent, igstPercent }>`.
- **Return Type**: `{ success: boolean, message: string }`.

#### `createCategoryAction(prevState, formData)`
- **Description**: Creates a new custom product category with auto-generated uppercase code, custom name, optional default HSN code, and configured GST rates.
- **Return Type**: `{ success: boolean, message: string, data?: CategoryItem }`.

#### `deleteCategoryAction(categoryId)`
- **Description**: Removes a merchant-created custom category from the organization (system default categories are protected and cannot be deleted).
- **Return Type**: `{ success: boolean, message: string }`.

---

### Purchases & Vendors APIs and Server Actions

#### `GET /api/vendors/search`
- **Description**: Autocomplete search endpoint for supplier directory lookup.
- **Query Parameters**:
  - `q`: Search keyword matching vendor name, contact person, phone number, or GSTIN.
- **Authentication**: Session authenticated via `createClient()` / `profiles.organizationId`.
- **Response**: `200 OK` JSON array of matching `Vendor` records (limit 20).

#### `createPurchaseAction(data)` (`actions/purchase.actions.ts`)
- **Description**: Finalizes an inward purchase bill and marks status `COMPLETED`. Updates inventory quantities atomically (`+qty`), updates cost and retail prices, links supplier invoice number and inward date, and logs `STOCK_IN` movements in `stock_movements`.
- **Payload**: `PurchaseOrderFormValues` (purchaseNumber, purchaseDate, vendorId, vendorName, taxRule, taxType, roundOff, items[]).
- **Return Type**: `{ success: boolean, message: string, purchaseId?: string }`.

#### `savePurchaseDraftAction(data)` (`actions/purchase.actions.ts`)
- **Description**: Saves an inward purchase bill with status `DRAFT`. Does not mutate live inventory stock levels.
- **Payload**: `PurchaseOrderFormValues`.
- **Return Type**: `{ success: boolean, message: string, purchaseId?: string }`.

#### `createVendorAction(data)` (`actions/purchase.actions.ts`)
- **Description**: Registers a new supplier in the organization's vendor directory directly from the purchase form modal.
- **Payload**: `VendorFormValues` (name, contactPerson, phone, email, gstin, panNumber, address, city, state, pincode).
- **Return Type**: `{ success: boolean, message: string, vendor?: Vendor }`.

#### `createPurchaseProductAction(data)` (`actions/purchase.actions.ts`)
- **Description**: Ingests a new catalog product directly from the purchase inline modal (SS3 design) with category tabs, pre-calculated GST splits, and attributes. Creates an inventory record with initial stock 0 (stock is credited upon purchase completion).
- **Payload**: `{ category, productCode, productName, brand?, gender?, color?, size?, type?, material?, hsnCode?, gstPercent, cgstPercent, sgstPercent, igstPercent, costPrice, retailPrice }`.
- **Return Type**: `{ success: boolean, message: string, item?: InventoryItem }`.

---

### Customer & Bulk Ingestion Actions (`actions/customer.actions.ts`)

#### `bulkImportCustomersAction(shopId, records)`
- **Description**: High-performance transactional batch ingestion endpoint for customer directories imported via CSV. Generates sequential `registrationId` values (`OP-shopNum-YYYY-NNNN`) in a single query batch and commits all valid rows atomically.
- **Route**: Accessible via `/shop/customers/import`.
- **Payload**: `shopId: string`, `records: Array<{ fullName, phone, email?, gender?, dateOfBirth?, address?, city?, state?, pincode?, referredBy?, notes? }>`.
- **Validation**: Enforces strict 10-digit numeric phone format, minimum name length, and email format.
- **Return Type**: `{ success: boolean, message: string, count?: number, firstRegId?: string, lastRegId?: string, errors?: string[] }`.

---

### Optical Manager Desktop Assistant Actions (`actions/desktop-wa.actions.ts`)

#### `generateShopPairingKeyAction(shopId?)`
- **Description**: Generates a deterministic Base64-encoded store pairing key (`OM_WA_...`) embedding store credentials and Supabase endpoints for pairing the local Electron Desktop Assistant to this counter.
- **Return Type**: `{ success: boolean, data?: ShopPairingInfo, error?: string }`.

#### `dispatchWhatsAppMessageAction(payload)`
- **Description**: Enqueues a WhatsApp utility notification into `whatsapp_dispatch_queue`. The local Desktop Assistant listening via Realtime Supabase WebSockets and periodic polling picks up and sends the message automatically.
- **Payload**: `DispatchWhatsAppPayload` (`phoneNumber`, `messageText`, `mediaUrl?`, `mediaType?`, `templateKey?`, `recipientName?`, `shopId?`, `metadata?`).
- **Return Type**: `{ success: boolean, queueId?: string, isDesktopOnline?: boolean, error?: string }`.

#### `checkDesktopAssistantStatusAction(shopId?)`
- **Description**: Inspects `whatsapp_dispatch_queue` for recent heartbeat updates (`updatedAt > 2 minutes ago`) and pending message counts to determine live online/offline state of the store's Desktop Assistant.
- **Return Type**: `{ isOnline: boolean, lastActiveAt?: string | null, pendingCount: number, metadata?: any }`.
