import { NextResponse } from 'next/server'

export async function GET() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  const nextauthSecret = process.env.NEXTAUTH_SECRET
  const nextauthUrl = process.env.NEXTAUTH_URL

  return NextResponse.json({
    // NEXTAUTH
    secretSet: !!nextauthSecret,
    secretLength: nextauthSecret ? nextauthSecret.length : 0,
    secretPrefix: nextauthSecret ? nextauthSecret.substring(0, 4) + '...' : 'NOT_SET',
    nextauthUrl: nextauthUrl || 'NOT_SET',

    // Google OAuth
    googleClientIdSet: !!googleClientId,
    googleClientIdPrefix: googleClientId ? googleClientId.substring(0, 15) + '...' : 'NOT_SET',
    googleClientSecretSet: !!googleClientSecret,
    googleClientSecretLength: googleClientSecret ? googleClientSecret.length : 0,

    // General
    nodeEnv: process.env.NODE_ENV,
    databaseUrlSet: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL?.startsWith('file:') ? 'SQLite (local)' :
                       process.env.DATABASE_URL?.startsWith('postgresql://') ? 'PostgreSQL' :
                       process.env.DATABASE_URL?.startsWith('postgres://') ? 'PostgreSQL' : 'unknown',
    timestamp: new Date().toISOString(),
  })
}
