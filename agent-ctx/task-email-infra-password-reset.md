# Task: Email Infrastructure + Password Reset Flow

## Summary
Built complete email infrastructure and password reset flow for the Sinap SaaS platform.

## Files Created
1. `/src/lib/email.ts` — Email utility with Resend (sendEmail, sendPasswordResetEmail, sendWelcomeEmail)
2. `/src/app/api/auth/forgot-password/route.ts` — POST endpoint for forgot password
3. `/src/app/api/auth/reset-password/route.ts` — POST endpoint for resetting password
4. `/src/app/api/auth/verify-reset-token/route.ts` — GET endpoint for verifying reset token
5. `/src/app/reset-password/page.tsx` — Reset password page with token verification

## Files Modified
1. `/src/components/sinap/login-screen.tsx` — Wired up "Olvidé mi contraseña" button with dialog, added resetSuccess toast
2. `/src/app/login/page.tsx` — Added resetSuccess prop from URL params
3. `/src/middleware.ts` — Added /reset-password to public routes

## Dependencies Added
- `resend@^6.12.4` — Email sending via Resend API

## Security Considerations
- Forgot password API always returns success (doesn't reveal if email exists)
- Tokens are crypto.randomBytes(32).toString('hex')
- Tokens expire after 1 hour
- Used tokens are deleted after password reset
- Previous tokens are deleted before creating new ones
- Passwords hashed with bcrypt (12 salt rounds)

## Design
- Reset password page matches login screen design (dark left panel, white right panel)
- Forgot password dialog uses shadcn/ui Dialog component
- Email templates branded with Sinap colors (#1D9E75 green, #534AB7 purple)
- All UI text in Spanish
- Framer Motion animations throughout
