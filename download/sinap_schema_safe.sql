-- Sinap Schema — SAFE VERSION (adds columns if missing)
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════
-- 1. CREATE TABLES (IF NOT EXISTS)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "clinicId" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'solo',
    "rfc" TEXT,
    "regimenFiscal" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'MX',
    "wabaId" TEXT,
    "phoneNumberId" TEXT,
    "metaAccessToken" TEXT,
    "igBusinessId" TEXT,
    "fbPageId" TEXT,
    "facturamaUserId" TEXT,
    "facturamaToken" TEXT,
    "facturamaSandbox" BOOLEAN NOT NULL DEFAULT true,
    "defaultIvaRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "monthlyConvLimit" INTEGER NOT NULL DEFAULT 200,
    "maxDoctors" INTEGER NOT NULL DEFAULT 1,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1D9E75',
    "personaName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Doctor" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialty" TEXT,
    "license" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1D9E75',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "workStart" TEXT NOT NULL DEFAULT '09:00',
    "workEnd" TEXT NOT NULL DEFAULT '18:00',
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Staff" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'receptionist',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ivaRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ServiceDoctor" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    CONSTRAINT "ServiceDoctor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Patient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "rfc" TEXT,
    "address" TEXT,
    "source" TEXT,
    "firstContactDate" TIMESTAMP(3),
    "lastVisitDate" TIMESTAMP(3),
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ltv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "segment" TEXT NOT NULL DEFAULT 'new',
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "preferredChannel" TEXT DEFAULT 'whatsapp',
    "preferredTime" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT,
    "medicalHistory" TEXT,
    "notes" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "serviceId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "preConsultCompleted" BOOLEAN NOT NULL DEFAULT false,
    "preConsultData" TEXT,
    "notes" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SoapNote" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "doctorId" TEXT NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "doctorApproved" BOOLEAN NOT NULL DEFAULT false,
    "doctorSignedAt" TIMESTAMP(3),
    "vitals" TEXT,
    "diagnosis" TEXT,
    "prescriptions" TEXT,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SoapNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "cfdiUuid" TEXT,
    "cfdiVersion" TEXT NOT NULL DEFAULT '4.0',
    "serie" TEXT,
    "folio" TEXT,
    "fechaTimbrado" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ivaRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "formaPago" TEXT NOT NULL DEFAULT '01',
    "metodoPago" TEXT NOT NULL DEFAULT 'PUE',
    "tipoComprobante" TEXT NOT NULL DEFAULT 'I',
    "usoCFDI" TEXT NOT NULL DEFAULT 'G01',
    "concepto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "paidAt" TIMESTAMP(3),
    "facturamaId" TEXT,
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "formaPago" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentAgent" TEXT,
    "routedToHuman" BOOLEAN NOT NULL DEFAULT false,
    "humanAssignee" TEXT,
    "intent" TEXT,
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "mediaUrl" TEXT,
    "agentName" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "wamid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FeatureFlag" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'assist',
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventBus" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourceAgent" TEXT NOT NULL,
    "targetAgent" TEXT,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventBus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FollowUp" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "meta_connections" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "businessId" TEXT,
    "phoneNumberId" TEXT,
    "pageId" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "businessName" TEXT,
    "oauthCode" TEXT,
    "scopes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "meta_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "segment" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clickRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "expenses" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
--    (These silently skip if column already exists)
-- ═══════════════════════════════════════════

-- User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Clinic
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "regimenFiscal" TEXT;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "facturamaUserId" TEXT;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "facturamaToken" TEXT;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "facturamaSandbox" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "defaultIvaRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "trialStart" TIMESTAMP(3);
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "trialEnd" TIMESTAMP(3);
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#1D9E75';
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "personaName" TEXT;

-- Doctor
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "license" TEXT;
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#1D9E75';
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "workDays" TEXT NOT NULL DEFAULT '1,2,3,4,5';
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "workStart" TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "workEnd" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "slotMinutes" INTEGER NOT NULL DEFAULT 30;

-- Staff
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Service
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "ivaRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Patient
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "rfc" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "firstContactDate" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "lastVisitDate" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "totalVisits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "ltv" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "segment" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "sentiment" TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "preferredChannel" TEXT DEFAULT 'whatsapp';
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "preferredTime" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "doNotContact" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "emergencyContactRelation" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "insuranceProvider" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Appointment
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "preConsultCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "preConsultData" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

-- SoapNote
ALTER TABLE "SoapNote" ADD COLUMN IF NOT EXISTS "aiGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SoapNote" ADD COLUMN IF NOT EXISTS "aiSuggested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SoapNote" ADD COLUMN IF NOT EXISTS "doctorApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SoapNote" ADD COLUMN IF NOT EXISTS "doctorSignedAt" TIMESTAMP(3);
ALTER TABLE "SoapNote" ADD COLUMN IF NOT EXISTS "vitals" TEXT;
ALTER TABLE "SoapNote" ADD COLUMN IF NOT EXISTS "diagnosis" TEXT;
ALTER TABLE "SoapNote" ADD COLUMN IF NOT EXISTS "prescriptions" TEXT;
ALTER TABLE "SoapNote" ADD COLUMN IF NOT EXISTS "attachments" TEXT;

-- Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "cfdiVersion" TEXT NOT NULL DEFAULT '4.0';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "fechaTimbrado" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ivaRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "formaPago" TEXT NOT NULL DEFAULT '01';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "metodoPago" TEXT NOT NULL DEFAULT 'PUE';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tipoComprobante" TEXT NOT NULL DEFAULT 'I';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "usoCFDI" TEXT NOT NULL DEFAULT 'G01';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "concepto" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "facturamaId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "xmlUrl" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

-- Account
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "id_token" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "session_state" TEXT;

-- ═══════════════════════════════════════════
-- 3. INDEXES (IF NOT EXISTS)
-- ═══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_clinicId_idx" ON "User"("clinicId");
CREATE UNIQUE INDEX IF NOT EXISTS "Clinic_slug_key" ON "Clinic"("slug");
CREATE INDEX IF NOT EXISTS "Doctor_clinicId_idx" ON "Doctor"("clinicId");
CREATE INDEX IF NOT EXISTS "Staff_clinicId_idx" ON "Staff"("clinicId");
CREATE INDEX IF NOT EXISTS "Service_clinicId_idx" ON "Service"("clinicId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceDoctor_serviceId_doctorId_key" ON "ServiceDoctor"("serviceId", "doctorId");
CREATE INDEX IF NOT EXISTS "Patient_clinicId_idx" ON "Patient"("clinicId");
CREATE INDEX IF NOT EXISTS "Patient_clinicId_phone_idx" ON "Patient"("clinicId", "phone");
CREATE INDEX IF NOT EXISTS "Patient_clinicId_segment_idx" ON "Patient"("clinicId", "segment");
CREATE INDEX IF NOT EXISTS "Patient_clinicId_isActive_idx" ON "Patient"("clinicId", "isActive");
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_date_idx" ON "Appointment"("clinicId", "date");
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_status_idx" ON "Appointment"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "Appointment_doctorId_date_idx" ON "Appointment"("doctorId", "date");
CREATE INDEX IF NOT EXISTS "Appointment_patientId_idx" ON "Appointment"("patientId");
CREATE UNIQUE INDEX IF NOT EXISTS "SoapNote_appointmentId_key" ON "SoapNote"("appointmentId");
CREATE INDEX IF NOT EXISTS "SoapNote_clinicId_patientId_idx" ON "SoapNote"("clinicId", "patientId");
CREATE INDEX IF NOT EXISTS "SoapNote_clinicId_doctorId_idx" ON "SoapNote"("clinicId", "doctorId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_appointmentId_key" ON "Invoice"("appointmentId");
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_status_idx" ON "Invoice"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_createdAt_idx" ON "Invoice"("clinicId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_patientId_idx" ON "Invoice"("patientId");
CREATE INDEX IF NOT EXISTS "payments_invoiceId_idx" ON "payments"("invoiceId");
CREATE INDEX IF NOT EXISTS "Conversation_clinicId_status_idx" ON "Conversation"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "Conversation_clinicId_channel_idx" ON "Conversation"("clinicId", "channel");
CREATE INDEX IF NOT EXISTS "Conversation_clinicId_lastMessageAt_idx" ON "Conversation"("clinicId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_clinicId_createdAt_idx" ON "Message"("clinicId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeatureFlag_clinicId_module_idx" ON "FeatureFlag"("clinicId", "module");
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_clinicId_module_feature_key" ON "FeatureFlag"("clinicId", "module", "feature");
CREATE INDEX IF NOT EXISTS "EventBus_clinicId_eventType_idx" ON "EventBus"("clinicId", "eventType");
CREATE INDEX IF NOT EXISTS "EventBus_clinicId_status_idx" ON "EventBus"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "EventBus_createdAt_idx" ON "EventBus"("createdAt");
CREATE INDEX IF NOT EXISTS "FollowUp_clinicId_status_idx" ON "FollowUp"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "FollowUp_clinicId_dueDate_idx" ON "FollowUp"("clinicId", "dueDate");
CREATE INDEX IF NOT EXISTS "FollowUp_patientId_idx" ON "FollowUp"("patientId");
CREATE INDEX IF NOT EXISTS "meta_connections_clinicId_idx" ON "meta_connections"("clinicId");
CREATE INDEX IF NOT EXISTS "meta_connections_status_idx" ON "meta_connections"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "meta_connections_clinicId_channel_key" ON "meta_connections"("clinicId", "channel");
CREATE INDEX IF NOT EXISTS "campaigns_clinicId_status_idx" ON "campaigns"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "expenses_clinicId_date_idx" ON "expenses"("clinicId", "date");
CREATE INDEX IF NOT EXISTS "expenses_clinicId_category_idx" ON "expenses"("clinicId", "category");

-- ═══════════════════════════════════════════
-- 4. FOREIGN KEYS (safe — skips if exists)
-- ═══════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Account_userId_fkey') THEN
        ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Session_userId_fkey') THEN
        ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_clinicId_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Doctor_clinicId_fkey') THEN
        ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Staff_clinicId_fkey') THEN
        ALTER TABLE "Staff" ADD CONSTRAINT "Staff_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Service_clinicId_fkey') THEN
        ALTER TABLE "Service" ADD CONSTRAINT "Service_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceDoctor_serviceId_fkey') THEN
        ALTER TABLE "ServiceDoctor" ADD CONSTRAINT "ServiceDoctor_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceDoctor_doctorId_fkey') THEN
        ALTER TABLE "ServiceDoctor" ADD CONSTRAINT "ServiceDoctor_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Patient_clinicId_fkey') THEN
        ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Appointment_clinicId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Appointment_patientId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Appointment_doctorId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Appointment_serviceId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SoapNote_clinicId_fkey') THEN
        ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SoapNote_patientId_fkey') THEN
        ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SoapNote_appointmentId_fkey') THEN
        ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SoapNote_doctorId_fkey') THEN
        ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invoice_clinicId_fkey') THEN
        ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invoice_patientId_fkey') THEN
        ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invoice_appointmentId_fkey') THEN
        ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_invoiceId_fkey') THEN
        ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Conversation_clinicId_fkey') THEN
        ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Conversation_patientId_fkey') THEN
        ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Message_clinicId_fkey') THEN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Message_conversationId_fkey') THEN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FeatureFlag_clinicId_fkey') THEN
        ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EventBus_clinicId_fkey') THEN
        ALTER TABLE "EventBus" ADD CONSTRAINT "EventBus_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FollowUp_clinicId_fkey') THEN
        ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FollowUp_patientId_fkey') THEN
        ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'meta_connections_clinicId_fkey') THEN
        ALTER TABLE "meta_connections" ADD CONSTRAINT "meta_connections_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaigns_clinicId_fkey') THEN
        ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'expenses_clinicId_fkey') THEN
        ALTER TABLE "expenses" ADD CONSTRAINT "expenses_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
