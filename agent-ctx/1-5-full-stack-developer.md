---
Task ID: 1-5
Agent: full-stack-developer
Task: Connect Sinap platform to real Supabase database

Work Log:
- Added clinicId and clinicSlug fields to Zustand store with setters and persistence
- Created /api/clinic/route.ts — GET endpoint that resolves clinic by slug, returns clinic data with doctors/patients counts
- Created /api/services/route.ts — GET and POST endpoints for services CRUD
- Created /api/dashboard/kpi/route.ts — GET endpoint returning aggregated KPIs (citasHoy, conversacionesActivas, facturasMes, totalFacturado, pacientesNuevos, ocupacion, weeklyAppointments)
- Rewrote agenda-calendar.tsx to fetch doctors, appointments, patients, and services from real API endpoints
- Implemented date-based appointment fetching that refreshes when date or doctor filter changes
- Added week view with per-day API calls for the entire week range
- Implemented appointment creation via POST /api/appointments with proper field mapping
- Implemented appointment confirmation via PATCH /api/appointments with status update
- Implemented smart cancellation UI with cancel reason dialog
- Cancelled appointments appear faded/struck-through in day view with re-booking "+" button
- Cancelled appointments show "Cancelada" badge, cancel reason, and "Agendar en este horario" button in detail view
- Extended AgendaAppointment type with doctorId, doctorName, doctorColor, cancelReason, serviceId, date, endTime
- Added loading skeletons and spinner states for all data fetches
- Doctor dropdown now populates from real DB with color indicators
- Services dropdown uses API-fetched services with ID-based selection
- Connected os-overview.tsx to /api/dashboard/kpi endpoint with graceful fallback to mock data
- KPI cards show real data when available, loading dashes while fetching
- Weekly appointments chart uses real data from KPI endpoint

Stage Summary:
- All 3 new API endpoints created: /api/clinic, /api/services, /api/dashboard/kpi
- Zustand store extended with clinicId/clinicSlug for multi-tenant support
- Agenda calendar fully connected to real database (doctors, appointments, patients, services)
- Smart cancellation flow complete: reason dialog, visual feedback, re-booking on cancelled slots
- OS Overview dashboard connected to real KPI data with fallback to mock data
- All existing UI/UX preserved — only data layer changed
- Clinic resolution flow: on mount, if clinicId is empty, fetches from /api/clinic using slug
