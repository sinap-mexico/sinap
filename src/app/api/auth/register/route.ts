import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Base de datos no disponible. Intenta el modo demo." },
        { status: 503 }
      )
    }

    const { name, email, password, clinicName, mode } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Correo electrónico inválido" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Calculate trial dates: 7 days from now
    const now = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + 7)

    // Create clinic if clinicName is provided
    let clinicId = null
    if (clinicName) {
      const slug = clinicName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40) + "-" + Date.now().toString(36)
      const clinic = await db.clinic.create({
        data: {
          name: clinicName,
          slug,
          email,
          mode: mode || "solo",
          trialStart: now,
          trialEnd: trialEnd,
          isActive: true,
        },
      })
      clinicId = clinic.id
    }

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "owner",
        clinicId,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      clinicId,
      trialEnd: trialEnd.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Error al crear la cuenta" }, { status: 500 })
  }
}
