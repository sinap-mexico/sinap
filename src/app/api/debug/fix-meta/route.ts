import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encryptToken } from '@/lib/meta/token-vault'

// Fix: Move MetaConnection from wrong clinic to the correct one
export async function POST() {
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 503 })

  try {
    const correctClinicId = 'cmq1g50tw0000ib04slhgdhip' // sinapmexico@gmail.com → CENPOD CENTRO PODOLOGICO
    const wrongClinicId = 'cmpx2u7sf0000jo046unwxe51' // Where the connection was mistakenly saved
    const envToken = process.env.META_WHATSAPP_ACCESS_TOKEN
    const envWabaId = process.env.META_WHATSAPP_WABA_ID
    const envPhoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID

    if (!envToken || !envWabaId || !envPhoneNumberId) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const encryptedToken = encryptToken(envToken)

    // 1. Delete the wrong MetaConnection
    await db.metaConnection.deleteMany({
      where: { clinicId: wrongClinicId, channel: 'whatsapp' }
    })

    // 2. Create MetaConnection on the CORRECT clinic
    await db.metaConnection.upsert({
      where: { clinicId_channel: { clinicId: correctClinicId, channel: 'whatsapp' } },
      create: {
        clinicId: correctClinicId,
        channel: 'whatsapp',
        businessId: envWabaId,
        phoneNumberId: envPhoneNumberId,
        accessToken: encryptedToken,
        status: 'active',
        businessName: 'CENPOD CENTRO PODOLOGICO',
      },
      update: {
        businessId: envWabaId,
        phoneNumberId: envPhoneNumberId,
        accessToken: encryptedToken,
        status: 'active',
        businessName: 'CENPOD CENTRO PODOLOGICO',
      },
    })

    // 3. Update legacy Clinic fields
    await db.clinic.update({
      where: { id: correctClinicId },
      data: {
        wabaId: envWabaId,
        phoneNumberId: envPhoneNumberId,
        metaAccessToken: encryptedToken,
      },
    })

    // 4. Move any existing conversations from the wrong clinic to the correct one
    const movedConvs = await db.conversation.updateMany({
      where: { clinicId: wrongClinicId, channel: 'whatsapp' },
      data: { clinicId: correctClinicId },
    })

    // 5. Also move messages
    const movedMsgs = await db.message.updateMany({
      where: { clinicId: wrongClinicId, channel: 'whatsapp' },
      data: { clinicId: correctClinicId },
    })

    // 6. Also move patients created from WhatsApp
    const movedPatients = await db.patient.updateMany({
      where: { clinicId: wrongClinicId, source: 'whatsapp' },
      data: { clinicId: correctClinicId },
    })

    return NextResponse.json({
      success: true,
      movedConnections: 1,
      movedConversations: movedConvs.count,
      movedMessages: movedMsgs.count,
      movedPatients: movedPatients.count,
      correctClinicId,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
