-- Sinap OS — Migration: Real Expenses + Inventory (Hub Module)
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- 1. ALTER expenses TABLE — Add new columns
-- ═══════════════════════════════════════════════════════════

-- Add isRecurring column (default false)
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;

-- Add recurrence column (nullable string: "monthly" | "weekly" | "yearly")
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "recurrence" TEXT;

-- Add vendor column (nullable string)
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "vendor" TEXT;

-- Add notes column (nullable string)
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- ═══════════════════════════════════════════════════════════
-- 2. CREATE inventory_items TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "minQuantity" INTEGER NOT NULL DEFAULT 5,
  "unit" TEXT NOT NULL DEFAULT 'pieza',
  "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "supplier" TEXT,
  "expiryDate" TIMESTAMP(3),
  "location" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- Foreign key to clinics
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for inventory_items
CREATE INDEX IF NOT EXISTS "inventory_items_clinicId_category_idx"
  ON "inventory_items"("clinicId", "category");

CREATE INDEX IF NOT EXISTS "inventory_items_clinicId_isActive_idx"
  ON "inventory_items"("clinicId", "isActive");

-- ═══════════════════════════════════════════════════════════
-- 3. Add inventoryItems relation to Clinic (Prisma needs this
--    to be reflected in the DB — no SQL change needed since
--    it's a virtual relation, but we add a comment for docs)
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE "inventory_items" IS 'Sinap Hub — Inventory items for clinics';
COMMENT ON TABLE "expenses" IS 'Sinap Hub — Expense tracking for clinics (updated with recurring, vendor, notes)';
