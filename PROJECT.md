# Optical Manager — PROJECT.md

> Multi-Tenant SaaS CRM for Optical Stores

---

## 1. Project Overview

**Optical Manager** is a production-grade multi-tenant SaaS web application designed for optical store businesses. It provides a centralized platform for managing multiple shops, customers, eye prescriptions, inventory, and invoicing — all under a single organization account.

### Core Value Proposition

- **Multi-shop management** from a single dashboard
- **Eye prescription tracking** with full SPH/CYL/AXIS/ADD data
- **Inventory management** with low-stock alerts
- **Invoicing** with Indian payment method support (UPI, Cash, Card)
- **Role-based access** for owners and shop managers

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework |
| **Authentication** | Supabase Auth | Email/Password + Google OAuth |
| **Database** | Supabase PostgreSQL | Managed PostgreSQL with RLS |
| **ORM** | Drizzle ORM | Type-safe database queries |
| **Styling** | Tailwind CSS v4 | Utility-first CSS framework |
| **Validation** | Zod | Schema validation for forms and actions |
| **Icons** | Lucide React | Consistent icon library |
| **Language** | TypeScript | Full type safety |

### Key Technical Decisions

- **Drizzle over Prisma**: Better serverless performance, SQL-level control, and lighter bundle
- **Supabase over custom auth**: Managed auth with built-in RLS, OAuth, and real-time
- **Server Components by default**: Minimal JS shipped to client
- **Server Actions for mutations**: Type-safe, secure, progressive enhancement
- **`proxy.ts` instead of `middleware.ts`**: Next.js 16 renamed middleware to proxy

---

## 3. Multi-Tenant SaaS Architecture

```
┌─────────────────────────────────────────────┐
│                 ORGANIZATION                 │
│              (Top-level tenant)              │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Shop A  │  │  Shop B  │  │  Shop C  │  │
│  │          │  │          │  │          │  │
│  │ Manager  │  │ Manager  │  │ Manager  │  │
│  │Customers │  │Customers │  │Customers │  │
│  │Inventory │  │Inventory │  │Inventory │  │
│  │Invoices  │  │Invoices  │  │Invoices  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │       Subscription (per org)         │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Tenant Isolation

- Every data table includes `organization_id` and/or `shop_id`
- All queries are scoped by the user's organization
- RLS policies enforce isolation at the database level
- OWNER sees all data in their organization
- SHOP_MANAGER sees only their assigned shop's data

---

## 4. Authentication Flow (Supabase-Based)

### Login Flow

```
User enters email + password
        ↓
Supabase authenticates
        ↓
proxy.ts refreshes auth token cookies
        ↓
Server Component calls getCurrentUser()
        ↓
Fetches profile from DB using auth.uid()
        ↓
Determines: role, organization_id, shop_id
        ↓
Renders appropriate dashboard
```

### Key Points

- **No role selection on frontend** — role is determined from the `profiles` table
- **No custom JWT** — Supabase handles all token management
- **`proxy.ts`** refreshes session tokens on every request (Next.js 16 convention)
- **`getUser()` is used, NOT `getSession()`** — validates the JWT properly
- **Google OAuth** redirects through `/api/auth/callback` route handler

### OAuth Callback Flow

1. User clicks "Sign in with Google"
2. Supabase redirects to Google consent screen
3. Google redirects back to `/api/auth/callback`
4. Route handler exchanges code for session
5. If new user → creates org + profile + trial subscription → redirects to `/onboarding`
6. If existing user → redirects to `/owner/dashboard`

---

## 5. Role System

### OWNER

| Capability | Access |
|---|---|
| View organization dashboard | ✅ |
| Create/manage shops | ✅ |
| Create shop manager accounts | ✅ |
| View all shops' data | ✅ |
| Manage organization settings | ✅ |
| Manage subscription | ✅ |

### SHOP_MANAGER

| Capability | Access |
|---|---|
| View shop dashboard | ✅ |
| Manage customers (own shop) | ✅ |
| Manage prescriptions (own shop) | ✅ |
| Manage inventory (own shop) | ✅ |
| Create/manage invoices (own shop) | ✅ |
| Access other shops | ❌ |
| Organization settings | ❌ |

---

## 6. Onboarding Flow

```
1. New user signs up
        ↓
2. System creates:
   - Organization
   - Profile (role = OWNER)
   - Trial subscription (14 days)
        ↓
3. First login → check if shops exist
        ↓
4. No shops → Show onboarding: "Create your first shop"
        ↓
5. Shop created → Redirect to /owner/dashboard
```

---

## 7. Folder Structure

```
optical-manager/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: auth pages (no sidebar)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/              # Route group: protected pages (sidebar + topbar)
│   │   ├── onboarding/page.tsx
│   │   ├── owner/                # OWNER-only routes
│   │   │   ├── dashboard/
│   │   │   ├── shops/
│   │   │   ├── shop-managers/
│   │   │   └── settings/
│   │   └── shop/                 # Shop-level routes (both roles)
│   │       ├── dashboard/
│   │       ├── customers/
│   │       ├── prescriptions/
│   │       ├── inventory/
│   │       └── invoices/
│   └── api/auth/callback/        # Supabase OAuth callback
│
├── actions/                      # Server Actions (mutations only)
├── components/                   # React components
│   ├── ui/                       # Reusable UI primitives
│   ├── layout/                   # Sidebar, topbar
│   └── providers/                # Context providers
│
├── db/schema/                    # Drizzle ORM table definitions
├── lib/                          # Core library code
│   └── supabase/                 # 3 Supabase clients (browser, server, admin)
│
├── services/                     # Business logic layer
├── types/                        # TypeScript type definitions
├── utils/                        # Constants, validators, helpers
│
├── proxy.ts                      # Next.js 16 Proxy (auth + routing)
└── drizzle.config.ts             # Drizzle Kit configuration
```

### Architecture Layers

```
┌──────────────────────────────────────┐
│         App Router (Pages)           │  ← Server Components, UI rendering
├──────────────────────────────────────┤
│       Server Actions (actions/)      │  ← Mutations, form handling
├──────────────────────────────────────┤
│        Services (services/)          │  ← Business logic, DB queries
├──────────────────────────────────────┤
│        Drizzle ORM (db/schema)       │  ← Type-safe schema & queries
├──────────────────────────────────────┤
│     Supabase PostgreSQL + RLS        │  ← Database + row-level security
└──────────────────────────────────────┘
```

---

## 8. Database Design

### Entity Relationship

```
organizations ─── 1:N ──→ shops
     │                       │
     │                       ├── 1:N ──→ customers ──→ prescriptions
     │                       ├── 1:N ──→ inventory
     │                       └── 1:N ──→ invoices
     │
     ├── 1:N ──→ profiles (linked to auth.users)
     └── 1:1 ──→ subscriptions
```

### Tables

| Table | Key Columns | Multi-Tenant Key |
|---|---|---|
| `organizations` | id, name, slug | — (top level) |
| `profiles` | id (= auth.uid), role, full_name | organization_id |
| `shops` | id, name, gst_number | organization_id |
| `subscriptions` | id, plan, status | organization_id |
| `customers` | id, full_name, phone | organization_id, shop_id |
| `prescriptions` | id, r/l sphere/cyl/axis/add, pd | organization_id, shop_id |
| `inventory` | id, category, price, quantity | organization_id, shop_id |
| `invoices` | id, invoice_number, total, status | organization_id, shop_id |

### Enums

- `user_role`: OWNER, SHOP_MANAGER
- `subscription_plan`: TRIAL, BASIC, PRO, ENTERPRISE
- `subscription_status`: ACTIVE, EXPIRED, CANCELLED
- `inventory_category`: FRAME, LENS, CONTACT_LENS, ACCESSORY, SOLUTION
- `invoice_status`: DRAFT, PENDING, PAID, CANCELLED
- `payment_method`: CASH, CARD, UPI, BANK_TRANSFER

---

## 9. RLS Security Model

### Policies (applied in Supabase SQL Editor)

```sql
-- Profiles: users can only read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Organizations: members can read their org
CREATE POLICY "Members can read own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Shops: OWNER sees all, SHOP_MANAGER sees own
CREATE POLICY "Role-based shop access"
  ON shops FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'OWNER'
      OR id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Customers/Prescriptions/Inventory/Invoices: same pattern
-- OWNER → org-level access
-- SHOP_MANAGER → shop-level access only
```

### Security Principles

1. **Never trust the frontend** — all access checks happen server-side
2. **Always use `auth.uid()`** — never pass user ID from client
3. **Double enforcement** — both application-level (services) and database-level (RLS)
4. **Service-role client** — only used for admin operations (creating users)

---

## 10. Feature Breakdown

### Phase 1: Foundation ✅ (Current)
- [x] Project structure & architecture
- [x] Database schema (Drizzle)
- [x] Authentication (Supabase)
- [x] Proxy-based route protection
- [x] Server Actions framework
- [x] Services layer

### Phase 2: Core Features (Next)
- [ ] Complete UI components (buttons, inputs, cards, tables)
- [ ] Sidebar navigation (role-aware)
- [ ] Login/Signup with full form validation
- [ ] Onboarding flow (create first shop)
- [ ] Shop CRUD (OWNER)
- [ ] Shop Manager CRUD (OWNER)
- [ ] Customer CRUD
- [ ] Prescription management
- [ ] Inventory management
- [ ] Invoice creation

### Phase 3: Polish
- [ ] Dashboard analytics (charts, stats)
- [ ] Search & filtering across all tables
- [ ] Responsive mobile design
- [ ] Loading states & error boundaries
- [ ] Toast notifications

### Phase 4: Advanced
- [ ] PDF invoice generation
- [ ] Low-stock email alerts
- [ ] Data export (CSV/Excel)
- [ ] Audit logging

---

## 11. Future Enhancements

### Subscription Billing
- Integrate **Razorpay** (India) or **Stripe** (global)
- Plan-based feature gating
- Usage-based billing (per shop, per invoice)
- Trial → paid conversion flow

### Notifications
- Email notifications (via Supabase Edge Functions or Resend)
- In-app notification center
- Low-stock alerts
- Subscription expiry warnings

### Reports & Export
- Sales reports by shop/period
- Inventory valuation reports
- Customer visit history
- PDF/Excel export for all reports

### Multi-Shop User Support
- Allow a SHOP_MANAGER to access multiple shops
- Cross-shop customer lookup
- Inventory transfer between shops

### Audit Logs
- Track all CRUD operations
- User activity timeline
- Data change history
- Compliance reporting

### Mobile App
- React Native companion app
- Barcode scanning for inventory
- Mobile prescription entry
- Offline-first with sync

---

## Environment Setup

### Prerequisites
- Node.js 18+
- Supabase project (free tier works)
- PostgreSQL access via Supabase

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.local.example .env.local
# Fill in your Supabase credentials

# 3. Generate Drizzle migrations
npx drizzle-kit generate

# 4. Push migrations to Supabase
npx drizzle-kit push

# 5. Start development server
npm run dev
```

### Required Dependencies

```bash
# Production
npm install @supabase/supabase-js @supabase/ssr drizzle-orm postgres zod clsx lucide-react

# Development
npm install -D drizzle-kit dotenv
```
