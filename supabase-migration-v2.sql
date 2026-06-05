-- Sinap Migration — New tables for Campaigns, Expenses, Inventory, Notifications
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- This is idempotent: uses CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS

-- ═══════════════════════════════════════════════════════════
-- CAMPAIGNS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS campaigns (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clinicId"       TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'whatsapp',
  "campaignType"   TEXT NOT NULL DEFAULT 'promocion',
  channel          TEXT NOT NULL DEFAULT 'whatsapp',
  status           TEXT NOT NULL DEFAULT 'draft',
  segment          TEXT NOT NULL DEFAULT 'all',
  subject          TEXT,
  content          TEXT NOT NULL,
  "scheduledAt"    TIMESTAMPTZ,
  "sentAt"         TIMESTAMPTZ,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount"      INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "openedCount"    INTEGER NOT NULL DEFAULT 0,
  "respondedCount" INTEGER NOT NULL DEFAULT 0,
  "openRate"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "clickRate"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "responseRate"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_clinic_status ON campaigns("clinicId", status);
CREATE INDEX IF NOT EXISTS idx_campaigns_clinic_type ON campaigns("clinicId", "campaignType");

-- ═══════════════════════════════════════════════════════════
-- EXPENSES TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS expenses (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clinicId"    TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  description   TEXT NOT NULL,
  amount        DOUBLE PRECISION NOT NULL,
  date          TIMESTAMPTZ NOT NULL,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  recurrence    TEXT,
  vendor        TEXT,
  notes         TEXT,
  "receiptUrl"  TEXT,
  "createdBy"   TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_date ON expenses("clinicId", date);
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_category ON expenses("clinicId", category);

-- ═══════════════════════════════════════════════════════════
-- INVENTORY ITEMS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_items (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clinicId"    TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 0,
  "minQuantity" INTEGER NOT NULL DEFAULT 5,
  unit          TEXT NOT NULL DEFAULT 'pieza',
  "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  supplier      TEXT,
  "expiryDate"  TIMESTAMPTZ,
  location      TEXT,
  notes         TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_clinic_category ON inventory_items("clinicId", category);
CREATE INDEX IF NOT EXISTS idx_inventory_clinic_active ON inventory_items("clinicId", "isActive");

-- ═══════════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clinicId"  TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  "userId"    TEXT,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  icon        TEXT,
  "actionUrl" TEXT,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_user_read ON notifications("clinicId", "userId", "isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_created ON notifications("clinicId", "createdAt");

-- ═══════════════════════════════════════════════════════════
-- ADD CLINIC RELATIONS (add reference columns to clinics if needed)
-- ═══════════════════════════════════════════════════════════
-- These are handled by foreign keys in the child tables above,
-- no additional columns needed on the clinics table.
