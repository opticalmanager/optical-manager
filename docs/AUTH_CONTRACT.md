# Optical Manager - Authentication & Authorization Contract

This document provides a comprehensive specification of authentication, authorization, session management, tokens, and role-based access control (RBAC) implementation details for the OpticalManager CRM. 

This contract serves as the source of truth for all authentication-related integration.

---

## 1. Authentication Provider

The system leverages **Supabase Auth** hosted at `NEXT_PUBLIC_SUPABASE_URL` as the underlying Identity Provider (IdP).

### Client Types

We utilize two distinct Supabase clients depending on the operation context:

1. **Server Client (`lib/supabase/server.ts`)**
   - Uses `createServerClient` from `@supabase/ssr`.
   - Injects async `cookies()` from `next/headers`.
   - Used for all standard operations in Server Components, Server Actions, and Route Handlers.
   - Enforces Row Level Security (RLS) policies.

2. **Admin Client (`lib/supabase/admin.ts`)**
   - Uses the `SUPABASE_SERVICE_ROLE_KEY`.
   - Bypasses RLS entirely.
   - **Restricted Usage**: Only used for administrative tasks, specifically creating and managing Shop Manager accounts.

---

## 2. Authentication Methods

The platform supports the following authentication methods:

1. **Email + Password (Primary)**
   - Users register via `/signup` providing `fullName`, `email`, `password`, and `organizationName`.
2. **Google OAuth**
   - Triggered via `supabase.auth.signInWithOAuth({ provider: 'google' })`.
   - Callback URL configured as: `{NEXT_PUBLIC_APP_URL}/api/auth/callback`.
3. **Password Reset**
   - Triggered via `supabase.auth.resetPasswordForEmail()`.
   - Redirect URL configured as: `/api/auth/callback?next=/reset-password`.
   - Supports both magic link tokens and manually entered 6-digit OTP codes.

---

## 3. Role-Based Access Control (RBAC)

The system relies on a PostgreSQL Enum `user_role` mapping to three distinct roles:

1. **`SUPER_ADMIN` (Platform Admin)**
   - Access is strictly restricted to the `admin.opticalmanager.in` subdomain.
   - Any attempt to login via the main site (`/login`) will be rejected with an error message.
2. **`OWNER` (Store Chain Owner)**
   - Full read/write access to organization-wide data across all shops associated with their `organization_id`.
3. **`SHOP_MANAGER` (Individual Store Staff)**
   - Access is strictly scoped to a single `shop_id`.

---

## 4. Session & Token Management

- **Storage**: Sessions are strictly cookie-based, handled automatically via `@supabase/ssr`.
- **Naming**: Cookies are prefixed with `sb-` and contain `auth-token`.
- **Refresh Flow**: Session refreshing is handled implicitly in the proxy middleware (`proxy.ts`) on every request.
- **Error Handling**: Stale or corrupted cookies are automatically cleared upon encountering `refresh_token_not_found` or HTTP 400 auth errors.
- **JWT**: The system does not mint custom JWTs. It relies entirely on Supabase's native JWT implementation.

---

## 5. Profile System

User metadata is stored in a dedicated `profiles` table in PostgreSQL, decoupled from Supabase's internal `auth.users` metadata (though linked via ID).

- **ID Mapping**: `profiles.id` MUST exactly match `auth.users.id`. It is manually set during insertion, not auto-generated.
- **Schema**:
  - `id` (uuid)
  - `fullName` (text)
  - `email` (text)
  - `role` (user_role enum)
  - `organizationId` (uuid, nullable)
  - `shopId` (uuid, nullable)
  - `avatarUrl` (text, nullable)
  - `isActive` (boolean, defaults to true)

### Auto-Recreation Failsafe
If a valid Supabase session is detected but no corresponding row exists in the `profiles` table (e.g., following a database reset), the system will automatically recreate an `OWNER` profile and provision a new organization for the user.

---

## 6. The `getCurrentUser()` Contract (CRITICAL)

All context regarding the currently authenticated user is accessed via `getCurrentUser()` located in `services/auth.service.ts`.

- **Caching**: The function is wrapped in React's `cache()` to ensure it only executes a single Supabase query per request lifecycle.
- **Return Signature**: Returns a `SessionUser` object or `null`.

```typescript
interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'SHOP_MANAGER';
  organizationId: string | null;
  shopId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isImpersonating?: boolean;
}
```

### Context Switching (`OWNER` → Shop Impersonation)
When an `OWNER` clicks "Access Console" to manage a specific shop:
1. A server action sets an `httpOnly` cookie: `active_shop_context_id = {shopId}` (maxAge: 24h, secure in prod).
2. On subsequent requests, `getCurrentUser()` detects this cookie.
3. The function validates the UUID and ensures the target shop belongs to the owner's organization.
4. It overrides the returned `shopId` property with the cookie's value and sets `isImpersonating = true`, while maintaining `role = 'OWNER'`.
5. Exiting the console deletes the cookie and redirects the user to `/owner`.

---

## 7. Routing & Middleware Rules (`proxy.ts`)

Authentication and routing enforcement is handled by `proxy.ts` (Next.js 16 proxy).

### Public Routes
Accessible without authentication:
- `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/privacy-policy`, `/terms-of-service`
- `/api/auth/callback`, `/api/auth/*`
- `/book/*` (Public appointment booking)
- `/share/*` (Public invoice sharing)

### Admin Subdomain Enforcement (`admin.opticalmanager.in`)
- `/` → Rewritten to `/admin` (if `SUPER_ADMIN`) or `/admin/login` (if unauthenticated).
- `/admin/login` → Redirects to `/admin` if already authenticated as a `SUPER_ADMIN`.
- All other `/admin/*` paths mandate the `SUPER_ADMIN` role.
- If a user accesses `/admin` on the main domain, they are redirected to `admin.opticalmanager.in`.
- Local dev equivalent: `admin.lvh.me:3000`.

### Auth Error Handling
- If the request URL contains `error_code=otp_expired` or `error=access_denied`, the middleware intercepts and redirects to `/reset-password?error=expired`.

### Protected Routes Enforcement
- Any non-public route accessed without an active session triggers a redirect to `/login?redirect={pathname}`.
- Authenticated users accessing `/login` or `/signup` are automatically routed based on their role:
  - `SUPER_ADMIN` → `/admin`
  - `SHOP_MANAGER` → `/shop/dashboard`
  - `OWNER` → `/owner`

---

## 8. Authentication Flows

### OAuth Callback Handler (`/api/auth/callback`)
1. Exchanges the OAuth code for a session.
2. Looks up the user in the `profiles` table.
3. **New User**: If no profile exists, executes `createOwnerWithOrganization()` (provisioning org + profile) and redirects to `/onboarding`.
4. **Existing User**: Redirects based on role (`SHOP_MANAGER` → `/shop/dashboard`, `OWNER` → `/owner`).
5. Honours the `?next=` query parameter for custom redirect targets.

### Signup Flow (Email/Password)
1. Form inputs validated via Zod (`fullName`, `email`, `password`, `organizationName`).
2. `supabase.auth.signUp()` is called, storing `full_name` in Supabase `user_metadata`.
3. Triggers `createOwnerWithOrganization()`:
   - Creates Organization row.
   - Creates Profile row (`OWNER` role).
   - Provisions a Trial Subscription (14 days).
4. Redirects to `/onboarding`.

### Login Flow (Email/Password)
1. Credentials validated via Zod.
2. `supabase.auth.signInWithPassword()`.
3. `getCurrentUser()` invoked to fetch the DB profile.
4. Auto-recreate `OWNER` profile if missing (failsafe).
5. Checks `isActive`: If false, forces a sign-out and throws an error.
6. Checks role: If `SUPER_ADMIN`, rejects login on main domain and instructs user to use `admin.opticalmanager.in`.
7. Redirects based on role.

### Admin Login Flow
- Located at `/admin/login`.
- Uses `supabase.auth.signInWithPassword()`.
- Validates that the returned profile has `role = 'SUPER_ADMIN'` (also mirrored in `user_metadata.role`).

### Password Reset Flow
1. User submits email at `/forgot-password`.
2. Server action calls `supabase.auth.resetPasswordForEmail({ redirectTo: '{APP_URL}/api/auth/callback?next=/reset-password' })`.
3. User clicks email link → hits callback → session exchanged → redirected to `/reset-password`.
4. The `/reset-password` page accepts two modes:
   - **Hash**: Validates `token_hash` query parameter.
   - **OTP**: Accepts a 6-digit OTP code and email.
5. Calls `supabase.auth.verifyOtp()` followed by `supabase.auth.updateUser({ password })`.

---

## 9. Account Provisioning (Shop Managers)

Shop Managers cannot sign themselves up. They are provisioned by an `OWNER`.

- Executed via Server Action using the **Admin Client**.
- Calls `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`.
- This ensures the account is pre-confirmed without requiring an email verification loop.
- Inserts a row into `profiles` with `role = 'SHOP_MANAGER'` and the specific `shopId`.
- Owners can update manager credentials via the same Admin API flow.

---

## 10. Core Security Guards

To maintain data integrity and isolation, the following patterns MUST be adhered to:

- **Action Protection**: Every Server Action interacting with protected data MUST initiate with a `getCurrentUser()` check.
- **Admin Endpoints**: Any service/action requiring Admin rights MUST call `verifySuperAdmin()`, which throws or redirects if the user is not a `SUPER_ADMIN`.
- **Query Scoping (Owner)**: All queries retrieving organizational data MUST include a `where: { organization_id: user.organizationId }` clause.
- **Query Scoping (Manager)**: All queries retrieving shop-specific data for managers MUST include a `where: { shop_id: user.shopId }` clause.
- **Deactivation**: If `isActive === false` on a profile, any login attempt will immediately trigger a sign-out mechanism and block entry.

---

## 11. Environment Configuration

The following environment variables are strictly required for authentication flows to operate:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (safe for client-side).
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations, **SERVER-SIDE ONLY**).
- `NEXT_PUBLIC_APP_URL`: Base application URL for OAuth redirects (e.g., `http://localhost:3000` or production domain).
