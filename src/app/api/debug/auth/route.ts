import { NextResponse } from 'next/server'
import { getAuthOptions } from '@/lib/auth'

export async function GET() {
  const opts = getAuthOptions()

  return NextResponse.json({
    secretSet: !!opts.secret,
    secretLength: opts.secret ? opts.secret.length : 0,
    secretPrefix: opts.secret ? opts.secret.substring(0, 4) + '...' : 'NOT_SET',
    strategy: opts.session?.strategy,
    providersCount: opts.providers.length,
    nodeEnv: process.env.NODE_ENV,
    nextauthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
    nextauthSecretEnvSet: !!process.env.NEXTAUTH_SECRET,
    timestamp: new Date().toISOString(),
  })
}
