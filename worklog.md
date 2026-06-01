# Task 1: Connect Onboarding to Database & Auth Protection

## Summary
Connected the 8-step onboarding flow to the real Supabase database via Prisma, implemented real auth protection with NextAuth JWT-based middleware, and ensured proper session hydration on the dashboard.

## Changes Made

### 1. Created `/api/onboarding` endpoint
**File**: `src/app/api/onboarding/route.ts` (NEW)

- POST endpoint that receives ALL onboarding data in a single request
- Uses Prisma `$transaction` for atomicity
- Logic:
  1. If `clinicId` provided, updates existing Clinic with full data (rfc, address, city, state, mode)
  2. If no `clinicId`, creates new Clinic (generates slug from name + timestamp)
  3. Updates User record with clinicId if not set
  4. Creates Doctor record linked to clinic with personalData + schedule + random color
  5. Creates all Service records linked to the clinic
  6. Creates ServiceDoctor pivot records linking each service to the doctor
  7. Creates FeatureFlag records based on aiMode:
     - 'full' → all 12 flags set to 'on'
     - 'assist' → mixed flags (desk-auto-reply=assist, desk-appointment=assist, flow-soap=assist, flow-preconsulta=on, bill-auto-cfdi=assist, bill-reminders=off, grow-reactivation=assist, grow-segments=on, sight-alerts=on, sight-reports=assist, hub-scheduling=off, hub-inventory=off)
     - 'manual' → all 12 flags set to 'off'
  8. Returns `{ clinicId, clinicSlug, doctorId, serviceIds }`

### 2. Modified OnboardingFlow component
**File**: `src/components/sinap/onboarding-flow.tsx`

- Added `useSession` from next-auth/react to get user session
- Added `isSaving` and `saveError` state variables
- Modified `handleNext` to be async
- On step 7 (final step), when user clicks "Ir al dashboard":
  1. Gets userId from NextAuth session
  2. If demo mode or no userId, completes onboarding locally (no API call)
  3. Otherwise calls POST `/api/onboarding` with all collected data
  4. Shows loading spinner (Loader2) on the button while saving
  5. On success: sets `clinicId`, `clinicSlug` in Zustand from API response
  6. On error: shows red error message with retry capability
  7. Button is disabled during save (`!canNext() || isSaving`)
- Added `AlertCircle` icon import for error display
- Added error message display in step 7 (red alert box)

### 3. Updated middleware for auth protection
**File**: `src/middleware.ts`

- Replaced passthrough middleware with real auth protection
- Uses `getToken` from `next-auth/jwt` to check for session
- Routes:
  - `/` and `/login` → always allowed (public)
  - `/api/*` → always allowed (API auth handled per-route)
  - `/dashboard/*` → protected:
    - If `sinap-demo=true` cookie → allowed (demo mode)
    - If NextAuth JWT token exists → allowed
    - Otherwise → redirect to `/login`
- Matcher: `['/dashboard/:path*']`

### 4. Updated login demo mode to set cookie
**File**: `src/components/sinap/login-screen.tsx`

- Added `document.cookie = 'sinap-demo=true; path=/; max-age=86400; SameSite=Lax'` in `handleDemoLogin`
- This ensures middleware allows dashboard access for demo users
- Also added `navigateToOnboarding` function for new users (does NOT set onboardingComplete)
- Updated `handleRegister` to:
  - Store `clinicId` from register response into Zustand
  - Navigate to dashboard without setting onboardingComplete (new users need onboarding)
- Updated `navigateToDashboard` to only be used for existing users (sets onboardingComplete=true)
- Added `setClinicId` from store to destructured values

### 5. Updated register endpoint
**File**: `src/app/api/auth/register/route.ts`

- Added `clinicId` to the response JSON so the client can store it immediately

### 6. Updated dashboard page to hydrate from session
**File**: `src/app/dashboard/page.tsx`

- Added session hydration effect:
  - When NextAuth session is available, sets `clinicId` from `session.user.clinicId` into Zustand
  - If onboarding is not complete in Zustand but user has a session with clinicId:
    - Checks if clinic has doctors via `/api/doctors?clinicId=xxx`
    - If doctors exist → sets onboardingComplete=true (they completed onboarding before)
  - If no clinicId or onboarding already complete → just marks as hydrated
- Used `useRef` for sessionHydrated to avoid lint errors
- Added eslint-disable comment for `setMounted(true)` (standard SSR hydration pattern)

## Verification

- Lint: 0 errors, 4 pre-existing warnings (unused eslint-disable directives in settings-pages.tsx)
- API endpoint test: `POST /api/onboarding` with empty body → `{ error: "userId es requerido" }` (correct validation)
- Middleware test:
  - `GET /dashboard` without auth → 307 redirect to `/login` ✅
  - `GET /dashboard` with `sinap-demo=true` cookie → 200 ✅
  - `GET /` → 200 ✅
  - `GET /login` → 200 ✅
  - `GET /api/onboarding` → 405 (POST only) ✅
- Dev server: running without errors

## Flow Diagram

```
New User Registration:
  Register → signIn → navigateToOnboarding() → /dashboard → show OnboardingFlow
  → Step 7: POST /api/onboarding → create Clinic/Doctor/Services/Flags → setOnboardingComplete(true) → dashboard

Existing User Login:
  Login → navigateToDashboard() → /dashboard → session hydration → check doctors → onboardingComplete=true → dashboard

Demo Mode:
  Demo → set cookie → navigateToDemo() → /dashboard → middleware allows via cookie → onboardingComplete=true → dashboard
```
