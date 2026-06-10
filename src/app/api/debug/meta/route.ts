import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 503 })

  try {
    // Find user by email
    const users = await db.user.findMany({
      where: { email: { contains: 'sinap' } },
      select: { id: true, email: true, name: true, clinicId: true }
    })

    // Find ALL MetaConnection records
    const connections = await db.metaConnection.findMany()

    // Find clinics with Meta fields
    const clinics = await db.clinic.findMany({
      select: { id: true, name: true, wabaId: true, phoneNumberId: true, metaAccessToken: true }
    })

    // Find recent conversations
    const recentConvs = await db.conversation.findMany({
      take: 5,
      orderBy: { lastMessageAt: 'desc' },
      select: { id: true, clinicId: true, channel: true, status: true, lastMessageAt: true }
    })

    return NextResponse.json({
      users,
      connections,
      clinics,
      recentConversations: recentConvs,
      envVars: {
        META_APP_ID: !!process.env.META_APP_ID,
        META_APP_SECRET: !!process.env.META_APP_SECRET,
        META_WHATSAPP_WABA_ID: process.env.META_WHATSAPP_WABA_ID || 'not set',
        META_WHATSAPP_PHONE_NUMBER_ID: process.env.META_WHATSAPP_PHONE_NUMBER_ID || 'not set',
        META_WHATSAPP_ACCESS_TOKEN: !!process.env.META_WHATSAPP_ACCESS_TOKEN,
        META_TOKEN_ENCRYPTION_KEY: !!process.env.META_TOKEN_ENCRYPTION_KEY,
      }
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
