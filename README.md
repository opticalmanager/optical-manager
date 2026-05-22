# 👓 Optical Manager

> **The Operating System for Modern Optical Stores.**  
> A production-ready, high-fidelity Multi-Tenant SaaS CRM tailored for clinical eye care, dynamic stock management, multi-branch ledger tracking, and precise optometry record keeping.

---

[![Next.js Version](https://img.shields.io/badge/Next.js-16.0%20(App%20Router)-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![ORM](https://img.shields.io/badge/ORM-Drizzle%20ORM-C5F74F?style=flat-square&logo=drizzle)](https://orm.drizzle.team)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Validation](https://img.shields.io/badge/Validation-Zod%20Schema-3068B2?style=flat-square&logo=zod)](https://zod.dev)

---

## 📖 Table of Contents

- [Core Value Proposition](#-core-value-proposition)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Database Security (RLS)](#%EF%B8%8F-database-security-rls)
- [Key Features](#-key-features)
- [Developer Experience & Resiliency Highlights](#-developer-experience--resiliency-highlights)
- [Project Layout & Directory Structure](#-project-layout--directory-structure)
- [Quick Start & Environment Setup](#-quick-start--environment-setup)
- [Database Schema & Migrations](#-database-schema--migrations)
- [Production Deployment](#-production-deployment)

---

## 💡 Core Value Proposition

Managing optical store chains using spreadsheets or fragmented systems leads to administrative delays, inventory discrepancies, and disconnected patient records. **Optical Manager** provides a centralized, secure, multi-tenant portal designed by optical professionals, for optical professionals. It empowers store owners to scale from a single shop to a multi-branch enterprise without losing transactional fidelity.

---

## 🏗️ Architecture & Tech Stack

```
           ┌──────────────────────────────────────────────┐
           │                   FRONTEND                   │
           │        Next.js 16 Client & Server Components  │
           └───────────────────┬──────────────────────────┘
                               │ (Server Actions & SSR)
                               ▼
           ┌──────────────────────────────────────────────┐
           │            BUSINESS SERVICES LAYER           │
           │       Auth & Shop Services, DB Queries       │
           └───────────────────┬──────────────────────────┘
                               │ (Type-Safe Schema API)
                               ▼
           ┌──────────────────────────────────────────────┐
           │                 DRIZZLE ORM                  │
           │          Postgres Driver Execution           │
           └───────────────────┬──────────────────────────┘
                               │ (pgbouncer Port 6543)
                               ▼
           ┌──────────────────────────────────────────────┐
           │                 SUPABASE DB                  │
           │     PostgreSQL + RLS + Admin Service API     │
           └──────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | High-performance Server Components, Server Actions, & Route-based layouts |
| **Authentication**| Supabase Auth | Cloud session cookies, secure JWT verification, and Google OAuth |
| **Database** | Supabase PostgreSQL | Relational transactional database with built-in connection pooling |
| **ORM** | Drizzle ORM | Type-safe queries, dynamic relationships, and simplified migrations |
| **Styling** | Tailwind CSS v4 | Harmonious, curated HSL color tokens, glassmorphism overlays, and premium fluid layouts |
| **Validation** | Zod | Deep nested form verification and type-safe server payloads |

---

## 🛡️ Database Security (RLS)

Strict data isolation is enforced at the database level using Supabase Row-Level Security (RLS) policies. Every table in the schema is linked to an `organization_id` or `shop_id`.
* **OWNER role**: Authorized to query and modify all locations, stocks, staff credentials, and invoice ledgers belonging to their top-level Organization.
* **SHOP_MANAGER role**: Restrained automatically to read/write records matching only their specifically assigned `shop_id`.
* **Security Principle**: All database transactions leverage the user's secure Supabase Auth UID via `auth.uid()`, preventing client-side identifier spoofing.

---

## ✨ Key Features

### 🏢 Multi-Shop Location Scaling
Register and track multiple physical store locations. Maintain top-level performance, address sheets, tax identities (GST/VAT), and store metrics under a unified Organization dashboard.

### 👥 Role-Based Access & Onboarding
* **Owner Registration**: New owners sign up, establish their organization, and are immediately guided through a beautifully progressive onboarding layout.
* **Conditional Shop Manager Creation**: Set up store profiles with an optional toggle to dynamically register a dedicated Shop Manager login.
* **Zod-backed Verification**: Form inputs are validated in real-time using advanced conditional validation schemas (Zod `superRefine`).

### 🩺 Optometry Prescription Ledger
A clinical register documenting historical patient eye metrics:
* Spherical (SPH), Cylindrical (CYL), Axis, and ADD values for both Left (OS) and Right (OD) eyes.
* Pupil Distance (PD) measurements and clinical physician remarks.

### 📦 Smart Inventory System
Real-time tracking of lenses, frames, contact lenses, and solutions. Categorized inventory lists feature automatic stock counts, pricing metrics, and dynamic threshold-based low-stock warning banners.

### 🧾 Invoice & Billing Engine
Create professional invoices with specific billing totals, discounts, and payment methods. Fully configured for cash, cards, and UPI transfers, with transaction history.

### ⚙️ Shops & Access Admin Settings
A dynamic panel inside settings that provides:
* Fast shop editing tools.
* Account registration forms for existing shops lacking managers.
* Secure email updates and password reset/override forms powered by the Supabase Admin API.

---

## ⚡ Developer Experience & Resiliency Highlights

We have integrated high-fidelity error handling and session recovery utilities to maximize uptime and prevent broken states in local development and production environments:

1. **Local DB Wipe Auto-Recovery**: If your local database is wiped or reset in development but your browser maintains an active Supabase session, `getCurrentUser()` automatically auto-recreates the `OWNER` profile and organization records on-the-fly, redirecting you seamlessly to `/onboarding`.
2. **Defensive Redirect-Loop Prevention**: In cases where a session is completely orphaned (e.g. for a deleted `SHOP_MANAGER` account whose shop records no longer exist), `(dashboard)/layout.tsx` detects the invalid session, executes a clean client-side `supabase.auth.signOut()` to clear browser cookies, and redirects the user safely to `/login`.
3. **Robust Exception Guards**: All core database and authentication fetch commands (including `proxy.ts` middleware and `getCurrentUser()`) are encapsulated in strict try-catch handlers. This isolates temporary network connection timeouts (`ConnectTimeoutError`) and DNS failures (`ENOTFOUND`), logging warnings and keeping public landing pages active instead of crashing Server Component rendering.

---

## 📁 Project Layout & Directory Structure

```
optical-manager/
├── actions/              # Mutative Server Actions (Auth, Onboarding, Shops, etc.)
├── app/                  # Next.js App Router Pages & Client Components
│   ├── (auth)/           # Authentication Screens (Login, Signup Layouts)
│   ├── (dashboard)/      # Protected Pages with Sidebars (Owner & Shop views)
│   ├── api/              # API Route Handlers (OAuth callback endpoints)
│   ├── onboarding/       # Post-signup Organization & Shop creation flow
│   ├── globals.css       # Core styling & custom HSL Tailwind v4 variable system
│   └── page.tsx          # Marketing Landing Page
├── components/           # Reusable UI Components & Page Shells
│   ├── layout/           # Sidebar & personalized user Topbar components
│   ├── onboarding/       # Multi-step onboarding forms
│   ├── owner/            # Dashboard analytics, list tables, and setting cards
│   └── ui/               # Lower-level styled primitives (Buttons, Inputs, Modals)
├── db/                   # Drizzle ORM Configuration & Table Definitions
│   └── schema/           # Relational schema (profiles, shops, customers, stocks)
├── lib/                  # Initialized instances & wrappers
│   ├── supabase/         # SSR, Browser, and Service-Role Admin clients
│   └── drizzle.ts        # Database client pointing to Supabase transaction pooler
├── services/             # Core Business Logic & database read queries
├── types/                # Global TypeScript definitions
├── utils/                # Standard validators, constants, and HSL style helpers
└── proxy.ts              # Next.js 16 Proxy Middleware (replacing deprecated middleware.ts)
```

---

## 🚀 Quick Start & Environment Setup

### 1. Prerequisites
* **Node.js** 18.x or above installed.
* A **Supabase** account and active PostgreSQL database project.

### 2. Configure Environment Variables
Create a `.env` file in the root directory by copying the template:
```bash
cp .env.local.example .env
```
Populate the values with your Supabase API keys and transaction connection pooler URL:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsIn...
DATABASE_URL=postgres://postgres.your-project-id:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
> [!IMPORTANT]
> The database connection URL must target **Port 6543** (PgBouncer pooler) with `&pgbouncer=true` to support high-frequency serverless database requests seamlessly.

### 3. Install Dependencies
Run the package installer:
```bash
npm install
```

### 4. Setup Database Schema
Compile the Drizzle schema and push table structures straight to your Supabase PostgreSQL instance:
```bash
# Generate type-safe migrations
npm run db:generate

# Push schema structure directly to Supabase
npm run db:push
```

### 5. Launch Development Server
Start the local Next.js dev server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🗃️ Database Schema & Migrations

Drizzle ORM is configured to manage incremental schema changes. Should you edit any table inside `db/schema/`:
1. Generate a new migrations bundle:
   ```bash
   npx drizzle-kit generate
   ```
2. Apply the compiled migration files onto your live server:
   ```bash
   npx drizzle-kit migrate
   ```
3. Use the local visual UI to explore and check database records directly:
   ```bash
   npm run db:studio
   ```

---

## 🌐 Production Deployment

This project compiles cleanly to production. Build and bundle output statically:
```bash
npm run build
```

### Vercel Deployment
To host this Next.js project on Vercel:
1. Connect your GitHub repository to Vercel.
2. In the Vercel Project Settings, add all Environment Variables specified in your `.env` file.
3. Vercel automatically detects the Next.js framework, installs packages, compiles scripts, and provisions edge networking instantly.
