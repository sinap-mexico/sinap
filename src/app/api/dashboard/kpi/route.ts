import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/dashboard/kpi?clinicId=xxx
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Start of current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

    // Start of current week (Monday)
    const dayOfWeek = today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    weekStart.setHours(0, 0, 0, 0)

    // Citas hoy — count of today's appointments (excluding cancelled/no-show)
    const citasHoy = await db.appointment.count({
      where: {
        clinicId,
        date: { gte: today, lte: todayEnd },
        status: { notIn: ['cancelled', 'no_show'] },
      },
    })

    // Conversaciones activas — count of active conversations
    const conversacionesActivas = await db.conversation.count({
      where: {
        clinicId,
        status: 'active',
      },
    })

    // Facturas este mes — count
    const facturasMes = await db.invoice.count({
      where: {
        clinicId,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    })

    // Total facturado este mes — sum of invoice totals
    const invoiceAgg = await db.invoice.aggregate({
      where: {
        clinicId,
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { notIn: ['cancelled', 'error'] },
      },
      _sum: { total: true },
    })
    const totalFacturado = invoiceAgg._sum.total || 0

    // Pacientes nuevos este mes
    const pacientesNuevos = await db.patient.count({
      where: {
        clinicId,
        segment: 'new',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    })

    // Ocupacion — calculate based on available slots vs booked appointments this week
    // Get doctors for this clinic
    const doctors = await db.doctor.findMany({
      where: { clinicId, isActive: true },
      select: { workDays: true, workStart: true, workEnd: true, slotMinutes: true },
    })

    let totalPossibleSlots = 0
    for (const doc of doctors) {
      const workDaysArr = doc.workDays.split(',').map(Number)
      // Count work days in current week
      const daysInWeek: Date[] = []
      for (let i = 0; i < 6; i++) {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        daysInWeek.push(d)
      }
      const workDaysThisWeek = daysInWeek.filter(d => workDaysArr.includes(d.getDay())).length
      const startMin = parseTimeToMin(doc.workStart)
      const endMin = parseTimeToMin(doc.workEnd)
      const slotsPerDay = Math.floor((endMin - startMin) / doc.slotMinutes)
      totalPossibleSlots += workDaysThisWeek * slotsPerDay
    }

    // Booked appointments this week
    const bookedThisWeek = await db.appointment.count({
      where: {
        clinicId,
        date: { gte: weekStart, lte: todayEnd },
        status: { notIn: ['cancelled', 'no_show'] },
      },
    })

    const ocupacion = totalPossibleSlots > 0
      ? Math.round((bookedThisWeek / totalPossibleSlots) * 100)
      : 0

    // Weekly appointments for chart
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const weeklyAppointments = []

    for (let i = 0; i < 6; i++) {
      const dayDate = new Date(weekStart)
      dayDate.setDate(weekStart.getDate() + i)
      const dayStart = new Date(dayDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayDate)
      dayEnd.setHours(23, 59, 59, 999)

      const count = await db.appointment.count({
        where: {
          clinicId,
          date: { gte: dayStart, lte: dayEnd },
          status: { notIn: ['cancelled', 'no_show'] },
        },
      })

      weeklyAppointments.push({ day: dayNames[i], count })
    }

    // Monthly revenue — last 6 months for chart
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const monthlyRevenue = []
    const currentMonth = today.getMonth()

    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonth - i + 12) % 12
      const year = currentMonth - i < 0 ? today.getFullYear() - 1 : today.getFullYear()
      const mStart = new Date(year, mIdx, 1)
      const mEnd = new Date(year, mIdx + 1, 0, 23, 59, 59, 999)

      const agg = await db.invoice.aggregate({
        where: {
          clinicId,
          createdAt: { gte: mStart, lte: mEnd },
          status: { notIn: ['cancelled', 'error'] },
        },
        _sum: { total: true },
      })

      monthlyRevenue.push({
        month: monthNames[mIdx],
        amount: Math.round(agg._sum.total || 0),
      })
    }

    // No-show rate
    const totalAppointments = await db.appointment.count({
      where: {
        clinicId,
        date: { gte: monthStart, lte: monthEnd },
      },
    })
    const noShowCount = await db.appointment.count({
      where: {
        clinicId,
        date: { gte: monthStart, lte: monthEnd },
        status: 'no_show',
      },
    })
    const noShowRate = totalAppointments > 0 ? Math.round((noShowCount / totalAppointments) * 100) : 0

    // Current month revenue for KPI card
    const currentMonthRevenue = monthlyRevenue.length > 0 ? monthlyRevenue[monthlyRevenue.length - 1].amount : 0

    return NextResponse.json({
      kpi: {
        citasHoy,
        conversacionesActivas,
        facturasMes,
        totalFacturado: Math.round(totalFacturado),
        pacientesNuevos,
        ocupacion,
      },
      weeklyAppointments,
      monthlyRevenue,
      noShowRate,
      currentMonthRevenue,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Dashboard KPI GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function parseTimeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
