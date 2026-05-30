'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSinapStore } from '@/lib/sinap-store'
import {
  agentStatuses,
  kpiData,
  weeklyAppointments,
} from '@/lib/mock-data'
import {
  Calendar,
  MessageSquare,
  Receipt,
  Users,
  BarChart3,
  Circle,
  Zap,
  CalendarCheck,
  Stethoscope,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  UserPlus,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { motion } from 'framer-motion'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos dias'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return now.toLocaleDateString('es-MX', options)
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'active'
      ? '#1D9E75'
      : status === 'processing'
      ? '#534AB7'
      : '#888780'
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'processing' && (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full opacity-50"
          style={{ backgroundColor: color }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {status === 'active' && (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full opacity-30"
          style={{ backgroundColor: color }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <Circle
        className="relative inline-flex h-2.5 w-2.5 fill-current"
        style={{ color }}
      />
    </span>
  )
}

const statusLabels: Record<string, string> = {
  active: 'Activo',
  processing: 'Procesando',
  idle: 'Inactivo',
}

const eventTypeLabels: Record<string, string> = {
  cita_agendada: 'Cita agendada',
  cita_confirmada: 'Cita confirmada',
  cita_completada: 'Cita completada',
  cita_cancelada: 'Cita cancelada',
  factura_generada: 'Factura generada',
  pago_recibido: 'Pago recibido',
  paciente_nuevo: 'Paciente nuevo',
  soap_borrador_listo: 'Nota SOAP lista',
  conversacion_atendida: 'Conversacion atendida',
}

const eventTypeIcons: Record<string, React.ElementType> = {
  cita_agendada: CalendarCheck,
  cita_confirmada: CheckCircle,
  cita_completada: CheckCircle,
  cita_cancelada: AlertTriangle,
  factura_generada: Receipt,
  pago_recibido: CreditCard,
  paciente_nuevo: UserPlus,
  soap_borrador_listo: FileText,
  conversacion_atendida: MessageSquare,
}

const eventTypeColors: Record<string, string> = {
  cita_agendada: '#1D9E75',
  cita_confirmada: '#1D9E75',
  cita_completada: '#1D9E75',
  cita_cancelada: '#E53E3E',
  factura_generada: '#1D9E75',
  pago_recibido: '#1D9E75',
  paciente_nuevo: '#5DCAA5',
  soap_borrador_listo: '#534AB7',
  conversacion_atendida: '#5DCAA5',
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const duration = 1200
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(startValue + (value - startValue) * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return (
    <span>
      {prefix}{displayed.toLocaleString('es-MX')}{suffix}
    </span>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function OsOverview() {
  const { setActiveModule, recentEvents, doctorProfile } = useSinapStore()

  const maxAppointments = Math.max(...weeklyAppointments.map((d) => d.count))

  const kpiCards = [
    {
      label: 'Citas hoy',
      value: kpiData.citasHoy,
      prefix: '',
      icon: Calendar,
      iconBg: '#E1F5EE',
      iconColor: '#1D9E75',
      trend: '+2 vs ayer',
      trendColor: '#1D9E75',
      trendIcon: TrendingUp,
    },
    {
      label: 'Conversaciones activas',
      value: kpiData.conversacionesActivas,
      prefix: '',
      icon: MessageSquare,
      iconBg: '#EEEDFE',
      iconColor: '#534AB7',
      trend: '3 sin leer',
      trendColor: '#534AB7',
      trendIcon: null,
    },
    {
      label: 'Facturado este mes',
      value: kpiData.totalFacturado,
      prefix: '$',
      icon: Receipt,
      iconBg: '#E1F5EE',
      iconColor: '#1D9E75',
      trend: '+15% vs abril',
      trendColor: '#1D9E75',
      trendIcon: TrendingUp,
    },
    {
      label: 'Pacientes nuevos',
      value: kpiData.pacientesNuevos,
      prefix: '',
      icon: Users,
      iconBg: '#E1F5EE',
      iconColor: '#5DCAA5',
      trend: 'Este mes',
      trendColor: '#5DCAA5',
      trendIcon: null,
    },
  ]

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome banner */}
      <motion.div variants={itemVariants}>
        <div className="bg-gradient-to-r from-[#0F2D26] to-[#1D9E75] rounded-xl p-6 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/3 w-24 h-24 rounded-full bg-white/5 translate-y-1/2" />

          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.03em]">
                {getGreeting()}, {doctorProfile.name.split(' ').slice(-1)[0]}
              </h2>
              <p className="text-white/70 text-sm mt-1 capitalize">{formatDate()}</p>
            </div>
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Badge className="bg-[#534AB7] text-white border-0 text-xs px-3 py-1">
                <Zap className="h-3 w-3 mr-1" />
                7 neuronas activas
              </Badge>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          const TrendIcon = kpi.trendIcon
          return (
            <motion.div key={kpi.label} variants={itemVariants}>
              <Card className="border-[#E1F5EE] bg-white transition-shadow duration-300 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                        {kpi.label}
                      </p>
                      <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                        <AnimatedNumber value={kpi.value} prefix={kpi.prefix} />
                      </p>
                      {kpi.label === 'Facturado este mes' && (
                        <p className="text-[10px] text-[#888780]">MXN</p>
                      )}
                    </div>
                    <motion.div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: kpi.iconBg }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Icon className="h-5 w-5" style={{ color: kpi.iconColor }} />
                    </motion.div>
                  </div>
                  <p className="text-xs mt-2 font-medium flex items-center gap-1" style={{ color: kpi.trendColor }}>
                    {TrendIcon && <TrendIcon className="h-3 w-3" />}
                    {kpi.trend}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Status Panel */}
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white lg:col-span-1 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
                Estado de neuronas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {agentStatuses.map((agent, i) => (
                <motion.button
                  key={agent.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F1EFE8] transition-colors w-full text-left"
                  onClick={() => setActiveModule(agent.id as Parameters<typeof setActiveModule>[0])}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  whileHover={{ x: 4 }}
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-transform"
                    style={{ backgroundColor: agent.color + '15' }}
                  >
                    <Zap className="h-4 w-4" style={{ color: agent.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2A]">{agent.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot status={agent.status} />
                      <span className="text-[11px] text-[#888780]">
                        {statusLabels[agent.status]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#2C2C2A]">{agent.messages}</p>
                    <p className="text-[10px] text-[#888780]">msgs hoy</p>
                  </div>
                </motion.button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Appointments Mini Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
                Citas esta semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-40">
                {weeklyAppointments.map((d, i) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-[#2C2C2A]">{d.count}</span>
                    <div className="w-full relative rounded-t-md overflow-hidden" style={{ height: '100px' }}>
                      <motion.div
                        className="absolute bottom-0 w-full rounded-t-md"
                        style={{
                          background: `linear-gradient(to top, #1D9E75, #5DCAA5)`,
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.count / maxAppointments) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] text-[#888780]">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#1D9E75]" />
                <span className="text-xs text-[#888780]">Ocupacion: {kpiData.ocupacion}%</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white lg:col-span-1 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
                  Actividad reciente
                </CardTitle>
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                    <Zap className="h-3 w-3 mr-1" />
                    En vivo
                  </Badge>
                </motion.div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {recentEvents.slice(0, 8).map((event, i) => {
                    const Icon = eventTypeIcons[event.eventType] || Circle
                    const color = eventTypeColors[event.eventType] || '#888780'
                    const label = eventTypeLabels[event.eventType] || event.eventType

                    let payloadText = ''
                    try {
                      const parsed = JSON.parse(event.payload)
                      payloadText = parsed.patientName || parsed.concept || parsed.cfdiUuid || event.payload
                    } catch {
                      payloadText = event.payload
                    }

                    return (
                      <motion.div
                        key={event.id}
                        className="flex items-start gap-2.5"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color }} />
                        <div className="min-w-0">
                          <p className="text-xs text-[#2C2C2A] leading-relaxed">
                            <span className="font-medium" style={{ color }}>{label}</span>
                            {payloadText && <span className="text-[#888780]"> — {payloadText}</span>}
                          </p>
                          <p className="text-[10px] text-[#888780]">
                            {event.sourceAgent} {event.targetAgent ? `→ ${event.targetAgent}` : ''}
                            {' '}&middot;{' '}
                            {new Date(event.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
              Acciones rapidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Agendar cita', icon: Calendar, bg: '#534AB7', hoverBg: '#534AB7/90', module: 'agenda' as const },
                { label: 'Generar CFDI', icon: Receipt, bg: '#1D9E75', hoverBg: '#1D9E75/90', module: 'bill' as const },
                { label: 'Pre-consulta IA', icon: Stethoscope, bg: '#5DCAA5', hoverBg: '#5DCAA5/90', module: 'flow' as const },
                { label: 'Ver reporte', icon: BarChart3, bg: 'transparent', hoverBg: '#EEEDFE', module: 'sight' as const, outline: true },
              ].map((action, i) => {
                const ActionIcon = action.icon
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                  >
                    <Button
                      className={`${action.outline ? 'border-[#534AB7] text-[#534AB7] hover:bg-[#EEEDFE]' : `bg-[${action.bg}] hover:bg-[${action.hoverBg}] text-white`} h-auto py-3 flex-col gap-2 w-full transition-all`}
                      style={!action.outline ? { backgroundColor: action.bg } : undefined}
                      onClick={() => setActiveModule(action.module)}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <motion.div
                        whileHover={{ rotate: 10, scale: 1.15 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <ActionIcon className="h-5 w-5" />
                      </motion.div>
                      <span className="text-xs">{action.label}</span>
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
