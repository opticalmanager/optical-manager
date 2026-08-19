# REST API Contract & Integration Specifications

This document defines the REST API contract for **OpticalManager**. It provides complete request/response schemas, query parameters, header requirements, authentication scopes, and error structures for system integrations, client components, and campaign synchronization.

---

## 🌐 Global Request Standards

### Base URL & Protocol
* **Production Endpoint:** `https://www.opticalmanager.in/api`
* **Development Endpoint:** `http://localhost:3000/api`
* **Protocol:** HTTPS (strictly enforced in production)
* **Data Format:** `application/json` for all request bodies and API responses.

### Required Request Headers

| Header Name | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `Authorization` | `string` | Optional* | Bearer JWT token (`Bearer <token>`). *Note: Browser clients pass session cookies automatically. |
| `Content-Type` | `string` | Yes | Must be `application/json` for `POST`, `PUT`, and `PATCH` requests. |
| `X-Shop-Id` | `string (UUID)` | Optional | Overrides active store outlet context for store owners. |

### Global Error Response Schema (`4xx` / `5xx`)

All API failures return a standardized error structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid customer input parameters.",
    "details": [
      {
        "field": "phone",
        "issue": "Phone number must contain exactly 10 digits."
      }
    ]
  },
  "timestamp": "2026-08-01T21:07:00Z"
}
```

#### HTTP Status Codes
* `200 OK`: Request succeeded. Returns requested data payload.
* `201 Created`: Entity created successfully.
* `400 Bad Request`: Malformed JSON or invalid parameters.
* `401 Unauthorized`: Missing or invalid authentication token.
* `403 Forbidden`: Authenticated user lacks permission scope for this action/outlet.
* `404 Not Found`: Target entity does not exist.
* `422 Unprocessable Entity`: Business logic rule violation.
* `500 Internal Server Error`: Server exception.

---

## 👥 Customer Management APIs

### 1. `GET /api/customers`
Fetches a paginated, searchable list of customer profiles belonging to the active store.

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)
* **Query Parameters:**

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `page` | `integer` | No | `1` | Page number for pagination. |
| `limit` | `integer` | No | `20` | Items per page (max 100). |
| `search` | `string` | No | `""` | Filters name, phone number, or city. |
| `tag` | `string` | No | `""` | Filters by customer tag (e.g. `VIP`, `PROGRESSIVE`). |
| `city` | `string` | No | `""` | Filters by customer city. |

#### Request Example
```http
GET /api/customers?page=1&limit=10&search=Rahul&tag=VIP HTTP/1.1
Host: www.opticalmanager.in
Authorization: Bearer <JWT_TOKEN>
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "c7a8f901-4b2e-41d3-98fa-123456789abc",
        "organizationId": "737709a3-6a37-48a0-84de-3dc1c043dc7a",
        "shopId": "23749aa9-735f-4eae-a48d-bc3481903210",
        "name": "Rahul Mehta",
        "phone": "9876543210",
        "email": "rahul.mehta@example.com",
        "gender": "MALE",
        "birthday": "1988-05-14",
        "city": "Narsapur",
        "bloodGroup": "O_POSITIVE",
        "tags": ["VIP", "PROGRESSIVE"],
        "lastPurchaseAt": "2026-07-15T10:30:00Z",
        "createdAt": "2025-01-10T08:00:00Z"
      }
    ],
    "pagination": {
      "totalRecords": 450,
      "totalPages": 45,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

---

### 2. `GET /api/customers/:id`
Retrieves a complete customer profile, including eye prescriptions, order history, and spend analytics.

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)
* **Path Variables:** `id` (UUID) - Target Customer ID.

#### Request Example
```http
GET /api/customers/c7a8f901-4b2e-41d3-98fa-123456789abc HTTP/1.1
Host: www.opticalmanager.in
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "c7a8f901-4b2e-41d3-98fa-123456789abc",
      "name": "Rahul Mehta",
      "phone": "9876543210",
      "email": "rahul.mehta@example.com",
      "gender": "MALE",
      "birthday": "1988-05-14",
      "city": "Narsapur",
      "address": "Main Road, Narsapur, Telangana",
      "bloodGroup": "O_POSITIVE",
      "notes": "Prefers titanium light-weight frames.",
      "lastPurchaseAt": "2026-07-15T10:30:00Z"
    },
    "prescriptions": [
      {
        "id": "p1234567-89ab-cdef-0123-456789abcdef",
        "prescriptionType": "DISTANCE",
        "optometristName": "Dr. V. Sharma",
        "sphOd": "-2.25",
        "cylOd": "-0.50",
        "axisOd": "180",
        "addOd": "+1.75",
        "sphOs": "-2.00",
        "cylOs": "-0.75",
        "axisOs": "175",
        "addOs": "+1.75",
        "pd": "64",
        "createdAt": "2026-07-15T09:45:00Z"
      }
    ],
    "orders": [
      {
        "id": "ord-8839201",
        "invoiceNumber": "INV-2026-0104",
        "totalAmount": 14500,
        "fulfillmentStatus": "DELIVERED",
        "promisedDate": "2026-07-18",
        "createdAt": "2026-07-15T10:30:00Z"
      }
    ]
  }
}
```

---

### 3. `POST /api/customers`
Registers a new patient/customer profile under the active store outlet.

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)

#### Request Body Schema
```json
{
  "name": "Ananya Rao",
  "phone": "9123456789",
  "email": "ananya.rao@example.com",
  "gender": "FEMALE",
  "birthday": "1994-11-22",
  "city": "Hyderabad",
  "address": "Banjara Hills, Hyderabad",
  "bloodGroup": "B_POSITIVE",
  "notes": "New contact lens user."
}
```

#### Response Example (`201 Created`)
```json
{
  "success": true,
  "message": "Customer created successfully.",
  "data": {
    "id": "d9b0e123-5c3f-42e4-99ab-987654321def",
    "name": "Ananya Rao",
    "phone": "9123456789",
    "createdAt": "2026-08-01T21:07:00Z"
  }
}
```

---

### 4. `PUT /api/customers/:id`
Updates an existing customer's information.

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)
* **Path Variables:** `id` (UUID) - Target Customer ID.

#### Request Body Schema
```json
{
  "name": "Ananya Rao Sharma",
  "city": "Secunderabad",
  "notes": "Updated contact lens power history."
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Customer profile updated successfully.",
  "data": {
    "id": "d9b0e123-5c3f-42e4-99ab-987654321def",
    "name": "Ananya Rao Sharma",
    "city": "Secunderabad",
    "updatedAt": "2026-08-01T21:08:00Z"
  }
}
```

---

## 🏷️ Segmentation & Grouping APIs

### 5. `GET /api/tags`
Retrieves all unique customer tags, classification labels, and frequency metrics for the active store.

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "tags": [
      { "name": "VIP", "count": 42, "color": "blue" },
      { "name": "PROGRESSIVE", "count": 128, "color": "emerald" },
      { "name": "CONTACT_LENS_USER", "count": 85, "color": "indigo" },
      { "name": "HIGH_POWER", "count": 31, "color": "rose" },
      { "name": "DUE_FOR_RETEST", "count": 64, "color": "amber" }
    ]
  }
}
```

---

### 6. `GET /api/groups`
Retrieves customer demographic segments, lifetime spend tiers, and purchase frequency groups.

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "groupId": "grp_high_spenders",
        "groupName": "High Value Customers (Spend > ₹20,000)",
        "memberCount": 54,
        "averageOrderValue": 24500
      },
      {
        "groupId": "grp_annual_retest",
        "groupName": "Prescription Expiry (Tested 11+ Months Ago)",
        "memberCount": 112,
        "averageOrderValue": 8900
      },
      {
        "groupId": "grp_kids_vision",
        "groupName": "Pediatric Eyewear Group (< 16 Years)",
        "memberCount": 38,
        "averageOrderValue": 6200
      }
    ]
  }
}
```

---

## 📢 Campaign & Marketing Integration APIs

### 7. `POST /api/campaign-sync`
Syncs customer segments and contact metadata to external broadcast platforms (WhatsApp API, Email Marketing, AI Voice Agents).

* **Authentication:** Required (`OWNER`, `SUPER_ADMIN`)

#### Request Body Schema
```json
{
  "campaignName": "Annual Vision Retest Reminder - August 2026",
  "channel": "WHATSAPP",
  "targetSegment": "grp_annual_retest",
  "tagFilter": "DUE_FOR_RETEST",
  "templateId": "tmpl_whatsapp_retest_v1",
  "scheduleTime": "2026-08-02T10:00:00Z"
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Campaign sync initialized successfully.",
  "data": {
    "campaignId": "cmp_992014812",
    "channel": "WHATSAPP",
    "syncedContactsCount": 112,
    "status": "QUEUED",
    "scheduledAt": "2026-08-02T10:00:00Z"
  }
}
```

---

## 📦 Additional POS & Inventory APIs

### 8. `GET /api/inventory`
Queries store stock catalog across optical categories.

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)
* **Query Parameters:** `category` (`FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SOLUTION`), `search`, `lowStock` (`true`/`false`).

### 9. `POST /api/invoices`
Creates a POS checkout billing invoice, deducts inventory stock, and logs payment receipts.

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)

### 10. `POST /api/orders/status`
Updates order fulfillment state (`PROCESSING` $\rightarrow$ `READY` $\rightarrow$ `DELIVERED`).

* **Authentication:** Required (`OWNER`, `SHOP_MANAGER`)
