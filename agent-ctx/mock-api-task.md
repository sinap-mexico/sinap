# Task: Create Mock API Data Module

## Status: ✅ Completed

## File Created
- `/home/z/my-project/src/lib/mock-api.ts` (1,604 lines)

## Summary
Created a comprehensive mock data module that provides realistic Mexican dermatology clinic data matching exactly the shape returned by Prisma queries, so API routes can fall back seamlessly when the database is unavailable.

## Exported Functions
1. `getMockConversations(clinicId)` — 8 conversations with Spanish messages, sorted by lastMessageAt desc
2. `getMockClinic(clinicId)` — Full clinic object with counts, matching /api/clinic shape
3. `getMockPatients(clinicId)` — 8 patients from seed data, sorted by createdAt desc
4. `getMockAppointments(clinicId)` — 12 appointments with included patient/doctor/service, sorted by date+startTime
5. `getMockInvoices(clinicId)` — 9 invoices with included patient (fullName, rfc), sorted by createdAt desc
6. `getMockDoctors(clinicId)` — 2 doctors, sorted by name
7. `getMockServices(clinicId)` — 6 active services, sorted by name
8. `getMockKPIs(clinicId)` — Computed KPI data matching /api/dashboard/kpi shape
9. `getMockFeatureFlags(clinicId)` — 12 feature flags, sorted by module+feature
10. `DEMO_CLINIC_ID` — Constant = `'demo-clinic-mock'`

## Data Consistency
- All IDs use `mock-` prefix (e.g., `mock-patient-1`, `mock-doctor-1`)
- Patient IDs are consistent across conversations, appointments, and invoices
- Doctor IDs are consistent across appointments
- Service IDs are consistent across appointments
- All dates are relative to "now" using helper functions
- Messages are in natural Mexican Spanish about dermatology scenarios

## Validation
- TypeScript compilation: ✅ No errors
- ESLint: ✅ No errors
- Dev server: ✅ Running normally
