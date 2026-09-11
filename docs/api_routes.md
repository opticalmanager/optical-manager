# API Endpoints Documentation

Optical Manager exposes RESTful API endpoints for data exporting, inventory quick search, global search, and public appointment booking.

---

## Endpoint Inventory

### 1. CSV Data Export APIs

#### `GET /api/orders/export`
- **Description**: Generates and downloads a CSV spreadsheet of orders and customer billing history for a specified timeframe.
- **Query Parameters**:
  - `timeframe`: `24h` | `7d` | `30d` | `90d` | `12m` | `ytd` | `all`
- **Response**: `200 OK` with `Content-Type: text/csv` download header.

#### `GET /api/reports/export`
- **Description**: Exports detailed financial revenue reports, GST tax breakdowns, and payment collection telemetry.
- **Query Parameters**:
  - `timeframe`: Date window filter.
- **Response**: `200 OK` with CSV binary payload.

---

### 2. POS & Global Search APIs

#### `GET /api/inventory/search`
- **Description**: Fast dynamic search endpoint for POS checkout and invoice generation.
- **Query Parameters**:
  - `q`: Search query string (sku, productName, brand, model).
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

#### `GET /book/[slug]`
- **Description**: Public appointment booking page for patients to view store operating hours and reserve consultation slots.

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
  - `PRESCRIPTION_CREATE`: Saves comprehensive optometry refraction values (Distance & Near OD/OS SPH, CYL, AXIS, ADD, V/N, PD, doctor & frame notes) offline and syncs atomically.
  - `RETURN_CREATE`: Processes product returns, restocks inventory, adjusts customer store credit ledgers, and logs non-restock audit movements.
- **Response**: `200 OK` JSON containing `{ results: [{ id, type, success, serverResultId, sku, registrationId, returnNumber, error }] }`.

