-- ============================================================
-- Migration: Upgrade existing clinic to Enterprise plan
-- This gives the free trial account all premium features:
--   - Unlimited doctors
--   - Unlimited conversations
--   - 7-day trial period
--   - All modules unlocked
-- ============================================================

-- Update ALL existing clinics to enterprise plan
UPDATE "Clinic"
SET
  plan = 'enterprise',
  "maxDoctors" = 999,
  "monthlyConvLimit" = 999999,
  "isActive" = true,
  "trialEnd" = NOW() + INTERVAL '7 days',
  "trialStart" = COALESCE("trialStart", NOW())
WHERE plan = 'starter';
