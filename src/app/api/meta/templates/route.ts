import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { META_BASE_URL } from '@/lib/meta-client'

const REQUEST_TIMEOUT_MS = 15_000

// ─── GET: List WhatsApp templates ──────────────────────────
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
      select: { wabaId: true, metaAccessToken: true },
    })

    if (!clinic?.wabaId || !clinic?.metaAccessToken) {
      return NextResponse.json({ error: 'Meta API no conectada' }, { status: 400 })
    }

    // Fetch templates from Meta API
    const url = `${META_BASE_URL}/${clinic.wabaId}/message_templates?access_token=${encodeURIComponent(clinic.metaAccessToken)}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, { signal: controller.signal })

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'Unknown error')
        return NextResponse.json(
          { error: `Error al obtener plantillas de Meta: ${errorBody}` },
          { status: res.status }
        )
      }

      const data = await res.json()

      // Map Meta template format to our format
      const templates = (data.data || []).map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        language: (t.language as string) || '',
        category: t.category,
        components: t.components,
      }))

      return NextResponse.json({ templates })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta templates GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST: Create a template ───────────────────────────────
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, name, category, language, components } = body

    if (!clinicId || !name || !category || !language) {
      return NextResponse.json(
        { error: 'clinicId, name, category y language son requeridos' },
        { status: 400 }
      )
    }

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { wabaId: true, metaAccessToken: true },
    })

    if (!clinic?.wabaId || !clinic?.metaAccessToken) {
      return NextResponse.json({ error: 'Meta API no conectada' }, { status: 400 })
    }

    // Create template via Meta API
    const url = `${META_BASE_URL}/${clinic.wabaId}/message_templates`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clinic.metaAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          category,
          language,
          components: components || [],
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'Unknown error')
        return NextResponse.json(
          { error: `Error al crear plantilla en Meta: ${errorBody}` },
          { status: res.status }
        )
      }

      const data = await res.json()

      return NextResponse.json({
        template: {
          id: data.id,
          name: data.name,
          status: data.status,
          category: data.category,
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta templates POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
