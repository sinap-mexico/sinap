import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { valid: false },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false })
    }

    // Find the token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      return NextResponse.json({ valid: false })
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await db.verificationToken.delete({
        where: { token },
      }).catch(() => {})
      return NextResponse.json({ valid: false })
    }

    // Mask the email for privacy: u***@email.com
    const email = verificationToken.identifier
    const [localPart, domain] = email.split('@')
    const maskedEmail = localPart
      ? `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 1, 3))}@${domain}`
      : '***'

    return NextResponse.json({
      valid: true,
      email: maskedEmail,
    })
  } catch (error) {
    console.error('[VerifyResetToken] Error:', error)
    return NextResponse.json({ valid: false })
  }
}
