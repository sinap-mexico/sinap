import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMetaToken, META_BASE_URL } from '@/lib/meta-client'

// ─── POST: Save Meta API configuration ─────────────────────
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, wabaId, phoneNumberId, metaAccessToken, igBusinessId, fbPageId } = body

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    if (!wabaId || !phoneNumberId || !metaAccessToken) {
      return NextResponse.json(
        { error: 'wabaId, phoneNumberId y metaAccessToken son requeridos' },
        { status: 400 }
      )
    }

    // Validate the token by making a test call to Meta API
    const validation = await validateMetaToken(metaAccessToken)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Token de acceso invalido. Verifica que sea correcto y no haya expirado.' },
        { status: 400 }
      )
    }

    // Save to Clinic record
    const clinic = await db.clinic.update({
      where: { id: clinicId },
      data: {
        wabaId,
        phoneNumberId,
        metaAccessToken,
        igBusinessId: igBusinessId || null,
        fbPageId: fbPageId || null,
      },
    })

    return NextResponse.json({
      success: true,
      businessName: validation.businessName || clinic.name,
      wabaId: clinic.wabaId,
      phoneNumberId: clinic.phoneNumberId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta connect POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── GET: Check connection status ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        wabaId: true,
        phoneNumberId: true,
        metaAccessToken: true,
        igBusinessId: true,
        fbPageId: true,
        name: true,
      },
    })

    if (!clinic) {
      return NextResponse.json({ error: 'Clinica no encontrada' }, { status: 404 })
    }

    const connected = !!(clinic.wabaId && clinic.phoneNumberId && clinic.metaAccessToken)

    if (!connected) {
      return NextResponse.json({
        connected: false,
      })
    }

    // Test the token with a lightweight API call
    let businessName: string | undefined
    let tokenValid = false

    try {
      const validation = await validateMetaToken(clinic.metaAccessToken)
      tokenValid = validation.valid
      businessName = validation.businessName
    } catch {
      tokenValid = false
    }

    return NextResponse.json({
      connected: tokenValid,
      wabaId: clinic.wabaId,
      phoneNumberId: clinic.phoneNumberId,
      businessName: businessName || clinic.name,
      igBusinessId: clinic.igBusinessId,
      fbPageId: clinic.fbPageId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta connect GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE: Disconnect ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    await db.clinic.update({
      where: { id: clinicId },
      data: {
        wabaId: null,
        phoneNumberId: null,
        metaAccessToken: null,
        igBusinessId: null,
        fbPageId: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta connect DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
