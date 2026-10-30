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

---

## 3. Google Gemini Vision API & Smart Bill Scanning Architecture

1. **Multimodal OCR & Resilient Model Architecture**:
   - Uses the official `@google/generative-ai` SDK with multi-model fallback resilience:
     - `gemini-3.5-flash-lite` (Primary / Recommended: ultra-fast ~2-15s latency, 100% live uptime, zero 503 overload errors on standard tier)
     - `gemini-3.8-flash` (Google official modern replacement for retired 2.x models; high capability vision OCR)
     - `gemini-3.6-flash` (High Capability OCR)
     - `gemini-3.7-flash` (Next-Gen Flash OCR)
     - `gemini-3.5-flash` (Standard flash fallback)
   - Stale/retired models (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-1.0-pro`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`) are sanitized and auto-migrated to `gemini-3.5-flash-lite`.
   - **Universal Pre-Validation MIME Normalization & Magic Byte Sniffing**: Cleans base64 headers, trims whitespace/newlines, and normalizes browser MIME variants (`image/jpg`, `image/pjpeg`, `application/x-pdf`, `applications/vnd.pdf`) before validation. Employs binary magic byte sniffing (`JVBERi0` for `%PDF-`, `/9j/` for JPEG, `iVBORw0KGgo` for PNG, `UklGR` for WEBP), guaranteeing successful processing even when browsers or mobile file pickers supply missing or generic `application/octet-stream` MIME types.
   - **Orientation-Agnostic OCR**: Automatically detects rotated, portrait, landscape, or skewed document photos without requiring manual re-orientation.
   - **Adaptive Timeout Protection**: Employs a 60-second `Promise.race` timeout for multi-page/dense PDF invoices (preventing premature aborts on 30+ item wholesale bills) and 35 seconds for camera photos.
   - **Output Token Ceiling**: Configures `maxOutputTokens: 16384` to prevent JSON truncation mid-response on large invoice inventories.
   - **Transient 503 Spike Backoff**: Applies a 100ms delay retry upon encountering Google endpoint 503 high-demand surges before cascading to the next fallback candidate.
   - **Large Payload Ingestion**: `next.config.ts` configures `serverActions.bodySizeLimit: "15mb"`, ensuring multi-page PDFs and high-resolution camera captures bypass default 1MB limits without HTTP 413 errors.
   - **Resilient JSON & Numerical Parser**: Extracts outermost JSON structures and scrubs currency signs, percentage characters, and commas (e.g. `₹ 1,200.50`), preventing `NaN` math corruptions.
   - **Batch Rate-Limit Throttling**: Automatically introduces a 400ms pause between sequential batch uploads in `BillScanDrawer.tsx` to maintain safety margins under Google Gemini RPM quotas.
   - Supports JPG, PNG, WEBP images and multi-page PDF supplier bills.
   - Enforces structured JSON output via `generationConfig: { responseMimeType: "application/json" }`.

2. **Zero-Math Hallucination Engine & Tax-Exclusive Rate Handling**:
   - Gemini extracts raw document text, item names, rates, quantities, and GST rates.
   - **B2B Indian Tax Invoices (Section 31 CGST Act)**: Printed item rates are standard tax-exclusive base prices. The server engine deterministically handles both tax-exclusive base prices and tax-inclusive bills by comparing taxable values with unit rates and quantities.
   - All arithmetic (CGST/SGST/IGST splitting, base price calculation, purchase price per unit, item totals, and bill rounding) is calculated on the server/client math engine to ensure 100% financial precision without floating-point errors.

3. **Intelligent Optical Specs Extraction (`extractOpticalSpecs`)**:
   - Extracts structured optical frame attributes:
     - **Luxottica / Global Article Code Support**: Intelligently parses standard manufacturer article codes (e.g. `0RB2140901/5850`, `0RB3016W036551`, `0VO...`, `0OO...`, `0PR...`) into customer-friendly product names (`Ray-Ban RB2140 901/58 50`), while keeping the exact manufacturer code in `productCode`.
     - **Eye Size**: Standard frame sizes (`44` to `64` mm) or trailing size tokens from manufacturer codes.
     - **Color**: Frame color codes (e.g. `901/58`, `W0365`, `601/8G`, `C1`, `C2`, `C4`, `BLK`, `GLD`, `DEMI`).
     - **Brand & Model**: Brand identifiers (`Ray-Ban`, `Oakley`, `Vogue`, `Prada`, `Tommy Hilfiger`, `Fastrack`, `Titan`, etc.) and model numbers (`RB2140`, `RB3016`, `TH 1111`, `3025`).
     - **Clean Product Code**: Strips HSN code misidentifications and synthesizes structured codes for immediate barcode generation.

4. **Client-Side Image Optimization & Dynamic Feedback**:
   - High-resolution mobile camera captures (8–15MB) are downscaled using an off-screen HTML5 canvas to a max dimension of 1800px at 85% JPEG quality before base64 encoding, with automatic fallback to `FileReader`.
   - Shrinks network payloads from ~10MB to <300KB, dropping network upload latency by up to 70%.
   - Live multi-stage progress messages keep the user informed during OCR processing.

5. **Per-Account Credentials Isolation & Pure Utility Architecture**:
   - Each tenant organization stores its private `geminiApiKey` and `geminiModel` in `organizations.settings.ai`.
   - Keys are managed and tested via `actions/ai-settings.actions.ts`.
   - Fallback to `process.env.GEMINI_API_KEY` for development and platform testing.
   - Synchronous string sanitization (`sanitizeGeminiApiKey`) and model resolution (`resolveGeminiModel`) are isolated in `utils/ai.utils.ts` without `"use server"` directives, ensuring zero Turbopack Server Action Ecmascript compilation errors across server boundaries.

6. **Zero-Hallucination & Clean Inward Rules (Optical Retail Standards)**:
   - **No Fabricated Retail Prices**: Supplier bills are B2B wholesale tax invoices that do not contain consumer retail selling prices / MRP. The AI pipeline strictly sets `retailPrice: 0`, leaving the Retail Price field 100% blank in both the purchase table and inline modal for store management entry.
   - **Optical Category Classification**: Accurately classifies items into `FRAME`, `SUNGLASSES`, `LENS`, `CONTACT_LENS`, `SOLUTION`, and `ACCESSORY` using HSN prefix matching against organization categories.
   - **Net Taxable Unit Rate**: Captures true inward purchase cost by computing net taxable unit rate after line-item trade discounts (`unitPrice = taxableValue / quantity`).
   - **Indian Date Normalizer**: Deterministically normalizes Indian invoice date formats (`DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`) into standard ISO `YYYY-MM-DD`.
   - **Spec Sanitizer**: Automatically strips placeholder tokens (`"N/A"`, `"none"`, `"null"`, `"-"`) to preserve clean database attributes.

7. **Multi-Image Batch Scanning & Resilient Sequential Processing**:
   - **Multi-File Queue**: Supports uploading multiple invoice images/PDFs simultaneously, with "+ Add More Images" appending to the active queue at any time. Badge labeled clearly as "Images".
   - **Sequential One-by-One OCR**: Images are parsed sequentially one after another, eliminating 429 rate limits, memory spikes, and payload timeouts.
   - **Isolated Failure Resilience**: If an individual image is blurry or unreadable, the failure is isolated to that specific file without failing the entire batch. Successful bills are extracted cleanly and failed images can be retried individually.
   - **Multi-Bill Aggregation**: Aggregates all line items across scanned images into a unified bill payload, preserving vendor/invoice headers from the primary document and recalculating GST and purchase totals.
   - **Smart Append Mode**: When applied to the purchase form, new scans append cleanly below existing items without overwriting previous entries or existing supplier configurations.
