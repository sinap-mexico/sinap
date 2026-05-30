---
Task ID: 1
Agent: main
Task: Prepare Sinap for Vercel deployment — make app resilient without database

Work Log:
- Modified auth.ts: removed PrismaAdapter (not needed with JWT strategy), added lazy DB import with error handling
- Modified db.ts: gracefully returns null when DATABASE_URL is missing (Vercel serverless has no SQLite)
- Fixed login-screen.tsx: changed router.push to window.location.href to avoid "Failed to fetch" errors
- Updated next.config.ts: added standalone output, image optimization for Vercel
- Created vercel.json with deployment configuration
- Created .env.example and .env.production templates
- Verified production build compiles successfully
- Attempted Vercel deployment but requires user authentication (not available in this environment)

Stage Summary:
- App is fully prepared for Vercel deployment
- Demo mode works without any database
- Build passes with no errors
- User needs to deploy via Vercel Dashboard (vercel.com/new) or local terminal with `vercel login`
- All auth flows are resilient: no crash when DB is unavailable
