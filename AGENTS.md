<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Optical Manager UI/UX & High-Density Design Guidelines

1. **High-Density Proportions & Compact Spacing**:
   - Always design enterprise SaaS dashboards with compact, proportional spacing (Stripe/Linear/Vercel standard) to fit key metrics and tables onto standard laptop screens without vertical scroll fatigue.
   - Use `p-3.5` to `p-4` padding for KPI cards, `py-2.5 px-4` for table rows, and keep section gaps compact (`gap-3.5` to `gap-4`).

2. **No Duplicate Action Buttons**:
   - Never duplicate primary call-to-action buttons (e.g. `+ New Invoice`, `+ Add Patient`) across both the sticky Topbar header and inner page headers. The sticky Topbar is the single primary source for top-level quick actions.

3. **Interactive KPI Selection States**:
   - Top metric/KPI cards must feature crisp hover states and active selection borders (`border-2 border-[#2563eb] shadow-md scale-[1.01]`).
   - Selecting a card must instantly filter/update the main table below with zero latency.

4. **Typography & Badge Hierarchy**:
   - Keep page titles crisp (`text-xl font-bold tracking-tight text-slate-900`) and metric values proportional (`text-2xl font-extrabold`).
   - Use soft HSL pill badges (`bg-blue-50 text-[#2563eb]`, `bg-emerald-50 text-emerald-600`, `bg-rose-50 text-rose-600`) with small sharp fonts (`text-[10px]` / `text-xs font-bold`).

5. **Universal Multi-Device Responsiveness**:
   - Every UI component developed must be 100% responsive across mobile, tablet, laptop, and desktop displays, adhering to modern UI/UX design standards.

6. **Production-Ready & Detailed Implementation Plans**:
   - Every implementation plan must be highly detailed, clear for agent execution, production-ready, and backed by robust, industry-grade logic.

7. **Zero-Latency & Optimized Codebase**:
   - Code must be highly optimized, efficient, free of unnecessary re-renders, and built for zero-latency user experiences.

8. **Industry-Grade Database Management**:
   - Database schemas, Drizzle migrations, indexing, and service queries must be managed to enterprise/production standards.

9. **Backwards Compatibility & Feature Integrity**:
   - Never break existing functionality, routes, or workflows when adding new features, unless explicitly instructed by the user.


