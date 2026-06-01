import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// AI mode feature flag presets
const AI_MODE_FLAGS: Record<string, Array<{ module: string; feature: string; state: string }>> = {
  full: [
    { module: 'desk', feature: 'auto-reply', state: 'on' },
    { module: 'desk', feature: 'appointment', state: 'on' },
    { module: 'flow', feature: 'soap', state: 'on' },
    { module: 'flow', feature: 'preconsulta', state: 'on' },
    { module: 'bill', feature: 'auto-cfdi', state: 'on' },
    { module: 'bill', feature: 'reminders', state: 'on' },
    { module: 'grow', feature: 'reactivation', state: 'on' },
    { module: 'grow', feature: 'segments', state: 'on' },
    { module: 'sight', feature: 'alerts', state: 'on' },
    { module: 'sight', feature: 'reports', state: 'on' },
    { module: 'hub', feature: 'scheduling', state: 'on' },
    { module: 'hub', feature: 'inventory', state: 'on' },
  ],
  assist: [
    { module: 'desk', feature: 'auto-reply', state: 'assist' },
    { module: 'desk', feature: 'appointment', state: 'assist' },
    { module: 'flow', feature: 'soap', state: 'assist' },
    { module: 'flow', feature: 'preconsulta', state: 'on' },
    { module: 'bill', feature: 'auto-cfdi', state: 'assist' },
    { module: 'bill', feature: 'reminders', state: 'off' },
    { module: 'grow', feature: 'reactivation', state: 'assist' },
    { module: 'grow', feature: 'segments', state: 'on' },
    { module: 'sight', feature: 'alerts', state: 'on' },
    { module: 'sight', feature: 'reports', state: 'assist' },
    { module: 'hub', feature: 'scheduling', state: 'off' },
    { module: 'hub', feature: 'inventory', state: 'off' },
  ],
  manual: [
    { module: 'desk', feature: 'auto-reply', state: 'off' },
    { module: 'desk', feature: 'appointment', state: 'off' },
    { module: 'flow', feature: 'soap', state: 'off' },
    { module: 'flow', feature: 'preconsulta', state: 'off' },
    { module: 'bill', feature: 'auto-cfdi', state: 'off' },
    { module: 'bill', feature: 'reminders', state: 'off' },
    { module: 'grow', feature: 'reactivation', state: 'off' },
    { module: 'grow', feature: 'segments', state: 'off' },
    { module: 'sight', feature: 'alerts', state: 'off' },
    { module: 'sight', feature: 'reports', state: 'off' },
    { module: 'hub', feature: 'scheduling', state: 'off' },
    { module: 'hub', feature: 'inventory', state: 'off' },
  ],
}

// Default colors for doctor calendar
const DOCTOR_COLORS = ['#1D9E75', '#534AB7', '#E67E22', '#E74C3C', '#3498DB', '#9B59B6']

interface OnboardingBody {
  userId: string
  clinicId?: string
  accountType: 'solo' | 'clinic'
  personalData: {
    name: string
    specialty: string
    license: string
    email: string
    phone: string
  }
  clinicData: {
    name: string
    rfc: string
    address: string
    city: string
    state: string
  }
  schedule: {
    workDays: string
    workStart: string
    workEnd: string
    slotMinutes: number
  }
  services: Array<{
    name: string
    duration: number
    price: number
    category: string
  }>
  aiMode: 'full' | 'assist' | 'manual'
}

// POST /api/onboarding — Complete onboarding in a single transaction
export async function POST(req: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Base de datos no disponible. Intenta el modo demo.' },
        { status: 503 }
      )
    }

    const body: OnboardingBody = await req.json()
    const { userId, clinicId, accountType, personalData, clinicData, schedule, services, aiMode } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }

    if (!personalData?.name) {
      return NextResponse.json({ error: 'El nombre del doctor es requerido' }, { status: 400 })
    }

    if (!aiMode) {
      return NextResponse.json({ error: 'El modo de IA es requerido' }, { status: 400 })
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const result = await db.$transaction(async (tx) => {
      let finalClinicId = clinicId

      // Step 1: Create or update Clinic
      if (clinicId) {
        // Update existing clinic with full data
        const existingClinic = await tx.clinic.findUnique({ where: { id: clinicId } })
        if (!existingClinic) {
          throw new Error('Clinica no encontrada')
        }
        await tx.clinic.update({
          where: { id: clinicId },
          data: {
            name: clinicData.name || existingClinic.name,
            mode: accountType,
            rfc: clinicData.rfc || null,
            address: clinicData.address || null,
            city: clinicData.city || null,
            state: clinicData.state || null,
            phone: personalData.phone || null,
            email: personalData.email || user.email,
          },
        })
      } else {
        // Create new clinic
        const slug = (clinicData.name || personalData.name)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .slice(0, 40) + '-' + Date.now().toString(36)

        const newClinic = await tx.clinic.create({
          data: {
            name: clinicData.name || `Consultorio ${personalData.name}`,
            slug,
            mode: accountType,
            rfc: clinicData.rfc || null,
            address: clinicData.address || null,
            city: clinicData.city || null,
            state: clinicData.state || null,
            phone: personalData.phone || null,
            email: personalData.email || user.email,
          },
        })
        finalClinicId = newClinic.id
      }

      // Step 2: Update User record with clinicId if not set
      if (!user.clinicId) {
        await tx.user.update({
          where: { id: userId },
          data: { clinicId: finalClinicId },
        })
      }

      // Step 3: Create Doctor record
      const doctorColor = DOCTOR_COLORS[Math.floor(Math.random() * DOCTOR_COLORS.length)]
      const doctor = await tx.doctor.create({
        data: {
          clinicId: finalClinicId!,
          name: personalData.name,
          email: personalData.email || null,
          phone: personalData.phone || null,
          specialty: personalData.specialty || null,
          license: personalData.license || null,
          color: doctorColor,
          isActive: true,
          workDays: schedule.workDays || '1,2,3,4,5',
          workStart: schedule.workStart || '09:00',
          workEnd: schedule.workEnd || '18:00',
          slotMinutes: schedule.slotMinutes || 30,
        },
      })

      // Step 4: Create Service records and ServiceDoctor pivots
      const serviceIds: string[] = []
      for (const svc of services) {
        const createdService = await tx.service.create({
          data: {
            clinicId: finalClinicId!,
            name: svc.name,
            duration: svc.duration || 30,
            price: svc.price || 0,
            category: svc.category || null,
            isActive: true,
          },
        })
        serviceIds.push(createdService.id)

        // Create ServiceDoctor pivot
        await tx.serviceDoctor.create({
          data: {
            serviceId: createdService.id,
            doctorId: doctor.id,
          },
        })
      }

      // Step 5: Create FeatureFlag records based on aiMode
      const flagsToCreate = AI_MODE_FLAGS[aiMode] || AI_MODE_FLAGS.assist
      for (const flag of flagsToCreate) {
        await tx.featureFlag.upsert({
          where: {
            clinicId_module_feature: {
              clinicId: finalClinicId!,
              module: flag.module,
              feature: flag.feature,
            },
          },
          create: {
            clinicId: finalClinicId!,
            module: flag.module,
            feature: flag.feature,
            state: flag.state,
          },
          update: {
            state: flag.state,
          },
        })
      }

      // Get clinic slug for response
      const clinic = await tx.clinic.findUnique({
        where: { id: finalClinicId },
        select: { slug: true },
      })

      return {
        clinicId: finalClinicId,
        clinicSlug: clinic?.slug || '',
        doctorId: doctor.id,
        serviceIds,
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Onboarding error:', error)
    const message = error instanceof Error ? error.message : 'Error al guardar onboarding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
