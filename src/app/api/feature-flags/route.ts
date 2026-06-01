import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/feature-flags?clinicId=xxx — Get all feature flags for a clinic
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    const flags = await db.featureFlag.findMany({
      where: { clinicId },
      orderBy: [{ module: 'asc' }, { feature: 'asc' }],
    })

    return NextResponse.json({ flags })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('FeatureFlags GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/feature-flags — Upsert a feature flag
export async function PUT(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, module, feature, state, config } = body

    if (!clinicId || !module || !feature) {
      return NextResponse.json({ error: 'clinicId, module y feature son requeridos' }, { status: 400 })
    }

    // Use upsert since there's a unique constraint on (clinicId, module, feature)
    const flag = await db.featureFlag.upsert({
      where: {
        clinicId_module_feature: { clinicId, module, feature },
      },
      create: {
        clinicId,
        module,
        feature,
        state: state || 'assist',
        config: config || null,
      },
      update: {
        ...(state !== undefined && { state }),
        ...(config !== undefined && { config }),
      },
    })

    return NextResponse.json({ flag })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('FeatureFlags PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/feature-flags — Bulk sync all flags for a clinic
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    const database = db // non-null alias for closure

    const body = await req.json()
    const { clinicId, flags } = body as {
      clinicId: string
      flags: Array<{ module: string; feature: string; state: string; config?: string }>
    }

    if (!clinicId || !flags || !Array.isArray(flags)) {
      return NextResponse.json({ error: 'clinicId y flags[] son requeridos' }, { status: 400 })
    }

    const results = await Promise.all(
      flags.map((f) =>
        database.featureFlag.upsert({
          where: {
            clinicId_module_feature: { clinicId, module: f.module, feature: f.feature },
          },
          create: {
            clinicId,
            module: f.module,
            feature: f.feature,
            state: f.state || 'assist',
            config: f.config || null,
          },
          update: {
            state: f.state,
            ...(f.config !== undefined && { config: f.config }),
          },
        })
      )
    )

    return NextResponse.json({ flags: results })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('FeatureFlags POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
