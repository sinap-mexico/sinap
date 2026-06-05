import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decode } from 'next-auth/jwt'

// GET /api/auth/google-status — Check Google OAuth connection status
// Uses JWT decoding (not getServerSession) for Next.js 16 compatibility
export async function GET(request: NextRequest) {
  try {
    // Read session from JWT cookie directly (same pattern as /api/auth/custom-session)
    const sessionToken = request.cookies.get('__Secure-next-auth.session-token')?.value
      || request.cookies.get('next-auth.session-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ connected: false }, { status: 401 })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return NextResponse.json({ connected: false, error: 'Configuración incompleta' })
    }

    let decoded: any
    try {
      decoded = await decode({ token: sessionToken, secret })
    } catch {
      return NextResponse.json({ connected: false }, { status: 401 })
    }

    if (!decoded?.sub) {
      return NextResponse.json({ connected: false }, { status: 401 })
    }

    const userId = decoded.sub

    if (!db) {
      return NextResponse.json({ connected: false, error: 'Base de datos no disponible' })
    }

    // Check if the user has a Google account linked
    const googleAccount = await db.account.findFirst({
      where: {
        userId,
        provider: 'google',
      },
      select: {
        id: true,
        providerAccountId: true,
        scope: true,
      },
    })

    if (googleAccount) {
      return NextResponse.json({
        connected: true,
        email: decoded.email || null,
        providerAccountId: googleAccount.providerAccountId,
      })
    }

    return NextResponse.json({
      connected: false,
      email: null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GoogleStatus] Error:', error)
    return NextResponse.json({ connected: false, error: message }, { status: 500 })
  }
}

// DELETE /api/auth/google-status — Disconnect Google account
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('__Secure-next-auth.session-token')?.value
      || request.cookies.get('next-auth.session-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 })
    }

    let decoded: any
    try {
      decoded = await decode({ token: sessionToken, secret })
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    if (!decoded?.sub) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const userId = decoded.sub

    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    // Delete the Google account record
    const deleted = await db.account.deleteMany({
      where: {
        userId,
        provider: 'google',
      },
    })

    if (deleted.count > 0) {
      return NextResponse.json({ success: true, message: 'Cuenta de Google desconectada' })
    }

    return NextResponse.json({ success: true, message: 'No había cuenta de Google conectada' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GoogleStatus] DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
