# Database Overview & Entity Specifications

This document provides a conceptual overview of the **OpticalManager** relational database model. It explains every entity, table relationship, attribute, data type, and business constraint powering the ecosystem.

*(Note: Structured for developer comprehension — no raw SQL code snippets required).*

---

## 🗄️ Database Architectural Model

The database is structured around a multi-tenant hierarchy:

```
[ Organization ] 
    ├── [ Subscription ]
    ├── [ Shops / Outlets ]
    │       ├── [ Profiles / Users ]
    │       ├── [ Customers ] ───┬─── [ Prescriptions ]
    │       │                  └─── [ Appointments ]
    │       ├── [ Inventory ] ───┬─── [ Frame / Lens Details ]
    │       │                  └─── [ Stock Movements ]
    │       └── [ Invoices ]  ───┬─── [ Invoice Items ]
    │                          └─── [ Payment Receipts ] ─── [ Orders ]
    └── [ Email Configs & Logs ]
```

---

## 📋 Core Entity Definitions

### 1. Platform & Tenant Multi-Tenancy

#### `organizations` (Organizations / Business Accounts)
* **Purpose:** Represents the top-level business enterprise (e.g., "Vision Care Optics Group"). All data in the system belongs to an organization.
* **Key Attributes:**
  * `id`: Unique universal identifier for the business entity.
  * `name`: Legal or trade name of the optical business chain.
  * `slug`: URL-friendly identifier string.
  * `onboardingCompleted`: Boolean flag indicating if initial configuration is finished.
  * `createdAt`: Timestamp when the tenant registered.

#### `shops` (Stores / Outlets / Branches)
* **Purpose:** Represents an individual physical retail store branch or outlet under an organization (e.g., "Store 1 - Narsapur Branch").
* **Key Attributes:**
  * `id`: Unique store outlet identifier.
  * `organizationId`: Link to the parent organization.
  * `name`: Display name of the specific store branch.
  * `email`: Branch contact email address.
  * `phone`: Branch primary contact phone number.
  * `address`: Physical street address and location details.
  * `isActive`: Status flag indicating whether the store is operational.
  * `createdAt`: Timestamp when the branch was added.

#### `profiles` (Users / Staff Accounts)
* **Purpose:** Stores extended user profile information and links Supabase Authentication accounts (`auth.users`) to organizations and shops with granular Role-Based Access Control (RBAC).
* **Key Attributes:**
  * `id`: Primary key matching the unique Supabase Auth User ID.
  * `organizationId`: Associated organization (null for Super Admin).
  * `shopId`: Assigned store outlet (null for Store Owners and Super Admins; set for Shop Managers / Staff).
  * `fullName`: Full name of the staff member or owner.
  * `email`: Registered email address.
  * `role`: User authorization level (`SUPER_ADMIN`, `OWNER`, `SHOP_MANAGER`).
  * `customRoleName`: Custom staff role title (e.g., "Optometrist", "Sales & Billing", "Cashier", "Store Manager").
  * `permissions`: JSONB module access toggles (`dashboard`, `inventory`, `sales`, `returns`, `customers`, `appointments`, `analytics`, `reports`, `settings`, `support`).


#### `subscriptions` (Tenant Plans & Limits)
* **Purpose:** Tracks SaaS subscription status, plan tiers, and resource usage caps for each organization.
* **Key Attributes:**
  * `id`: Subscription record identifier.
  * `organizationId`: Associated tenant organization.
  * `plan`: Subscription tier (`TRIAL`, `BASIC`, `PRO`, `ENTERPRISE`).
  * `status`: Active state (`ACTIVE`, `EXPIRED`, `SUSPENDED`, `CANCELLED`).
  * `maxShops`: Maximum allowed store branches under this plan.
  * `maxUsers`: Maximum allowed staff user accounts.
  * `billingCycle`: Billing frequency (`MONTHLY`, `YEARLY`).
  * `trialEndsAt`: Expiration date for free trial period.
  * `currentPeriodStart` & `currentPeriodEnd`: Validity window for active billing cycle.

---

### 2. Customer Relationship Management (CRM)

#### `customers` (Patients & Customers)
* **Purpose:** Stores comprehensive demographic, contact, and purchasing records for patients/customers. Each customer belongs to a store outlet.
* **Key Attributes:**
  * `id`: Customer unique identifier.
  * `organizationId`: Parent organization reference.
  * `shopId`: Primary store outlet where the customer registered.
  * `name` (`fullName`): Customer full name.
  * `phone`: Mobile / WhatsApp contact number (strictly 10-digit formatted).
  * `email`: Optional email address.
  * `gender`: Customer gender (`MALE`, `FEMALE`, `OTHER`).
  * `birthday` (`dob`): Date of birth.
  * `city`: City / locality name.
  * `address`: Full home or mailing address.
  * `bloodGroup`: Medical blood group classification.
  * `notes`: Operational or medical notes logged by staff.
  * `lastPurchaseAt`: Timestamp of the customer's most recent completed invoice transaction.
  * `createdAt` & `updatedAt`: Record audit timestamps.

#### `prescriptions` (Eye Testing & Clinical Refraction Records)
* **Purpose:** Stores detailed optometrist vision refraction measurements for glasses or contact lenses. Linked directly to a customer.
* **Key Attributes:**
  * `id`: Prescription record identifier.
  * `customerId`: Associated patient reference.
  * `shopId`: Store outlet where test was performed.
  * `optometristName`: Name of testing practitioner or optometrist.
  * `prescriptionType`: Vision correction type (`DISTANCE`, `NEAR`).
  * **Right Eye (OD) Parameters:**
    * `sphOd`: Sphere power (-20.00 to +20.00 diopters).
    * `cylOd`: Cylinder power (-10.00 to +10.00 diopters).
    * `axisOd`: Axis angle (1° to 180°).
    * `addOd`: Near addition power.
    * `vaOd`: Visual acuity measurement (e.g. 6/6, 20/20).
  * **Left Eye (OS) Parameters:**
    * `sphOs`: Sphere power.
    * `cylOs`: Cylinder power.
    * `axisOs`: Axis angle.
    * `addOs`: Near addition power.
    * `vaOs`: Visual acuity measurement.
  * `pd`: Pupillary Distance measurement in millimeters.
  * `notes`: Clinical testing observations.

---

### 3. Inventory, Taxonomy & Products

#### `inventory` (Master Stock Items)
* **Purpose:** Core inventory catalog tracking general product details, stock levels, and pricing across store locations.
* **Key Attributes:**
  * `id`: Inventory item identifier.
  * `organizationId` & `shopId`: Store location holding the stock.
  * `name`: Product title (e.g. "Ray-Ban Aviator Classic").
  * `sku`: Stock Keeping Unit alphanumeric code.
  * `category`: Product taxonomy category (`FRAME`, `LENS`, `CONTACT_LENS`, `ACCESSORY`, `SOLUTION`).
  * `brand`: Manufacturer or brand name.
  * `modelNumber`: Model or style code.
  * `purchasePrice`: Cost price paid to vendor.
  * `sellingPrice`: Retail selling price to customer.
  * `stockQuantity`: Current physical stock count on hand.
  * `minStockLevel`: Low-stock alert threshold limit.

#### Specialized Product Detail Tables (`products`)

1. **`frame_details` (Eyewear Frames):**
   * Extended technical specs for optical frames: `gender` (Men, Women, Unisex, Kids), `shape` (Rectangle, Oval, Aviator, Wayfarer, Cat Eye, Round), `material` (Titanium, Acetate, Metal, TR90, Wood), `color`, `size` (Eye width - Bridge - Temple length), `rimType` (Full Rim, Half Rim, Rimless).
2. **`lens_details` (Optical Spectacle Lenses):**
   * Technical specs for spectacle lenses: `lensType` (Single Vision, Bifocal, Progressive), `index` (Refractive index: 1.56, 1.61, 1.67, 1.74), `coating` (Anti-Reflective, Blue Cut, Photochromic, Scratch Resistant), `tint` color.
3. **`contact_lens_details` (Contact Lenses):**
   * Extended specs: `replacementFrequency` (Daily, Weekly, Monthly, Yearly), `baseCurve` (BC mm), `diameter` (DIA mm), `powerRange`, `packSize` (Lenses per box).
4. **`accessory_details` (Store Accessories):**
   * Category details: `accessoryType` (Spray, Case, Cloth, Cord), `compatibility`.

#### `stock_movements` (Stock Audit Log)
* **Purpose:** Ledger of all stock quantity adjustments.
* **Key Attributes:**
  * `inventoryId`: Target item modified.
  * `movementType`: Direction of movement (`IN` for stock entry, `OUT` for POS sales, `ADJUSTMENT` for audits).
  * `quantity`: Number of units adjusted.
  * `reason`: Operational explanation.

---

### 4. POS Billing, Receipts & Orders

#### `invoices` (Sales Invoices & Billing)
* **Purpose:** Financial invoice document generated during POS checkout.
* **Key Attributes:**
  * `id`: Invoice document identifier.
  * `invoiceNumber`: Sequential human-readable invoice code (e.g. `INV-2026-0001`).
  * `customerId`: Customer purchasing items.
  * `shopId`: Originating store outlet.
  * `subtotal`, `taxAmount`, `discountAmount`, `totalAmount`: Financial totals.
  * `status`: Payment invoice status (`DRAFT`, `PENDING`, `PAID`, `CANCELLED`).
  * `notes`: Customer order notes.

#### `invoice_items` (Invoice Line Items)
* **Purpose:** Individual items sold within an invoice.
* **Key Attributes:**
  * `invoiceId`: Parent invoice reference.
  * `inventoryId`: Inventory item purchased.
  * `quantity`: Number of items bought.
  * `unitPrice` & `totalPrice`: Item price snapshot at time of sale.

#### `receipts` (Payment Receipts & Ledger)
* **Purpose:** Logs every partial or full payment transaction received against an invoice.
* **Key Attributes:**
  * `invoiceId`: Associated invoice.
  * `receiptNumber`: Sequential receipt document code.
  * `amountPaid`: Amount paid in this specific transaction.
  * `paymentMethod`: Payment channel (`CASH`, `CARD`, `UPI`, `BANK_TRANSFER`).
  * `notes`: Transaction reference numbers (e.g. UPI UTR number).

#### `orders` (Order Fulfillment & Lab Pipeline)
* **Purpose:** Tracks optical lab manufacturing, lens edging, frame fitting, and customer pickup status for an invoice.
* **Key Attributes:**
  * `id`: Order tracking identifier.
  * `invoiceId`: Associated sales invoice.
  * `status`: Fulfillment pipeline stage (`PROCESSING`, `READY`, `DELIVERED`, `ON_HOLD`).
  * `promisedDate`: Promised ready/delivery date communicated to customer.
  * `deliveredAt`: Actual timestamp when customer picked up the eyewear.

---

### 5. Appointments & System Leads

#### `appointments` (Patient Optometrist Visits)
* **Purpose:** Schedules and tracks eye examination sessions.
* **Key Attributes:**
  * `id`: Appointment identifier.
  * `customerId`: Patient visiting the store.
  * `shopId`: Target store branch.
  * `optometristName`: Doctor or tester assigned.
  * `appointmentDate`: Date and time slot.
  * `status`: State (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).

#### `demo_requests` (Super Admin Lead Pipeline)
* **Purpose:** Platform landing page requests from store owners applying for OpticalManager subscriptions.
* **Key Attributes:**
  * `storeName`, `ownerName`, `email`, `phone`, `city`: Applicant contact information.
  * `status`: Sales pipeline state (`PENDING`, `CONTACTED`, `DEMO_SCHEDULED`, `APPROVED`, `REJECTED`).

---

### 6. Sales Returns & Customer Credit Notes

#### `sales_returns` (Returns Ledger & Credit Notes)
* **Purpose:** Records customer returns against previously issued sales invoices.
* **Key Attributes:**
  * `id`: Unique return transaction identifier.
  * `shopId` & `organizationId`: Multi-tenant branch scoping.
  * `invoiceId`: Original invoice referenced.
  * `customerId`: Customer returning products.
  * `returnNumber`: Sequential document identifier (e.g. `RET-1-2026-0001`).
  * `returnType`: Return scope (`SELECTED_PRODUCTS`, `ENTIRE_INVOICE`).
  * `status`: Return lifecycle state (`DRAFT`, `COMPLETED`, `CANCELLED`).
  * `totalRefundAmount`: Total financial credit/refund value.
  * `notes`: Internal remarks from store staff.
  * `processedBy`: Staff member who inspected and authorized the return.

#### `sales_return_items` (Returned Line Items & Inspection)
* **Purpose:** Individual products inspected and returned within a sales return document.
* **Key Attributes:**
  * `returnId`: Parent sales return reference.
  * `invoiceItemId`: Original invoice line item.
  * `inventoryId`: Associated inventory catalog SKU.
  * `quantityReturned`: Units returned.
  * `unitPrice` & `refundAmount`: Financial pricing snapshot.
  * `inspectionReason`: Condition classification (`LOOKS_NEW`, `MINOR_WEAR`, `DAMAGED`, `WRONG_PRODUCT`, `MANUFACTURING_DEFECT`, `WARRANTY_CLAIM`).
  * `finalAction`: Operational handling decision (`RESTOCK_INVENTORY`, `REPAIR_AT_STORE`, `SEND_TO_VENDOR`, `SCRAP_DAMAGE`, `HOLD_FOR_INSPECTION`).

