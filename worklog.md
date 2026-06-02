---
Task ID: 1
Agent: main
Task: Configure DATABASE_URL and seed data for Sinap SaaS platform

Work Log:
- Updated .env with correct Supabase connection strings (pooler + pgbouncer=true for transactions mode)
- Ran prisma db push - schema already in sync with Supabase
- Verified seed data exists in DB: 1 clinic, 3 doctors, 8 patients, 12 appointments, 9 invoices, 6 conversations, 20 messages, 2 SOAP notes, 18 feature flags, 5 events
- Added "postinstall": "prisma generate" to package.json for Vercel builds
- Fixed isMock: true hardcoded in messages API route → isMock: false for real messages
- Committed and pushed to GitHub (f14c4be) for Vercel auto-deploy
- Guided user to set DATABASE_URL and DIRECT_URL in Vercel environment variables
- User confirmed env vars set and redeploy triggered

Stage Summary:
- All seed data verified in Supabase PostgreSQL
- All API routes (conversations, messages, patients, appointments, invoices) already support DB+mock fallback
- Vercel deployment should now connect to DB and serve real data
- Key env vars: DATABASE_URL (pgbouncer pooler), DIRECT_URL (session mode pooler)
- Demo login flow: handleDemoLogin → /api/demo/seed → setClinicId → navigate to dashboard
