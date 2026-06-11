import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 503 })

  try {
    const correctClinicId = 'cmq1g50tw0000ib04slhgdhip'

    // Find conversations for the correct clinic
    const conversations = await db.conversation.findMany({
      where: { clinicId: correctClinicId },
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
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return NextResponse.json({
      conversations,
      totalMessages: conversations.reduce((sum, c) => sum + c.messages.length, 0),
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
