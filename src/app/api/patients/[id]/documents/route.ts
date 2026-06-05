import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/patients/[id]/documents — List all documents for a patient
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    if (!db) {
      // Return empty array in demo mode
      return NextResponse.json({ documents: [] })
    }

    try {
      const where: Record<string, unknown> = { patientId }
      if (category && category !== 'all') where.category = category

      const documents = await db.patientDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ documents })
    } catch (dbError) {
      console.warn('Documents GET DB error:', dbError instanceof Error ? dbError.message : dbError)
      return NextResponse.json({ documents: [] })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Documents GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/patients/[id]/documents — Create a new document (file upload or link)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params

    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    // Check if this is a multipart form (file upload) or JSON (link)
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // ─── FILE UPLOAD ────────────────────────────
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const name = formData.get('name') as string || file?.name || 'Documento'
      const category = formData.get('category') as string || 'study'
      const description = formData.get('description') as string || null
      const date = formData.get('date') as string || null
      const clinicId = formData.get('clinicId') as string

      if (!file) {
        return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
      }

      if (!clinicId) {
        return NextResponse.json({ error: 'Se requiere clinicId' }, { status: 400 })
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // For now, store as base64 data URL (in production, upload to Supabase Storage)
      // We'll generate a data URL that can be opened in the browser
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'application/octet-stream'
      const dataUrl = `data:${mimeType};base64,${base64}`

      // Check size limit (10MB for data URLs, but we should use storage in production)
      if (buffer.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'El archivo excede el límite de 5MB. Para archivos más grandes, usa un enlace.' },
          { status: 400 }
        )
      }

      try {
        const document = await db.patientDocument.create({
          data: {
            clinicId,
            patientId,
            name,
            type: 'file',
            category,
            fileUrl: dataUrl,
            fileName: file.name,
            fileType: mimeType,
            fileSize: buffer.length,
            description,
            date: date ? new Date(date) : null,
          },
        })

        return NextResponse.json({ document }, { status: 201 })
      } catch (dbError) {
        console.error('Document POST (file) DB error:', dbError instanceof Error ? dbError.message : dbError)
        return NextResponse.json({ error: 'Error al guardar documento' }, { status: 500 })
      }

    } else {
      // ─── LINK / JSON ────────────────────────────
      const body = await req.json()
      const { clinicId, name, linkUrl, category, description, date } = body

      if (!clinicId) {
        return NextResponse.json({ error: 'Se requiere clinicId' }, { status: 400 })
      }

      if (!name || !linkUrl) {
        return NextResponse.json({ error: 'Se requiere nombre y URL del enlace' }, { status: 400 })
      }

      try {
        const document = await db.patientDocument.create({
          data: {
            clinicId,
            patientId,
            name,
            type: 'link',
            category: category || 'study',
            linkUrl,
            description: description || null,
            date: date ? new Date(date) : null,
          },
        })

        return NextResponse.json({ document }, { status: 201 })
      } catch (dbError) {
        console.error('Document POST (link) DB error:', dbError instanceof Error ? dbError.message : dbError)
        return NextResponse.json({ error: 'Error al guardar enlace' }, { status: 500 })
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Document POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/patients/[id]/documents — Delete a document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params
    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Se requiere documentId' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    try {
      // Verify the document belongs to this patient
      const doc = await db.patientDocument.findFirst({
        where: { id: documentId, patientId },
      })

      if (!doc) {
        return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
      }

      await db.patientDocument.delete({
        where: { id: documentId },
      })

      return NextResponse.json({ success: true })
    } catch (dbError) {
      console.error('Document DELETE DB error:', dbError instanceof Error ? dbError.message : dbError)
      return NextResponse.json({ error: 'Error al eliminar documento' }, { status: 500 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Document DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
