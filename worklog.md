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

---

# Task 3: Comprehensive Seed Script for Demo Data

## Summary
Created a comprehensive, idempotent seed script that populates the database with realistic demo data for the Sinap platform. The seed went from creating only 4 entity types (clinic, doctor, user, 6 services) to creating 12 entity types with 97 records total, making the platform look alive and impressive.

## Changes Made

### 1. Rewrote `prisma/seed.ts` (full rewrite on top of existing)

**Date Helpers** — Added three helper functions:
- `today(hour, minute)` → today at specific time
- `daysAgo(n, hour, minute)` → n days ago at specific time
- `tomorrow(hour, minute)` → tomorrow at specific time

**Section 1: Clinic** — Kept existing upsert for Clínica San Ángel (no changes)

**Section 2: Doctors** — Added second doctor:
- Dra. Carmen Vega, Dermatología estética, color #534AB7
- Schedule: Tue-Sat (2,3,4,5,6), 10:00-19:00, 45min slots
- Fixed ID: `demo-doctor-2`

**Section 3: Demo User** — Kept existing upsert (demo@sinap.health / demo1234)

**Section 4: Services** — Kept existing 6 services with fixed IDs (`svc-consulta-general`, etc.)

**Section 5: ServiceDoctor Pivots** (NEW) — Links all 6 services to both doctors (12 records)
- Uses `@@unique([serviceId, doctorId])` compound key for upsert

**Section 6: Patients** (NEW) — 8 patients with realistic Mexican data:
1. María García López — VIP, referral, 12 visits, $28,500 spent, melanoma follow-up
2. Carlos Mendoza Rivera — Active, WhatsApp, 6 visits, $9,800, acne treatment
3. Ana Sofía Hernández — Inactive, Instagram, 2 visits, $3,000, cosmetic consultation
4. Roberto Jiménez Salazar — VIP, referral, 18 visits, $52,000, multiple skin neoplasms
5. Laura Patricia Morales — Churned, Facebook, 3 visits, $4,500, complaint about wait time
6. Fernando Díaz Vega — New, walk-in, 1 visit, $1,200, first consultation
7. Isabel Reyes Castillo — Active, WhatsApp, 5 visits, $7,300, atopic dermatitis
8. Miguel Ángel Torres — Churned, Instagram, 2 visits, $3,800, cosmetic + cryotherapy

Each patient has: fullName, firstName, lastName, phone (MX +52 55), email, birthDate, gender, segment, source, totalVisits, totalSpent, ltv, lastVisitDate, firstContactDate, allergies (some), notes (clinical), rfc, address, sentiment, preferredChannel, preferredTime

**Section 7: Appointments** (NEW) — 12 appointments across today and past week:
- 2 confirmed (today), 1 scheduled (today), 4 completed, 2 cancelled, 1 no-show, 1 confirmed (tomorrow), 1 completed (6 days ago)
- Cancelled appointments have `cancelReason`
- Spread across both doctors and various services
- Channels: whatsapp, instagram, facebook, walk_in

**Section 8: Invoices** (NEW) — 9 invoices with CFDI 4.0 fields:
- 4 timbrada (with UUID, serie, folio, fechaTimbrado, paidAt)
- 2 pending (unpaid)
- 1 cancelled
- 1 error (with errorMessage about invalid RFC)
- Amounts: $696 - $6,032 MXN
- CFDI fields: formaPago, metodoPago, usoCFDI, tipoComprobante, concepto

**Section 9: Conversations & Messages** (NEW) — 6 conversations with 20 total messages:
1. María García (WhatsApp) — scheduling follow-up, 4 messages, AI responses
2. Ana Sofía (Instagram) — inquiry about pricing, 3 messages, AI response
3. Laura Patricia (Messenger) — complaint, 4 messages, routed to human
4. Fernando Díaz (WhatsApp) — reschedule request, 3 messages, AI response
5. Carlos Mendoza (WhatsApp) — scheduling, 4 messages, AI responses
6. Miguel Ángel Torres (Instagram) — promo inquiry, 2 messages, marketing agent AI response

All conversations marked `isMock: true`. AI responses have `aiGenerated: true` and `confidence` scores.

**Section 10: Feature Flags** (NEW) — 12 flags with "assist" default mode:
- desk-auto-reply=assist, desk-appointment=assist
- flow-soap=assist, flow-preconsulta=on
- bill-auto-cfdi=assist, bill-reminders=off
- grow-reactivation=assist, grow-segments=on
- sight-alerts=on, sight-reports=assist
- hub-scheduling=off, hub-inventory=off

Uses `@@unique([clinicId, module, feature])` compound key for upsert.

**Section 11: SOAP Notes** (NEW) — 2 notes:
1. Approved note (demo-soap-1): María García, melanoma in situ treatment, doctor signed
2. Draft note (demo-soap-2): Carlos Mendoza, acne treatment, AI-generated awaiting approval

Both have realistic dermatology content: subjective, objective, assessment, plan, vitals (JSON), diagnosis, prescriptions (JSON).

**Section 12: Event Bus** (NEW) — 5 recent events:
1. cita_agendada — desk→grow, processed
2. factura_generada — bill→desk, processed
3. soap_borrador_listo — flow→desk, pending
4. cita_completada — desk→bill, processed
5. paciente_nuevo — desk→grow, processed

### 2. Added `prisma.seed` config to `package.json`
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

## Implementation Details

- **Idempotent**: All records use `upsert` with fixed IDs (`demo-*` prefix) so the seed can be run multiple times safely
- **Dynamic dates**: Uses `today()`, `daysAgo(n)`, `tomorrow()` for date-relative data
- **Progress logging**: Each section logs progress with emoji markers and summary counts
- **No conflicts**: `update: {}` on upserts means existing data is preserved on re-runs

## Verification

- ✅ Seed runs successfully: `npx tsx prisma/seed.ts`
- ✅ Idempotent: second run completes without errors
- ✅ Lint: 0 errors (4 pre-existing warnings in settings-pages.tsx)
- ✅ Dev server: running without errors

## Data Summary

| Entity | Count |
|--------|-------|
| Clinics | 1 |
| Doctors | 2 |
| Users | 1 |
| Services | 6 |
| ServiceDoctor | 12 |
| Patients | 8 |
| Appointments | 12 |
| Invoices | 9 |
| Conversations | 6 |
| Messages | 20 |
| Feature Flags | 12 |
| SOAP Notes | 2 |
| Event Bus | 5 |
| **Total Records** | **97** |

---

# Task 4: Connect Bill Module to Database for CFDI Generation

## Summary
Made the Bill module truly connected to the database for CFDI generation. Previously, Facturama credentials were read from `process.env` only, the RFC del emisor was hardcoded as `CSA230515ABC`, the connection check was `process.env.NODE_ENV === 'development'` (wrong logic), and the patient's RFC was not fetched from the DB. All of these issues are now resolved with a DB-driven approach that still supports sandbox/mock mode for demos.

## Changes Made

### 1. Updated `/api/clinic` to support `clinicId` query param and return Facturama fields

**File**: `src/app/api/clinic/route.ts`

- Added support for `?clinicId=xxx` query param (looks up by ID instead of slug)
- Priority order: `clinicId` → `slug` → `findFirst` (demo mode)
- Response now includes Facturama config fields: `facturamaUserId`, `facturamaToken`, `facturamaSandbox`
- Refactored to extract shared `includeCounts` object to reduce duplication

### 2. Rewrote `/api/facturama` to read credentials from DB

**File**: `src/app/api/facturama/route.ts`

Major changes:
- **Added `resolveFacturamaConfig(clinicId)` function** that resolves Facturama credentials in a 3-tier cascade:
  1. **DB clinic lookup**: If clinic has `facturamaUserId` + `facturamaToken`, use those (real mode or sandbox per `facturamaSandbox`)
  2. **Environment variables**: Fall back to `FACTURAMA_USER`/`FACTURAMA_PASSWORD` if they differ from defaults
  3. **Mock/sandbox mode**: If neither DB nor env has real credentials, use simulated CFDI generation

- **POST handler** now:
  - Calls `resolveFacturamaConfig(clinicId)` to get credentials and clinic billing info (rfc, name, regimenFiscal)
  - Looks up patient by `patientId` from DB to get `rfc` and `fullName`
  - Resolves emisor RFC/name/regimen from: DB clinic → request body → defaults
  - Resolves receptor RFC/name from: DB patient → request body → generic "XAXX010101000"
  - In mock mode, returns simulated CFDI with additional fields: `facturamaId`, `tipoComprobante`, `usoCFDI`, `serie`
  - In real mode, uses DB credentials for Facturama API auth (with sandbox URL if `facturamaSandbox`)

- **GET handler** now uses `resolveFacturamaConfig` instead of hardcoded env vars

- **DELETE handler** now uses `resolveFacturamaConfig` instead of hardcoded env vars

- **`facturamaRequest`** now takes `auth` and `baseUrl` as parameters instead of using module-level constants

### 3. Rewrote `BillDashboard` component for DB-driven billing

**File**: `src/components/sinap/bill-dashboard.tsx`

- **Added `ClinicBillingConfig` interface** with rfc, regimenFiscal, name, facturamaUserId, facturamaToken, facturamaSandbox
- **Added `clinicBilling` state** and `isLoadingBilling` state
- **Replaced hardcoded `facturamaConnected = process.env.NODE_ENV === 'development'`** with DB-driven check:
  - `facturamaConnected = clinicBilling ? !!(clinicBilling.facturamaToken || clinicBilling.facturamaSandbox) : false`
  - `facturamaMode` shows "sandbox", "producción", or "desconectado"
- **Fetches clinic billing config** via `/api/clinic?clinicId=xxx` on mount (or `/api/clinic?slug=xxx` if clinicId not yet resolved)
- **Status badge** now shows 3 states with distinct colors:
  - Green (producción): `facturamaToken` is set → real Facturama connection
  - Amber (sandbox): No `facturamaToken` but `facturamaSandbox` is true → simulated mode
  - Red (desconectado): Neither available
- **CFDI dialog** shows sandbox warning only when in sandbox mode (not when connected to production)
- **Patient step** now shows RFC info: displays patient RFC if available, or warning "Sin RFC registrado"
- **Emisor info** in dialog summary now includes Régimen Fiscal: `Emisor: {name} | RFC: {rfc} | Régimen: {regimen}`
- **Receptor info** shows RFC when patient is selected

### 4. Updated CFDI generation to use clinic/patient data from DB

In `handleGenerateCFDI`:
- Uses `clinicBilling?.rfc` → `clinicProfile.rfc` → `'CSA230515ABC'` for emisor RFC (cascading fallback)
- Uses `clinicBilling?.name` → `clinicProfile.name` → default for emisor name
- Uses `clinicBilling?.regimenFiscal` → `'612'` for regimen fiscal
- Sends `patientId` so the `/api/facturama` POST handler can look up patient RFC from DB
- Sends fallback values in case DB lookup fails on the API side

### 5. Updated invoice creation with all CFDI fields

**File**: `src/app/api/invoices/route.ts`

- Added support for `tipoComprobante` field (defaults to 'I')
- Added support for `serie` field
- Added support for `folio` field
- All CFDI fields are now persisted: `cfdiUuid`, `facturamaId`, `pdfUrl`, `xmlUrl`, `formaPago`, `metodoPago`, `usoCFDI`, `tipoComprobante`, `subtotal`, `iva`, `total`, `concepto`, `serie`, `folio`

**File**: `src/components/sinap/bill-dashboard.tsx` (in `handleGenerateCFDI`)

- Invoice POST now includes: `tipoComprobante`, `serie` from CFDI response
- Error invoice POST also includes `tipoComprobante: 'I'`

## Verification

- ✅ Lint: 0 errors (4 pre-existing warnings in settings-pages.tsx)
- ✅ Dev server: running without errors
- ✅ No Prisma schema changes needed (all fields already existed: `facturamaUserId`, `facturamaToken`, `facturamaSandbox` on Clinic; `rfc` on Patient; `serie`, `folio`, `tipoComprobante` on Invoice)

## Flow Diagram

```
CFDI Generation Flow (after changes):

1. BillDashboard mounts → fetch /api/clinic?clinicId=xxx
   → Get clinic.facturamaToken, facturamaSandbox, rfc, name, regimenFiscal
   → Determine facturamaConnected badge state

2. User fills CFDI form → clicks "Generar CFDI"
   → POST /api/facturama with { clinicId, patientId, concept, subtotal, formaPago, metodoPago, usoCFDI, rfcEmisor, nombreEmisor, regimenFiscal }

3. /api/facturama POST handler:
   → resolveFacturamaConfig(clinicId)
     → DB clinic.facturamaUserId + facturamaToken? → use real Facturama
     → DB clinic.facturamaSandbox? → use sandbox/mock
     → Env vars? → use those
     → Otherwise → mock mode
   → Look up patient by patientId → get rfc, fullName
   → Resolve emisor: DB clinic rfc → body rfcEmisor → default
   → Resolve receptor: DB patient rfc → body rfcReceptor → XAXX010101000
   → If mock: generateMockCFDI() → return simulated UUID
   → If real: call Facturama API → return real CFDI UUID

4. On success → POST /api/invoices with full CFDI data
   → Persist: cfdiUuid, facturamaId, pdfUrl, xmlUrl, formaPago, metodoPago, usoCFDI, tipoComprobante, serie, subtotal, iva, total, concepto

5. Update local invoice list in UI
```

---

# Task 5: Persist SOAP Notes to Database in Flow Clinical Module

## Summary
Made the Flow clinical module persist SOAP notes to the database. Previously, `/api/soap` generated SOAP notes with AI but never saved them to the `SoapNote` table, and the Flow component stored them only in Zustand (localStorage). Now SOAP notes are saved to the database on creation, updated via API on edits, and signed via a dedicated approve/sign flow with PATCH endpoint.

## Changes Made

### 1. Created `/api/soap-notes` CRUD endpoints

**File**: `src/app/api/soap-notes/route.ts` (NEW)

**POST** — Create or update SOAP note:
- If `appointmentId` is provided and a SoapNote already exists for that appointment (via `@unique` constraint), UPDATE it
- Otherwise CREATE a new SoapNote
- Required fields: `clinicId`, `patientId`, `doctorId`
- Optional fields: `appointmentId`, `subjective`, `objective`, `assessment`, `plan`, `aiGenerated`, `aiSuggested`, `vitals`, `diagnosis`, `prescriptions`
- Defaults: `aiGenerated=true`, `aiSuggested=false`, `doctorApproved=false`
- Returns `{ soapNote }` with status 201 on create, 200 on update

**GET** — List SOAP notes:
- Query params: `clinicId` (required), `patientId` (optional)
- If `patientId` provided, filters notes for that patient
- Includes `patient.fullName` as `patientName` and `doctor.name` as `doctorName` in response
- Ordered by `createdAt` desc
- Returns `{ soapNotes: [...] }`

### 2. Created `/api/soap-notes/[id]` endpoint

**File**: `src/app/api/soap-notes/[id]/route.ts` (NEW)

**PUT** — Update SOAP note fields:
- Accepts partial updates: `subjective`, `objective`, `assessment`, `plan`, `vitals`, `diagnosis`, `prescriptions`, `doctorApproved`
- If `doctorApproved` is set to `true`, also sets `doctorSignedAt = new Date()`
- Returns 403 if note is already approved/signed (read-only after signing)
- Returns 404 if note not found

**PATCH** — Approve/sign SOAP note:
- Sets `doctorApproved = true`, `doctorSignedAt = new Date()`
- Sets `aiSuggested = false` (doctor has reviewed, no longer just a suggestion)
- Returns 400 if note is already approved
- Returns 404 if note not found

### 3. Updated `/api/soap` to save to DB after AI generation

**File**: `src/app/api/soap/route.ts`

After generating the SOAP note with AI:
- Now accepts additional fields: `doctorId`, `appointmentId`
- If `clinicId`, `patientId`, and `doctorId` are all provided AND `db` is available:
  - If `appointmentId` is provided and a SoapNote already exists for that appointment, UPDATE it
  - Otherwise CREATE a new SoapNote
- Sets `aiGenerated = true`, `aiSuggested = true` (doctor hasn't approved yet)
- If `appointmentId` is provided, links to the appointment
- Returns both the SOAP data AND the created note's `id` as `soapNoteId`
- DB save failure does NOT fail the overall request (graceful degradation)

### 4. Updated `flow-clinical.tsx` for DB persistence

**File**: `src/components/sinap/flow-clinical.tsx`

Major changes:

**Extended type system**:
- Added `DbSoapNoteItem` interface extending `SoapNoteItem` with `dbId`, `doctorApproved`, `doctorSignedAt`, `doctorName`, `appointmentId`
- Used `DbSoapNoteItem` for `selectedSoapNote` state

**DB fetch on mount**:
- Added `dbSoapNotes` state and `isLoadingSoapNotes` state
- On component mount, fetches SOAP notes from `GET /api/soap-notes?clinicId=xxx`
- Maps DB response to `DbSoapNoteItem[]` with patient/doctor names
- Uses `useRef` to prevent duplicate fetches

**Combined notes list**:
- `allSoapNotes` merges DB notes with local Zustand notes (deduped by `dbId`)
- DB notes appear first, local-only notes follow

**AI generation flow**:
- `handleGenerateSOAP` now sends `clinicId`, `patientId`, `doctorId`, `appointmentId` to `/api/soap`
- When response includes `soapNoteId`, stores it as `dbId` on the note
- Adds to both `dbSoapNotes` state and Zustand store

**Editing flow**:
- `handleSaveEdit` now calls `PUT /api/soap-notes/[id]` to persist edits to DB
- Falls back to local-only update if API fails
- Shows loading spinner on "Guardar cambios" button while saving
- Added `isSavingEdit` state for loading indicator

**Approve & Sign flow** (replaces simple approve):
- "Aprobar nota" button changed to "Aprobar y firmar" with `ShieldCheck` icon
- Clicking opens a confirmation dialog (`showApproveDialog`)
- Dialog shows:
  - Warning that note cannot be edited after signing
  - Patient name and date
  - AI-generated warning if applicable
  - Doctor name and license number for signing
  - "Confirmar firma" button
- On confirm, calls `PATCH /api/soap-notes/[id]` to set `doctorApproved=true`
- Updates both `dbSoapNotes` state and Zustand store

**Signed/Read-only state**:
- After approval, SOAP sections show "Solo lectura" badge instead of "Editar" button
- Signed indicator banner at top: "Firmada por Dr. [name]" with formatted timestamp
- Status badge changes from "Borrador IA" to "Firmada" (purple)
- Edit attempts on approved notes are blocked
- Content shown with `opacity-80` to visually indicate read-only

**Status badges**:
- Draft AI notes: amber "Borrador IA" + purple "IA" badge with sparkle
- Approved notes: green "Aprobada"
- Signed notes: purple "Firmada"

## Verification

- ✅ Build: `npx next build` completes successfully
- ✅ Lint: 0 errors (4 pre-existing warnings in settings-pages.tsx)
- ✅ New API routes visible in build output: `/api/soap-notes` and `/api/soap-notes/[id]`
- ✅ Dev server: running without errors
- ✅ No Prisma schema changes needed (all fields already existed)

## Flow Diagram

```
SOAP Note Lifecycle (after changes):

1. Doctor starts pre-consulta → answers questions → clicks "Generar nota SOAP con IA"
   → POST /api/soap with { clinicId, patientId, doctorId, appointmentId, specialty, preConsultaResponses }
   → AI generates SOAP content
   → If clinicId + patientId + doctorId provided: saves to SoapNote table
     → aiGenerated=true, aiSuggested=true, doctorApproved=false
   → Returns { subjective, objective, assessment, plan, soapNoteId }

2. Doctor edits a field (clicks "Editar" on S/O/A/P section)
   → Opens edit dialog with textarea
   → On save: PUT /api/soap-notes/[dbId] with { [field]: newValue }
   → Updates DB + local state
   → Blocked if note is already approved (403)

3. Doctor approves/signs note (clicks "Aprobar y firmar")
   → Shows confirmation dialog with doctor name + license
   → On confirm: PATCH /api/soap-notes/[dbId]
     → Sets doctorApproved=true, doctorSignedAt=now(), aiSuggested=false
   → UI updates: "Firmada" badge, "Solo lectura" on fields, signed indicator banner

4. On component mount:
   → GET /api/soap-notes?clinicId=xxx
   → Loads all SOAP notes for clinic from DB
   → Merges with local Zustand notes
   → Displays in sidebar list
```

---

# Task 6: Persist Desk Messages to Database

## Summary
Made the Desk module persist messages to the database. Previously, when a doctor sent a message in the Desk inbox, it was only saved in React state (lost on refresh). When the AI responded via `/api/orchestrator`, neither the inbound message nor the AI response was saved to the `Message` table. The conversation's `lastMessageAt` was also never updated. Now all messages are persisted to the database via a new `/api/messages` endpoint with fire-and-forget calls from the Desk component, and the orchestrator updates conversation metadata when `conversationId` is provided.

## Changes Made

### 1. Created `/api/messages` endpoint

**File**: `src/app/api/messages/route.ts` (NEW)

**POST** — Create a message and update conversation:
- Required fields: `conversationId`, `clinicId`, `direction`, `content`
- Optional fields: `senderType` (default 'patient'), `senderId`, `agentName`, `aiGenerated`, `channel` (default from conversation), `messageType` (default 'text')
- Validates direction is 'inbound' or 'outbound'
- Looks up conversation to get default channel
- Creates the `Message` record in DB
- Updates conversation's `lastMessageAt` to `now()`
- If direction is 'inbound' and conversation has no `currentAgent`, infers agent from content via keyword matching:
  - 'cita', 'agendar', 'horario' → 'reception'
  - 'factura', 'pago', 'cfdi' → 'billing'
  - 'sintoma', 'dolor', 'soap' → 'clinical'
  - 'campana', 'marketing', 'reactivar' → 'marketing'
- Returns the created message with status 201

**GET** — List messages for a conversation:
- Query: `conversationId` (required)
- Returns messages ordered by `createdAt` asc

### 2. Updated Desk component to persist messages

**File**: `src/components/sinap/desk-inbox.tsx`

In the `handleSendMessage` function:

**Doctor's message persistence** (fire-and-forget):
- After adding the user message to local state, fires `POST /api/messages` with:
  - `conversationId`, `clinicId`, `direction: 'inbound'`, `content`, `senderType: 'doctor'`, `channel`
- Uses `.catch(() => {})` to silently handle errors — UI is already updated

**AI response persistence** (fire-and-forget):
- After receiving the AI response from `/api/orchestrator` and updating local state, fires `POST /api/messages` with:
  - `conversationId`, `clinicId`, `direction: 'outbound'`, `content`, `senderType: 'agent'`, `agentName`, `aiGenerated: true`, `channel`
- Uses `.catch(() => {})` to silently handle errors — UI is already updated

**Orchestrator call updated**:
- Now passes `conversationId` (instead of `patientId`) to the orchestrator so it can update conversation metadata server-side

Both persistence calls are non-blocking — the UI updates immediately and DB writes happen in the background.

### 3. Updated `/api/orchestrator` to save messages and update conversation metadata

**File**: `src/app/api/orchestrator/route.ts`

After generating the AI response:

- Added `conversationId` to the destructured request body
- Added `db` import from `@/lib/db`
- Added `agentToCurrentAgent` mapping: desk→reception, flow→clinical, bill→billing, grow→marketing

**When `conversationId` is provided** (Desk component flow):
- The Desk component handles message creation via fire-and-forget `POST /api/messages`
- The orchestrator only updates conversation metadata: `lastMessageAt` and `currentAgent`
- This avoids duplicate message records (client already creates them)

**When `patientId` + `clinicId` are provided but no `conversationId`** (direct API calls):
- Looks up or creates an active conversation for that patient
- Saves both the inbound message and the outbound AI response to the `Message` table
- Updates the conversation's `lastMessageAt` and `currentAgent`

- DB persistence failure does NOT fail the overall request (graceful degradation with try/catch)

## Design Decisions

- **No duplicate messages**: The Desk component creates Message records via fire-and-forget `POST /api/messages`. The orchestrator does NOT create Message records when `conversationId` is provided (to avoid duplicates). It only updates conversation metadata.
- **Non-blocking persistence**: The fire-and-forget pattern ensures the UI updates immediately without waiting for DB writes.
- **Server-side fallback**: When the orchestrator is called directly (without `conversationId` but with `patientId` + `clinicId`), it handles full persistence server-side.
- All new messages are marked `isMock: true` since they come from the demo/simulation UI.
- No Prisma schema changes needed — all fields already existed on the `Message` and `Conversation` models.

## Verification

- ✅ Build: `npx next build` completes successfully
- ✅ Lint: 0 errors (4 pre-existing warnings in settings-pages.tsx)
- ✅ New API route visible in build output: `/api/messages`
- ✅ Dev server: running without errors
- ✅ No Prisma schema changes needed

## Flow Diagram

```
Desk Message Persistence Flow (after changes):

1. Doctor types message → handleSendMessage()
   → Add to local state (immediate UI update)
   → Fire-and-forget: POST /api/messages { conversationId, clinicId, direction: 'inbound', content, senderType: 'doctor', channel }
     → Creates Message record in DB
     → Updates conversation.lastMessageAt
     → Infers currentAgent from content keywords (if not set)

2. Call orchestrator → POST /api/orchestrator { message, clinicId, conversationId, conversationHistory }
   → Generate AI response
   → Server-side: update conversation.lastMessageAt and currentAgent (no message creation — Desk handles that)
   → Return AI response to client

3. Client receives AI response
   → Add to local state (immediate UI update)
   → Fire-and-forget: POST /api/messages { conversationId, clinicId, direction: 'outbound', content, senderType: 'agent', agentName, aiGenerated: true, channel }
     → Creates Message record in DB
     → Updates conversation.lastMessageAt

Direct API Call Flow (no Desk component):

1. POST /api/orchestrator { message, patientId, clinicId }
   → Generate AI response
   → Server-side: look up or create conversation
   → Server-side: create inbound + outbound Message records
   → Server-side: update conversation.lastMessageAt and currentAgent
   → Return AI response
```
