import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/clinic?slug=xxx
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')

    let clinic

    if (slug) {
      clinic = await db.clinic.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              doctors: { where: { isActive: true } },
              patients: true,
            },
          },
        },
      })
    } else {
      // No slug provided — return the first clinic (demo mode)
      clinic = await db.clinic.findFirst({
        include: {
          _count: {
            select: {
              doctors: { where: { isActive: true } },
              patients: true,
            },
          },
        },
      })
    }

    if (!clinic) {
      return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        mode: clinic.mode,
        rfc: clinic.rfc,
        regimenFiscal: clinic.regimenFiscal,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        country: clinic.country,
        plan: clinic.plan,
        maxDoctors: clinic.maxDoctors,
        primaryColor: clinic.primaryColor,
        personaName: clinic.personaName,
        logoUrl: clinic.logoUrl,
        doctorsCount: clinic._count.doctors,
        patientsCount: clinic._count.patients,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Clinic GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/clinic — Update clinic profile
export async function PUT(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, name, rfc, regimenFiscal, email, phone, address, city, state, personaName, primaryColor } = body

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (rfc !== undefined) updateData.rfc = rfc
    if (regimenFiscal !== undefined) updateData.regimenFiscal = regimenFiscal
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (personaName !== undefined) updateData.personaName = personaName
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor

    const clinic = await db.clinic.update({
      where: { id: clinicId },
      data: updateData,
    })

    return NextResponse.json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        mode: clinic.mode,
        rfc: clinic.rfc,
        regimenFiscal: clinic.regimenFiscal,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        country: clinic.country,
        plan: clinic.plan,
        maxDoctors: clinic.maxDoctors,
        primaryColor: clinic.primaryColor,
        personaName: clinic.personaName,
        logoUrl: clinic.logoUrl,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Clinic PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
