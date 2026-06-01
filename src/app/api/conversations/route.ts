import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/conversations?clinicId=xxx&status=xxx&channel=xxx
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    const where: Record<string, unknown> = { clinicId }
    if (status) {
      where.status = status
    }
    if (channel) {
      where.channel = channel
    }

    const conversations = await db.conversation.findMany({
      where,
      include: {
        patient: { select: { fullName: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            direction: true,
            channel: true,
            senderType: true,
            content: true,
            agentName: true,
            aiGenerated: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return NextResponse.json({ conversations })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Conversations GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
