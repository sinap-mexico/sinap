import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decode } from 'next-auth/jwt'

// Custom session endpoint that works with Next.js 16 + NextAuth v4
// NextAuth v4's built-in /api/auth/session doesn't work properly with Next.js 16
// because of App Router route handler signature changes.
// This endpoint reads the JWT cookie directly and returns the session data.
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('__Secure-next-auth.session-token')?.value
      || request.cookies.get('next-auth.session-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ user: null, expires: null })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error('[CustomSession] NEXTAUTH_SECRET not set')
      return NextResponse.json({ user: null, expires: null })
    }

    try {
      const decoded = await decode({
        token: sessionToken,
        secret: secret,
      })

      if (!decoded) {
        return NextResponse.json({ user: null, expires: null })
      }

      // Format to match NextAuth session shape
      const expires = decoded.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      return NextResponse.json({
        user: {
          id: decoded.sub || null,
          name: decoded.name || null,
          email: decoded.email || null,
          image: decoded.picture || null,
          role: (decoded as any).role || null,
          clinicId: (decoded as any).clinicId || null,
          trialExpired: (decoded as any).trialExpired || false,
        },
        expires,
      })
    } catch (decodeError: any) {
      console.error('[CustomSession] JWT decode failed:', decodeError.message)
      return NextResponse.json({ user: null, expires: null })
    }
  } catch (error: any) {
    console.error('[CustomSession] Error:', error.message)
    return NextResponse.json({ user: null, expires: null })
  }
}
