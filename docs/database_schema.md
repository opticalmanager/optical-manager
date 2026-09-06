# Database Schema & Entity Relationships

The database is built on **PostgreSQL** (via Supabase) and managed using **Drizzle ORM**. It features 20 normalized relational tables designed for multi-tenant isolation, POS billing, optical inventory taxonomies, eye prescriptions, patient appointments, and Super Admin lead management.

---

## 🔠 Database ENUM Definitions

```sql
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'OWNER', 'SHOP_MANAGER');
CREATE TYPE demo_request_status AS ENUM ('PENDING', 'CONTACTED', 'DEMO_SCHEDULED', 'APPROVED', 'REJECTED');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE blood_group AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');
CREATE TYPE prescription_type AS ENUM ('DISTANCE', 'NEAR');
CREATE TYPE inventory_category AS ENUM ('FRAME', 'LENS', 'CONTACT_LENS', 'ACCESSORY', 'SOLUTION');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'PENDING', 'PAID', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER');
CREATE TYPE fulfillment_status AS ENUM ('PROCESSING', 'READY', 'DELIVERED', 'ON_HOLD');
CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
CREATE TYPE subscription_plan AS ENUM ('TRIAL', 'BASIC', 'PRO', 'ENTERPRISE');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');
```

---

## 📋 Table Definitions & Schema Details

### 1. Platform & Tenant Tables

#### `demo_requests` (`db/schema/demo-requests.ts`)
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Unique lead request ID |
| `storeName` | `varchar(255)` | NOT NULL | Applicant optical store name |
| `ownerName` | `varchar(255)` | NOT NULL | Store owner contact name |
| `email` | `varchar(255)` | NOT NULL, INDEXED | Owner email address |
| `phone` | `varchar(20)` | NOT NULL, INDEXED | WhatsApp mobile phone |
| `city` | `varchar(100)` | NULLABLE | Store location city |
| `status` | `demo_request_status` | NOT NULL, DEFAULT 'PENDING' | Lead pipeline status |
| `notes` | `text` | NULLABLE | Internal sales call notes |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Submission timestamp |

#### `subscriptions` (`db/schema/subscriptions.ts`)
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Subscription ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE) | Associated organization |
| `plan` | `subscription_plan` | NOT NULL, DEFAULT 'TRIAL' | `TRIAL`, `BASIC`, `PRO`, `ENTERPRISE` |
| `status` | `subscription_status`| NOT NULL, DEFAULT 'ACTIVE' | `ACTIVE`, `EXPIRED`, `SUSPENDED`, `CANCELLED` |
| `maxShops` | `integer` | NOT NULL, DEFAULT 1 | Allowed store outlets |
| `maxUsers` | `integer` | NOT NULL, DEFAULT 3 | Allowed user profiles |
| `billingCycle` | `varchar(20)` | NOT NULL, DEFAULT 'MONTHLY' | Billing frequency |
| `trialEndsAt` | `timestamp` | NULLABLE | Free trial expiration date |
| `currentPeriodStart`| `timestamp` | NULLABLE | Active period start |
| `currentPeriodEnd` | `timestamp` | NULLABLE | Active period end date |
| `notes` | `text` | NULLABLE | Super Admin log notes |

#### `profiles` (`db/schema/profiles.ts`)
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK (references `auth.users.id`) | Supabase User ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (NULLABLE) | Organization reference (null for Super Admin) |
| `shopId` | `uuid` | FK -> `shops.id` (NULLABLE) | Shop branch reference |
| `fullName` | `varchar(255)` | NOT NULL | User full name |
| `email` | `varchar(255)` | NOT NULL | User email address |
| `role` | `user_role` | NOT NULL | `SUPER_ADMIN`, `OWNER`, `SHOP_MANAGER` |
| `customRoleName` | `varchar(100)` | NULLABLE | Custom role title (e.g. Optometrist, Cashier, Sales & Billing) |
| `permissions` | `jsonb` | NULLABLE | Granular module permission flags (`dashboard`, `inventory`, `sales`, `returns`, `customers`, `appointments`, `analytics`, `reports`, `settings`, `support`, `edit_orders`) |

---

### 2. Utility Email Communication Tables (`db/schema/email.ts`)

#### `email_configs`
Stores AES-256-GCM encrypted Gmail SMTP credentials and 3-tier rate limiting counters (`dailySentCount`, `dailyLimit`, `hourlySentCount`, `minuteSentCount`).

#### `email_templates`
Stores HTML email templates for `INVOICE`, `RECEIPT`, `REMINDER`, `WELCOME`, `APPOINTMENT`, and `CUSTOM` categories with `{{variable}}` placeholders.

#### `email_triggers`
Stores automated event trigger rules (`CUSTOMER_CREATED`, `INVOICE_CREATED`, `PAYMENT_RECEIVED`, `APPOINTMENT_BOOKED`, `APPOINTMENT_REMINDER`) linked to templates.

#### `email_logs`
Logs all sent, failed, and rate-limited email dispatches across all store locations with timestamps and error trace messages.

---

### 3. POS Billing & Invoicing Tables (`db/schema/invoices.ts`, `db/schema/invoice-items.ts`, `db/schema/receipts.ts`)

#### `invoices`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Invoice unique identifier |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE) | Physical store outlet ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE) | Multi-tenant organization ID |
| `customerId` | `uuid` | FK -> `customers.id` (RESTRICT) | Billed patient/customer ID |
| `invoiceNumber` | `varchar(50)` | NOT NULL, UNIQUE(org, num) | Human-readable sequential invoice number |
| `subtotal` | `decimal(10,2)` | NOT NULL | Gross items subtotal |
| `discount` | `decimal(10,2)` | NOT NULL, DEFAULT 0 | Total discount amount in Rupees |
| `discountPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 0 | Overall discount percentage |
| `tax` | `decimal(10,2)` | NOT NULL, DEFAULT 0 | Total aggregated GST tax |
| `taxPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 0 | Effective tax percentage |
| `total` | `decimal(10,2)` | NOT NULL | Net payable invoice amount |
| `status` | `invoice_status` | NOT NULL, DEFAULT 'DRAFT' | `DRAFT`, `PENDING`, `PAID`, `CANCELLED` |
| `paymentMethod` | `payment_method` | NULLABLE | `CASH`, `CARD`, `UPI`, `BANK_TRANSFER` |
| `fulfillmentStatus`| `fulfillment_status`| NOT NULL, DEFAULT 'PROCESSING' | `PROCESSING`, `READY`, `DELIVERED`, `ON_HOLD` |
| `estimatedDelivery`| `date` | NULLABLE | Target order fulfillment date |
| `amountPaid` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Upfront payment deposit |
| `balanceDue` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Remaining unpaid dues |
| `soldBy` | `varchar(255)` | NULLABLE | Salesperson / staff attribution |
| `notes` | `text` | NULLABLE | Invoice remarks and optometry instructions |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Billing occurrence timestamp (supports backdating) |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Last modification timestamp |

#### `invoice_items`
Stores granular line items per invoice with individual pricing, dual discounts (`discountPercent`, `discountAmount`), and per-item tax components (`cgstPercent`, `cgstAmount`, `sgstPercent`, `sgstAmount`, `igstPercent`, `igstAmount`).

#### `receipts`
Stores incremental payment receipts (`PPS-shopNum-YYYY-NNNN`) linking invoices and orders with `amountPaid`, `balanceDue`, `paymentMethod`, and `transactionId`.

---

### 4. Orders & Order Audit History Tables (`db/schema/orders.ts`)

#### `orders`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Order unique identifier |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE) | Physical store outlet ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE) | Multi-tenant organization ID |
| `customerId` | `uuid` | FK -> `customers.id` (CASCADE) | Customer / patient reference |
| `invoiceId` | `uuid` | FK -> `invoices.id` (CASCADE) | Linked tax invoice record |
| `receiptId` | `uuid` | FK -> `receipts.id` (SET NULL) | Attached payment receipt (if partially paid) |
| `orderNumber` | `varchar(50)` | NOT NULL, INDEXED | Sequential order number (`ORD-shop-YYYY-NNNN`) |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Order creation timestamp |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Last modification timestamp |

#### `order_edit_history`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Audit entry ID |
| `orderId` | `uuid` | FK -> `orders.id` (CASCADE) | Modified order reference |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE) | Physical store outlet ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE) | Multi-tenant organization ID |
| `userId` | `uuid` | FK -> `profiles.id` (SET NULL) | User account who performed the update |
| `userName` | `varchar(255)` | NOT NULL | User full name at the time of modification |
| `userRole` | `varchar(50)` | NOT NULL | User role at time of modification (`OWNER`, `SUPER_ADMIN`, `SHOP_MANAGER`) |
| `summary` | `text` | NOT NULL | Human-readable change summary (items, prices, payment, delivery) |
| `snapshot` | `jsonb` | NULLABLE | JSON snapshot containing `{ previous, updated }` states |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Exact timestamp of the edit event |

