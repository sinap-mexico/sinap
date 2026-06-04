import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMockKPIs, DEMO_CLINIC_ID } from '@/lib/mock-api'

// GET /api/dashboard/kpi?clinicId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Fallback to mock data when DB is unavailable (demo mode)
    if (!db) {
      const mockData = getMockKPIs(clinicId)
      return NextResponse.json(mockData)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Yesterday for trend calculation
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)

    // Start of current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

    // Start of previous month for revenue trend
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)

    // Start of current week (Monday)
    const dayOfWeek = today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    weekStart.setHours(0, 0, 0, 0)

    // ── Parallel batch 1: Core KPI counts ───────────────────────
    const [
      citasHoy,
      citasAyer,
      conversacionesActivas,
      conversacionesUnread,
      facturasMes,
      invoiceAgg,
      pacientesNuevos,
      prevInvoiceAgg,
    ] = await Promise.all([
      // Citas hoy (excluding cancelled/no_show)
      db.appointment.count({
        where: {
          clinicId,
          date: { gte: today, lte: todayEnd },
          status: { notIn: ['cancelled', 'no_show'] },
        },
      }),

      // Citas ayer (for trend)
      db.appointment.count({
        where: {
          clinicId,
          date: { gte: yesterday, lte: yesterdayEnd },
          status: { notIn: ['cancelled', 'no_show'] },
        },
      }),

      // Conversaciones activas
      db.conversation.count({
        where: { clinicId, status: 'active' },
      }),

      // Conversaciones sin leer (inbound messages not yet responded)
      db.conversation.count({
        where: { clinicId, status: 'active', unreadCount: { gt: 0 } },
      }),

      // Facturas este mes
      db.invoice.count({
        where: {
          clinicId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),

      // Total facturado este mes
      db.invoice.aggregate({
        where: {
          clinicId,
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { notIn: ['cancelled', 'error'] },
        },
        _sum: { total: true },
      }),

      // Pacientes nuevos este mes (by createdAt, not segment)
      db.patient.count({
        where: {
          clinicId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),

      // Total facturado mes anterior (for trend)
      db.invoice.aggregate({
        where: {
          clinicId,
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
          status: { notIn: ['cancelled', 'error'] },
        },
        _sum: { total: true },
      }),
    ])

    const totalFacturado = invoiceAgg._sum.total || 0
    const prevTotalFacturado = prevInvoiceAgg._sum.total || 0

    // ── Parallel batch 2: Ocupacion + weekly chart + monthly ─────
    const [doctors, bookedThisWeek, todayAppts, totalAppointments, noShowCount] =
      await Promise.all([
        // Doctors for occupancy calculation
        db.doctor.findMany({
          where: { clinicId, isActive: true },
          select: { workDays: true, workStart: true, workEnd: true, slotMinutes: true },
        }),

        // Booked this week
        db.appointment.count({
          where: {
            clinicId,
            date: { gte: weekStart, lte: todayEnd },
            status: { notIn: ['cancelled', 'no_show'] },
          },
        }),

        // Today's appointments grouped by doctor
        db.appointment.findMany({
          where: {
            clinicId,
            date: { gte: today, lte: todayEnd },
            status: { notIn: ['cancelled', 'no_show'] },
          },
          select: { doctorId: true, doctor: { select: { name: true } } },
        }),

        // Total appointments this month (for no-show rate)
        db.appointment.count({
          where: {
            clinicId,
            date: { gte: monthStart, lte: monthEnd },
          },
        }),

        // No-show count this month
        db.appointment.count({
          where: {
            clinicId,
            date: { gte: monthStart, lte: monthEnd },
            status: 'no_show',
          },
        }),
      ])

    // Ocupacion calculation
    let totalPossibleSlots = 0
    for (const doc of doctors) {
      const workDaysArr = doc.workDays.split(',').map(Number)
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

    const ocupacion = totalPossibleSlots > 0
      ? Math.round((bookedThisWeek / totalPossibleSlots) * 100)
      : 0

    // ── Weekly appointments chart ────────────────────────────────
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const weeklyAppointments = []

    // Batch all 6 day counts in parallel
    const dayCounts = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const dayDate = new Date(weekStart)
        dayDate.setDate(weekStart.getDate() + i)
        const dayStart = new Date(dayDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayDate)
        dayEnd.setHours(23, 59, 59, 999)

        return db.appointment.count({
          where: {
            clinicId,
            date: { gte: dayStart, lte: dayEnd },
            status: { notIn: ['cancelled', 'no_show'] },
          },
        })
      })
    )

    for (let i = 0; i < 6; i++) {
      weeklyAppointments.push({ day: dayNames[i], count: dayCounts[i] })
    }

    // ── Monthly revenue chart ────────────────────────────────────
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const currentMonth = today.getMonth()

    const monthlyAggs = await Promise.all(
      Array.from({ length: 6 }, (_, idx) => {
        const i = 5 - idx
        const mIdx = (currentMonth - i + 12) % 12
        const year = currentMonth - i < 0 ? today.getFullYear() - 1 : today.getFullYear()
        const mStart = new Date(year, mIdx, 1)
        const mEnd = new Date(year, mIdx + 1, 0, 23, 59, 59, 999)

        return db.invoice.aggregate({
          where: {
            clinicId,
            createdAt: { gte: mStart, lte: mEnd },
            status: { notIn: ['cancelled', 'error'] },
          },
          _sum: { total: true },
        }).then(agg => ({
          month: monthNames[mIdx],
          amount: Math.round(agg._sum.total || 0),
        }))
      })
    )

    const monthlyRevenue = monthlyAggs

    // ── Derived metrics ──────────────────────────────────────────
    const noShowRate = totalAppointments > 0 ? Math.round((noShowCount / totalAppointments) * 100) : 0
    const currentMonthRevenue = monthlyRevenue.length > 0 ? monthlyRevenue[monthlyRevenue.length - 1].amount : 0

    // Doctor appointments today
    const doctorApptMap = new Map<string, { doctorName: string; todayCount: number }>()
    for (const appt of todayAppts) {
      const existing = doctorApptMap.get(appt.doctorId)
      if (existing) {
        existing.todayCount++
      } else {
        doctorApptMap.set(appt.doctorId, { doctorName: appt.doctor.name, todayCount: 1 })
      }
    }
    const doctorAppointments = Array.from(doctorApptMap, ([doctorId, data]) => ({
      doctorId,
      doctorName: data.doctorName,
      todayCount: data.todayCount,
    }))

    // Trend calculations
    const citasHoyDiff = citasHoy - citasAyer
    const revenueGrowth = prevTotalFacturado > 0
      ? Math.round(((totalFacturado - prevTotalFacturado) / prevTotalFacturado) * 100)
      : totalFacturado > 0 ? 100 : 0

    const prevMonthName = monthNames[(currentMonth - 1 + 12) % 12]

    return NextResponse.json({
      kpi: {
        citasHoy,
        conversacionesActivas,
        facturasMes,
        totalFacturado: Math.round(totalFacturado),
        pacientesNuevos,
        ocupacion,
      },
      trends: {
        citasHoyDiff,
        conversacionesUnread,
        revenueGrowth,
        revenuePrevMonth: prevMonthName,
      },
      weeklyAppointments,
      monthlyRevenue,
      noShowRate,
      currentMonthRevenue,
      doctorAppointments,
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
