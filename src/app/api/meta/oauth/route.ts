import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { META_BASE_URL, validateMetaToken } from '@/lib/meta-client'

const REQUEST_TIMEOUT_MS = 15_000

// ─── GET: Return OAuth URL for Embedded Signup ──────────────
// This generates the URL that redirects the user to Meta's OAuth consent screen
// for the Embedded Signup flow (Stage 2 — requires Meta Tech Provider registration)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    const appId = process.env.META_APP_ID
    const configId = process.env.META_CONFIG_ID

    if (!appId || !configId) {
      return NextResponse.json({
        error: 'Embedded Signup no configurado. Se requieren las variables de entorno META_APP_ID y META_CONFIG_ID.',
        missingVars: [
          !appId && 'META_APP_ID',
          !configId && 'META_CONFIG_ID',
        ].filter(Boolean),
        setupInstructions: {
          step1: 'Registra tu app en developers.facebook.com',
          step2: 'Configura Embedded Signup para WhatsApp Business',
          step3: 'Establece META_APP_ID y META_CONFIG_ID en las variables de entorno',
          step4: 'Registra tu app como Tech Provider en Meta',
        },
      }, { status: 503 })
    }

    // Build the OAuth URL for Embedded Signup
    const redirectUri = process.env.META_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://sinap-nine.vercel.app'}/api/meta/oauth/callback`

    // Encode state with clinicId and timestamp for security
    const statePayload = JSON.stringify({
      clinicId,
      timestamp: Date.now(),
    })
    const state = Buffer.from(statePayload).toString('base64')

    // Scopes for all channels
    const scope = [
      'whatsapp_business_messaging',
      'whatsapp_business_management',
      'business_management',
      'instagram_manage_messages',
      'pages_messaging',
      'pages_manage_metadata',
    ].join(',')

    const oauthUrl = `https://www.facebook.com/${process.env.META_API_VERSION || 'v21.0'}/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `config_id=${configId}&` +
      `state=${encodeURIComponent(state)}`

    return NextResponse.json({
      url: oauthUrl,
      appId,
      redirectUri,
      scope,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta oauth GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST: Handle OAuth callback (exchange code for token) ──
// This is called after the user completes the Meta OAuth flow
// (Stage 2 — requires META_APP_SECRET to be configured)
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { code, state } = body

    if (!code || !state) {
      return NextResponse.json(
        { error: 'code y state son requeridos' },
        { status: 400 }
      )
    }

    // Decode state to get clinicId
    let clinicId: string
    let stateTimestamp: number
    try {
      const statePayload = JSON.parse(Buffer.from(state, 'base64').toString())
      clinicId = statePayload.clinicId
      stateTimestamp = statePayload.timestamp

      // Verify state is not too old (max 10 minutes)
      if (Date.now() - stateTimestamp > 10 * 60 * 1000) {
        return NextResponse.json(
          { error: 'El codigo de autorizacion ha expirado. Intenta de nuevo.' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'State invalido. Intenta de nuevo.' },
        { status: 400 }
      )
    }

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET

    if (!appId || !appSecret) {
      return NextResponse.json({
        error: 'Embedded Signup no configurado completamente. Se requiere META_APP_SECRET.',
        missingVars: [
          !appId && 'META_APP_ID',
          !appSecret && 'META_APP_SECRET',
        ].filter(Boolean),
      }, { status: 503 })
    }

    const redirectUri = process.env.META_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://sinap-nine.vercel.app'}/api/meta/oauth/callback`

    // Step 1: Exchange code for access token
    const tokenUrl = `${META_BASE_URL}/oauth/access_token?` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `code=${encodeURIComponent(code)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let tokenData: { access_token: string; token_type: string; expires_in?: number }
    try {
      const tokenRes = await fetch(tokenUrl, { signal: controller.signal })
      if (!tokenRes.ok) {
        const errorBody = await tokenRes.text().catch(() => 'Unknown error')
        return NextResponse.json(
          { error: `Error al intercambiar codigo por token: ${errorBody}` },
          { status: 400 }
        )
      }
      tokenData = await tokenRes.json()
    } finally {
      clearTimeout(timeout)
    }

    const accessToken = tokenData.access_token

    // Step 2: Get granted permissions
    const permissionsRes = await fetch(
      `${META_BASE_URL}/me/permissions?access_token=${encodeURIComponent(accessToken)}`
    )
    const permissionsData = await permissionsRes.json()
    const grantedScopes = (permissionsData.data || [])
      .filter((p: { status: string }) => p.status === 'granted')
      .map((p: { permission: string }) => p.permission)
      .join(',')

    // Step 3: Get WABA ID from user's businesses
    const accountsRes = await fetch(
      `${META_BASE_URL}/me/accounts?access_token=${encodeURIComponent(accessToken)}`
    )
    const accountsData = await accountsRes.json()

    // Step 4: Get phone number for WhatsApp
    const whatsappBusinessId = accountsData.data?.[0]?.id
    let phoneNumberId: string | null = null

    if (whatsappBusinessId) {
      try {
        const phonesRes = await fetch(
          `${META_BASE_URL}/${whatsappBusinessId}/phone_numbers?access_token=${encodeURIComponent(accessToken)}`
        )
        const phonesData = await phonesRes.json()
        phoneNumberId = phonesData.data?.[0]?.id || null
      } catch {
        // Continue without phone number ID
      }
    }

    // Step 5: Create MetaConnection records for each channel
    const connections: Array<{ channel: string; status: string; businessId: string | null }> = []

    // WhatsApp connection
    if (whatsappBusinessId) {
      const waConn = await db.metaConnection.upsert({
        where: { clinicId_channel: { clinicId, channel: 'whatsapp' } },
        create: {
          clinicId,
          channel: 'whatsapp',
          businessId: whatsappBusinessId,
          phoneNumberId,
          accessToken,
          status: 'active',
          oauthCode: code,
          scopes: grantedScopes,
        },
        update: {
          businessId: whatsappBusinessId,
          phoneNumberId,
          accessToken,
          status: 'active',
          oauthCode: code,
          scopes: grantedScopes,
        },
      })
      connections.push({ channel: 'whatsapp', status: waConn.status, businessId: waConn.businessId })
    }

    // Instagram connection (if permissions granted)
    if (grantedScopes.includes('instagram_manage_messages')) {
      // Get IG Business Account from page
      try {
        const pageId = accountsData.data?.[0]?.id
        if (pageId) {
          const igRes = await fetch(
            `${META_BASE_URL}/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`
          )
          const igData = await igRes.json()

          if (igData.instagram_business_account?.id) {
            const igConn = await db.metaConnection.upsert({
              where: { clinicId_channel: { clinicId, channel: 'instagram' } },
              create: {
                clinicId,
                channel: 'instagram',
                businessId: igData.instagram_business_account.id,
                pageId,
                accessToken,
                status: 'active',
                oauthCode: code,
                scopes: grantedScopes,
              },
              update: {
                businessId: igData.instagram_business_account.id,
                pageId,
                accessToken,
                status: 'active',
                oauthCode: code,
                scopes: grantedScopes,
              },
            })
            connections.push({ channel: 'instagram', status: igConn.status, businessId: igConn.businessId })
          }
        }
      } catch {
        // Continue without Instagram
      }
    }

    // Messenger connection (if permissions granted)
    if (grantedScopes.includes('pages_messaging')) {
      const pageId = accountsData.data?.[0]?.id
      if (pageId) {
        const msConn = await db.metaConnection.upsert({
          where: { clinicId_channel: { clinicId, channel: 'messenger' } },
          create: {
            clinicId,
            channel: 'messenger',
            businessId: pageId,
            pageId,
            accessToken,
            status: 'active',
            oauthCode: code,
            scopes: grantedScopes,
          },
          update: {
            businessId: pageId,
            pageId,
            accessToken,
            status: 'active',
            oauthCode: code,
            scopes: grantedScopes,
          },
        })
        connections.push({ channel: 'messenger', status: msConn.status, businessId: msConn.businessId })
      }
    }

    // Update legacy Clinic fields for backward compatibility
    if (whatsappBusinessId) {
      await db.clinic.update({
        where: { id: clinicId },
        data: {
          wabaId: whatsappBusinessId,
          phoneNumberId,
          metaAccessToken: accessToken,
        },
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      connections,
      grantedScopes,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Meta oauth POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
