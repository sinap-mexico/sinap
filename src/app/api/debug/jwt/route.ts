import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decode } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('__Secure-next-auth.session-token')?.value
      || request.cookies.get('next-auth.session-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token cookie found' })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'NEXTAUTH_SECRET not set' })
    }

    // Try to decode the JWT
    try {
      const decoded = await decode({
        token: sessionToken,
        secret: secret,
      })
      return NextResponse.json({
        decoded: decoded,
        secretPrefix: secret.substring(0, 4) + '...',
        secretLength: secret.length,
        tokenPrefix: sessionToken.substring(0, 20) + '...',
      })
    } catch (decodeError: any) {
      return NextResponse.json({
        error: 'JWT decode failed',
        message: decodeError.message,
        stack: decodeError.stack?.split('\n').slice(0, 5),
        secretPrefix: secret.substring(0, 4) + '...',
        secretLength: secret.length,
        tokenPrefix: sessionToken.substring(0, 20) + '...',
      })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message })
  }
}
