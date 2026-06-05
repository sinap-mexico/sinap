'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSinapStore } from '@/lib/sinap-store'
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Clock,
  Send,
  BarChart3,
  Loader2,
  MessageSquare,
  Mail,
  Trash2,
  MoreHorizontal,
  Pause,
  Play,
  Copy,
  Pencil,
  Eye,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
  Target,
  Megaphone,
  HeartHandshake,
  Bell,
  Zap,
  DollarSign,
  Activity,
  Stethoscope,
  AlertTriangle,
  Lightbulb,
  X,
  Bot,
  ChevronUp,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── TYPES ──────────────────────────────────────────────────────

interface PatientSegments {
  new: number
  active: number
  inactive: number
  churned: number
  vip: number
}

interface FunnelStage {
  stage: string
  count: number
  color: string
}

interface Campaign {
  id: string
  name: string
  type: string
  campaignType: string
  channel: string
  segment: string
  status: string
  recipientCount: number
  sentCount: number
  deliveredCount: number
  openedCount: number
  respondedCount: number
  content: string
  subject?: string | null
  scheduledAt?: string | null
  sentAt?: string | null
  openRate: number
  responseRate: number
  createdAt: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SmartAlert {
  id: string
  type: 'warning' | 'info' | 'success' | 'tip'
  icon: React.ReactNode
  message: string
  dismissed: boolean
}

// ─── CONFIG ─────────────────────────────────────────────────────

const segmentConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  new: { color: '#534AB7', bg: '#EEEDFE', icon: <UserPlus className="h-4 w-4" />, label: 'Nuevos' },
  active: { color: '#1D9E75', bg: '#E1F5EE', icon: <Users className="h-4 w-4" />, label: 'Activos' },
  inactive: { color: '#D97706', bg: '#FEF3C7', icon: <Clock className="h-4 w-4" />, label: 'Inactivos' },
  churned: { color: '#E53E3E', bg: '#FEE2E2', icon: <UserMinus className="h-4 w-4" />, label: 'Perdidos' },
  vip: { color: '#534AB7', bg: '#EEEDFE', icon: <Crown className="h-4 w-4" />, label: 'VIP' },
}

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  both: <Send className="h-4 w-4" />,
}

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  both: 'Ambos',
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: '#888780', bg: '#F1EFE8' },
  scheduled: { label: 'Programada', color: '#D97706', bg: '#FEF3C7' },
  sending: { label: 'Enviando', color: '#534AB7', bg: '#EEEDFE' },
  completed: { label: 'Completada', color: '#1D9E75', bg: '#E1F5EE' },
  paused: { label: 'Pausada', color: '#E53E3E', bg: '#FEE2E2' },
  active: { label: 'Activa', color: '#1D9E75', bg: '#E1F5EE' },
}

const segmentLabels: Record<string, string> = {
  all: 'Todos',
  new: 'Nuevos',
  active: 'Activos',
  inactive: 'Inactivos',
  churned: 'Perdidos',
  vip: 'VIP',
}

const campaignTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; description: string }> = {
  reactivacion: {
    label: 'Reactivación',
    icon: <Zap className="h-4 w-4" />,
    color: '#D97706',
    bg: '#FEF3C7',
    description: 'Para pacientes inactivos que no han regresado',
  },
  retencion: {
    label: 'Retención',
    icon: <HeartHandshake className="h-4 w-4" />,
    color: '#E53E3E',
    bg: '#FEE2E2',
    description: 'Para pacientes en riesgo de abandonar',
  },
  vip: {
    label: 'VIP',
    icon: <Crown className="h-4 w-4" />,
    color: '#534AB7',
    bg: '#EEEDFE',
    description: 'Exclusivo para pacientes VIP',
  },
  promocion: {
    label: 'Promoción',
    icon: <Megaphone className="h-4 w-4" />,
    color: '#1D9E75',
    bg: '#E1F5EE',
    description: 'Promociones y ofertas generales',
  },
  recordatorio: {
    label: 'Recordatorio',
    icon: <Bell className="h-4 w-4" />,
    color: '#888780',
    bg: '#F1EFE8',
    description: 'Recordatorios de citas y seguimientos',
  },
}

// AI-suggested templates by campaign type
const aiTemplates: Record<string, { name: string; subject?: string; content: string }[]> = {
  reactivacion: [
    {
      name: 'Te extrañamos',
      subject: 'Te extrañamos en la clínica 🏥',
      content: 'Hola {nombre}, hace tiempo que no te vemos. Tu salud es importante para nosotros. Agenda tu próxima consulta con un {descuento}% de descuento. ¡Te esperamos!',
    },
    {
      name: 'Seguimiento pendiente',
      subject: 'Tu seguimiento está pendiente',
      content: 'Hola {nombre}, notamos que tienes un seguimiento pendiente. ¿Te gustaría agendar una cita? Tenemos disponibilidad esta semana. Responde para agendar.',
    },
  ],
  retencion: [
    {
      name: 'Cuidado continuo',
      subject: 'Tu tratamiento es importante 💊',
      content: 'Hola {nombre}, queremos asegurarnos que tu tratamiento vaya bien. ¿Has tenido alguna duda? Agenda una revisión sin costo esta semana.',
    },
    {
      name: 'Beneficio exclusivo',
      subject: 'Beneficio exclusivo para ti',
      content: 'Hola {nombre}, como paciente valioso, tienes un beneficio especial: consulta de seguimiento con precio especial. ¡No dejes pasar esta oportunidad!',
    },
  ],
  vip: [
    {
      name: 'Atención preferente',
      subject: 'Servicio VIP exclusivo ✨',
      content: 'Estimado/a {nombre}, como paciente VIP tienes acceso a horarios preferentes y precios especiales. Agenda tu próxima cita con prioridad.',
    },
    {
      name: 'Invitación especial',
      subject: 'Invitación exclusiva',
      content: 'Hola {nombre}, te invitamos a nuestro servicio de atención preferente. Como paciente VIP, disfruta de beneficios exclusivos. ¿Te gustaría conocer más?',
    },
  ],
  promocion: [
    {
      name: 'Promoción del mes',
      subject: '¡Promoción especial! 🎉',
      content: '¡Hola {nombre}! Este mes tenemos {descuento}% de descuento en {servicio}. Agenda tu cita y aprovecha esta oferta. ¡Cupos limitados!',
    },
    {
      name: 'Nuevo servicio',
      subject: '¡Nuevo servicio disponible!',
      content: 'Hola {nombre}, nos complace anunciarte nuestro nuevo servicio de {servicio}. Sé de los primeros en probarlo con precio especial de introducción.',
    },
  ],
  recordatorio: [
    {
      name: 'Recordatorio de cita',
      subject: 'Recordatorio de tu cita 📅',
      content: 'Hola {nombre}, te recordamos que tienes cita el {fecha} a las {hora}. Si necesitas reprogramar, responde a este mensaje. ¡Te esperamos!',
    },
    {
      name: 'Revisión anual',
      subject: 'Es tiempo de tu revisión anual',
      content: 'Hola {nombre}, ya pasó un año desde tu última revisión. Es importante mantener tu salud al día. Agenda tu revisión anual con nosotros.',
    },
  ],
}

// ─── ANIMATION VARIANTS ─────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

// ─── SPARKLINE COMPONENT ────────────────────────────────────────

function MiniSparkline({ data, color, width = 60, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── KPI CARD COMPONENT ─────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  sparkData,
  sparkColor,
  isLoading,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend: number
  trendLabel: string
  sparkData: number[]
  sparkColor: string
  isLoading: boolean
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-4 w-4 animate-spin text-[#534AB7]" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#F1EFE8]">
                  <span className="text-[#534AB7]">{icon}</span>
                </div>
                <MiniSparkline data={sparkData} color={sparkColor} />
              </div>
              <p className="text-xl font-semibold text-[#2C2C2A] tracking-[-0.03em]">{value}</p>
              {trend !== 0 && trendLabel ? (
                <div className="flex items-center gap-1 mt-0.5">
                  {trend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-[#1D9E75]" />
                  ) : trend < 0 ? (
                    <TrendingDown className="h-3 w-3 text-[#E53E3E]" />
                  ) : null}
                  <span className={`text-[10px] font-medium ${trend > 0 ? 'text-[#1D9E75]' : trend < 0 ? 'text-[#E53E3E]' : 'text-[#888780]'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                  </span>
                  <span className="text-[10px] text-[#888780]">{trendLabel}</span>
                </div>
              ) : (
                <div className="h-4 mt-0.5" />
              )}
              <p className="text-[10px] text-[#888780] mt-0.5">{label}</p>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────

export function GrowMarketing() {
  const { clinicId, setClinicId, clinicSlug } = useSinapStore()
  const [patientSegments, setPatientSegments] = useState<PatientSegments>({ new: 0, active: 0, inactive: 0, churned: 0, vip: 0 })
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Campaign dialog state
  const [showCampaignDialog, setShowCampaignDialog] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [campaignType, setCampaignType] = useState('reactivacion')
  const [campaignChannel, setCampaignChannel] = useState('whatsapp')
  const [campaignSegment, setCampaignSegment] = useState('inactive')
  const [campaignSubject, setCampaignSubject] = useState('')
  const [campaignContent, setCampaignContent] = useState('')
  const [campaignScheduledAt, setCampaignScheduledAt] = useState('')
  const [estimatedRecipients, setEstimatedRecipients] = useState(0)
  const [isSavingCampaign, setIsSavingCampaign] = useState(false)
  const [isSendingCampaign, setIsSendingCampaign] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all')

  // Detail view state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [detailRecipients, setDetailRecipients] = useState<Array<{ id: string; fullName: string; phone: string | null; segment: string }>>([])

  // Edit state
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  // AI Chat state
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Smart Alerts state
  const [alerts, setAlerts] = useState<SmartAlert[]>([])

  // ─── COMPUTED KPI DATA ────────────────────────────────────────

  const totalPatients = patientSegments.new + patientSegments.active + patientSegments.inactive + patientSegments.churned + patientSegments.vip
  const retentionRate = totalPatients > 0 ? Math.round(((patientSegments.active + patientSegments.vip) / totalPatients) * 100) : 0
  const reactivationRate = totalPatients > 0 ? Math.round((Math.max(patientSegments.active - patientSegments.new, 0) / Math.max(totalPatients - patientSegments.active - patientSegments.vip, 1)) * 100) : 0
  const hasData = totalPatients > 0

  // Trend data only shown when there's real data
  const makeSparkData = (base: number) => hasData ? [
    Math.max(0, base * 0.7),
    Math.max(0, base * 0.85),
    Math.max(0, base * 0.75),
    Math.max(0, base * 0.9),
    Math.max(0, base * 0.95),
    base,
  ] : []

  const kpiCards = [
    {
      icon: <Users className="h-4 w-4" />,
      label: 'Pacientes totales',
      value: hasData ? totalPatients.toLocaleString('es-MX') : '—',
      trend: 0,
      trendLabel: '',
      sparkData: makeSparkData(totalPatients),
      sparkColor: '#1D9E75',
    },
    {
      icon: <RefreshCw className="h-4 w-4" />,
      label: 'Tasa de retención',
      value: hasData ? `${retentionRate}%` : '—',
      trend: 0,
      trendLabel: '',
      sparkData: makeSparkData(retentionRate),
      sparkColor: '#534AB7',
    },
    {
      icon: <Wallet className="h-4 w-4" />,
      label: 'LTV promedio',
      value: '—',
      trend: 0,
      trendLabel: '',
      sparkData: [],
      sparkColor: '#D97706',
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: 'Tasa de reactivación',
      value: hasData ? `${reactivationRate}%` : '—',
      trend: 0,
      trendLabel: '',
      sparkData: makeSparkData(reactivationRate),
      sparkColor: '#1D9E75',
    },
    {
      icon: <Stethoscope className="h-4 w-4" />,
      label: 'Citas este mes',
      value: '—',
      trend: 0,
      trendLabel: '',
      sparkData: [],
      sparkColor: '#534AB7',
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: 'Ingreso mensual',
      value: '—',
      trend: 0,
      trendLabel: '',
      sparkData: [],
      sparkColor: '#1D9E75',
    },
  ]

  // ─── AI PREDICTIONS (computed from analytics data) ─────────────

  const aiPredictions = (() => {
    // No predictions without real data
    if (!hasData) return []

    const predictions: Array<{ icon: React.ReactNode; text: string; color: string }> = []

    // Prediction 1: Reactivation potential
    const reactivableEstimate = Math.round(patientSegments.inactive * 0.25)
    if (patientSegments.inactive > 0) {
      predictions.push({
        icon: <Zap className="h-4 w-4" />,
        text: `Se estima que ${reactivableEstimate} pacientes inactivos pueden reactivarse este mes`,
        color: '#D97706',
      })
    }

    // Prediction 2: Cancellation risk
    const churnedRate = totalPatients > 0 ? (patientSegments.churned / totalPatients) * 100 : 0
    const cancellationRisk = Math.min(100, Math.round(churnedRate + 5))
    if (patientSegments.churned > 0) {
      predictions.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `La tasa de cancelación podría subir a ${cancellationRisk}% la próxima semana`,
        color: '#E53E3E',
      })
    }

    // Prediction 3: VIP growth potential
    const vipRate = totalPatients > 0 ? (patientSegments.vip / totalPatients) * 100 : 0
    if (patientSegments.vip > 0 || patientSegments.active > 0) {
      const vipGrowthPotential = Math.round(15 + vipRate * 0.5)
      predictions.push({
        icon: <Crown className="h-4 w-4" />,
        text: `El segmento VIP tiene potencial de crecimiento del ${vipGrowthPotential}%`,
        color: '#534AB7',
      })
    }

    // Prediction 4: Reactivation campaign recommendation
    if (patientSegments.inactive > totalPatients * 0.2) {
      predictions.push({
        icon: <Send className="h-4 w-4" />,
        text: `Recomendación: lanzar campaña de reactivación para ${patientSegments.inactive} pacientes inactivos`,
        color: '#1D9E75',
      })
    } else if (patientSegments.inactive > 0) {
      predictions.push({
        icon: <Send className="h-4 w-4" />,
        text: `Considera enviar un seguimiento a ${patientSegments.inactive} pacientes inactivos`,
        color: '#1D9E75',
      })
    }

    // Prediction 5: VIP upgrade campaign if VIP < 5%
    if (vipRate < 5 && patientSegments.active > 3) {
      predictions.push({
        icon: <TrendingUp className="h-4 w-4" />,
        text: `Solo el ${vipRate.toFixed(1)}% son VIP. Sugiere upgrade a ${patientSegments.active} pacientes activos`,
        color: '#534AB7',
      })
    }

    return predictions
  })()

  // ─── SMART ALERTS (computed from data) ─────────────────────────

  useEffect(() => {
    // No alerts without real data
    if (!hasData) {
      setAlerts([])
      return
    }

    const generatedAlerts: SmartAlert[] = []

    // Alert: Patients without follow-up
    const noFollowUp = Math.round(patientSegments.inactive * 0.6)
    if (noFollowUp > 0) {
      generatedAlerts.push({
        id: 'no-followup',
        type: 'warning',
        icon: <AlertTriangle className="h-4 w-4" />,
        message: `${noFollowUp} pacientes sin seguimiento hace más de 30 días`,
        dismissed: false,
      })
    }

    // Alert: Conversion rate drop
    if (funnelData.length >= 2) {
      const leadToFirst = funnelData[0].count > 0 ? (funnelData[1].count / funnelData[0].count) * 100 : 0
      if (leadToFirst < 50 && leadToFirst > 0) {
        generatedAlerts.push({
          id: 'conversion-drop',
          type: 'info',
          icon: <BarChart3 className="h-4 w-4" />,
          message: `Tasa de conversión bajó un ${Math.round(50 - leadToFirst)}% esta semana`,
          dismissed: false,
        })
      }
    }

    // Alert: VIP patients without appointment
    const vipNoAppt = Math.round(patientSegments.vip * 0.3)
    if (vipNoAppt > 0) {
      generatedAlerts.push({
        id: 'vip-no-appt',
        type: 'warning',
        icon: <Target className="h-4 w-4" />,
        message: `${vipNoAppt} pacientes VIP sin cita este mes`,
        dismissed: false,
      })
    }

    // Alert: Best time to send campaign (only show when there are campaigns or patients)
    if (campaigns.length > 0 || patientSegments.active > 0) {
      generatedAlerts.push({
        id: 'best-time',
        type: 'tip',
        icon: <Lightbulb className="h-4 w-4" />,
        message: 'Mejor momento para enviar campaña: martes 10am',
        dismissed: false,
      })
    }

    setAlerts(generatedAlerts)
  }, [patientSegments, funnelData, hasData, campaigns.length])

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a))
  }

  const activeAlerts = alerts.filter(a => !a.dismissed)

  const alertBorderColor: Record<string, string> = {
    warning: '#D97706',
    info: '#534AB7',
    success: '#1D9E75',
    tip: '#D97706',
  }

  const alertBgColor: Record<string, string> = {
    warning: '#FEF3C7',
    info: '#EEEDFE',
    success: '#E1F5EE',
    tip: '#FEF3C7',
  }

  // ─── AI CHAT ───────────────────────────────────────────────────

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsChatLoading(true)

    try {
      const clinicData = {
        patientSegments,
        funnelData,
        campaigns: campaigns.map(c => ({
          name: c.name,
          type: c.campaignType,
          status: c.status,
          segment: c.segment,
          recipientCount: c.recipientCount,
          responseRate: c.responseRate,
        })),
        totalPatients,
        retentionRate,
      }

      const messagesPayload = [
        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage },
      ]

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesPayload, clinicData }),
      })

      if (res.ok) {
        const data = await res.json()
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message || 'No pude generar una respuesta.' }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu pregunta. Intenta de nuevo.' }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error de conexión. Intenta de nuevo.' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, isChatLoading])

  // ─── RESOLVE CLINIC ID ─────────────────────────────────────────

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

  // ─── FETCH DATA ────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    if (!clinicId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/analytics?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.patientSegments) {
          setPatientSegments(data.patientSegments)
        }
        if (data.funnelData) {
          setFunnelData(data.funnelData)
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clinicId])

  const fetchCampaigns = useCallback(async () => {
    if (!clinicId) return
    try {
      const res = await fetch(`/api/campaigns?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    }
  }, [clinicId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Estimate recipients when segment changes
  useEffect(() => {
    if (!clinicId) return
    async function estimate() {
      try {
        const segmentFilter = campaignSegment === 'all' ? '' : `&segment=${campaignSegment}`
        const res = await fetch(`/api/patients?clinicId=${clinicId}${segmentFilter}&limit=1000`)
        if (res.ok) {
          const data = await res.json()
          setEstimatedRecipients(data.patients?.length || data.total || 0)
        }
      } catch {
        setEstimatedRecipients(0)
      }
    }
    if (showCampaignDialog) {
      estimate()
    }
  }, [campaignSegment, showCampaignDialog, clinicId])

  // Auto-suggest segment based on campaign type
  useEffect(() => {
    if (!showCampaignDialog) return
    const segmentMap: Record<string, string> = {
      reactivacion: 'inactive',
      retencion: 'active',
      vip: 'vip',
      promocion: 'all',
      recordatorio: 'active',
    }
    setCampaignSegment(segmentMap[campaignType] || 'all')
  }, [campaignType, showCampaignDialog])

  const maxFunnel = Math.max(...funnelData.map((d) => d.count), 1)

  // Filtered campaigns
  const filteredCampaigns = statusFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter)

  // ─── CAMPAIGN CRUD ──────────────────────────────────────────

  const handleSaveCampaign = async (sendNow: boolean) => {
    if (!campaignName.trim() || !campaignContent.trim()) return

    if (sendNow) {
      setIsSendingCampaign(true)
    } else {
      setIsSavingCampaign(true)
    }

    try {
      const status = sendNow
        ? 'active'
        : campaignScheduledAt
          ? 'scheduled'
          : 'draft'

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          name: campaignName,
          type: campaignChannel,
          campaignType,
          channel: campaignChannel,
          segment: campaignSegment,
          subject: campaignChannel === 'email' || campaignChannel === 'both' ? campaignSubject : null,
          content: campaignContent,
          scheduledAt: sendNow ? null : (campaignScheduledAt || null),
          status,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        fetchCampaigns()
        resetCampaignForm()
        setShowCampaignDialog(false)

        // If sending now, trigger the actual send via Meta API
        if (sendNow && data.campaign?.id) {
          try {
            await fetch(`/api/campaigns/${data.campaign.id}/send`, {
              method: 'POST',
            })
            fetchCampaigns() // Refresh with updated stats
          } catch (sendErr) {
            console.error('Campaign send error:', sendErr)
          }
        }
      }
    } catch (err) {
      console.error('Failed to create campaign:', err)
    } finally {
      setIsSavingCampaign(false)
      setIsSendingCampaign(false)
    }
  }

  const handleUpdateCampaign = async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        fetchCampaigns()
      }
    } catch (err) {
      console.error('Failed to update campaign:', err)
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id))
        if (selectedCampaign?.id === id) {
          setShowDetailSheet(false)
          setSelectedCampaign(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err)
    }
  }

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          name: `${campaign.name} (copia)`,
          type: campaign.channel,
          campaignType: campaign.campaignType,
          channel: campaign.channel,
          segment: campaign.segment,
          subject: campaign.subject,
          content: campaign.content,
          status: 'draft',
        }),
      })
      if (res.ok) {
        fetchCampaigns()
      }
    } catch (err) {
      console.error('Failed to duplicate campaign:', err)
    }
  }

  const handlePauseResume = (campaign: Campaign) => {
    const newStatus = campaign.status === 'paused' ? 'active' : 'paused'
    handleUpdateCampaign(campaign.id, { status: newStatus })
  }

  const openEditDialog = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setCampaignName(campaign.name)
    setCampaignType(campaign.campaignType || 'promocion')
    setCampaignChannel(campaign.channel || campaign.type || 'whatsapp')
    setCampaignSegment(campaign.segment)
    setCampaignSubject(campaign.subject || '')
    setCampaignContent(campaign.content)
    setCampaignScheduledAt(campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : '')
    setShowCampaignDialog(true)
  }

  const handleEditSave = async (sendNow: boolean) => {
    if (!editingCampaign || !campaignName.trim() || !campaignContent.trim()) return

    setIsSavingCampaign(true)
    try {
      const updates: Record<string, unknown> = {
        name: campaignName,
        campaignType,
        channel: campaignChannel,
        type: campaignChannel,
        segment: campaignSegment,
        subject: campaignChannel === 'email' || campaignChannel === 'both' ? campaignSubject : null,
        content: campaignContent,
      }
      if (sendNow) {
        updates.status = 'active'
      }
      if (campaignScheduledAt) {
        updates.scheduledAt = campaignScheduledAt
        if (!sendNow) updates.status = 'scheduled'
      }

      const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        fetchCampaigns()
        resetCampaignForm()
        setShowCampaignDialog(false)
        setEditingCampaign(null)
      }
    } catch (err) {
      console.error('Failed to update campaign:', err)
    } finally {
      setIsSavingCampaign(false)
    }
  }

  const openDetail = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setShowDetailSheet(true)
    if (clinicId) {
      try {
        const segmentFilter = campaign.segment === 'all' ? '' : `&segment=${campaign.segment}`
        const res = await fetch(`/api/patients?clinicId=${clinicId}${segmentFilter}&limit=50`)
        if (res.ok) {
          const data = await res.json()
          setDetailRecipients(
            (data.patients || []).map((p: { id: string; fullName: string; phone: string | null; segment: string }) => ({
              id: p.id,
              fullName: p.fullName,
              phone: p.phone,
              segment: p.segment,
            }))
          )
        }
      } catch {
        setDetailRecipients([])
      }
    }
  }

  const applyTemplate = (template: { subject?: string; content: string }) => {
    if (template.subject) setCampaignSubject(template.subject)
    setCampaignContent(template.content)
    setShowTemplates(false)
  }

  const resetCampaignForm = () => {
    setCampaignName('')
    setCampaignType('reactivacion')
    setCampaignChannel('whatsapp')
    setCampaignSegment('inactive')
    setCampaignSubject('')
    setCampaignContent('')
    setCampaignScheduledAt('')
    setEstimatedRecipients(0)
    setShowTemplates(false)
    setEditingCampaign(null)
  }

  // ─── HELPERS ────────────────────────────────────────────────

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statPercent = (count: number, total: number) => total > 0 ? Math.round((count / total) * 100) : 0

  // ─── RENDER ─────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6 pb-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: KPI DASHBOARD
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi, i) => (
          <KPICard
            key={i}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            trendLabel={kpi.trendLabel}
            sparkData={kpi.sparkData}
            sparkColor={kpi.sparkColor}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: AI PREDICTIONS
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#E1F5EE] bg-white overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#534AB7] to-[#1D9E75]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#EEEDFE] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[#534AB7]" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
                    Predicciones IA
                  </CardTitle>
                  <p className="text-[10px] text-[#888780]">Basadas en tus datos actuales</p>
                </div>
              </div>
              <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                Sinap Grow
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
              </div>
            ) : aiPredictions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="h-8 w-8 text-[#888780]/30 mb-2" />
                <p className="text-xs text-[#888780]">Se necesitan más datos para generar predicciones</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiPredictions.map((pred, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[#F8F7F3] hover:bg-[#F1EFE8] transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${pred.color}15`, color: pred.color }}
                    >
                      {pred.icon}
                    </div>
                    <p className="text-xs text-[#2C2C2A] leading-relaxed">{pred.text}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: SMART ALERTS + PATIENT SEGMENTS ROW
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Smart Alerts */}
        {activeAlerts.length > 0 && (
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card className="border-[#E1F5EE] bg-white h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#D97706]" />
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Alertas inteligentes
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <AnimatePresence>
                    {activeAlerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        className="relative p-3 rounded-lg"
                        style={{
                          borderLeft: `3px solid ${alertBorderColor[alert.type]}`,
                          backgroundColor: alertBgColor[alert.type],
                        }}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-start gap-2 pr-5">
                          <span className="shrink-0 mt-0.5">{alert.icon}</span>
                          <p className="text-[11px] text-[#2C2C2A] leading-relaxed">{alert.message}</p>
                        </div>
                        <button
                          className="absolute top-2 right-2 text-[#888780] hover:text-[#2C2C2A] transition-colors"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Patient Segments */}
        <motion.div variants={itemVariants} className={activeAlerts.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <Card className="border-[#E1F5EE] bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-center h-16">
                        <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              Object.entries(patientSegments).map(([key, count]) => {
                const config = segmentConfig[key]
                if (!config) return null
                const pct = totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0
                return (
                  <motion.div key={key} variants={itemVariants}>
                    <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <motion.div
                          className="h-9 w-9 rounded-lg flex items-center justify-center mb-3"
                          style={{ backgroundColor: config.bg }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <span style={{ color: config.color }}>{config.icon}</span>
                        </motion.div>
                        <p className="text-2xl font-medium text-[#2C2C2A] tracking-[-0.03em]">{count}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-[#888780]">{config.label}</p>
                          <span className="text-[10px] font-medium" style={{ color: config.color }}>{pct}%</span>
                        </div>
                        <div className="h-1 bg-[#F1EFE8] rounded-full overflow-hidden mt-1.5">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: config.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: FUNNEL + CAMPAIGNS (existing)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Funnel visualization */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Embudo de conversión
                </CardTitle>
                <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Sinap Sight
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#534AB7]" />
                </div>
              ) : funnelData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="h-8 w-8 text-[#888780]/30 mb-2" />
                  <p className="text-xs text-[#888780]">Sin datos de embudo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {funnelData.map((stage, i) => (
                    <motion.div
                      key={stage.stage}
                      className="space-y-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#2C2C2A] font-medium">{stage.stage}</span>
                        <span className="text-sm text-[#888780]">{stage.count}</span>
                      </div>
                      <div className="h-8 bg-[#F1EFE8] rounded-lg overflow-hidden">
                        <motion.div
                          className="h-full rounded-lg flex items-center justify-end pr-3"
                          style={{ backgroundColor: stage.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                        >
                          <span className="text-[10px] text-white font-medium">
                            {Math.round((stage.count / maxFunnel) * 100)}%
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              <motion.div
                className="mt-4 p-3 bg-[#EEEDFE] rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#534AB7]" />
                  <span className="text-xs font-medium text-[#534AB7]">Insight IA</span>
                </div>
                <p className="text-xs text-[#2C2C2A] mt-1">
                  {funnelData.length >= 2 && funnelData[1].count > 0
                    ? `Tasa de conversión Lead a Primera cita: ${Math.round((funnelData[1].count / Math.max(funnelData[0].count, 1)) * 100)}%. ${funnelData[1].count > 0 ? 'El punto de mayor caída es Recurrente a VIP.' : 'Necesitas más datos para insights.'}`
                    : 'Necesitas más datos de pacientes para generar insights del embudo.'}
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Campaigns */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Campañas de marketing
                </CardTitle>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-7 text-xs"
                    onClick={() => {
                      resetCampaignForm()
                      setShowCampaignDialog(true)
                    }}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Nueva campaña
                  </Button>
                </motion.div>
              </div>
            </CardHeader>
            <Separator className="bg-[#E1F5EE]" />

            {/* Status filter tabs */}
            <div className="px-3 pt-3 flex gap-1.5 flex-wrap">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'draft', label: 'Borradores' },
                { key: 'active', label: 'Activas' },
                { key: 'scheduled', label: 'Programadas' },
                { key: 'completed', label: 'Completadas' },
                { key: 'paused', label: 'Pausadas' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-[#534AB7] text-white'
                      : 'bg-[#F1EFE8] text-[#888780] hover:bg-[#E1F5EE]'
                  }`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                  {tab.key !== 'all' && (
                    <span className="ml-1 opacity-70">
                      {campaigns.filter(c => c.status === tab.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <ScrollArea className="max-h-[calc(100vh-420px)]">
              <div className="p-3 space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                  </div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Send className="h-8 w-8 text-[#888780]/30 mb-2" />
                    <p className="text-xs text-[#888780]">
                      {statusFilter === 'all' ? 'No hay campañas' : `No hay campañas ${statusLabels[statusFilter]?.label?.toLowerCase() || ''}`}
                    </p>
                    <p className="text-[10px] text-[#888780]/70 mt-1">
                      {statusFilter === 'all' ? 'Crea una campaña para reactivar pacientes' : 'Cambia el filtro o crea una nueva campaña'}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredCampaigns.map((camp, i) => {
                      const sConfig = statusLabels[camp.status] || statusLabels.draft
                      const ctConfig = campaignTypeConfig[camp.campaignType] || campaignTypeConfig.promocion
                      return (
                        <motion.div
                          key={camp.id}
                          className="p-3 rounded-lg bg-[#F1EFE8] hover:bg-[#F1EFE8]/80 transition-colors group cursor-pointer"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={{ x: 2 }}
                          onClick={() => openDetail(camp)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span style={{ color: ctConfig.color }}>
                                {ctConfig.icon}
                              </span>
                              <span className="text-sm font-medium text-[#2C2C2A] truncate">{camp.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge
                                className="text-[9px] border-0"
                                style={{ backgroundColor: ctConfig.bg, color: ctConfig.color }}
                              >
                                {ctConfig.label}
                              </Badge>
                              <Badge
                                className="text-[9px] border-0"
                                style={{ backgroundColor: sConfig.bg, color: sConfig.color }}
                              >
                                {sConfig.label}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#888780] hover:text-[#2C2C2A] rounded hover:bg-white/50">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(camp) }}>
                                    <Eye className="h-3.5 w-3.5 mr-2" /> Ver detalle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(camp) }}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  {(camp.status === 'active' || camp.status === 'paused') && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePauseResume(camp) }}>
                                      {camp.status === 'paused' ? (
                                        <><Play className="h-3.5 w-3.5 mr-2" /> Reanudar</>
                                      ) : (
                                        <><Pause className="h-3.5 w-3.5 mr-2" /> Pausar</>
                                      )}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateCampaign(camp) }}>
                                    <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-[#E53E3E] focus:text-[#E53E3E]"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(camp.id) }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#888780]">
                            <span className="flex items-center gap-1">
                              {channelIcons[camp.channel] || channelIcons.whatsapp}
                              {channelLabels[camp.channel] || camp.channel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {segmentLabels[camp.segment] || camp.segment}
                            </span>
                            <span>{camp.recipientCount} destinatarios</span>
                          </div>

                          {/* Stats bar for sent campaigns */}
                          {camp.sentAt && (
                            <div className="mt-2 space-y-1.5">
                              <div className="grid grid-cols-4 gap-2 text-[10px]">
                                <div className="flex items-center gap-1">
                                  <Send className="h-2.5 w-2.5 text-[#888780]" />
                                  <span className="text-[#888780]">{camp.sentCount}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-[#1D9E75]" />
                                  <span className="text-[#1D9E75]">{camp.deliveredCount}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="h-2.5 w-2.5 text-[#534AB7]" />
                                  <span className="text-[#534AB7]">{camp.openedCount}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ArrowRight className="h-2.5 w-2.5 text-[#D97706]" />
                                  <span className="text-[#D97706]">{camp.respondedCount}</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-white rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-[#1D9E75] rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${camp.responseRate * 100}%` }}
                                  transition={{ duration: 0.6, delay: 0.3 }}
                                />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </Card>
        </motion.div>
      </div>

      {/* ─── CAMPAIGN CREATION / EDIT DIALOG ──────────────────── */}
      <Dialog open={showCampaignDialog} onOpenChange={(open) => {
        setShowCampaignDialog(open)
        if (!open) resetCampaignForm()
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#2C2C2A]">
              {editingCampaign ? 'Editar campaña' : 'Nueva campaña'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Campaign name */}
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Nombre de la campaña</Label>
              <Input
                className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7]"
                placeholder="Ej: Reactivación pacientes inactivos"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            {/* Campaign type + Channel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Tipo de campaña</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(campaignTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: config.color }}>{config.icon}</span>
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Canal</Label>
                <Select value={campaignChannel} onValueChange={setCampaignChannel}>
                  <SelectTrigger className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-[#534AB7]" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="both">
                      <div className="flex items-center gap-2">
                        <Send className="h-3.5 w-3.5 text-[#D97706]" />
                        Ambos
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target segment */}
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Segmento objetivo</Label>
              <Select value={campaignSegment} onValueChange={setCampaignSegment}>
                <SelectTrigger className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pacientes</SelectItem>
                  <SelectItem value="new">Nuevos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="churned">Perdidos</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
              {campaignTypeConfig[campaignType] && (
                <p className="text-[10px] text-[#888780]">
                  {campaignTypeConfig[campaignType].description}
                </p>
              )}
            </div>

            {/* Email subject (for email or both channels) */}
            {(campaignChannel === 'email' || campaignChannel === 'both') && (
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Asunto del email</Label>
                <Input
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7]"
                  placeholder="Ej: Te extrañamos en la clínica"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                />
              </div>
            )}

            {/* AI Templates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#888780]">Mensaje</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-[#534AB7] hover:text-[#534AB7]"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Plantillas IA
                </Button>
              </div>

              {/* AI Template suggestions */}
              <AnimatePresence>
                {showTemplates && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 mb-2">
                      {(aiTemplates[campaignType] || []).map((template, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left p-2.5 rounded-lg bg-[#EEEDFE] hover:bg-[#534AB7]/10 transition-colors border border-transparent hover:border-[#534AB7]/20"
                          onClick={() => applyTemplate(template)}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="h-3 w-3 text-[#534AB7]" />
                            <span className="text-xs font-medium text-[#534AB7]">{template.name}</span>
                          </div>
                          <p className="text-[10px] text-[#888780] line-clamp-2">{template.content}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Textarea
                className="min-h-[120px] text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7] resize-none"
                placeholder="Escribe el mensaje de tu campaña... Usa {nombre}, {descuento}, {servicio}, {fecha}, {hora} como variables."
                value={campaignContent}
                onChange={(e) => setCampaignContent(e.target.value)}
              />
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label className="text-xs text-[#888780] flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Programar envío (opcional)
              </Label>
              <Input
                type="datetime-local"
                className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7]"
                value={campaignScheduledAt}
                onChange={(e) => setCampaignScheduledAt(e.target.value)}
              />
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-[#F1EFE8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#2C2C2A]">Vista previa</span>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[9px]">
                    {campaignTypeConfig[campaignType]?.label}
                  </Badge>
                  <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[9px]">
                    {channelLabels[campaignChannel]}
                  </Badge>
                  <Badge className="bg-[#F1EFE8] text-[#888780] border-0 text-[9px]">
                    {segmentLabels[campaignSegment]}
                  </Badge>
                </div>
              </div>
              {(campaignSubject && (campaignChannel === 'email' || campaignChannel === 'both')) && (
                <p className="text-xs font-medium text-[#2C2C2A]">Asunto: {campaignSubject}</p>
              )}
              {campaignContent && (
                <p className="text-xs text-[#888780] line-clamp-3">{campaignContent}</p>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-[#1D9E75]">
                <Users className="h-3 w-3" />
                ~{estimatedRecipients} destinatarios estimados
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-xs h-8 border-[#E1F5EE]"
              onClick={() => editingCampaign ? handleEditSave(false) : handleSaveCampaign(false)}
              disabled={isSavingCampaign || isSendingCampaign || !campaignName.trim() || !campaignContent.trim()}
            >
              {isSavingCampaign ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              {editingCampaign ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>
            <Button
              className="text-xs h-8 bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
              onClick={() => editingCampaign ? handleEditSave(true) : handleSaveCampaign(true)}
              disabled={isSavingCampaign || isSendingCampaign || !campaignName.trim() || !campaignContent.trim()}
            >
              {isSendingCampaign ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
              {editingCampaign ? 'Guardar y lanzar' : 'Lanzar ahora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CAMPAIGN DETAIL SHEET ────────────────────────────── */}
      <Sheet open={showDetailSheet} onOpenChange={(open) => {
        setShowDetailSheet(open)
        if (!open) setSelectedCampaign(null)
      }}>
        <SheetContent className="sm:max-w-[540px] w-full overflow-y-auto">
          {selectedCampaign && (() => {
            const camp = selectedCampaign
            const sConfig = statusLabels[camp.status] || statusLabels.draft
            const ctConfig = campaignTypeConfig[camp.campaignType] || campaignTypeConfig.promocion
            const total = camp.recipientCount || 1
            const deliveredPct = statPercent(camp.deliveredCount, total)
            const openedPct = statPercent(camp.openedCount, total)
            const respondedPct = statPercent(camp.respondedCount, total)

            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <SheetTitle className="text-[#2C2C2A] text-lg">{camp.name}</SheetTitle>
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-[10px] border-0"
                          style={{ backgroundColor: ctConfig.bg, color: ctConfig.color }}
                        >
                          {ctConfig.icon}
                          <span className="ml-1">{ctConfig.label}</span>
                        </Badge>
                        <Badge
                          className="text-[10px] border-0"
                          style={{ backgroundColor: sConfig.bg, color: sConfig.color }}
                        >
                          {sConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => { openEditDialog(camp); setShowDetailSheet(false) }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        {(camp.status === 'active' || camp.status === 'paused') && (
                          <DropdownMenuItem onClick={() => handlePauseResume(camp)}>
                            {camp.status === 'paused' ? (
                              <><Play className="h-3.5 w-3.5 mr-2" /> Reanudar</>
                            ) : (
                              <><Pause className="h-3.5 w-3.5 mr-2" /> Pausar</>
                            )}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicateCampaign(camp)}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[#E53E3E] focus:text-[#E53E3E]"
                          onClick={() => handleDeleteCampaign(camp.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Campaign info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#F1EFE8]">
                      <span className="text-[#888780]">Canal</span>
                      <div className="flex items-center gap-1.5 mt-1 font-medium text-[#2C2C2A]">
                        {channelIcons[camp.channel]}
                        {channelLabels[camp.channel] || camp.channel}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F1EFE8]">
                      <span className="text-[#888780]">Segmento</span>
                      <div className="flex items-center gap-1.5 mt-1 font-medium text-[#2C2C2A]">
                        <Target className="h-3.5 w-3.5" />
                        {segmentLabels[camp.segment] || camp.segment}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F1EFE8]">
                      <span className="text-[#888780]">Creada</span>
                      <div className="mt-1 font-medium text-[#2C2C2A]">{formatDate(camp.createdAt)}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F1EFE8]">
                      <span className="text-[#888780]">{camp.sentAt ? 'Enviada' : camp.scheduledAt ? 'Programada' : 'Estado'}</span>
                      <div className="mt-1 font-medium text-[#2C2C2A]">
                        {camp.sentAt ? formatDate(camp.sentAt) : camp.scheduledAt ? formatDate(camp.scheduledAt) : 'Sin enviar'}
                      </div>
                    </div>
                  </div>

                  {/* Stats dashboard */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-[#2C2C2A]">Estadísticas</h3>

                    {/* Stat cards */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-lg bg-[#F8F7F3] text-center">
                        <Send className="h-4 w-4 mx-auto text-[#888780] mb-1" />
                        <p className="text-lg font-medium text-[#2C2C2A]">{camp.sentCount}</p>
                        <p className="text-[9px] text-[#888780]">Enviados</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#E1F5EE] text-center">
                        <CheckCircle2 className="h-4 w-4 mx-auto text-[#1D9E75] mb-1" />
                        <p className="text-lg font-medium text-[#1D9E75]">{camp.deliveredCount}</p>
                        <p className="text-[9px] text-[#888780]">Entregados</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#EEEDFE] text-center">
                        <Eye className="h-4 w-4 mx-auto text-[#534AB7] mb-1" />
                        <p className="text-lg font-medium text-[#534AB7]">{camp.openedCount}</p>
                        <p className="text-[9px] text-[#888780]">Abiertos</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#FEF3C7] text-center">
                        <ArrowRight className="h-4 w-4 mx-auto text-[#D97706] mb-1" />
                        <p className="text-lg font-medium text-[#D97706]">{camp.respondedCount}</p>
                        <p className="text-[9px] text-[#888780]">Respondidos</p>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#888780]">Tasa de entrega</span>
                          <span className="text-[10px] font-medium text-[#1D9E75]">{deliveredPct}%</span>
                        </div>
                        <Progress value={deliveredPct} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#888780]">Tasa de apertura</span>
                          <span className="text-[10px] font-medium text-[#534AB7]">{openedPct}%</span>
                        </div>
                        <Progress value={openedPct} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#888780]">Tasa de respuesta</span>
                          <span className="text-[10px] font-medium text-[#D97706]">{respondedPct}%</span>
                        </div>
                        <Progress value={respondedPct} className="h-2" />
                      </div>
                    </div>

                    {/* AI Insight */}
                    <motion.div
                      className="p-3 bg-[#EEEDFE] rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#534AB7]" />
                        <span className="text-xs font-medium text-[#534AB7]">Insight IA</span>
                      </div>
                      <p className="text-xs text-[#2C2C2A] mt-1">
                        {respondedPct > 20
                          ? `Excelente rendimiento. La tasa de respuesta del ${respondedPct}% esta por encima del promedio del sector salud. Considera replicar esta estrategia.`
                          : respondedPct > 0
                            ? `La tasa de respuesta del ${respondedPct}% esta dentro del rango esperado. Prueba con un mensaje mas personalizado o un mejor horario de envio.`
                            : 'La campana aun no tiene respuestas. Si acaba de ser lanzada, espera algunas horas para ver resultados.'}
                      </p>
                    </motion.div>
                  </div>

                  {/* Message preview */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-[#2C2C2A]">Vista previa del mensaje</h3>
                    <div className="p-4 rounded-lg bg-[#F1EFE8] space-y-2">
                      {(camp.subject && (camp.channel === 'email' || camp.channel === 'both')) && (
                        <div>
                          <span className="text-[10px] text-[#888780]">Asunto:</span>
                          <p className="text-xs font-medium text-[#2C2C2A]">{camp.subject}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-[#888780]">Mensaje:</span>
                        <p className="text-xs text-[#2C2C2A] whitespace-pre-wrap mt-0.5">{camp.content}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recipient list */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-[#2C2C2A]">
                      Destinatarios ({camp.recipientCount})
                    </h3>
                    <ScrollArea className="max-h-64">
                      <div className="space-y-1.5">
                        {detailRecipients.length === 0 ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-[#534AB7]" />
                          </div>
                        ) : (
                          detailRecipients.map((r) => {
                            const rSegConfig = segmentConfig[r.segment]
                            return (
                              <div
                                key={r.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[#F8F7F3] hover:bg-[#F1EFE8] transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium"
                                    style={{
                                      backgroundColor: rSegConfig?.bg || '#F1EFE8',
                                      color: rSegConfig?.color || '#888780',
                                    }}
                                  >
                                    {r.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-[#2C2C2A]">{r.fullName}</p>
                                    <p className="text-[10px] text-[#888780]">{r.phone || 'Sin telefono'}</p>
                                  </div>
                                </div>
                                <Badge
                                  className="text-[9px] border-0"
                                  style={{
                                    backgroundColor: rSegConfig?.bg || '#F1EFE8',
                                    color: rSegConfig?.color || '#888780',
                                  }}
                                >
                                  {rSegConfig?.label || r.segment}
                                </Badge>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-8 border-[#E1F5EE]"
                      onClick={() => { openEditDialog(camp); setShowDetailSheet(false) }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    {(camp.status === 'active' || camp.status === 'paused') && (
                      <Button
                        variant="outline"
                        className="flex-1 text-xs h-8 border-[#E1F5EE]"
                        onClick={() => handlePauseResume(camp)}
                      >
                        {camp.status === 'paused' ? (
                          <><Play className="h-3 w-3 mr-1" /> Reanudar</>
                        ) : (
                          <><Pause className="h-3 w-3 mr-1" /> Pausar</>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-8 border-[#E1F5EE]"
                      onClick={() => handleDuplicateCampaign(camp)}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Duplicar
                    </Button>
                  </div>
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════
          AI CHAT FLOATING PANEL
          ═══════════════════════════════════════════════════════════ */}

      {/* Floating chat button */}
      <AnimatePresence>
        {!showChat && (
          <motion.button
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-[#534AB7] hover:bg-[#534AB7]/90 text-white shadow-lg flex items-center justify-center z-50 transition-shadow hover:shadow-xl"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setShowChat(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bot className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E1F5EE] overflow-hidden"
            style={{ width: 350, height: 450 }}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          >
            {/* Chat header */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#534AB7] to-[#1D9E75]">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">Sinap Grow</p>
                  <p className="text-[9px] text-white/70">Asistente de marketing</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="h-6 w-6 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  onClick={() => setShowChat(false)}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  className="h-6 w-6 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  onClick={() => { setShowChat(false); setChatMessages([]) }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chat messages */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-3"
              style={{ scrollbarWidth: 'thin' }}
            >
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-10 w-10 rounded-full bg-[#EEEDFE] flex items-center justify-center mb-2">
                    <Sparkles className="h-5 w-5 text-[#534AB7]" />
                  </div>
                  <p className="text-xs font-medium text-[#2C2C2A] mb-1">Sinap Grow</p>
                  <p className="text-[10px] text-[#888780] mb-3">
                    Pregunta sobre tus pacientes, campañas o pide recomendaciones
                  </p>
                  <div className="space-y-1.5 w-full">
                    {[
                      'Cuantos pacientes inactivos tengo?',
                      'Sugereme una campana de reactivacion',
                      'Cual es mi mejor segmento?',
                      'Genera un mensaje para pacientes VIP',
                    ].map((q, i) => (
                      <button
                        key={i}
                        className="w-full text-left p-2 rounded-lg bg-[#F8F7F3] hover:bg-[#E1F5EE] transition-colors text-[10px] text-[#2C2C2A]"
                        onClick={() => { setChatInput(q) }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="h-5 w-5 rounded-full bg-[#EEEDFE] flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-2.5 w-2.5 text-[#534AB7]" />
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#534AB7] text-white rounded-tr-sm'
                          : 'bg-[#F8F7F3] text-[#2C2C2A] rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isChatLoading && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#EEEDFE] flex items-center justify-center">
                      <Sparkles className="h-2.5 w-2.5 text-[#534AB7] animate-pulse" />
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-[#F8F7F3] rounded-tl-sm">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#534AB7] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-1.5 w-1.5 rounded-full bg-[#534AB7] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-1.5 w-1.5 rounded-full bg-[#534AB7] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Chat input */}
            <div className="p-3 border-t border-[#E1F5EE] bg-white">
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 text-xs bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7] flex-1"
                  placeholder="Escribe tu pregunta..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendChatMessage()
                    }
                  }}
                  disabled={isChatLoading}
                />
                <Button
                  className="h-8 w-8 p-0 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white shrink-0"
                  onClick={sendChatMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
