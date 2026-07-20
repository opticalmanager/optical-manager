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
