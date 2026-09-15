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
| `permissions` | `jsonb` | NULLABLE | Granular module permission flags (`dashboard`, `inventory`, `sales`, `returns`, `customers`, `appointments`, `analytics`, `reports`, `settings`, `support`, `edit_orders`, `delete_orders`) |

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
| `creditApplied` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Store credit deducted from invoice total |
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
| `deletedAt` | `timestamp` | NULLABLE, INDEXED | Soft-deletion timestamp (null for active invoices) |
| `deletedBy` | `uuid` | FK -> `profiles.id` (SET NULL) | User account who deleted the record |

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
| `deletedAt` | `timestamp` | NULLABLE, INDEXED | Soft-deletion timestamp (null for active orders) |
| `deletedBy` | `uuid` | FK -> `profiles.id` (SET NULL) | User account who deleted the record |

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

---

### 5. Patients, Customers & Store Credit Ledger (`db/schema/customers.ts`, `db/schema/customer-credit-ledger.ts`)

#### `customers`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Customer unique identifier |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE) | Physical store outlet ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE) | Multi-tenant organization ID |
| `registrationId` | `varchar(50)` | NOT NULL, INDEXED | Human-readable ID (`OP-shopNum-YYYY-NNNN`) |
| `fullName` | `varchar(255)` | NOT NULL | Patient / customer name |
| `email` | `varchar(255)` | NULLABLE | Patient email address |
| `phone` | `varchar(20)` | NOT NULL, INDEXED | Primary contact number |
| `dateOfBirth` | `date` | NULLABLE | Patient date of birth |
| `gender` | `gender` | NULLABLE | Patient gender |
| `bloodGroup` | `blood_group` | NULLABLE | Patient blood group |
| `storeCredit` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00, INDEXED | Accumulated store credit balance |
| `notes` | `text` | NULLABLE | Clinical & general customer remarks |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Patient registration timestamp |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Last profile modification timestamp |

#### `customer_credit_ledger`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Ledger entry identifier |
| `customerId` | `uuid` | FK -> `customers.id` (CASCADE), INDEXED | Associated customer ID |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE), INDEXED | Physical store branch ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE), INDEXED | Multi-tenant organization ID |
| `transactionType` | `varchar(50)` | NOT NULL | `CREDIT_ISSUED` (from sales return) or `CREDIT_REDEEMED` (used in invoice) |
| `amount` | `decimal(10,2)` | NOT NULL | Transaction credit value |
| `balanceBefore` | `decimal(10,2)` | NOT NULL | Customer credit balance prior to transaction |
| `balanceAfter` | `decimal(10,2)` | NOT NULL | Customer credit balance post transaction |
| `referenceType` | `varchar(50)` | NOT NULL | `SALES_RETURN` or `INVOICE` |
| `referenceNumber` | `varchar(100)` | NOT NULL | Associated Return # or Invoice # |
| `notes` | `text` | NULLABLE | Descriptive note or reason |
| `performedBy` | `uuid` | FK -> `profiles.id` (SET NULL) | Staff member who executed the transaction |
| `createdAt` | `timestamp` | NOT NULL, defaultNow(), INDEXED | Audit event timestamp |

---

### 6. Clinical Prescriptions & Refraction (`db/schema/prescriptions.ts`)

#### `prescriptions`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Prescription unique identifier |
| `customerId` | `uuid` | FK -> `customers.id` (CASCADE), INDEXED | Patient reference |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE), INDEXED | Outlet store location |
| `rxNumber` | `varchar(50)` | NULLABLE, INDEXED | Clinical Rx identifier (e.g. `PR-8821`) |
| `rxCategory` | `varchar(50)` | NOT NULL, DEFAULT 'SPECT_RX' | Refraction tab (`SPECT_RX`, `CL_RX`, `DISTANCE`, `NEAR`) |
| `prescriptionType`| `prescription_type` | NOT NULL, DEFAULT 'DISTANCE' | Vision correction category (`DISTANCE`, `NEAR`) |
| `sphOd` | `decimal(4,2)` | NULLABLE | Right Eye (OD/RE) sphere power diopter |
| `cylOd` | `decimal(4,2)` | NULLABLE | Right Eye (OD/RE) cylinder power diopter |
| `axisOd` | `integer` | NULLABLE | Right Eye (OD/RE) astigmatism axis (1° to 180°) |
| `addOd` | `decimal(4,2)` | NULLABLE | Right Eye (OD/RE) presbyopia addition diopter |
| `vaOd` | `varchar(20)` | NULLABLE | Right Eye (OD/RE) visual acuity (6/6, 20/20, N6) |
| `pdOd` | `decimal(4,2)` | NULLABLE | Right Eye monocular pupillary distance (mm) |
| `caddRight` | `varchar(20)` | NULLABLE | Right Eye contact lens addition / intermediate power |
| `sphOs` | `decimal(4,2)` | NULLABLE | Left Eye (OS/LE) sphere power diopter |
| `cylOs` | `decimal(4,2)` | NULLABLE | Left Eye (OS/LE) cylinder power diopter |
| `axisOs` | `integer` | NULLABLE | Left Eye (OS/LE) astigmatism axis (1° to 180°) |
| `addOs` | `decimal(4,2)` | NULLABLE | Left Eye (OS/LE) presbyopia addition diopter |
| `vaOs` | `varchar(20)` | NULLABLE | Left Eye (OS/LE) visual acuity (6/6, 20/20, N6) |
| `pdOs` | `decimal(4,2)` | NULLABLE | Left Eye monocular pupillary distance (mm) |
| `caddLeft` | `varchar(20)` | NULLABLE | Left Eye contact lens addition / intermediate power |
| `pd` | `decimal(4,2)` | NULLABLE | Total binocular pupillary distance (mm) |
| `lensType` | `varchar(50)` | NULLABLE | Lens design (`SINGLE_VISION`, `BIFOCAL`, `PROGRESSIVE`, `BLUE_CUT`, `ANTI_REFLECTIVE`, `PHOTOCHROMIC`, `HIGH_INDEX`, `POLARIZED`) |
| `optometristName` | `varchar(255)` | NULLABLE | Testing optometrist name |
| `doctorName` | `varchar(255)` | NULLABLE | Prescribing doctor / ophthalmologist |
| `prescribedDate` | `date` | NULLABLE | Clinical examination / prescription date |
| `notes` | `text` | NULLABLE | Clinical remarks and dispensation notes |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Record creation timestamp |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Record update timestamp |

---

### 7. Sales Returns & Refund Resolutions (`db/schema/sales-returns.ts`)

#### `sales_returns`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Return record unique identifier |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE) | Physical store outlet ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE) | Multi-tenant organization ID |
| `invoiceId` | `uuid` | FK -> `invoices.id` (CASCADE) | Original billed invoice reference |
| `customerId` | `uuid` | FK -> `customers.id` (CASCADE) | Customer returning the items |
| `returnNumber` | `varchar(50)` | NOT NULL, UNIQUE(org, num) | Sequential return ID (`RET-shopNum-YYYY-NNNN`) |
| `totalRefundAmount`| `decimal(10,2)` | NOT NULL | Total financial value refunded/credited |
| `refundMethod` | `varchar(50)` | NOT NULL, DEFAULT 'CASH' | Resolution method: `CASH` or `STORE_CREDIT` |
| `creditAmount` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Amount converted to customer store credit balance |
| `reason` | `text` | NULLABLE | Reason for merchandise return |
| `status` | `varchar(20)` | NOT NULL, DEFAULT 'COMPLETED' | Return workflow state |
| `processedBy` | `uuid` | FK -> `profiles.id` (SET NULL) | Staff member processing the return |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Return execution timestamp |

#### `sales_return_items`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Item return line ID |
| `returnId` | `uuid` | FK -> `sales_returns.id` (CASCADE) | Associated return header record |
| `invoiceItemId` | `uuid` | FK -> `invoice_items.id` (RESTRICT) | Original invoice item reference |
| `inventoryId` | `uuid` | FK -> `inventory.id` (RESTRICT) | Product inventory ID restored to stock |
| `quantity` | `integer` | NOT NULL | Quantity returned |
| `unitPrice` | `decimal(10,2)` | NOT NULL | Item price at time of original invoice |
| `refundAmount` | `decimal(10,2)` | NOT NULL | Net refund amount allocated to this item |
| `reason` | `text` | NULLABLE | Item-specific defect or return reason |
| `restock` | `boolean` | NOT NULL, DEFAULT true | Whether inventory counts were incremented |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Item return line creation timestamp |

---

### 8. Optical Inventory & Stock Management (`db/schema/inventory.ts`)

#### `inventory`
Base entity for all stock items across all categories (Frames, Lenses, Contact Lenses, Accessories).

| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Inventory record unique identifier |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE), INDEXED | Physical store outlet ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE), INDEXED | Multi-tenant organization ID |
| `productCode` | `varchar(100)` | NULLABLE, INDEXED, UNIQUE(org, product_code) | Unique item code / identification within organization |
| `productName` | `varchar(255)` | NULLABLE | Display product name across all product categories |
| `name` | `varchar(255)` | NOT NULL, INDEXED | Synchronized item title (backwards compatible with billing & POS) |
| `category` | `varchar(50)` | NOT NULL, DEFAULT 'FRAME', INDEXED | Category code (`FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SOLUTION`, or custom organization-defined categories) |
| `brand` | `varchar(100)` | NULLABLE, INDEXED | Manufacturer or designer brand |
| `model` | `varchar(100)` | NULLABLE | Model number or code |
| `sku` | `varchar(100)` | NULLABLE, INDEXED | Barcode / SKU string (synchronized with productCode) |
| `price` | `decimal(10,2)` | NOT NULL | Retail selling price |
| `costPrice` | `decimal(10,2)` | NULLABLE | Purchase / acquisition cost price |
| `quantity` | `integer` | NOT NULL, DEFAULT 0 | Current on-hand stock count |
| `minQuantity` | `integer` | NOT NULL, DEFAULT 5 | Low-stock threshold trigger level |
| `isActive` | `boolean` | NOT NULL, DEFAULT true | Active status toggle |
| `imageUrl` | `text` | NULLABLE | Cloudinary / Supabase storage image URL |
| `hsnCode` | `varchar(20)` | NULLABLE | Harmonized System of Nomenclature code for GST |
| `cgstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 6.00 | Intra-state Central GST rate |
| `sgstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 6.00 | Intra-state State GST rate |
| `igstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 12.00 | Inter-state Integrated GST rate |
| `vendorName` | `varchar(255)` | NULLABLE | Supplier / distributor business name |
| `rackLocation` | `varchar(100)` | NULLABLE | Physical shelf or bin coordinates |
| `requiresExpiryTracking` | `boolean` | NOT NULL, DEFAULT false | Whether batch/expiry tracking is enforced |
| `batchNumber` | `varchar(100)` | NULLABLE | Lot/batch number |
| `expiryDate` | `date` | NULLABLE | Product expiration date |
| `purchaseInvoiceNo` | `varchar(100)` | NULLABLE | Vendor invoice reference |
| `inwardDate` | `date` | NULLABLE | Stock arrival / purchase inward date |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Item entry creation timestamp |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Last modification timestamp |

**Indexes & Constraints**:
- `uniqueIndex("inventory_shop_product_code_idx").on(table.shopId, table.productCode)`: Enforces store-scoped uniqueness for product codes.
- `index("inventory_product_code_idx").on(table.productCode)`: Optimizes real-time product code lookups.

#### Category Extension Tables
- `frames`: Dimensions (`frameWidth`, `bridgeWidth`, `templeLength`, `lensHeight`), shape, material, color, rim type, gender.
- `lenses`: Optical specifications (`lensType`, `lensMaterial`, `coating`, `index`, `tintColor`, `uvProtection`, `prescriptionRequirements`).
- `contact_lenses`: Modality (`Daily Disposable`, `Weekly`, `Monthly`, `Yearly`), base curve, diameter, color, power grid (`sphere`, `cylinder`, `axis`, `addPower`), box quantity.
- `accessories`: Accessory categorization (`type`, `sizeVolume`, `colorPattern`).
- `inventory_movements`: Stock audit trail (`movementType`: `IN`, `OUT`, `ADJUSTMENT`, quantity changes, and staff references).

---

### 9. Product Categories & Dynamic Tax Master (`db/schema/product-categories.ts`)

#### `product_categories`
Stores default optical product categories and custom merchant-defined categories with their default HSN codes and GST taxation percentages (`CGST`, `SGST`, `IGST`).

| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Category unique identifier |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE), INDEXED | Multi-tenant organization ID |
| `name` | `varchar(100)` | NOT NULL | Human-readable category display name |
| `code` | `varchar(50)` | NOT NULL, INDEXED | Uppercase code identifier (e.g. `FRAME`, `LENS`, `SUNGLASSES`) |
| `hsnCode` | `varchar(20)` | NULLABLE | Default Harmonized System of Nomenclature code |
| `cgstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 6.00 | Default Intra-state CGST percentage |
| `sgstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 6.00 | Default Intra-state SGST percentage |
| `igstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 12.00 | Default Inter-state IGST percentage |
| `isSystem` | `boolean` | NOT NULL, DEFAULT false | Whether category is protected system default |
| `isActive` | `boolean` | NOT NULL, DEFAULT true | Active status toggle |
| `displayOrder` | `integer` | NOT NULL, DEFAULT 0 | Ordering sequence on Add Item and filter bars |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Creation timestamp |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Last rate modification timestamp |

**Indexes & Constraints**:
- `uniqueIndex("product_categories_org_code_idx").on(table.organizationId, table.code)`: Prevents duplicate category codes within an organization.
- `index("product_categories_org_active_idx").on(table.organizationId, table.isActive)`: Rapid lookup of active categories.

---

### 10. Purchases, Inward Supply & Vendors (`db/schema/vendors.ts`, `db/schema/purchase-orders.ts`, `db/schema/purchase-order-items.ts`)

#### `vendors`
Stores supplier and vendor business profiles, contact persons, tax identification (GSTIN, PAN), and physical location addresses.

| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Vendor unique identifier |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE), INDEXED | Shop location reference |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE), INDEXED | Multi-tenant organization reference |
| `name` | `varchar(255)` | NOT NULL | Vendor company / supplier name |
| `contactPerson` | `varchar(255)` | NULLABLE | Primary representative or account manager |
| `phone` | `varchar(20)` | NULLABLE | 10-digit primary phone contact |
| `email` | `varchar(255)` | NULLABLE | Official supplier email address |
| `gstin` | `varchar(20)` | NULLABLE, INDEXED | 15-character GST Identification Number |
| `panNumber` | `varchar(20)` | NULLABLE | Permanent Account Number (PAN) |
| `address` | `text` | NULLABLE | Street address / premises details |
| `city` | `varchar(100)` | NULLABLE | City / Municipality |
| `state` | `varchar(100)` | NULLABLE | State / Province |
| `pincode` | `varchar(10)` | NULLABLE | 6-digit postal PIN code |
| `isActive` | `boolean` | NOT NULL, DEFAULT true | Active status indicator |
| `notes` | `text` | NULLABLE | Internal merchant notes |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Creation timestamp |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Last update timestamp |

**Indexes & Constraints**:
- `uniqueIndex("vendors_org_name_idx").on(table.organizationId, table.name)`: Prevents duplicate vendor names per organization.
- `index("vendors_org_gstin_idx").on(table.organizationId, table.gstin)`: Fast lookups by GSTIN.

#### `purchase_orders`
Stores purchase order bills, supplier inward invoices, and calculated financial summaries.

| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Purchase order unique identifier |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE), INDEXED | Physical outlet store ID |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE), INDEXED | Multi-tenant organization ID |
| `vendorId` | `uuid` | FK -> `vendors.id` (SET NULL), INDEXED | Linked supplier directory record |
| `vendorName` | `varchar(255)` | NULLABLE | Denormalized supplier name snapshot |
| `purchaseNumber` | `varchar(100)` | NOT NULL, INDEXED | Supplier bill / invoice number |
| `purchaseDate` | `date` | NOT NULL, INDEXED | Inward bill transaction date |
| `status` | `purchase_status` | NOT NULL, DEFAULT 'DRAFT' | `DRAFT`, `COMPLETED`, `CANCELLED` |
| `taxRule` | `varchar(20)` | NOT NULL, DEFAULT 'EXCLUDE' | `EXCLUDE` or `INCLUDE` |
| `taxType` | `varchar(50)` | NOT NULL, DEFAULT 'SGST_CGST' | `SGST_CGST` (Intra-state) or `IGST` (Inter-state) |
| `totalQuantity` | `integer` | NOT NULL, DEFAULT 0 | Sum of all inward item quantities |
| `totalUnitAmount`| `decimal(12,2)` | NOT NULL, DEFAULT 0.00 | Sum of item unit purchase prices |
| `totalBasePrice` | `decimal(12,2)` | NOT NULL, DEFAULT 0.00 | Sum of line base amounts (`qty * unitPrice`) |
| `totalGstAmount` | `decimal(12,2)` | NOT NULL, DEFAULT 0.00 | Sum of all CGST + SGST or IGST taxes |
| `totalPurchase` | `decimal(12,2)` | NOT NULL, DEFAULT 0.00 | Grand purchase amount before round off |
| `roundOff` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | User-entered rounding adjustment (+/-) |
| `totalNetPurchase`| `decimal(12,2)` | NOT NULL, DEFAULT 0.00 | Final net invoice payable amount |
| `notes` | `text` | NULLABLE | Supplier / inward order remarks |
| `createdBy` | `uuid` | FK -> `profiles.id` (SET NULL) | Staff member who entered the bill |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Record creation timestamp |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Last update timestamp |

#### `purchase_order_items`
Stores the individual line items received in a purchase invoice matching the SS2 table specification.

| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, defaultRandom() | Line item unique identifier |
| `purchaseOrderId`| `uuid` | FK -> `purchase_orders.id` (CASCADE), INDEXED | Header bill reference |
| `inventoryId` | `uuid` | FK -> `inventory.id` (SET NULL), INDEXED | Linked inventory product |
| `shopId` | `uuid` | FK -> `shops.id` (CASCADE), INDEXED | Outlet store location |
| `organizationId` | `uuid` | FK -> `organizations.id` (CASCADE) | Multi-tenant organization reference |
| `serialNumber` | `integer` | NOT NULL | Sequential row number (1, 2, 3...) |
| `productName` | `varchar(255)` | NOT NULL | Item name (Products column) |
| `productCode` | `varchar(100)` | NULLABLE | Barcode / SKU code |
| `category` | `varchar(50)` | NULLABLE | Product category code |
| `details` | `text` | NULLABLE | Specifications / attributes summary |
| `unitPrice` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Unit acquisition cost before tax |
| `basePrice` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | `quantity * unitPrice` |
| `hsnCode` | `varchar(20)` | NULLABLE | Harmonized System Code |
| `gstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 0.00 | Overall GST percentage |
| `cgstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 0.00 | Central GST rate (half of GST) |
| `cgstAmount` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Computed CGST value in INR |
| `sgstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 0.00 | State GST rate (half of GST) |
| `sgstAmount` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Computed SGST value in INR |
| `igstPercent` | `decimal(5,2)` | NOT NULL, DEFAULT 0.00 | Integrated GST rate |
| `igstAmount` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Computed IGST value in INR |
| `purchasePrice` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Unit price with GST included |
| `quantity` | `integer` | NOT NULL, DEFAULT 0 | Inward unit count |
| `totalPurchasePrice`| `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | `purchasePrice * quantity` |
| `retailPrice` | `decimal(10,2)` | NOT NULL, DEFAULT 0.00 | Customer selling price (MRP) |
| `createdAt` | `timestamp` | NOT NULL, defaultNow() | Creation timestamp |
| `updatedAt` | `timestamp` | NOT NULL, defaultNow() | Update timestamp |



