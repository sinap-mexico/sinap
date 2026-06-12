-- ============================================================
-- Migration: Add reminder tracking fields to Appointment
-- These fields track whether a 24-hour reminder has been sent
-- for each appointment via WhatsApp.
-- ============================================================

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reminder24hSentAt" TIMESTAMP(3);
