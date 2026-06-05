// ─── Meta OAuth Callback Route ──────────────────────────────────
// Handles the redirect from Meta's OAuth consent screen.
// Meta redirects users here with a `code` and `state` parameter.
// This route exchanges the code for an access token and creates
// MetaConnection records for each channel (WhatsApp, IG, Messenger).

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { META_BASE_URL, validateMetaToken } from '@/lib/meta-client'
import { encryptToken } from '@/lib/meta/token-vault'

const REQUEST_TIMEOUT_MS = 15_000

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorReason = searchParams.get('error_reason')

    // User denied access
    if (error) {
      console.warn('[OAuth Callback] User denied access:', error, errorReason)
      return NextResponse.redirect(
        new URL(`/config?meta_error=${encodeURIComponent(errorReason || error)}`, req.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/config?meta_error=missing_params', req.url)
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
        return NextResponse.redirect(
          new URL('/config?meta_error=expired_code', req.url)
        )
      }
    } catch {
      return NextResponse.redirect(
        new URL('/config?meta_error=invalid_state', req.url)
      )
    }

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET

    if (!appId || !appSecret) {
      console.error('[OAuth Callback] META_APP_ID or META_APP_SECRET not configured')
      return NextResponse.redirect(
        new URL('/config?meta_error=server_config', req.url)
      )
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
        console.error('[OAuth Callback] Token exchange failed:', errorBody)
        return NextResponse.redirect(
          new URL(`/config?meta_error=${encodeURIComponent('token_exchange_failed')}`, req.url)
        )
      }
      tokenData = await tokenRes.json()
    } finally {
      clearTimeout(timeout)
    }

    const accessToken = tokenData.access_token

    // Step 2: Get granted permissions
    let grantedScopes = ''
    try {
      const permissionsRes = await fetch(
        `${META_BASE_URL}/me/permissions?access_token=${encodeURIComponent(accessToken)}`
      )
      const permissionsData = await permissionsRes.json()
      grantedScopes = (permissionsData.data || [])
        .filter((p: { status: string }) => p.status === 'granted')
        .map((p: { permission: string }) => p.permission)
        .join(',')
    } catch {
      // Continue without permissions info
    }

    // Step 3: Get WhatsApp Business Account ID
    let whatsappBusinessId: string | null = null
    let phoneNumberId: string | null = null
    try {
      const accountsRes = await fetch(
        `${META_BASE_URL}/me/accounts?access_token=${encodeURIComponent(accessToken)}`
      )
      const accountsData = await accountsRes.json()
      whatsappBusinessId = accountsData.data?.[0]?.id || null

      // Get phone number for WhatsApp
      if (whatsappBusinessId) {
        try {
          const phonesRes = await fetch(
            `${META_BASE_URL}/${whatsappBusinessId}/phone_numbers?access_token=${encodeURIComponent(accessToken)}`
          )
          const phonesData = await phonesRes.json()
          phoneNumberId = phonesData.data?.[0]?.id || null
        } catch {
          // Continue without phone number
        }
      }
    } catch {
      // Continue without WhatsApp
    }

    // Step 4: Get Facebook Pages (for Messenger + Instagram)
    let pageId: string | null = null
    let igBusinessId: string | null = null
    let pageAccessToken: string | null = null

    try {
      const pagesRes = await fetch(
        `${META_BASE_URL}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`
      )
      const pagesData = await pagesRes.json()

      if (pagesData.data?.[0]) {
        pageId = pagesData.data[0].id
        pageAccessToken = pagesData.data[0].access_token || accessToken

        // Get Instagram Business Account from page
        if (pagesData.data[0].instagram_business_account?.id) {
          igBusinessId = pagesData.data[0].instagram_business_account.id
        }
      }
    } catch {
      // Continue without pages
    }

    // Step 5: Encrypt tokens before storing
    const encryptedToken = encryptToken(accessToken)
    const encryptedPageToken = pageAccessToken ? encryptToken(pageAccessToken) : null

    // Step 6: Create MetaConnection records for each channel
    if (!db) {
      return NextResponse.redirect(
        new URL('/config?meta_error=db_unavailable', req.url)
      )
    }

    const connections: Array<{ channel: string; status: string }> = []

    // WhatsApp connection
    if (whatsappBusinessId) {
      await db.metaConnection.upsert({
        where: { clinicId_channel: { clinicId, channel: 'whatsapp' } },
        create: {
          clinicId,
          channel: 'whatsapp',
          businessId: whatsappBusinessId,
          phoneNumberId,
          accessToken: encryptedToken,
          status: 'active',
          oauthCode: code,
          scopes: grantedScopes,
        },
        update: {
          businessId: whatsappBusinessId,
          phoneNumberId,
          accessToken: encryptedToken,
          status: 'active',
          oauthCode: code,
          scopes: grantedScopes,
        },
      })
      connections.push({ channel: 'whatsapp', status: 'active' })

      // Update legacy Clinic fields for backward compatibility
      await db.clinic.update({
        where: { id: clinicId },
        data: {
          wabaId: whatsappBusinessId,
          phoneNumberId,
          metaAccessToken: encryptedToken,
        },
      }).catch(() => {})
    }

    // Instagram connection
    if (igBusinessId && pageId) {
      await db.metaConnection.upsert({
        where: { clinicId_channel: { clinicId, channel: 'instagram' } },
        create: {
          clinicId,
          channel: 'instagram',
          businessId: igBusinessId,
          pageId,
          accessToken: encryptedPageToken || encryptedToken,
          status: 'active',
          oauthCode: code,
          scopes: grantedScopes,
        },
        update: {
          businessId: igBusinessId,
          pageId,
          accessToken: encryptedPageToken || encryptedToken,
          status: 'active',
          oauthCode: code,
          scopes: grantedScopes,
        },
      })
      connections.push({ channel: 'instagram', status: 'active' })

      // Update legacy
      await db.clinic.update({
        where: { id: clinicId },
        data: { igBusinessId },
      }).catch(() => {})
    }

    // Messenger connection
    if (pageId) {
      await db.metaConnection.upsert({
        where: { clinicId_channel: { clinicId, channel: 'messenger' } },
        create: {
          clinicId,
          channel: 'messenger',
          businessId: pageId,
          pageId,
          accessToken: encryptedPageToken || encryptedToken,
          status: 'active',
          oauthCode: code,
          scopes: grantedScopes,
        },
        update: {
          businessId: pageId,
          pageId,
          accessToken: encryptedPageToken || encryptedToken,
          status: 'active',
          oauthCode: code,
          scopes: grantedScopes,
        },
      })
      connections.push({ channel: 'messenger', status: 'active' })

      // Update legacy
      await db.clinic.update({
        where: { id: clinicId },
        data: { fbPageId: pageId },
      }).catch(() => {})
    }

    // Step 7: Subscribe WABA to webhook (WhatsApp)
    if (whatsappBusinessId) {
      try {
        await fetch(
          `${META_BASE_URL}/${whatsappBusinessId}/subscribed_apps`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        )
      } catch {
        // Non-critical — webhook subscription can be done manually
      }
    }

    console.log(`[OAuth Callback] Successfully connected ${connections.length} channels for clinic ${clinicId}`)

    // Redirect to the integrations settings page with success
    return NextResponse.redirect(
      new URL(`/config?meta_connected=${connections.map(c => c.channel).join(',')}`, req.url)
    )
  } catch (error) {
    console.error('[OAuth Callback] Unhandled error:', error)
    return NextResponse.redirect(
      new URL('/config?meta_error=unknown', req.url)
    )
  }
}
