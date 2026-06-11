import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createZAI } from '@/lib/zai'
import { getClinicMetaConnection, MetaClient } from '@/lib/meta-client'

// GET /api/debug/test-auto-reply?clinicId=xxx — Test the auto-reply flow step by step
export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get('clinicId') || 'cmq1g50tw0000ib04slhgdhip'
  const results: Record<string, unknown> = {}

  // Step 1: Check feature flag
  try {
    const flag = await db.featureFlag.findFirst({
      where: { clinicId, module: 'desk', feature: 'auto-reply' },
      select: { state: true, id: true },
    })
    results.featureFlag = flag
    results.autoReplyEnabled = flag?.state === 'on'
  } catch (e) {
    results.featureFlagError = String(e)
  }

  // Step 2: Test AI generation
  try {
    const zai = await createZAI()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Eres el asistente de Sinap Desk. Responde brevemente en español.' },
        { role: 'user', content: 'Hola' },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })
    results.aiResponse = completion.choices[0]?.message?.content || 'NO CONTENT'
  } catch (e) {
    results.aiError = String(e)
  }

  // Step 3: Check Meta connection
  try {
    const channelConfig = await getClinicMetaConnection(clinicId, 'whatsapp')
    results.metaConnection = channelConfig ? {
      hasToken: !!channelConfig.accessToken,
      tokenLength: channelConfig.accessToken?.length || 0,
      businessId: channelConfig.businessId,
      phoneNumberId: channelConfig.phoneNumberId,
    } : null
  } catch (e) {
    results.metaConnectionError = String(e)
  }

  // Step 4: Try sending a test message
  try {
    const channelConfig = await getClinicMetaConnection(clinicId, 'whatsapp')
    if (channelConfig) {
      const metaClient = MetaClient.createForChannel('whatsapp', channelConfig)
      const testPhone = '5216624618691'
      const normalizedPhone = testPhone.replace(/^521/, '52')
      results.sendAttempt = { to: normalizedPhone, originalPhone: testPhone }
      const sendResult = await metaClient.sendTextMessage(normalizedPhone, '[Sinap Test] Verificando auto-respuesta')
      results.sendResult = sendResult
    }
  } catch (e) {
    results.sendError = String(e)
  }

  // Step 5: Check latest conversation messages
  try {
    const conversations = await db.conversation.findMany({
      where: { clinicId, channel: 'whatsapp' },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 3, select: { direction: true, senderType: true, content: true, aiGenerated: true, wamid: true, createdAt: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 1,
    })
    results.latestMessages = conversations[0]?.messages || []
  } catch (e) {
    results.latestMessagesError = String(e)
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
