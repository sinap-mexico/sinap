import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMetaToken, META_BASE_URL } from '@/lib/meta-client'
import type { MetaChannel } from '@/lib/meta-client'

// ─── POST: Save Meta API configuration for a specific channel ──
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, channel, businessId, phoneNumberId, pageId, accessToken, igBusinessId, fbPageId, wabaId, metaAccessToken } = body

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Support legacy format (no channel specified) → default to WhatsApp
    const resolvedChannel: MetaChannel = channel || 'whatsapp'

    // Support both new format and legacy format
    let resolvedBusinessId = businessId
    let resolvedPhoneNumberId = phoneNumberId
    let resolvedPageId = pageId
    let resolvedAccessToken = accessToken

    // Legacy: if wabaId/metaAccessToken provided without channel, treat as WhatsApp
    if (!channel && wabaId) {
      resolvedBusinessId = wabaId
      resolvedPhoneNumberId = phoneNumberId
      resolvedPageId = fbPageId
      resolvedAccessToken = metaAccessToken
    }

    if (!resolvedAccessToken) {
      return NextResponse.json(
        { error: 'accessToken es requerido' },
        { status: 400 }
      )
    }

    // Validate required fields per channel
    switch (resolvedChannel) {
      case 'whatsapp':
        if (!resolvedBusinessId || !resolvedPhoneNumberId) {
          return NextResponse.json(
            { error: 'businessId (WABA ID) y phoneNumberId son requeridos para WhatsApp' },
            { status: 400 }
          )
        }
        break
      case 'instagram':
        if (!resolvedBusinessId) {
          return NextResponse.json(
            { error: 'businessId (IG Business ID) es requerido para Instagram' },
            { status: 400 }
          )
        }
        if (!resolvedPageId) {
          return NextResponse.json(
            { error: 'pageId es requerido para Instagram (necesario para enviar mensajes)' },
            { status: 400 }
          )
        }
        break
      case 'messenger':
        if (!resolvedPageId && !resolvedBusinessId) {
          return NextResponse.json(
            { error: 'pageId o businessId es requerido para Messenger' },
            { status: 400 }
          )
        }
        // For messenger, pageId is the businessId
        if (!resolvedPageId) {
          resolvedPageId = resolvedBusinessId
        }
        break
    }

    // Validate the token by making a test call to Meta API
    let resourceToValidate: string | undefined
    switch (resolvedChannel) {
      case 'whatsapp':
        resourceToValidate = resolvedPhoneNumberId
        break
      case 'instagram':
        resourceToValidate = resolvedBusinessId
        break
      case 'messenger':
        resourceToValidate = resolvedPageId || resolvedBusinessId
        break
    }

    const validation = await validateMetaToken(resolvedAccessToken, resourceToValidate)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Token de acceso invalido. Verifica que sea correcto y no haya expirado.' },
        { status: 400 }
      )
    }

    // Create or update MetaConnection record
    const connection = await db.metaConnection.upsert({
      where: {
        clinicId_channel: { clinicId, channel: resolvedChannel },
      },
      create: {
        clinicId,
        channel: resolvedChannel,
        businessId: resolvedBusinessId || null,
        phoneNumberId: resolvedPhoneNumberId || null,
        pageId: resolvedPageId || null,
        accessToken: resolvedAccessToken,
        status: 'active',
        businessName: validation.businessName || null,
      },
      update: {
        businessId: resolvedBusinessId || null,
        phoneNumberId: resolvedPhoneNumberId || null,
        pageId: resolvedPageId || null,
        accessToken: resolvedAccessToken,
        status: 'active',
        businessName: validation.businessName || null,
      },
    })

    // Also update legacy Clinic fields for backward compatibility
    const clinicUpdateData: Record<string, unknown> = {}
    if (resolvedChannel === 'whatsapp') {
      clinicUpdateData.wabaId = resolvedBusinessId
      clinicUpdateData.phoneNumberId = resolvedPhoneNumberId
      clinicUpdateData.metaAccessToken = resolvedAccessToken
    }
    if (resolvedChannel === 'instagram' || (igBusinessId)) {
      clinicUpdateData.igBusinessId = igBusinessId || resolvedBusinessId
    }
    if (resolvedChannel === 'messenger' || fbPageId) {
      clinicUpdateData.fbPageId = fbPageId || resolvedPageId
    }

    if (Object.keys(clinicUpdateData).length > 0) {
      await db.clinic.update({
        where: { id: clinicId },
        data: clinicUpdateData,
      }).catch(() => {
        // Ignore errors updating legacy fields
      })
    }

    return NextResponse.json({
      success: true,
      connection: {
        channel: connection.channel,
        status: connection.status,
        businessName: connection.businessName,
        businessId: connection.businessId,
        phoneNumberId: connection.phoneNumberId,
        pageId: connection.pageId,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta connect POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── GET: Check connection status for all channels ─────────
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Query MetaConnection table
    const connections = await db.metaConnection.findMany({
      where: { clinicId },
      orderBy: { channel: 'asc' },
    })

    // If we have MetaConnection records, use those as source of truth
    if (connections.length > 0) {
      const connectionResults = await Promise.all(
        connections.map(async (conn) => {
          // Validate token for active connections
          let tokenValid = false
          let businessName = conn.businessName

          if (conn.status === 'active') {
            try {
              const resource = conn.channel === 'whatsapp'
                ? conn.phoneNumberId
                : conn.channel === 'instagram'
                ? conn.businessId
                : conn.pageId || conn.businessId
              const validation = await validateMetaToken(conn.accessToken, resource || undefined)
              tokenValid = validation.valid
              if (validation.businessName) {
                businessName = validation.businessName
                // Update cached name
                if (db) {
                  await db.metaConnection.update({
                    where: { id: conn.id },
                    data: { businessName: validation.businessName },
                  }).catch(() => {})
                }
              }
            } catch {
              tokenValid = false
            }
          }

          return {
            channel: conn.channel,
            status: tokenValid ? 'active' : conn.status === 'active' ? 'expired' : conn.status,
            businessName,
            businessId: conn.businessId,
            phoneNumberId: conn.phoneNumberId,
            pageId: conn.pageId,
            connected: tokenValid && conn.status === 'active',
            connectedAt: conn.createdAt,
          }
        })
      )

      return NextResponse.json({
        connections: connectionResults,
        // Backward compat
        connected: connectionResults.some(c => c.connected),
      })
    }

    // Fallback: legacy Clinic table fields
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

    const legacyConnections: Array<{
      channel: string
      status: string
      businessName: string | null
      businessId: string | null
      phoneNumberId: string | null
      pageId: string | null
      connected: boolean
    }> = []

    // WhatsApp from legacy fields
    if (clinic.wabaId && clinic.phoneNumberId && clinic.metaAccessToken) {
      let businessName: string | undefined
      let tokenValid = false

      try {
        const validation = await validateMetaToken(clinic.metaAccessToken, clinic.phoneNumberId)
        tokenValid = validation.valid
        businessName = validation.businessName
      } catch {
        tokenValid = false
      }

      legacyConnections.push({
        channel: 'whatsapp',
        status: tokenValid ? 'active' : 'expired',
        businessName: businessName || clinic.name,
        businessId: clinic.wabaId,
        phoneNumberId: clinic.phoneNumberId,
        pageId: null,
        connected: tokenValid,
      })
    }

    // Instagram from legacy fields
    if (clinic.igBusinessId && clinic.metaAccessToken) {
      legacyConnections.push({
        channel: 'instagram',
        status: 'pending',
        businessName: null,
        businessId: clinic.igBusinessId,
        phoneNumberId: null,
        pageId: clinic.fbPageId,
        connected: false,
      })
    }

    // Messenger from legacy fields
    if (clinic.fbPageId && clinic.metaAccessToken) {
      legacyConnections.push({
        channel: 'messenger',
        status: 'pending',
        businessName: null,
        businessId: null,
        phoneNumberId: null,
        pageId: clinic.fbPageId,
        connected: false,
      })
    }

    return NextResponse.json({
      connections: legacyConnections,
      // Backward compat
      connected: legacyConnections.some(c => c.connected),
      wabaId: clinic.wabaId,
      phoneNumberId: clinic.phoneNumberId,
      businessName: legacyConnections.find(c => c.channel === 'whatsapp')?.businessName || clinic.name,
      igBusinessId: clinic.igBusinessId,
      fbPageId: clinic.fbPageId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta connect GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE: Disconnect a specific channel ──────────────────
export async function DELETE(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const channel = searchParams.get('channel') // "whatsapp" | "instagram" | "messenger"

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    if (channel) {
      // Disconnect specific channel via MetaConnection
      const connection = await db.metaConnection.findUnique({
        where: { clinicId_channel: { clinicId, channel } },
      })

      if (connection) {
        await db.metaConnection.update({
          where: { id: connection.id },
          data: { status: 'disconnected' },
        })
      }

      // Also update legacy Clinic fields
      if (channel === 'whatsapp') {
        await db.clinic.update({
          where: { id: clinicId },
          data: {
            wabaId: null,
            phoneNumberId: null,
            metaAccessToken: null,
          },
        }).catch(() => {})
      }
      if (channel === 'instagram') {
        await db.clinic.update({
          where: { id: clinicId },
          data: { igBusinessId: null },
        }).catch(() => {})
      }
      if (channel === 'messenger') {
        await db.clinic.update({
          where: { id: clinicId },
          data: { fbPageId: null },
        }).catch(() => {})
      }
    } else {
      // Legacy: disconnect all channels
      await db.metaConnection.updateMany({
        where: { clinicId },
        data: { status: 'disconnected' },
      })

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
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta connect DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
