import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Base de datos no disponible' },
        { status: 503 }
      )
    }

    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'El correo electrónico es requerido' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Correo electrónico inválido' },
        { status: 400 }
      )
    }

    // Always return success — don't reveal if email exists (security)
    const user = await db.user.findUnique({
      where: { email },
    })

    if (user) {
      // Delete any existing reset tokens for this email
      await db.verificationToken.deleteMany({
        where: { identifier: email },
      })

      // Generate a new token
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 3600000) // 1 hour from now

      // Store the token
      await db.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      })

      // Send the reset email (non-blocking — don't wait for result)
      sendPasswordResetEmail({ to: email, token }).catch((err) => {
        console.error('[ForgotPassword] Failed to send email:', err)
      })
    }

    return NextResponse.json({
      message: 'Si existe una cuenta con ese correo, recibirás un email con instrucciones',
    })
  } catch (error) {
    console.error('[ForgotPassword] Error:', error)
    // Still return success to not reveal system state
    return NextResponse.json({
      message: 'Si existe una cuenta con ese correo, recibirás un email con instrucciones',
    })
  }
}
