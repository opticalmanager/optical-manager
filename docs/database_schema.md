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
