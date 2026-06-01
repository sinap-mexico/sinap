'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSinapStore } from '@/lib/sinap-store'
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface KpiData {
  ocupacion: number
  currentMonthRevenue: number
  noShowRate: number
}

interface WeeklyAppointment {
  day: string
  count: number
}

interface MonthlyRevenue {
  month: string
  amount: number
}

export function SightAnalytics() {
  const { clinicId, setClinicId, clinicSlug } = useSinapStore()
  const [kpiData, setKpiData] = useState<KpiData>({ ocupacion: 0, currentMonthRevenue: 0, noShowRate: 0 })
  const [weeklyAppointments, setWeeklyAppointments] = useState<WeeklyAppointment[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Resolve clinicId on mount if needed
  useEffect(() => {
    async function resolveClinicId() {
      if (clinicId) return
      try {
        const res = await fetch(`/api/clinic?slug=${encodeURIComponent(clinicSlug)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.clinic?.id) {
            setClinicId(data.clinic.id)
          }
        }
      } catch (err) {
        console.error('Failed to resolve clinicId:', err)
      }
    }
    resolveClinicId()
  }, [clinicId, clinicSlug, setClinicId])

  // Fetch KPI data
  const fetchKpiData = useCallback(async () => {
    if (!clinicId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/dashboard/kpi?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.kpi) {
          setKpiData({
            ocupacion: data.kpi.ocupacion || 0,
            currentMonthRevenue: data.currentMonthRevenue || 0,
            noShowRate: data.noShowRate || 0,
          })
        }
        if (data.weeklyAppointments) {
          setWeeklyAppointments(data.weeklyAppointments)
        }
        if (data.monthlyRevenue) {
          setMonthlyRevenue(data.monthlyRevenue)
        }
      }
    } catch (err) {
      console.error('Failed to fetch KPI data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clinicId])

  useEffect(() => {
    fetchKpiData()
  }, [fetchKpiData])

  const maxRevenue = Math.max(...monthlyRevenue.map((d) => d.amount), 1)
  const maxAppointments = Math.max(...weeklyAppointments.map((d) => d.count), 1)

  const alerts = [
    {
      id: 'al1',
      type: 'warning',
      title: 'Ocupacion baja los jueves',
      description: 'La ocupacion de jueves ha bajado un 15% en las ultimas 3 semanas.',
      action: 'Considerar promociones para horarios de jueves',
    },
    {
      id: 'al2',
      type: 'success',
      title: 'Pacientes nuevos en aumento',
      description: 'Los pacientes nuevos aumentaron 23% este mes vs. el anterior.',
      action: 'El agente Sinap Grow esta funcionando bien',
    },
    {
      id: 'al3',
      type: 'info',
      title: 'Facturacion en tendencia positiva',
      description: 'La facturacion mensual crece consistentemente desde febrero.',
      action: 'Mantener estrategia actual de precios',
    },
    {
      id: 'al4',
      type: 'warning' as const,
      title: 'Tasa de no-show elevada',
      description: `El ${kpiData.noShowRate || 12}% de las citas no se presentan. Promedio sector: 8%.`,
      action: 'Activar recordatorios automaticos por WhatsApp',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  const formatRevenue = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`
    }
    return `$${amount.toLocaleString('es-MX')}`
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Ocupacion semanal
                </p>
                <motion.div whileHover={{ scale: 1.2 }}>
                  <ArrowUpRight className="h-4 w-4 text-[#1D9E75]" />
                </motion.div>
              </div>
              <p className="text-3xl font-medium text-[#2C2C2A] tracking-[-0.03em]">
                {isLoading ? '—' : `${kpiData.ocupacion}%`}
              </p>
              <p className="text-xs text-[#1D9E75] mt-1 font-medium">+5% vs. semana pasada</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Ingresos del mes
                </p>
                <motion.div whileHover={{ scale: 1.2 }}>
                  <ArrowUpRight className="h-4 w-4 text-[#1D9E75]" />
                </motion.div>
              </div>
              <p className="text-3xl font-medium text-[#2C2C2A] tracking-[-0.03em]">
                {isLoading ? '—' : formatRevenue(kpiData.currentMonthRevenue)}
              </p>
              <p className="text-xs text-[#1D9E75] mt-1 font-medium">MXN</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Tasa de no-show
                </p>
                <motion.div whileHover={{ scale: 1.2 }}>
                  <ArrowDownRight className="h-4 w-4 text-[#E53E3E]" />
                </motion.div>
              </div>
              <p className="text-3xl font-medium text-[#2C2C2A] tracking-[-0.03em]">
                {isLoading ? '—' : `${kpiData.noShowRate || 0}%`}
              </p>
              <p className="text-xs text-[#E53E3E] mt-1 font-medium">Por encima del promedio (8%)</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments chart */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Citas por dia
                </CardTitle>
                <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                  Esta semana
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-[#534AB7]" />
                </div>
              ) : weeklyAppointments.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-[#888780]">Sin datos de citas esta semana</p>
                </div>
              ) : (
                <div className="flex items-end gap-4 h-48">
                  {weeklyAppointments.map((d, i) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-[#2C2C2A]">{d.count}</span>
                      <div className="w-full relative" style={{ height: '140px' }}>
                        <motion.div
                          className="absolute bottom-0 w-full rounded-t-lg"
                          style={{
                            background: d.day === 'Vie'
                              ? 'linear-gradient(to top, #534AB7, #534AB7/80)'
                              : 'linear-gradient(to top, #1D9E75, #5DCAA5)',
                          }}
                          initial={{ height: 0 }}
                          animate={{ height: `${(d.count / maxAppointments) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[11px] text-[#888780]">{d.day}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue chart */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Ingresos mensuales
                </CardTitle>
                <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[10px]">
                  2026
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-[#534AB7]" />
                </div>
              ) : monthlyRevenue.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-[#888780]">Sin datos de ingresos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {monthlyRevenue.map((d, i) => (
                    <motion.div
                      key={d.month}
                      className="space-y-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#2C2C2A] font-medium">{d.month}</span>
                        <span className="text-xs text-[#888780]">
                          ${(d.amount / 1000).toFixed(0)}k MXN
                        </span>
                      </div>
                      <div className="h-6 bg-[#F1EFE8] rounded-md overflow-hidden">
                        <motion.div
                          className="h-full rounded-md"
                          style={{
                            backgroundColor: i === monthlyRevenue.length - 1 ? '#534AB7' : '#5DCAA5',
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(d.amount / maxRevenue) * 100}%` }}
                          transition={{ duration: 0.7, delay: 0.4 + i * 0.06, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alerts panel */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Alertas proactivas
              </CardTitle>
              <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                <BarChart3 className="h-3 w-3 mr-1" />
                Sinap Sight
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alerts.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-shadow hover:shadow-sm ${
                    alert.type === 'warning'
                      ? 'bg-[#FEF3C7] border-amber-200'
                      : alert.type === 'success'
                      ? 'bg-[#E1F5EE] border-[#1D9E75]/20'
                      : 'bg-[#EEEDFE] border-[#534AB7]/20'
                  }`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {alert.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : alert.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />
                    ) : (
                      <Info className="h-4 w-4 text-[#534AB7]" />
                    )}
                    <span className="text-sm font-medium text-[#2C2C2A]">{alert.title}</span>
                  </div>
                  <p className="text-xs text-[#2C2C2A] leading-relaxed mb-1">
                    {alert.description}
                  </p>
                  <p className="text-[10px] text-[#888780]">{alert.action}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
