-- Migration: Add PatientDocument model
-- Run this SQL in Supabase SQL Editor or via prisma db push

CREATE TABLE IF NOT EXISTS "patient_documents" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'file',
    "category" TEXT NOT NULL DEFAULT 'study',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "linkUrl" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "patient_documents"
    ADD CONSTRAINT "patient_documents_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patient_documents"
    ADD CONSTRAINT "patient_documents_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "patient_documents_clinicId_patientId_idx" ON "patient_documents"("clinicId", "patientId");
CREATE INDEX "patient_documents_clinicId_category_idx" ON "patient_documents"("clinicId", "category");
