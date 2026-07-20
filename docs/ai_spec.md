# AI Assistant & Engineering Guidelines

This document specifies the guidelines, design rules, and operational constraints for AI coding agents working on the **Optical Manager** codebase.

---

## 1. High-Density UI/UX Design System Rules

As defined in `AGENTS.md`, all UI development must adhere to enterprise SaaS design standards (Linear / Stripe / Vercel):

1. **High-Density Proportions**:
   - Use compact, proportional padding: `p-3.5` to `p-4` for metric cards.
   - Table rows: `py-2.5 px-4`.
   - Section gaps: `gap-3.5` to `gap-4`.
   - Goal: Fit key telemetry, tables, and controls onto standard laptop screens without vertical scroll fatigue.

2. **No Duplicate Call-to-Action Buttons**:
   - Never duplicate primary action buttons (e.g. `+ New Invoice`, `+ Add Patient`) across both the sticky Topbar header and inner page headers.
   - The sticky Topbar is the single primary source for top-level quick actions.

3. **KPI Selection & Telemetry States**:
   - Metric cards must feature crisp hover states and active selection borders (`border-2 border-[#2563eb] shadow-md scale-[1.01]`).
   - Selecting a KPI card must filter/update the main table below with zero latency.

4. **Typography & Soft HSL Badges**:
   - Page titles: `text-xl font-bold tracking-tight text-slate-900`.
   - Metric values: `text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight`.
   - Soft HSL pill badges: `bg-blue-50 text-[#2563eb]`, `bg-emerald-50 text-emerald-600`, `bg-rose-50 text-rose-600` with small sharp fonts (`text-[10px]` / `text-xs font-bold`).

---

## 2. Codebase Engineering Constraints

1. **Next.js 16 Breaking Changes**:
   - Follow Next.js 16 dynamic API rules (`await params`, `await searchParams`, `@supabase/ssr` cookie handshakes).
   - Consult `node_modules/next/dist/docs/` when working with dynamic server rendering APIs.

2. **Database Integrity**:
   - Always left-join `customers` to map `customers.fullName` as `customerName`.
   - `invoices.estimatedDelivery` is the exact column name (not `estimatedDeliveryDate`).
   - Order status is tracked on `invoices.fulfillmentStatus` (`PROCESSING`, `READY`, `DELIVERED`, `ON_HOLD`) and `invoices.status` (`PAID`, `PENDING`, `CANCELLED`, `DRAFT`).

3. **Zero Hardcoded Data**:
   - All telemetry, category splits, top SKUs, VIP patients, and delivery statistics must be derived from real Postgres Drizzle queries in `services/dashboard.service.ts` or `services/report.service.ts`.

4. **Synchronized Documentation Maintenance (`docs/`)**:
   - Whenever performing any development, adding features, modifying database schemas, updating architecture, adding API endpoints, or configuring external services, you MUST simultaneously update the relevant documentation files inside the `docs/` directory (`docs/overview.md`, `docs/architecture.md`, `docs/tech_stack.md`, `docs/user_flow.md`, `docs/database_schema.md`, `docs/ai_spec.md`, `docs/requirements.md`, `docs/services_used.md`, `docs/api_routes.md`). System documentation must always remain 100% synchronized with the live codebase.
