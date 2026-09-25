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
| **Lottie Web** | `^5.12.2` | Vector SVG animation engine (`lottie-web`) dynamically loaded with React Error Boundary and 0ms blocking latency. |
| **Sonner** | `^1.7.4` | Toast notification system for async user actions. |

### Global Color Palette & Design System Specifications
Optical Manager adheres to a unified enterprise color scheme and design rules across all application surfaces:
- **Main App Canvas**: `#F6F7F9` (Soft gray canvas right of the sidebar, behind cards and content)
- **Sidebar**: Clean light surface (`#F8FAFC` / `#FFFFFF`) with 1px solid `#E5E7EB` border.
  - *Nav Hover*: `hover:bg-slate-200/50 hover:text-slate-900`.
  - *Nav Active*: `bg-[#2563EB] text-white shadow-md shadow-blue-500/20 font-bold`.
- **Top Navbar / Header**: `#FFFFFF` (Pure white with 1px solid `#E5E7EB` border).
- **Cards, Tables, Modals & Inputs**: Pure white (`#FFFFFF`) with 1px solid `#E5E7EB` perimeter border and 8-12px border radius.
- **Primary Action Buttons**: Solid fill `#2563EB` with pure white text (`text-white`). Exactly ONE primary button visible per screen canvas.
- **Secondary Buttons**: White background (`#FFFFFF`), 1px solid `#D1D5DB`, `#374151` text, hover `#F9FAFB`.
- **Ghost Action Buttons**: Transparent background, `#6B7280` icon color, hover `#F3F4F6`.
- **Status Badges**:
  - *Success*: `#059669` text on `#ECFDF5` background.
  - *Warning*: `#D97706` text on `#FFFBEB` background.
  - *Danger*: `#DC2626` text on `#FEF2F2` background.
- **Typography Hierarchy**: Primary text `#111827`, secondary/muted text `#6B7280`.
- **Table Formatting**:
  - *Header (`thead`)*: `#F3F6FA` with `#E5E7EB` border and `text-slate-600`.
  - *Rows (`tbody tr`)*: `#FFFFFF` with 1px `#E5E7EB` bottom border and `#F9FAFB` hover state.

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
| **Nodemailer** | `^6.10.0` | SMTP client for Gmail transactional email dispatches & verification. |
| **Vercel Speed Insights**| `^2.0.0` | Real-time Core Web Vitals and performance monitoring. |

---

## PWA & Offline Storage

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Dexie.js** | `^4.0.11` | High-performance IndexedDB wrapper providing type-safe client-side databases. |
| **Service Worker** | Native Browser API | Client-side asset precaching, offline navigation fallback, and background sync. |
| **Web App Manifest** | Next.js 16 Native | Standalone desktop/mobile installation support across Windows, macOS, Android, and iOS. |
