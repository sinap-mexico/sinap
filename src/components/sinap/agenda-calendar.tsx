'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSinapStore } from '@/lib/sinap-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bot,
  Trash2,
  Loader2,
  Receipt,
  DollarSign,
  FileDown,
  Stamp,
  CircleDot,
  ArrowRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'

type AppointmentStatus = 'confirmed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no-show'

interface AgendaAppointment {
  id: string
  patientId: string
  patientName: string
  time: string
  duration: number
  status: AppointmentStatus
  type: string
  isAI?: boolean
  doctorId: string
  doctorName: string
  doctorColor: string
  cancelReason?: string
  serviceId?: string
  date?: string
  endTime?: string
}

interface DoctorItem {
  id: string
  name: string
  specialty?: string | null
  color: string
  isActive: boolean
}

interface PatientItem {
  id: string
  fullName: string
  phone?: string | null
}

interface ServiceItem {
  id: string
  name: string
  duration: number
  price: number
  category?: string | null
  isActive: boolean
}

const statusConfig: Record<AppointmentStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  confirmed: { label: 'Confirmada', color: '#1D9E75', bg: '#E1F5EE', icon: CheckCircle },
  scheduled: { label: 'Agendada', color: '#534AB7', bg: '#EEEDFE', icon: CalendarIcon },
  in_progress: { label: 'En consulta', color: '#1D9E75', bg: '#E1F5EE', icon: Clock },
  completed: { label: 'Completada', color: '#888780', bg: '#F1EFE8', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: '#888780', bg: '#F1EFE8', icon: XCircle },
  'no-show': { label: 'No asistió', color: '#E53E3E', bg: '#FEE2E2', icon: AlertCircle },
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status] || statusConfig.scheduled
  const Icon = config.icon
  return (
    <Badge className="text-[9px] border-0 font-medium gap-1 px-1.5 py-0" style={{ backgroundColor: config.bg, color: config.color }}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  )
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTimeSlot(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function AgendaCalendar() {
  const { schedule, clinicMode, clinicId, setClinicId, clinicSlug, setActiveModule } = useSinapStore()

  // Data states
  const [doctors, setDoctors] = useState<DoctorItem[]>([])
  const [patients, setPatients] = useState<PatientItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [appointmentList, setAppointmentList] = useState<AgendaAppointment[]>([])
  const [cancelledAppointments, setCancelledAppointments] = useState<AgendaAppointment[]>([])

  // Loading states
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true)
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)
  const [isLoadingPatients, setIsLoadingPatients] = useState(false)
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Invoice states for completed appointments
  const [appointmentInvoice, setAppointmentInvoice] = useState<{
    id: string
    concepto?: string | null
    subtotal?: number
    iva?: number
    ivaRate?: number
    total?: number
    status?: string
    paymentStatus?: string
    formaPago?: string
    cfdiUuid?: string | null
    metodoPago?: string
    usoCFDI?: string
  } | null>(null)
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false)
  const [isCharging, setIsCharging] = useState(false)
  const [chargeMethod, setChargeMethod] = useState('01') // '01'=efectivo, '03'=transferencia, '04'=tarjeta
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)

  // Inline CFDI dialog states
  const [showInlineCFDI, setShowInlineCFDI] = useState(false)
  const [isStampingCfdi, setIsStampingCfdi] = useState(false)
  const [cfdiError, setCfdiError] = useState<string | null>(null)
  const [cfdiFormaPago, setCfdiFormaPago] = useState('01')
  const [cfdiMetodoPago, setCfdiMetodoPago] = useState('PUE')
  const [cfdiUsoCFDI, setCfdiUsoCFDI] = useState('G01')
  const [cfdiResult, setCfdiResult] = useState<{ uuid: string; isSimulated?: boolean } | null>(null)

  // UI states
  const [view, setView] = useState<'day' | 'week'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<AgendaAppointment | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Error feedback
  const [actionError, setActionError] = useState<string | null>(null)

  // New appointment form
  const [newPatient, setNewPatient] = useState('')
  const [newDoctor, setNewDoctor] = useState('')
  const [newService, setNewService] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const workStart = parseTime(schedule.workStart)
  const workEnd = parseTime(schedule.workEnd)

  // Resolve clinicId on mount
  useEffect(() => {
    async function resolveClinicId() {
      if (clinicId) {
        setIsLoadingDoctors(false)
        return
      }
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
      } finally {
        setIsLoadingDoctors(false)
      }
    }
    resolveClinicId()
  }, [clinicId, clinicSlug, setClinicId])

  // Fetch doctors when clinicId is available
  useEffect(() => {
    if (!clinicId) return
    async function fetchDoctors() {
      setIsLoadingDoctors(true)
      try {
        const res = await fetch(`/api/doctors?clinicId=${clinicId}`)
        if (res.ok) {
          const data = await res.json()
          setDoctors(
            (data.doctors || []).map((d: Record<string, unknown>) => ({
              id: d.id as string,
              name: d.name as string,
              specialty: d.specialty as string | null,
              color: d.color as string,
              isActive: d.isActive as boolean,
            }))
          )
        }
      } catch (err) {
        console.error('Failed to fetch doctors:', err)
      } finally {
        setIsLoadingDoctors(false)
      }
    }
    fetchDoctors()
  }, [clinicId])

  // Fetch patients when dialog opens
  const fetchPatients = useCallback(async () => {
    if (!clinicId || patients.length > 0) return
    setIsLoadingPatients(true)
    try {
      const res = await fetch(`/api/patients?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        setPatients(
          (data.patients || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            fullName: p.fullName as string,
            phone: p.phone as string | null,
          }))
        )
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err)
    } finally {
      setIsLoadingPatients(false)
    }
  }, [clinicId, patients.length])

  // Fetch services when dialog opens
  const fetchServices = useCallback(async () => {
    if (!clinicId || services.length > 0) return
    setIsLoadingServices(true)
    try {
      const res = await fetch(`/api/services?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        setServices(
          (data.services || []).map((s: Record<string, unknown>) => ({
            id: s.id as string,
            name: s.name as string,
            duration: s.duration as number,
            price: s.price as number,
            category: s.category as string | null,
            isActive: s.isActive as boolean,
          }))
        )
      }
    } catch (err) {
      console.error('Failed to fetch services:', err)
    } finally {
      setIsLoadingServices(false)
    }
  }, [clinicId, services.length])

  // Map API appointment to AgendaAppointment
  function mapApiAppointment(apt: Record<string, unknown>): AgendaAppointment {
    const patient = apt.patient as Record<string, unknown> | null
    const doctor = apt.doctor as Record<string, unknown> | null
    const service = apt.service as Record<string, unknown> | null
    return {
      id: apt.id as string,
      patientId: apt.patientId as string,
      patientName: (patient?.fullName as string) || 'Paciente',
      time: apt.startTime as string,
      duration: (service?.duration as number) || 30,
      status: (apt.status as AppointmentStatus) || 'scheduled',
      type: (service?.name as string) || 'Consulta',
      isAI: apt.channel === 'whatsapp' && (apt.status === 'scheduled' || apt.status === 'confirmed') && apt.notes?.includes('[IA]'),
      doctorId: apt.doctorId as string,
      doctorName: (doctor?.name as string) || 'Doctor',
      doctorColor: (doctor?.color as string) || '#1D9E75',
      cancelReason: apt.cancelReason as string | undefined,
      serviceId: apt.serviceId as string | undefined,
      date: apt.date ? formatDateStr(new Date(apt.date as string)) : undefined,
      endTime: apt.endTime as string | undefined,
    }
  }

  // Fetch appointments for a date
  const fetchAppointments = useCallback(async (date: Date, doctorFilter?: string) => {
    if (!clinicId) return
    setIsLoadingAppointments(true)
    try {
      const dateStr = formatDateStr(date)
      let url = `/api/appointments?clinicId=${clinicId}&date=${dateStr}&includeHistory=true`
      if (doctorFilter && doctorFilter !== 'all') {
        url += `&doctorId=${doctorFilter}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const allApts = (data.appointments || []).map(mapApiAppointment)
        const active = allApts.filter((a: AgendaAppointment) => a.status !== 'cancelled' && a.status !== 'no-show')
        const cancelled = allApts.filter((a: AgendaAppointment) => a.status === 'cancelled' || a.status === 'no-show')
        setAppointmentList(active)
        setCancelledAppointments(cancelled)
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err)
    } finally {
      setIsLoadingAppointments(false)
    }
  }, [clinicId])

  // Fetch appointments when date or doctor filter changes
  useEffect(() => {
    fetchAppointments(currentDate, selectedDoctor)
  }, [currentDate, selectedDoctor, fetchAppointments])

  // Fetch invoice for completed appointment when detail dialog opens
  const fetchAppointmentInvoice = useCallback(async () => {
    if (!selectedAppointment || !clinicId) return
    setIsLoadingInvoice(true)
    try {
      const res = await fetch(`/api/invoices?clinicId=${clinicId}&appointmentId=${selectedAppointment.id}`)
      if (res.ok) {
        const data = await res.json()
        const inv = (data.invoices || [])[0] as Record<string, unknown> | undefined
        setAppointmentInvoice(inv ? {
          id: inv.id as string,
          concepto: inv.concepto as string | null,
          subtotal: inv.subtotal as number,
          iva: inv.iva as number,
          ivaRate: inv.ivaRate as number,
          total: inv.total as number,
          status: inv.status as string,
          paymentStatus: inv.paymentStatus as string,
          formaPago: inv.formaPago as string,
          cfdiUuid: inv.cfdiUuid as string | null,
          metodoPago: inv.metodoPago as string,
          usoCFDI: inv.usoCFDI as string,
        } : null)
      }
    } catch (err) {
      console.error('Failed to fetch invoice:', err)
    } finally {
      setIsLoadingInvoice(false)
    }
  }, [selectedAppointment, clinicId])

  useEffect(() => {
    if (showDetailDialog && selectedAppointment?.status === 'completed') {
      fetchAppointmentInvoice()
      setCfdiResult(null)
      setCfdiError(null)
      setShowInlineCFDI(false)
      setShowPaymentSuccess(false)
    } else if (!showDetailDialog) {
      setAppointmentInvoice(null)
      setCfdiResult(null)
      setCfdiError(null)
      setShowInlineCFDI(false)
      setShowPaymentSuccess(false)
    }
  }, [showDetailDialog, selectedAppointment?.status, fetchAppointmentInvoice])

  // Charge appointment (mark invoice as paid)
  const handleChargeAppointment = async () => {
    if (!appointmentInvoice) return
    setIsCharging(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: appointmentInvoice.id,
          paymentStatus: 'paid',
          formaPago: chargeMethod,
        }),
      })
      if (res.ok) {
        await fetchAppointmentInvoice()
        setShowPaymentSuccess(true)
        setTimeout(() => setShowPaymentSuccess(false), 2500)
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Error al cobrar')
      }
    } catch (err) {
      console.error('Failed to charge:', err)
      setActionError('Error de conexión al cobrar')
    } finally {
      setIsCharging(false)
    }
  }

  // Create invoice for a completed appointment
  const handleCreateAppointmentInvoice = async () => {
    if (!selectedAppointment || !clinicId) return
    setIsCharging(true)
    try {
      const serviceName = selectedAppointment.type || 'Consulta'
      // Try to get price from service
      const servicesRes = await fetch(`/api/services?clinicId=${clinicId}`)
      let price = 0
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        const svc = (servicesData.services || []).find((s: Record<string, unknown>) => s.name === serviceName)
        if (svc) price = (svc.price as number) || 0
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          patientId: selectedAppointment.patientId,
          appointmentId: selectedAppointment.id,
          concepto: serviceName,
          subtotal: price,
          iva: 0,
          ivaRate: 0,
          total: price,
          status: 'pending',
          paymentStatus: 'unpaid',
        }),
      })
      if (res.ok) {
        await fetchAppointmentInvoice()
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Error al crear cuenta')
      }
    } catch (err) {
      console.error('Failed to create invoice:', err)
      setActionError('Error de conexión al crear cuenta')
    } finally {
      setIsCharging(false)
    }
  }

  // Revert payment (mark invoice as unpaid again)
  const handleRevertAppointmentPayment = async () => {
    if (!appointmentInvoice) return
    if (!confirm('¿Eliminar el pago? La factura volverá a pendiente.')) return
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: appointmentInvoice.id,
          paymentStatus: 'unpaid',
        }),
      })
      if (res.ok) {
        await fetchAppointmentInvoice()
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Error al eliminar pago')
      }
    } catch (err) {
      console.error('Failed to revert payment:', err)
      setActionError('Error de conexión al eliminar pago')
    }
  }

  // Inline CFDI stamping from appointment detail
  const handleStampCFDI = async () => {
    if (!appointmentInvoice || !clinicId || !selectedAppointment) return
    setIsStampingCfdi(true)
    setCfdiError(null)
    setCfdiResult(null)
    try {
      // Get clinic info for Facturama
      const clinicRes = await fetch(`/api/clinic?clinicId=${clinicId}`)
      if (!clinicRes.ok) throw new Error('Error al obtener datos de la clínica')
      const clinicData = await clinicRes.json()
      const clinic = clinicData.clinic

      if (!clinic.rfc) {
        setCfdiError('La clínica no tiene RFC configurado. Ve a Configuración para agregarlo.')
        return
      }

      // Get patient info
      const patientRes = await fetch(`/api/patients/${selectedAppointment.patientId}`)
      if (!patientRes.ok) throw new Error('Error al obtener datos del paciente')
      const patientData = await patientRes.json()
      const patient = patientData.patient

      const patientRfc = patient.rfc || 'XAXX010101000' // Default generic RFC

      const ivaRate = appointmentInvoice.ivaRate ?? 0
      const subtotal = Number(appointmentInvoice.subtotal) || Number(appointmentInvoice.total) || 0
      const ivaAmount = ivaRate > 0 ? Math.round(subtotal * ivaRate * 100) / 100 : 0
      const total = ivaRate > 0 ? subtotal + ivaAmount : subtotal

      // Call Facturama API to stamp CFDI
      const facturamaRes = await fetch('/api/facturama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          invoiceId: appointmentInvoice.id,
          receptor: {
            Rfc: patientRfc,
            Nombre: patient.fullName,
            UsoCFDI: cfdiUsoCFDI,
            RegimenFiscalReceptor: '616', // Sin obligaciones fiscales (default for patients)
          },
          concepto: appointmentInvoice.concepto || 'Consulta',
          cantidad: 1,
          precioUnitario: subtotal,
          ivaRate,
          subtotal,
          iva: ivaAmount,
          total,
          formaPago: cfdiFormaPago,
          metodoPago: cfdiMetodoPago,
        }),
      })

      const facturamaData = await facturamaRes.json()

      if (!facturamaRes.ok) {
        // Update invoice with error
        await fetch('/api/invoices', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: appointmentInvoice.id,
            status: 'error',
            errorMessage: facturamaData.error || 'Error al timbrar CFDI',
          }),
        })
        setCfdiError(facturamaData.error || 'Error al timbrar CFDI')
        return
      }

      // CFDI stamped successfully
      setCfdiResult({
        uuid: facturamaData.cfdiUuid || facturamaData.uuid,
        isSimulated: facturamaData.isSimulated,
      })

      // Refresh invoice data
      await fetchAppointmentInvoice()
    } catch (err) {
      console.error('Failed to stamp CFDI:', err)
      setCfdiError(err instanceof Error ? err.message : 'Error al timbrar CFDI')
    } finally {
      setIsStampingCfdi(false)
    }
  }

  // For week view, fetch appointments for the entire week
  const [weekAppointments, setWeekAppointments] = useState<Record<string, AgendaAppointment[]>>({})

  useEffect(() => {
    if (view !== 'week' || !clinicId) return
    async function fetchWeek() {
      const days = weekDays
      // Fetch all days in parallel instead of sequentially
      const fetches = days.map(async (day) => {
        const dateStr = formatDateStr(day)
        let url = `/api/appointments?clinicId=${clinicId}&date=${dateStr}&includeHistory=true`
        if (selectedDoctor !== 'all') url += `&doctorId=${selectedDoctor}`
        try {
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            return { dateStr, apts: (data.appointments || []).map(mapApiAppointment) }
          }
        } catch {
          // skip failed day
        }
        return { dateStr, apts: [] }
      })
      const results = await Promise.all(fetches)
      const weekMap: Record<string, AgendaAppointment[]> = {}
      for (const r of results) {
        weekMap[r.dateStr] = r.apts
      }
      setWeekAppointments(weekMap)
    }
    fetchWeek()
  }, [view, clinicId, selectedDoctor, currentDate])

  const timeSlots = useMemo(() => {
    const slots: number[] = []
    for (let m = workStart; m < workEnd; m += schedule.slotMinutes) {
      slots.push(m)
    }
    return slots
  }, [workStart, workEnd, schedule.slotMinutes])

  const weekDays = useMemo(() => {
    const days: Date[] = []
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(startOfWeek.getDate() + diff)
    for (let i = 0; i < 6; i++) {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // Combined appointments for day view (active + cancelled for visual)
  const allDayAppointments = useMemo(() => {
    return [...appointmentList, ...cancelledAppointments]
  }, [appointmentList, cancelledAppointments])

  const getAppointmentsForDate = useCallback((date: Date) => {
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    if (isToday || date.toDateString() === currentDate.toDateString()) {
      return allDayAppointments
    }
    // For week view dates
    const dateStr = formatDateStr(date)
    return weekAppointments[dateStr] || []
  }, [allDayAppointments, currentDate, weekAppointments])

  const getAppointmentAtSlot = useCallback((timeMinutes: number, dateAppointments: AgendaAppointment[], includeCancelled = true) => {
    const apts = includeCancelled ? dateAppointments : dateAppointments.filter(a => a.status !== 'cancelled' && a.status !== 'no-show')
    return apts.find(apt => {
      const aptStart = parseTime(apt.time)
      const aptEnd = aptStart + apt.duration
      return timeMinutes >= aptStart && timeMinutes < aptEnd
    })
  }, [])

  const getCancelledAtSlot = useCallback((timeMinutes: number, dateAppointments: AgendaAppointment[]) => {
    return dateAppointments.find(apt => {
      if (apt.status !== 'cancelled' && apt.status !== 'no-show') return false
      const aptStart = parseTime(apt.time)
      const aptEnd = aptStart + apt.duration
      return timeMinutes >= aptStart && timeMinutes < aptEnd
    })
  }, [])

  const navigatePrev = () => {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() - 1)
    else d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }

  const navigateNext = () => {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + 1)
    else d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  const handleSlotClick = (timeStr: string) => {
    setSelectedSlot(timeStr)
    setNewTime(timeStr)
    setNewDate(formatDateStr(currentDate))
    setShowNewDialog(true)
    fetchPatients()
    fetchServices()
  }

  const handleAppointmentClick = (apt: AgendaAppointment) => {
    setSelectedAppointment(apt)
    setShowDetailDialog(true)
  }

  const handleCreateAppointment = async () => {
    if (!newPatient || !newService || !newTime || !clinicId) return
    const selectedService = services.find(s => s.id === newService)
    const endTime = selectedService
      ? formatTimeSlot(parseTime(newTime) + selectedService.duration)
      : formatTimeSlot(parseTime(newTime) + 30)

    setIsCreating(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          patientId: newPatient,
          doctorId: newDoctor || (doctors[0]?.id),
          serviceId: newService,
          date: newDate,
          startTime: newTime,
          endTime,
          notes: newNotes || undefined,
        }),
      })
      if (res.ok) {
        setShowNewDialog(false)
        setNewPatient('')
        setNewService('')
        setNewDoctor('')
        setNewNotes('')
        setActionError(null)
        fetchAppointments(currentDate, selectedDoctor)
      } else {
        const data = await res.json()
        setActionError(data.error || 'Error al crear la cita')
      }
    } catch (err) {
      setActionError('Error de conexión al crear la cita')
    } finally {
      setIsCreating(false)
    }
  }

  const handleConfirmAppointment = async (aptId: string) => {
    if (!clinicId) return
    setIsUpdating(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: aptId, status: 'confirmed' }),
      })
      if (res.ok) {
        setShowDetailDialog(false)
        setActionError(null)
        fetchAppointments(currentDate, selectedDoctor)
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Error al confirmar la cita')
      }
    } catch (err) {
      setActionError('Error de conexión al confirmar')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelClick = () => {
    setShowCancelDialog(true)
  }

  const handleCancelAppointment = async () => {
    if (!selectedAppointment || !clinicId) return
    setIsUpdating(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          status: 'cancelled',
          cancelReason: cancelReason || 'Cancelada sin razón especificada',
        }),
      })
      if (res.ok) {
        setShowCancelDialog(false)
        setShowDetailDialog(false)
        setCancelReason('')
        setActionError(null)
        fetchAppointments(currentDate, selectedDoctor)
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Error al cancelar la cita')
      }
    } catch (err) {
      setActionError('Error de conexión al cancelar')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRebookSlot = (apt: AgendaAppointment) => {
    setShowDetailDialog(false)
    setSelectedSlot(apt.time)
    setNewTime(apt.time)
    setNewDate(apt.date || formatDateStr(currentDate))
    setNewDoctor(apt.doctorId)
    setShowNewDialog(true)
    fetchPatients()
    fetchServices()
  }

  const handleHardDeleteAppointment = async () => {
    if (!selectedAppointment || !clinicId) return
    if (!confirm('¿Eliminar esta cita permanentemente? Esta acción no se puede deshacer.')) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}?hard=true`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShowDetailDialog(false)
        setActionError(null)
        fetchAppointments(currentDate, selectedDoctor)
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Error al eliminar la cita')
      }
    } catch (err) {
      setActionError('Error de conexión al eliminar la cita')
    } finally {
      setIsUpdating(false)
    }
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const formatDate = (date: Date) => {
    return `${dayNames[date.getDay()]} ${date.getDate()} de ${monthNames[date.getMonth()]}`
  }

  // Loading skeleton
  if (isLoadingDoctors && !clinicId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#F1EFE8] animate-pulse rounded" />
          <div className="h-5 w-48 bg-[#F1EFE8] animate-pulse rounded" />
          <div className="h-8 w-8 bg-[#F1EFE8] animate-pulse rounded" />
        </div>
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
              <span className="ml-3 text-sm text-[#888780]">Cargando agenda...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Error toast */}
      {actionError && (
        <motion.div
          className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{actionError}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-red-500 hover:text-red-700"
            onClick={() => setActionError(null)}
          >
            Cerrar
          </Button>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentDate.toISOString()}
              className="text-base font-medium tracking-[-0.03em] text-[#2C2C2A] min-w-[200px] text-center"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
            >
              {view === 'day' ? formatDate(currentDate) : `${formatDate(weekDays[0])} — ${formatDate(weekDays[5])}`}
            </motion.h2>
          </AnimatePresence>
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
          <Button variant="outline" size="sm" className="h-7 text-xs border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE]" onClick={goToday}>
            Hoy
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {clinicMode === 'clinic' && (
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="h-8 text-xs w-[160px] bg-white border-[#E1F5EE]">
                <SelectValue placeholder="Todos los doctores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los doctores</SelectItem>
                {doctors.filter(d => d.isActive).map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week')}>
            <TabsList className="h-8 bg-[#F1EFE8]">
              <TabsTrigger value="day" className="text-xs h-6 px-3">Dia</TabsTrigger>
              <TabsTrigger value="week" className="text-xs h-6 px-3">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Day View */}
      <AnimatePresence mode="wait">
        {view === 'day' && (
          <motion.div
            key="day-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-[#E1F5EE] bg-white overflow-hidden">
              <ScrollArea className="max-h-[calc(100vh-12rem)]">
              <div className="flex">
                {/* Time column */}
                <div className="w-16 shrink-0 border-r border-[#E1F5EE]">
                  {timeSlots.map((minutes) => (
                    <div
                      key={minutes}
                      className="h-14 border-b border-[#E1F5EE]/50 flex items-start justify-end pr-2 pt-1"
                    >
                      <span className="text-[10px] text-[#888780] font-mono">
                        {formatTimeSlot(minutes)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Slots column */}
                <div className="flex-1 relative">
                  {/* Current time indicator */}
                  {currentMinutes >= workStart && currentMinutes <= workEnd && (
                    <motion.div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: `${((currentMinutes - workStart) / (workEnd - workStart)) * (timeSlots.length * 56)}px` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex items-center">
                        <motion.div
                          className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="h-[2px] flex-1 bg-red-500" />
                      </div>
                    </motion.div>
                  )}

                  {isLoadingAppointments ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-6 w-6 animate-spin text-[#1D9E75]" />
                      <span className="ml-2 text-sm text-[#888780]">Cargando citas...</span>
                    </div>
                  ) : (
                  timeSlots.map((minutes) => {
                    const dateApts = getAppointmentsForDate(currentDate)
                    const apt = getAppointmentAtSlot(minutes, dateApts, true)
                    const isStart = apt && parseTime(apt.time) === minutes
                    const cancelledApt = apt?.status === 'cancelled' || apt?.status === 'no-show' ? apt : getCancelledAtSlot(minutes, dateApts)
                    const hasActiveApt = apt && apt.status !== 'cancelled' && apt.status !== 'no-show'

                    if (apt && !isStart) return null

                    return (
                      <div
                        key={minutes}
                        className="h-14 border-b border-[#E1F5EE]/50 relative cursor-pointer hover:bg-[#F1EFE8]/50 transition-colors"
                        onClick={() => !hasActiveApt && handleSlotClick(formatTimeSlot(minutes))}
                      >
                        {/* Cancelled appointment shown as faded/struck-through */}
                        {isStart && apt && (apt.status === 'cancelled' || apt.status === 'no-show') && (
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAppointmentClick(apt)
                            }}
                            className="absolute inset-x-2 top-1 rounded-lg p-2 text-left transition-all hover:shadow-md bg-[#F1EFE8]/60 border border-[#888780]/20"
                            style={{ height: `${(apt.duration / schedule.slotMinutes) * 56 - 8}px` }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-medium text-[#888780] line-through truncate">
                                  {apt.patientName.split(' ').slice(0, 2).join(' ')}
                                </span>
                              </div>
                              <StatusBadge status={apt.status} />
                            </div>
                            <p className="text-[10px] text-[#888780]/70 mt-0.5 truncate line-through">
                              {apt.time} — {apt.type}
                            </p>
                            {/* Plus button to re-book */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRebookSlot(apt)
                              }}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[#1D9E75] flex items-center justify-center hover:bg-[#1D9E75]/80 transition-colors"
                            >
                              <Plus className="h-3 w-3 text-white" />
                            </button>
                          </motion.button>
                        )}

                        {/* Active appointment */}
                        {isStart && apt && apt.status !== 'cancelled' && apt.status !== 'no-show' && (
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAppointmentClick(apt)
                            }}
                            className={`absolute inset-x-2 top-1 rounded-lg p-2 text-left transition-all hover:shadow-md ${
                              apt.isAI ? 'bg-[#534AB7]/10 border border-[#534AB7]/20' :
                              apt.status === 'confirmed' ? 'bg-[#E1F5EE] border border-[#1D9E75]/20' :
                              'bg-[#FEF3C7]/60 border border-[#D97706]/20'
                            }`}
                            style={{
                              height: `${(apt.duration / schedule.slotMinutes) * 56 - 8}px`,
                              borderLeftWidth: '3px',
                              borderLeftColor: apt.doctorColor || '#1D9E75',
                            }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            whileHover={{ y: -1 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {apt.isAI && <Bot className="h-3 w-3 text-[#534AB7] shrink-0" />}
                                <span className="text-xs font-medium text-[#2C2C2A] truncate">
                                  {apt.patientName.split(' ').slice(0, 2).join(' ')}
                                </span>
                              </div>
                              <StatusBadge status={apt.status} />
                            </div>
                            <p className="text-[10px] text-[#888780] mt-0.5 truncate">
                              {apt.time} — {apt.type}
                            </p>
                            {clinicMode === 'clinic' && (
                              <p className="text-[9px] text-[#888780]/70 mt-0.5 truncate">
                                {apt.doctorName}
                              </p>
                            )}
                          </motion.button>
                        )}

                        {/* Empty slot with only cancelled in history - show + for re-booking */}
                        {!hasActiveApt && cancelledApt && (!apt || (apt.status === 'cancelled' || apt.status === 'no-show')) && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-[#1D9E75]" />
                          </div>
                        )}

                        {/* Completely empty slot */}
                        {!apt && !cancelledApt && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-[#888780]" />
                          </div>
                        )}
                      </div>
                    )
                  })
                  )}
                </div>
              </div>
              </ScrollArea>
            </Card>
          </motion.div>
        )}

        {view === 'week' && (
          <motion.div
            key="week-view"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-[#E1F5EE] bg-white overflow-hidden">
              <ScrollArea className="max-h-[calc(100vh-12rem)]">
              <div className="min-w-[800px]">
                  {/* Day headers */}
                  <div className="flex border-b border-[#E1F5EE]">
                    <div className="w-14 shrink-0" />
                    {weekDays.map((day, i) => {
                      const isToday = day.toDateString() === new Date().toDateString()
                      return (
                        <div key={i} className={`flex-1 p-2 text-center border-l border-[#E1F5EE] ${
                          isToday ? 'bg-[#EEEDFE]' : ''
                        }`}>
                          <p className="text-[10px] text-[#888780]">{dayNames[day.getDay()]}</p>
                          <p className={`text-sm font-medium ${isToday ? 'text-[#534AB7]' : 'text-[#2C2C2A]'}`}>
                            {day.getDate()}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Time rows */}
                  {timeSlots.filter((_, i) => i % 2 === 0).map((minutes) => (
                    <div key={minutes} className="flex border-b border-[#E1F5EE]/50">
                      <div className="w-14 shrink-0 flex items-start justify-end pr-2 pt-1">
                        <span className="text-[9px] text-[#888780] font-mono">
                          {formatTimeSlot(minutes)}
                        </span>
                      </div>
                      {weekDays.map((day, i) => {
                        const dayApts = getAppointmentsForDate(day)
                        const apt = getAppointmentAtSlot(minutes, dayApts, true)
                        const isCancelled = apt?.status === 'cancelled' || apt?.status === 'no-show'
                        return (
                          <div
                            key={i}
                            className="flex-1 h-14 border-l border-[#E1F5EE]/50 p-0.5 cursor-pointer hover:bg-[#F1EFE8]/30"
                            onClick={() => {
                              setCurrentDate(day)
                              handleSlotClick(formatTimeSlot(minutes))
                            }}
                          >
                            {apt && parseTime(apt.time) === minutes && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAppointmentClick(apt)
                                }}
                                className={`w-full rounded p-1 text-left ${
                                  isCancelled ? 'bg-[#F1EFE8]/80' :
                                  apt.isAI ? 'bg-[#534AB7]/10' :
                                  apt.status === 'confirmed' ? 'bg-[#E1F5EE]' :
                                  'bg-[#FEF3C7]/60'
                                }`}
                                style={!isCancelled ? { borderLeftWidth: '2px', borderLeftColor: apt.doctorColor || '#1D9E75' } : undefined}
                              >
                                <p className={`text-[9px] font-medium truncate ${isCancelled ? 'text-[#888780] line-through' : 'text-[#2C2C2A]'}`}>
                                  {apt.patientName.split(' ').slice(0, 2).join(' ')}
                                </p>
                                <p className={`text-[8px] truncate ${isCancelled ? 'text-[#888780]/70 line-through' : 'text-[#888780]'}`}>
                                  {apt.type}
                                </p>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Appointment Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em]">
              Nueva cita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Paciente</Label>
              {isLoadingPatients ? (
                <div className="flex items-center gap-2 h-9 px-3 bg-[#F1EFE8] rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-[#888780]" />
                  <span className="text-sm text-[#888780]">Cargando pacientes...</span>
                </div>
              ) : (
                <Select value={newPatient} onValueChange={setNewPatient}>
                  <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                    <SelectValue placeholder="Buscar paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {clinicMode === 'clinic' && (
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Doctor</Label>
                <Select value={newDoctor} onValueChange={setNewDoctor}>
                  <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                    <SelectValue placeholder="Seleccionar doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.filter(d => d.isActive).map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                          {d.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Servicio</Label>
              {isLoadingServices ? (
                <div className="flex items-center gap-2 h-9 px-3 bg-[#F1EFE8] rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-[#888780]" />
                  <span className="text-sm text-[#888780]">Cargando servicios...</span>
                </div>
              ) : (
                <Select value={newService} onValueChange={setNewService}>
                  <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.filter(s => s.isActive).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — ${s.price.toLocaleString()} ({s.duration}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Fecha</Label>
                <Input
                  type="date"
                  className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Hora</Label>
                <Select value={newTime} onValueChange={setNewTime}>
                  <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(m => (
                      <SelectItem key={m} value={formatTimeSlot(m)}>
                        {formatTimeSlot(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Notas</Label>
              <Textarea
                placeholder="Notas adicionales..."
                className="text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] min-h-[60px]"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-sm"
              onClick={() => setShowNewDialog(false)}
            >
              Cancelar
            </Button>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white text-sm"
                onClick={handleCreateAppointment}
                disabled={!newPatient || !newService || !newTime || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Agendar'
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em]">
              Detalle de cita
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                  <User className="h-5 w-5 text-[#1D9E75]" />
                </div>
                <div>
                  <p className={`text-sm font-medium text-[#2C2C2A] ${selectedAppointment.status === 'cancelled' ? 'line-through' : ''}`}>
                    {selectedAppointment.patientName}
                  </p>
                  <p className="text-xs text-[#888780]">{selectedAppointment.type}</p>
                </div>
                {selectedAppointment.isAI && (
                  <Badge className="ml-auto bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                    <Bot className="h-3 w-3 mr-1" />
                    IA
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#F1EFE8]">
                <div>
                  <p className="text-[10px] text-[#888780] uppercase">Hora</p>
                  <p className="text-sm font-medium text-[#2C2C2A]">{selectedAppointment.time}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#888780] uppercase">Duracion</p>
                  <p className="text-sm font-medium text-[#2C2C2A]">{selectedAppointment.duration} min</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#888780] uppercase">Estado</p>
                  <StatusBadge status={selectedAppointment.status} />
                </div>
                <div>
                  <p className="text-[10px] text-[#888780] uppercase">Servicio</p>
                  <p className="text-sm font-medium text-[#2C2C2A]">{selectedAppointment.type}</p>
                </div>
                {clinicMode === 'clinic' && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-[#888780] uppercase">Doctor</p>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedAppointment.doctorColor }} />
                      <p className="text-sm font-medium text-[#2C2C2A]">{selectedAppointment.doctorName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cancellation info */}
              {selectedAppointment.status === 'cancelled' && (
                <div className="p-3 rounded-lg bg-[#F1EFE8] border border-[#888780]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="text-[9px] border-0 font-medium gap-1 px-1.5 py-0" style={{ backgroundColor: '#F1EFE8', color: '#888780' }}>
                      <XCircle className="h-2.5 w-2.5" />
                      Cancelada
                    </Badge>
                  </div>
                  {selectedAppointment.cancelReason && (
                    <p className="text-xs text-[#888780]">
                      <span className="font-medium">Motivo:</span> {selectedAppointment.cancelReason}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE]"
                      onClick={() => handleRebookSlot(selectedAppointment)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Reagendar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                      onClick={handleHardDeleteAppointment}
                      disabled={isUpdating}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'no-show' && (
                <div className="flex gap-2">
                  {selectedAppointment.status !== 'confirmed' && selectedAppointment.status !== 'completed' && (
                    <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                      <Button
                        className="w-full bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white text-sm h-9"
                        onClick={() => handleConfirmAppointment(selectedAppointment.id)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Confirmar
                      </Button>
                    </motion.div>
                  )}
                  {selectedAppointment.status !== 'completed' && (
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-sm h-9"
                      onClick={handleCancelClick}
                      disabled={isUpdating}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </div>
              )}

              {/* Completed appointment: Visual stepper Cita → Cobrar → CFDI */}
              {selectedAppointment.status === 'completed' && (
                <div className="p-3 rounded-lg bg-[#F1EFE8] border border-[#E1F5EE] space-y-3">
                  {/* Step Indicator */}
                  <div className="flex items-center gap-1 px-1">
                    {[
                      { key: 'cita', label: 'Cita', icon: CheckCircle, done: true },
                      { key: 'cobrar', label: 'Cobrar', icon: DollarSign, done: appointmentInvoice?.paymentStatus === 'paid' },
                      { key: 'cfdi', label: 'CFDI', icon: Receipt, done: appointmentInvoice?.status === 'timbrada' },
                    ].map((step, i) => {
                      const Icon = step.icon
                      return (
                        <div key={step.key} className="flex items-center flex-1">
                          <div className="flex items-center gap-1.5">
                            <motion.div
                              className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                step.done
                                  ? 'bg-[#1D9E75] text-white'
                                  : 'bg-white border border-[#888780]/30 text-[#888780]'
                              }`}
                              animate={step.done ? { scale: [1, 1.15, 1] } : {}}
                              transition={{ duration: 0.3, delay: i * 0.1 }}
                            >
                              {step.done ? <Icon className="h-3 w-3" /> : (i + 1)}
                            </motion.div>
                            <span className={`text-[10px] font-medium ${step.done ? 'text-[#1D9E75]' : 'text-[#888780]'}`}>
                              {step.label}
                            </span>
                          </div>
                          {i < 2 && (
                            <div className={`flex-1 h-px mx-1.5 ${step.done ? 'bg-[#1D9E75]' : 'bg-[#888780]/20'}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Payment success animation */}
                  <AnimatePresence>
                    {showPaymentSuccess && (
                      <motion.div
                        className="flex items-center justify-center gap-2 py-3 rounded-lg bg-[#E1F5EE]"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 0.5 }}
                        >
                          <CheckCircle className="h-5 w-5 text-[#1D9E75]" />
                        </motion.div>
                        <span className="text-sm font-medium text-[#1D9E75]">¡Pago registrado!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isLoadingInvoice ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#534AB7]" />
                      <span className="text-xs text-[#888780]">Cargando cuenta...</span>
                    </div>
                  ) : !appointmentInvoice ? (
                    /* No invoice - create one */
                    <div className="space-y-2">
                      <p className="text-xs text-[#888780]">No se ha creado cuenta para esta cita.</p>
                      <Button
                        className="w-full h-8 text-xs bg-[#534AB7] hover:bg-[#534AB7]/90 text-white"
                        onClick={handleCreateAppointmentInvoice}
                        disabled={isCharging}
                      >
                        {isCharging ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Receipt className="h-3.5 w-3.5 mr-1" />}
                        Crear cuenta
                      </Button>
                    </div>
                  ) : appointmentInvoice.paymentStatus === 'unpaid' ? (
                    /* Unpaid invoice - charge it */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white">
                        <div>
                          <p className="text-xs font-medium text-[#2C2C2A]">{appointmentInvoice.concepto || 'Consulta'}</p>
                          <p className="text-[10px] text-[#888780]">Pendiente de cobro</p>
                        </div>
                        <p className="text-sm font-semibold text-[#2C2C2A]">${(Number(appointmentInvoice.total) || 0).toLocaleString('es-MX')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Select value={chargeMethod} onValueChange={setChargeMethod}>
                          <SelectTrigger className="h-8 text-xs w-[130px] bg-white border-[#E1F5EE]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="01">Efectivo</SelectItem>
                            <SelectItem value="03">Transferencia</SelectItem>
                            <SelectItem value="04">Tarjeta</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          className="flex-1 h-8 text-xs bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
                          onClick={handleChargeAppointment}
                          disabled={isCharging}
                        >
                          {isCharging ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <DollarSign className="h-3.5 w-3.5 mr-1" />}
                          Cobrar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Paid invoice */
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#E1F5EE]">
                        <CheckCircle className="h-4 w-4 text-[#1D9E75]" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-[#1D9E75]">Pagado</p>
                          <p className="text-[10px] text-[#888780]">
                            ${(Number(appointmentInvoice.total) || 0).toLocaleString('es-MX')} — {
                              appointmentInvoice.formaPago === '01' ? 'Efectivo' :
                              appointmentInvoice.formaPago === '03' ? 'Transferencia' : 'Tarjeta'
                            }
                          </p>
                        </div>
                      </div>

                      {/* CFDI section */}
                      {appointmentInvoice.status === 'timbrada' ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#EEEDFE]">
                          <Receipt className="h-4 w-4 text-[#534AB7]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#534AB7]">CFDI timbrada</p>
                            <p className="text-[10px] text-[#888780] truncate">{appointmentInvoice.cfdiUuid as string || ''}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#534AB7]" onClick={() => { setShowDetailDialog(false); setActiveModule('bill') }}>
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : showInlineCFDI ? (
                        /* Inline CFDI form */
                        <div className="p-2 rounded-lg bg-white border border-[#534AB7]/20 space-y-2">
                          <p className="text-[10px] font-semibold text-[#534AB7] uppercase tracking-wide">Generar CFDI</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] text-[#888780]">Forma de Pago</Label>
                              <Select value={cfdiFormaPago} onValueChange={setCfdiFormaPago}>
                                <SelectTrigger className="h-7 text-[10px] bg-[#F1EFE8] border-[#E1F5EE]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="01">01 Efectivo</SelectItem>
                                  <SelectItem value="03">03 Transferencia</SelectItem>
                                  <SelectItem value="04">04 Tarjeta</SelectItem>
                                  <SelectItem value="28">28 Débito</SelectItem>
                                  <SelectItem value="99">99 Por definir</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] text-[#888780]">Método</Label>
                              <Select value={cfdiMetodoPago} onValueChange={setCfdiMetodoPago}>
                                <SelectTrigger className="h-7 text-[10px] bg-[#F1EFE8] border-[#E1F5EE]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PUE">PUE</SelectItem>
                                  <SelectItem value="PPD">PPD</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] text-[#888780]">Uso CFDI</Label>
                              <Select value={cfdiUsoCFDI} onValueChange={setCfdiUsoCFDI}>
                                <SelectTrigger className="h-7 text-[10px] bg-[#F1EFE8] border-[#E1F5EE]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="G01">G01 Mercancías</SelectItem>
                                  <SelectItem value="G03">G03 Gastos</SelectItem>
                                  <SelectItem value="D01">D01 Honorarios médicos</SelectItem>
                                  <SelectItem value="D07">D07 Seguros médicos</SelectItem>
                                  <SelectItem value="P01">P01 Por definir</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {cfdiError && (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FEE2E2] border border-[#991B1B]/20">
                              <AlertCircle className="h-3 w-3 text-[#991B1B] shrink-0" />
                              <p className="text-[10px] text-[#991B1B]">{cfdiError}</p>
                            </div>
                          )}
                          {cfdiResult ? (
                            <motion.div
                              className="flex items-center gap-2 p-2 rounded-lg bg-[#E1F5EE]"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <CheckCircle className="h-4 w-4 text-[#1D9E75] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-medium text-[#1D9E75]">CFDI timbrada {cfdiResult.isSimulated ? '(simulada)' : ''}</p>
                                <p className="text-[9px] text-[#888780] truncate">{cfdiResult.uuid}</p>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                className="flex-1 h-7 text-[10px] bg-[#534AB7] hover:bg-[#534AB7]/90 text-white"
                                onClick={handleStampCFDI}
                                disabled={isStampingCfdi}
                              >
                                {isStampingCfdi ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Stamp className="h-3 w-3 mr-1" />}
                                Timbrar CFDI
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-7 text-[10px] text-[#888780]"
                                onClick={() => setShowInlineCFDI(false)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full h-8 text-xs border-[#534AB7] text-[#534AB7] hover:bg-[#EEEDFE]"
                          onClick={() => { setShowInlineCFDI(true); setCfdiResult(null) }}
                        >
                          <Receipt className="h-3.5 w-3.5 mr-1" />
                          Generar CFDI
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          className="h-7 text-[10px] text-[#888780] hover:text-[#2C2C2A] hover:bg-[#F1EFE8] flex-1"
                          onClick={() => { setShowDetailDialog(false); setActiveModule('patients') }}
                        >
                          <User className="h-3 w-3 mr-1" />
                          Ver paciente
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={handleRevertAppointmentPayment}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Eliminar pago
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No-show can be re-booked or deleted */}
              {selectedAppointment.status === 'no-show' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE]"
                    onClick={() => handleRebookSlot(selectedAppointment)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Reagendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-red-300 text-red-600 hover:bg-red-50"
                    onClick={handleHardDeleteAppointment}
                    disabled={isUpdating}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Eliminar
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Reason Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em]">
              Motivo de cancelacion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#888780]">
              ¿Por que se cancela la cita de {selectedAppointment?.patientName}?
            </p>
            <Textarea
              placeholder="Escribe el motivo de la cancelacion..."
              className="text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] min-h-[80px]"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-sm"
              onClick={() => {
                setShowCancelDialog(false)
                setCancelReason('')
              }}
            >
              Volver
            </Button>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 text-sm"
                onClick={handleCancelAppointment}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Cancelar cita
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
