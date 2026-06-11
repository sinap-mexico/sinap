// ─── Diagnostic endpoint to test AI with clinic context ────
// This endpoint tests the full AI flow with real clinic data.
// Remove after debugging is complete.

import { NextRequest, NextResponse } from 'next/server'
import { generateContextualResponse, loadClinicContext, generateEmergencyResponse } from '@/lib/ai-orchestrator'

export async function POST(req: NextRequest) {
  try {
    const { message, clinicId } = await req.json()

    if (!message || !clinicId) {
      return NextResponse.json({ error: 'message and clinicId required' }, { status: 400 })
    }

    // 1. Load clinic context
    const context = await loadClinicContext(clinicId)

    // 2. Generate AI response (without a real conversation ID — just test)
    const aiResult = await generateContextualResponse(message, clinicId, 'test-no-conversation')

    return NextResponse.json({
      clinicContext: context ? {
        clinicName: context.clinicName,
        personaName: context.personaName,
        phone: context.phone,
        address: context.address,
        servicesCount: context.services.length,
        services: context.services.map(s => ({ name: s.name, price: s.price, duration: s.duration })),
        doctorsCount: context.doctors.length,
        doctors: context.doctors.map(d => ({ name: d.name, specialty: d.specialty, schedule: `${d.workDays} ${d.workStart}-${d.workEnd}` })),
      } : null,
      aiResponse: aiResult?.text || null,
      aiAgent: aiResult?.agent || null,
      aiAgentLabel: aiResult?.agentLabel || null,
      emergencyResponse: !aiResult?.text ? generateEmergencyResponse(message, context?.clinicName) : null,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clinicId = searchParams.get('clinicId')

  if (!clinicId) {
    return NextResponse.json({ error: 'clinicId query param required' }, { status: 400 })
  }

  const context = await loadClinicContext(clinicId)

  return NextResponse.json({
    clinicContext: context ? {
      clinicName: context.clinicName,
      personaName: context.personaName,
      phone: context.phone,
      address: context.address,
      city: context.city,
      state: context.state,
      servicesCount: context.services.length,
      services: context.services,
      doctorsCount: context.doctors.length,
      doctors: context.doctors,
    } : null,
  })
}
