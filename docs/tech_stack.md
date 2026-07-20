# Technology Stack

Optical Manager is built with cutting-edge web technologies designed for zero-latency user experiences, maximum type safety, and enterprise reliability.

---

## Core Framework & Runtime

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Next.js** | `16.2.4` | Full-stack React framework with App Router, Turbopack, and SSR/SSG rendering. |
| **React** | `19.2.4` | UI component rendering library with React Server Components (RSC) and Actions. |
| **TypeScript** | `^5.0.0` | End-to-end static typing across database schemas, API routes, and UI props. |
| **Node.js** | `>= 20` | Server runtime execution environment. |

---

## Styling & Design System

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **TailwindCSS** | `^4.0.0` | Utility-first CSS framework for high-density SaaS layouts. |
| **Lucide React** | `^0.487.0` | Enterprise iconography set. |
| **Shadcn UI / Radix** | `^4.6.0` | Unstyled accessible primitive components. |
| **Recharts** | `^3.9.2` | SVG-based charting library for revenue trendlines, category splits, and fulfillment donuts. |
| **Sonner** | `^1.7.4` | Toast notification system for async user actions. |

---

## Database & ORM

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Drizzle ORM** | `^0.40.1` | Ultra-fast, type-safe TypeScript ORM for SQL relational databases. |
| **Drizzle Kit** | `^0.31.1` | Schema migration CLI and database studio tool. |
| **PostgreSQL** | `^3.4.5` | Production relational database engine (via Supabase / Neon). |

---

## Authentication & Infrastructure

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Supabase Auth** | `^2.106.0` | JWT-based auth service with cookie session handling (`@supabase/ssr`). |
| **MailerSend** | `^3.0.0` | Transactional email delivery service for notifications and system alerts. |
| **Vercel Speed Insights**| `^2.0.0` | Real-time Core Web Vitals and performance monitoring. |
