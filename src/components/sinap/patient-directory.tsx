'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSinapStore } from '@/lib/sinap-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Search,
  Plus,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  FileText,
  Receipt,
  Users,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Heart,
  UserPlus,
  CreditCard,
  Stethoscope,
  Sparkles,
  Trash2,
  DollarSign,
  XCircle,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Bell,
  CalendarClock,
  Shield,
  Siren,
  Filter,
  ArrowUpDown,
  Send,
  UserCheck,
  UserX,
  FileUp,
  ExternalLink,
  Link2,
  Image as ImageIcon,
  Paperclip,
  Download,
} from 'lucide-react'

// ─── TYPES ──────────────────────────────────────────────

interface PatientListItem {
  id: string
  clinicId: string
  firstName: string
  lastName: string
  fullName: string
  phone: string | null
  email: string | null
  birthDate: string | null
  gender: string | null
  rfc: string | null
  source: string | null
  segment: string
  totalVisits: number
  totalSpent: number
  ltv: number
  allergies: string | null
  notes: string | null
  preferredChannel: string | null
  lastVisitDate: string | null
  firstContactDate: string | null
  isActive: boolean
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  insuranceProvider: string | null
  insurancePolicyNumber: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    appointments: number
    soapNotes: number
    invoices: number
  }
}

interface AppointmentItem {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes: string | null
  doctor?: { id: string; name: string; specialty?: string | null; color: string }
  service?: { id: string; name: string; duration: number; price: number } | null
}

interface SoapNoteItem {
  id: string
  createdAt: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  diagnosis: string | null
  doctor?: { id: string; name: string }
}

interface InvoiceItem {
  id: string
  createdAt: string
  total: number
  concepto: string | null
  status: string
  paymentStatus: string
  cfdiUuid: string | null
}

interface FollowUpItem {
  id: string
  type: string
  status: string
  dueDate: string | null
  completedAt: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
  patient?: { fullName: string; phone: string | null }
}

interface ConversationItem {
  id: string
  channel: string
  status: string
  lastMessageAt: string
  createdAt: string
  messages: MessageItem[]
}

interface MessageItem {
  id: string
  direction: string
  senderType: string
  content: string
  createdAt: string
  channel: string
}

interface PatientDocumentItem {
  id: string
  name: string
  type: string // "file" | "link"
  category: string // "study" | "xray" | "lab" | "prescription" | "insurance" | "other"
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  linkUrl: string | null
  description: string | null
  date: string | null
  createdAt: string
}

interface PatientProfile extends PatientListItem {
  address: string | null
  firstContactDate: string | null
  sentiment: string
  preferredTime: string | null
  doNotContact: boolean
  medicalHistory: string | null
  appointments: AppointmentItem[]
  soapNotes: SoapNoteItem[]
  invoices: InvoiceItem[]
  conversations: ConversationItem[]
  _count?: {
    appointments: number
    soapNotes: number
    invoices: number
    conversations: number
  }
}

// ─── SEGMENT BADGE ──────────────────────────────────────

const SEGMENT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  new: { label: 'Nuevo', bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]' },
  active: { label: 'Activo', bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]' },
  inactive: { label: 'Inactivo', bg: 'bg-[#F1EFE8]', text: 'text-[#888780]' },
  vip: { label: 'VIP', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
  churned: { label: 'Abandonado', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
}

function SegmentBadge({ segment }: { segment: string }) {
  const config = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG.new
  return (
    <Badge className={`${config.bg} ${config.text} border-0 text-[10px] font-medium px-2 py-0.5`}>
      {config.label}
    </Badge>
  )
}

// ─── APPOINTMENT STATUS BADGE ───────────────────────────

const APPT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  scheduled: { label: 'Programada', bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]' },
  confirmed: { label: 'Confirmada', bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]' },
  completed: { label: 'Completada', bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]' },
  cancelled: { label: 'Cancelada', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
  no_show: { label: 'No asistio', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
  in_progress: { label: 'En consulta', bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]' },
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const config = APPT_STATUS_CONFIG[status] || APPT_STATUS_CONFIG.scheduled
  return (
    <Badge className={`${config.bg} ${config.text} border-0 text-[10px] font-medium px-2 py-0.5`}>
      {config.label}
    </Badge>
  )
}

// ─── INVOICE STATUS BADGES ──────────────────────────────

const INV_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
  timbrada: { label: 'Timbrada', bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]' },
  cancelled: { label: 'Cancelada', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
  error: { label: 'Error', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  paid: { label: 'Pagada', bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]' },
  unpaid: { label: 'Sin pagar', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
  partial: { label: 'Parcial', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config = INV_STATUS_CONFIG[status] || INV_STATUS_CONFIG.pending
  return (
    <Badge className={`${config.bg} ${config.text} border-0 text-[10px] font-medium px-2 py-0.5`}>
      {config.label}
    </Badge>
  )
}

function PaymentStatusBadge({ paymentStatus }: { paymentStatus: string }) {
  const config = PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG.unpaid
  return (
    <Badge className={`${config.bg} ${config.text} border-0 text-[10px] font-medium px-2 py-0.5`}>
      {config.label}
    </Badge>
  )
}

// ─── SOURCE BADGE ───────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  walk_in: { label: 'Walk-in', icon: Users },
  whatsapp: { label: 'WhatsApp', icon: Phone },
  referral: { label: 'Referencia', icon: Heart },
  instagram: { label: 'Instagram', icon: Sparkles },
  facebook: { label: 'Facebook', icon: Users },
}

function SourceBadge({ source }: { source: string | null }) {
  const config = SOURCE_CONFIG[source || 'walk_in'] || SOURCE_CONFIG.walk_in
  const Icon = config.icon
  return (
    <Badge className="bg-[#F1EFE8] text-[#888780] border-0 text-[10px] font-medium px-2 py-0.5 gap-1">
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  )
}

// ─── HELPERS ────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── SEGMENT FILTER TABS ────────────────────────────────

const SEGMENT_TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'vip', label: 'VIP' },
]

// ─── MAIN COMPONENT ────────────────────────────────────

export function PatientDirectory() {
  const { clinicId, setClinicId, clinicSlug, isDemoMode, setActiveModule } = useSinapStore()

  // View state
  const [view, setView] = useState<'list' | 'profile'>('list')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Pagination & sort state
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [sortBy, setSortBy] = useState('createdAt')
  const [includeInactive, setIncludeInactive] = useState(false)

  // Data state
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [totalPatients, setTotalPatients] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Conversations expanded state
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    birthDate: '',
    gender: '',
    rfc: '',
    allergies: '',
    notes: '',
    source: 'walk_in',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showAdditionalFields, setShowAdditionalFields] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'appointment' | 'invoice'; id: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Follow-ups state
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([])
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false)
  const [showNewFollowUp, setShowNewFollowUp] = useState(false)
  const [newFollowUp, setNewFollowUp] = useState({ type: 'call', dueDate: '', notes: '' })
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false)

  // Documents state
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [showNewDocument, setShowNewDocument] = useState(false)
  const [newDocType, setNewDocType] = useState<'file' | 'link'>('file')
  const [newDocForm, setNewDocForm] = useState({
    name: '',
    category: 'study',
    description: '',
    date: '',
    linkUrl: '',
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isCreatingDocument, setIsCreatingDocument] = useState(false)
  const [docFilterCategory, setDocFilterCategory] = useState('all')

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

  // Auto-toast dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ─── FETCH PATIENTS ─────────────────────────────────

  const fetchPatients = useCallback(async () => {
    if (!clinicId) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ clinicId, page: String(page), limit: String(limit) })
      if (searchQuery) params.set('search', searchQuery)
      if (segmentFilter && segmentFilter !== 'all') params.set('segment', segmentFilter)
      if (includeInactive) params.set('includeInactive', 'true')
      const res = await fetch(`/api/patients?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || [])
        setTotalPatients(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clinicId, searchQuery, segmentFilter, page, limit, includeInactive])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  // ─── FETCH PATIENT PROFILE ──────────────────────────

  const fetchPatientProfile = useCallback(
    async (patientId: string) => {
      setIsLoadingProfile(true)
      try {
        const res = await fetch(`/api/patients/${patientId}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedPatient(data.patient)
          setEditForm({
            fullName: data.patient.fullName,
            phone: data.patient.phone || '',
            email: data.patient.email || '',
            birthDate: data.patient.birthDate
              ? new Date(data.patient.birthDate).toISOString().split('T')[0]
              : '',
            gender: data.patient.gender || '',
            rfc: data.patient.rfc || '',
            allergies: data.patient.allergies || '',
            notes: data.patient.notes || '',
            source: data.patient.source || 'walk_in',
            segment: data.patient.segment,
            preferredChannel: data.patient.preferredChannel || 'whatsapp',
            address: data.patient.address || '',
            emergencyContactName: data.patient.emergencyContactName || '',
            emergencyContactPhone: data.patient.emergencyContactPhone || '',
            emergencyContactRelation: data.patient.emergencyContactRelation || '',
            insuranceProvider: data.patient.insuranceProvider || '',
            insurancePolicyNumber: data.patient.insurancePolicyNumber || '',
          })
        }
      } catch (err) {
        console.error('Failed to fetch patient profile:', err)
      } finally {
        setIsLoadingProfile(false)
      }
    },
    []
  )

  // ─── FETCH FOLLOW-UPS ───────────────────────────────

  const fetchFollowUps = useCallback(
    async (patientId: string) => {
      if (!clinicId) return
      setIsLoadingFollowUps(true)
      try {
        const res = await fetch(`/api/follow-ups?clinicId=${clinicId}&patientId=${patientId}`)
        if (res.ok) {
          const data = await res.json()
          setFollowUps(data.followUps || [])
        }
      } catch (err) {
        console.error('Failed to fetch follow-ups:', err)
      } finally {
        setIsLoadingFollowUps(false)
      }
    },
    [clinicId]
  )

  // ─── FETCH DOCUMENTS ────────────────────────────────

  const fetchDocuments = useCallback(
    async (patientId: string) => {
      setIsLoadingDocuments(true)
      try {
        const params = new URLSearchParams()
        if (docFilterCategory && docFilterCategory !== 'all') params.set('category', docFilterCategory)
        const res = await fetch(`/api/patients/${patientId}/documents?${params}`)
        if (res.ok) {
          const data = await res.json()
          setDocuments(data.documents || [])
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err)
      } finally {
        setIsLoadingDocuments(false)
      }
    },
    [docFilterCategory]
  )

  // ─── CREATE DOCUMENT (FILE UPLOAD) ─────────────────

  const handleCreateFileDocument = async () => {
    if (!selectedPatientId || !clinicId || !uploadFile) return
    setIsCreatingDocument(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('name', newDocForm.name || uploadFile.name)
      formData.append('category', newDocForm.category)
      formData.append('clinicId', clinicId)
      if (newDocForm.description) formData.append('description', newDocForm.description)
      if (newDocForm.date) formData.append('date', newDocForm.date)

      const res = await fetch(`/api/patients/${selectedPatientId}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setToast({ message: 'Documento cargado', type: 'success' })
        setShowNewDocument(false)
        setNewDocForm({ name: '', category: 'study', description: '', date: '', linkUrl: '' })
        setUploadFile(null)
        fetchDocuments(selectedPatientId)
      } else {
        const data = await res.json().catch(() => ({}))
        setToast({ message: data.error || 'Error al cargar documento', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexion', type: 'error' })
    } finally {
      setIsCreatingDocument(false)
    }
  }

  // ─── CREATE DOCUMENT (LINK) ────────────────────────

  const handleCreateLinkDocument = async () => {
    if (!selectedPatientId || !clinicId || !newDocForm.linkUrl) return
    setIsCreatingDocument(true)
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          name: newDocForm.name || 'Enlace',
          linkUrl: newDocForm.linkUrl,
          category: newDocForm.category,
          description: newDocForm.description || null,
          date: newDocForm.date || null,
        }),
      })
      if (res.ok) {
        setToast({ message: 'Enlace agregado', type: 'success' })
        setShowNewDocument(false)
        setNewDocForm({ name: '', category: 'study', description: '', date: '', linkUrl: '' })
        setUploadFile(null)
        fetchDocuments(selectedPatientId)
      } else {
        const data = await res.json().catch(() => ({}))
        setToast({ message: data.error || 'Error al agregar enlace', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexion', type: 'error' })
    } finally {
      setIsCreatingDocument(false)
    }
  }

  // ─── DELETE DOCUMENT ────────────────────────────────

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedPatientId) return
    if (!confirm('¿Eliminar este documento?')) return
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/documents?documentId=${documentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setToast({ message: 'Documento eliminado', type: 'success' })
        fetchDocuments(selectedPatientId)
      } else {
        setToast({ message: 'Error al eliminar documento', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexion', type: 'error' })
    }
  }

  // ─── CREATE FOLLOW-UP ────────────────────────────────

  const handleCreateFollowUp = async () => {
    if (!selectedPatientId || !clinicId) return
    setIsCreatingFollowUp(true)
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          patientId: selectedPatientId,
          type: newFollowUp.type,
          dueDate: newFollowUp.dueDate || null,
          notes: newFollowUp.notes || null,
        }),
      })
      if (res.ok) {
        setToast({ message: 'Seguimiento creado', type: 'success' })
        setShowNewFollowUp(false)
        setNewFollowUp({ type: 'call', dueDate: '', notes: '' })
        fetchFollowUps(selectedPatientId)
      } else {
        const data = await res.json().catch(() => ({}))
        setToast({ message: data.error || 'Error al crear seguimiento', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    } finally {
      setIsCreatingFollowUp(false)
    }
  }

  // ─── UPDATE FOLLOW-UP ────────────────────────────────

  const handleUpdateFollowUp = async (followUpId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpId, ...updates }),
      })
      if (res.ok) {
        setToast({ message: 'Seguimiento actualizado', type: 'success' })
        if (selectedPatientId) fetchFollowUps(selectedPatientId)
      } else {
        const data = await res.json().catch(() => ({}))
        setToast({ message: data.error || 'Error al actualizar', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    }
  }

  // ─── OPEN PROFILE ───────────────────────────────────

  const openProfile = (patientId: string) => {
    setSelectedPatientId(patientId)
    setView('profile')
    fetchPatientProfile(patientId)
    fetchFollowUps(patientId)
    fetchDocuments(patientId)
  }

  // ─── BACK TO LIST ───────────────────────────────────

  const backToList = () => {
    setView('list')
    setSelectedPatientId(null)
    setSelectedPatient(null)
    setPage(1)
    fetchPatients()
  }

  // ─── CREATE PATIENT ─────────────────────────────────

  const handleCreatePatient = async () => {
    if (!createForm.fullName.trim() || !clinicId) return
    setIsCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          fullName: createForm.fullName.trim(),
          phone: createForm.phone || null,
          email: createForm.email || null,
          birthDate: createForm.birthDate || null,
          gender: createForm.gender || null,
          rfc: createForm.rfc || null,
          source: createForm.source,
          allergies: createForm.allergies || null,
          notes: createForm.notes || null,
          emergencyContactName: createForm.emergencyContactName || null,
          emergencyContactPhone: createForm.emergencyContactPhone || null,
          emergencyContactRelation: createForm.emergencyContactRelation || null,
          insuranceProvider: createForm.insuranceProvider || null,
          insurancePolicyNumber: createForm.insurancePolicyNumber || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setShowCreateDialog(false)
        setCreateForm({
          fullName: '',
          phone: '',
          email: '',
          birthDate: '',
          gender: '',
          rfc: '',
          allergies: '',
          notes: '',
          source: 'walk_in',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelation: '',
          insuranceProvider: '',
          insurancePolicyNumber: '',
        })
        setShowAdditionalFields(false)
        setToast({ message: 'Paciente creado exitosamente', type: 'success' })
        fetchPatients()
        // Optionally open the new patient's profile
        if (data.patient?.id) {
          openProfile(data.patient.id)
        }
      } else {
        const data = await res.json()
        setCreateError(data.error || 'Error al crear paciente')
      }
    } catch {
      setCreateError('Error de conexion')
    } finally {
      setIsCreating(false)
    }
  }

  // ─── DELETE APPOINTMENT FROM PROFILE ──────────────

  const handleDeleteAppointmentFromProfile = async (aptId: string) => {
    if (!confirm('¿Eliminar esta cita permanentemente?')) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/appointments/${aptId}?hard=true`, { method: 'DELETE' })
      if (res.ok) {
        setToast({ message: 'Cita eliminada', type: 'success' })
        if (selectedPatientId) fetchPatientProfile(selectedPatientId)
      } else {
        setToast({ message: 'Error al eliminar la cita', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  // ─── DELETE INVOICE FROM PROFILE ───────────────────

  const handleDeleteInvoiceFromProfile = async (invId: string) => {
    if (!confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/invoices?invoiceId=${invId}`, { method: 'DELETE' })
      if (res.ok) {
        setToast({ message: 'Factura eliminada', type: 'success' })
        if (selectedPatientId) fetchPatientProfile(selectedPatientId)
      } else {
        setToast({ message: 'Error al eliminar la factura', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  // ─── UPDATE PATIENT ─────────────────────────────────

  const handleSavePatient = async () => {
    if (!selectedPatientId) return
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setSaveSuccess(true)
        setToast({ message: 'Paciente actualizado', type: 'success' })
        setTimeout(() => setSaveSuccess(false), 2000)
        fetchPatientProfile(selectedPatientId)
      } else {
        const data = await res.json()
        setToast({ message: data.error || 'Error al actualizar', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexion', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  // ─── SOFT DELETE / REACTIVATE PATIENT ──────────────

  const handleDeactivatePatient = async () => {
    if (!selectedPatientId) return
    if (!confirm('¿Desactivar este paciente? El paciente ya no aparecerá en el directorio activo.')) return
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setToast({ message: 'Paciente desactivado', type: 'success' })
        fetchPatientProfile(selectedPatientId)
        fetchPatients()
      } else {
        setToast({ message: 'Error al desactivar paciente', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    }
  }

  const handleReactivatePatient = async () => {
    if (!selectedPatientId) return
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (res.ok) {
        setToast({ message: 'Paciente reactivado', type: 'success' })
        fetchPatientProfile(selectedPatientId)
        fetchPatients()
      } else {
        setToast({ message: 'Error al reactivar paciente', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    }
  }

  // ─── TOAST COMPONENT ────────────────────────────────

  const ToastNotification = () => {
    if (!toast) return null
    return (
      <motion.div
        className="fixed top-4 right-4 z-50"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/20'
              : 'bg-[#FEE2E2] text-[#991B1B] border border-[#991B1B]/20'
          }`}
        >
          {toast.type === 'success' ? (
            <Activity className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      </motion.div>
    )
  }

  // ─── LIST VIEW ──────────────────────────────────────

  const ListView = () => (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium tracking-[-0.03em] text-[#2C2C2A]">
            Directorio de pacientes
          </h2>
          <p className="text-sm text-[#888780] mt-0.5">
            {isLoading ? 'Cargando...' : `${totalPatients} paciente${totalPatients !== 1 ? 's' : ''} registrado${totalPatients !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={includeInactive ? 'default' : 'outline'}
            className={`h-9 text-xs gap-1.5 ${includeInactive ? 'bg-[#534AB7] hover:bg-[#534AB7]/90 text-white' : 'border-[#E1F5EE] text-[#888780] hover:bg-[#F1EFE8]'}`}
            onClick={() => { setIncludeInactive(!includeInactive); setPage(1) }}
          >
            {includeInactive ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
            {includeInactive ? 'Incluir inactivos' : 'Inactivos'}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white gap-2 h-9 text-sm">
                  <UserPlus className="h-4 w-4" />
                  Nuevo paciente
                </Button>
              </motion.div>
            </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-medium tracking-[-0.03em]">
                Nuevo paciente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {createError && (
                <div className="rounded-lg bg-[#FEE2E2] border border-[#991B1B]/20 p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#991B1B] shrink-0" />
                  <p className="text-sm text-[#991B1B]">{createError}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">
                  Nombre completo <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="Ej. Maria Garcia Lopez"
                  className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Telefono</Label>
                  <Input
                    placeholder="+52 55 1234 5678"
                    className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Email</Label>
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Fecha de nacimiento</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                    value={createForm.birthDate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, birthDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Genero</Label>
                  <Select
                    value={createForm.gender}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, gender: v }))}
                  >
                    <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">RFC</Label>
                <Input
                  placeholder="Ej. GALM880315MDF"
                  className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                  value={createForm.rfc}
                  onChange={(e) => setCreateForm((f) => ({ ...f, rfc: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Fuente</Label>
                <Select
                  value={createForm.source}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, source: v }))}
                >
                  <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                    <SelectValue placeholder="Seleccionar fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="referral">Referencia</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Alergias</Label>
                <Input
                  placeholder="Ej. Penicilina, Sulfonamidas"
                  className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                  value={createForm.allergies}
                  onChange={(e) => setCreateForm((f) => ({ ...f, allergies: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Notas</Label>
                <Textarea
                  placeholder="Notas adicionales sobre el paciente..."
                  className="text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20 min-h-[80px]"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Collapsible: Datos adicionales */}
              <div className="border border-[#E1F5EE] rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-[#F1EFE8] hover:bg-[#E1F5EE]/50 transition-colors"
                  onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                >
                  <span className="text-xs font-medium text-[#888780] flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Datos adicionales
                  </span>
                  {showAdditionalFields ? (
                    <ChevronUp className="h-3.5 w-3.5 text-[#888780]" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-[#888780]" />
                  )}
                </button>
                {showAdditionalFields && (
                  <div className="p-3 space-y-3">
                    <p className="text-[10px] text-[#888780] uppercase tracking-wide font-medium flex items-center gap-1">
                      <Siren className="h-3 w-3 text-red-400" />
                      Contacto de emergencia
                    </p>
                    <div className="space-y-2">
                      <Input
                        placeholder="Nombre del contacto"
                        className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                        value={createForm.emergencyContactName}
                        onChange={(e) => setCreateForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Input
                          placeholder="Teléfono del contacto"
                          className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                          value={createForm.emergencyContactPhone}
                          onChange={(e) => setCreateForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Select
                          value={createForm.emergencyContactRelation}
                          onValueChange={(v) => setCreateForm((f) => ({ ...f, emergencyContactRelation: v }))}
                        >
                          <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                            <SelectValue placeholder="Relación" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="esposo/a">Esposo/a</SelectItem>
                            <SelectItem value="padre">Padre</SelectItem>
                            <SelectItem value="madre">Madre</SelectItem>
                            <SelectItem value="hijo/a">Hijo/a</SelectItem>
                            <SelectItem value="amigo">Amigo</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator className="bg-[#E1F5EE]" />

                    <p className="text-[10px] text-[#888780] uppercase tracking-wide font-medium flex items-center gap-1">
                      <Shield className="h-3 w-3 text-[#1D9E75]" />
                      Seguro médico
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Input
                          placeholder="Aseguradora"
                          className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                          value={createForm.insuranceProvider}
                          onChange={(e) => setCreateForm((f) => ({ ...f, insuranceProvider: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Número de póliza"
                          className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                          value={createForm.insurancePolicyNumber}
                          onChange={(e) => setCreateForm((f) => ({ ...f, insurancePolicyNumber: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="h-9 text-sm border-[#E1F5EE] text-[#888780] hover:bg-[#F1EFE8]"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm gap-2"
                onClick={handleCreatePatient}
                disabled={!createForm.fullName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Crear paciente
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Quick stats banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-[#E1F5EE] bg-white">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-[#EEEDFE] flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-[#534AB7]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#2C2C2A] tracking-[-0.03em]">{totalPatients}</p>
                <p className="text-[10px] text-[#888780] uppercase tracking-wide font-medium">Total pacientes</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-[#E1F5EE] bg-white">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-[#E1F5EE] flex items-center justify-center shrink-0">
                <UserPlus className="h-4 w-4 text-[#1D9E75]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#2C2C2A] tracking-[-0.03em]">
                  {patients.filter(p => { const d = new Date(p.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length}
                </p>
                <p className="text-[10px] text-[#888780] uppercase tracking-wide font-medium">Nuevos este mes</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-[#E1F5EE] bg-white">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-[#E1F5EE] flex items-center justify-center shrink-0">
                <Activity className="h-4 w-4 text-[#1D9E75]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#2C2C2A] tracking-[-0.03em]">
                  {patients.filter(p => p.segment === 'active' || p.segment === 'vip').length}
                </p>
                <p className="text-[10px] text-[#888780] uppercase tracking-wide font-medium">Activos</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-[#E1F5EE] bg-white">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-[#FEF3C7] flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-[#92400E]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#2C2C2A] tracking-[-0.03em]">
                  {patients.filter(p => p.segment === 'vip').length}
                </p>
                <p className="text-[10px] text-[#888780] uppercase tracking-wide font-medium">VIP</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search + Sort + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#888780]" />
          <Input
            placeholder="Buscar por nombre, telefono o email..."
            className="pl-8 h-9 text-sm bg-white border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20 transition-colors"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-9 w-full sm:w-[180px] text-xs bg-white border-[#E1F5EE]">
            <ArrowUpDown className="h-3 w-3 mr-1.5 text-[#888780]" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Fecha de registro</SelectItem>
            <SelectItem value="name">Nombre</SelectItem>
            <SelectItem value="lastVisitDate">Última visita</SelectItem>
            <SelectItem value="totalSpent">Gasto total</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Segment filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {SEGMENT_TABS.map((tab) => {
          const isActive = segmentFilter === tab.value
          return (
            <motion.button
              key={tab.value}
              onClick={() => setSegmentFilter(tab.value)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-all duration-200 font-medium ${
                isActive
                  ? 'bg-[#534AB7] text-white shadow-sm'
                  : 'bg-white text-[#888780] hover:bg-[#F1EFE8] border border-[#E1F5EE]'
              }`}
              whileTap={{ scale: 0.97 }}
            >
              {tab.label}
            </motion.button>
          )
        })}
      </div>

      {/* Patient cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#534AB7]" />
          <span className="ml-2 text-sm text-[#888780]">Cargando pacientes...</span>
        </div>
      ) : patients.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-20 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-16 w-16 rounded-full bg-[#F1EFE8] flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-[#888780]/40" />
          </div>
          <p className="text-sm font-medium text-[#2C2C2A] mb-1">Sin pacientes</p>
          <p className="text-xs text-[#888780] mb-4">
            {searchQuery || segmentFilter !== 'all'
              ? 'No se encontraron pacientes con estos filtros'
              : 'Agrega tu primer paciente para comenzar'}
          </p>
          {!searchQuery && segmentFilter === 'all' && (
            <Button
              className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white gap-2 h-8 text-xs"
              onClick={() => setShowCreateDialog(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Nuevo paciente
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {(() => {
              const sorted = [...patients].sort((a, b) => {
                switch (sortBy) {
                  case 'name': return a.fullName.localeCompare(b.fullName)
                  case 'lastVisitDate': return new Date(b.lastVisitDate || 0).getTime() - new Date(a.lastVisitDate || 0).getTime()
                  case 'totalSpent': return b.totalSpent - a.totalSpent
                  default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                }
              })
              return sorted
            })().map((patient, i) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-[#E1F5EE] text-[#1D9E75] text-xs font-semibold">
                          {getInitials(patient.fullName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#2C2C2A] truncate tracking-[-0.01em]">
                              {patient.fullName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {patient.phone && (
                                <span className="text-[11px] text-[#888780] flex items-center gap-1 truncate">
                                  <Phone className="h-2.5 w-2.5 shrink-0" />
                                  {patient.phone}
                                </span>
                              )}
                            </div>
                            {patient.email && (
                              <span className="text-[11px] text-[#888780] flex items-center gap-1 truncate">
                                <Mail className="h-2.5 w-2.5 shrink-0" />
                                {patient.email}
                              </span>
                            )}
                          </div>
                          <SegmentBadge segment={patient.segment} />
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-[#888780]" />
                            <span className="text-[10px] text-[#888780]">
                              {patient._count?.appointments ?? patient.totalVisits} citas
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-[#888780]" />
                            <span className="text-[10px] text-[#888780]">
                              {patient._count?.soapNotes ?? 0} notas
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-[#888780]" />
                            <span className="text-[10px] text-[#888780]">
                              {formatCurrency(patient.totalSpent)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end mt-3">
                          {!patient.isActive && (
                            <Badge className="bg-[#FEE2E2] text-[#991B1B] border-0 text-[10px] font-medium px-2 py-0.5 mr-2">
                              Desactivado
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            className="h-7 text-xs text-[#534AB7] hover:text-[#534AB7] hover:bg-[#EEEDFE] gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={() => openProfile(patient.id)}
                          >
                            Ver ficha
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPatients > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#888780]">
            Mostrando {((page - 1) * limit) + 1}-{Math.min(page * limit, totalPatients)} de {totalPatients} pacientes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-[#E1F5EE] text-[#888780] hover:bg-[#F1EFE8]"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-xs text-[#888780]">
              Página {page} de {Math.max(1, Math.ceil(totalPatients / limit))}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-[#E1F5EE] text-[#888780] hover:bg-[#F1EFE8]"
              disabled={page >= Math.ceil(totalPatients / limit)}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )

  // ─── PROFILE VIEW ───────────────────────────────────

  const ProfileView = () => {
    if (isLoadingProfile) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#534AB7]" />
          <span className="ml-2 text-sm text-[#888780]">Cargando ficha...</span>
        </div>
      )
    }

    if (!selectedPatient) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-8 w-8 text-[#888780]/40 mb-2" />
          <p className="text-sm text-[#888780]">No se pudo cargar la informacion del paciente</p>
        </div>
      )
    }

    const p = selectedPatient

    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Back button */}
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            variant="ghost"
            className="gap-2 text-sm text-[#888780] hover:text-[#2C2C2A] h-8 px-2"
            onClick={backToList}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al directorio
          </Button>
        </motion.div>

        {/* Patient header card */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="bg-[#E1F5EE] text-[#1D9E75] text-base font-semibold">
                  {getInitials(p.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-medium text-[#2C2C2A] tracking-[-0.03em]">
                    {p.fullName}
                  </h2>
                  <SegmentBadge segment={p.segment} />
                  <SourceBadge source={p.source} />
                  {!p.isActive && (
                    <Badge className="bg-[#FEE2E2] text-[#991B1B] border-0 text-[10px] font-medium px-2 py-0.5">
                      Desactivado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  {p.phone && (
                    <span className="text-xs text-[#888780] flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {p.phone}
                    </span>
                  )}
                  {p.email && (
                    <span className="text-xs text-[#888780] flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      {p.email}
                    </span>
                  )}
                  <span className="text-xs text-[#888780] flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Registrado {formatDate(p.createdAt)}
                  </span>
                  {p.firstContactDate && (
                    <span className="text-xs text-[#888780] flex items-center gap-1.5">
                      <CalendarClock className="h-3 w-3" />
                      Primer contacto {formatDate(p.firstContactDate)}
                    </span>
                  )}
                </div>
                {p.allergies && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertCircle className="h-3 w-3 text-[#92400E]" />
                    <span className="text-[10px] font-medium text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                      Alergias: {p.allergies}
                    </span>
                  </div>
                )}
                {/* Emergency Contact + Insurance quick info */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {p.emergencyContactName && (
                    <span className="text-[10px] text-[#991B1B] bg-[#FEE2E2]/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Siren className="h-2.5 w-2.5" />
                      Emergencia: {p.emergencyContactName}{p.emergencyContactPhone ? ` ${p.emergencyContactPhone}` : ''}
                    </span>
                  )}
                  {p.insuranceProvider && (
                    <span className="text-[10px] text-[#1D9E75] bg-[#E1F5EE]/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Shield className="h-2.5 w-2.5" />
                      {p.insuranceProvider}{p.insurancePolicyNumber ? ` — ${p.insurancePolicyNumber}` : ''}
                    </span>
                  )}
                </div>
              </div>
              {/* Quick actions */}
              <div className="flex items-center gap-2 shrink-0">
                {p.isActive ? (
                  <Button
                    className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-8 text-xs gap-1.5"
                    onClick={() => setActiveModule('agenda')}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Agendar cita
                  </Button>
                ) : (
                  <Button
                    className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-8 text-xs gap-1.5"
                    onClick={handleReactivatePatient}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Reactivar
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-[#534AB7] text-[#534AB7] hover:bg-[#EEEDFE]"
                  onClick={() => setActiveModule('flow')}
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  Nota clínica
                </Button>
                {p.isActive && (
                  <Button
                    variant="outline"
                    className="h-8 text-xs gap-1.5 border-red-200 text-red-500 hover:bg-red-50"
                    onClick={handleDeactivatePatient}
                  >
                    <UserX className="h-3.5 w-3.5" />
                    Desactivar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-[#E1F5EE] bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-7 w-7 rounded-md bg-[#EEEDFE] flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-[#534AB7]" />
                  </div>
                  <span className="text-[10px] text-[#888780] uppercase tracking-wide font-medium">
                    Total visitas
                  </span>
                </div>
                <p className="text-xl font-semibold text-[#2C2C2A] tracking-[-0.03em]">
                  {p.totalVisits}
                </p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-[#E1F5EE] bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-7 w-7 rounded-md bg-[#E1F5EE] flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5 text-[#1D9E75]" />
                  </div>
                  <span className="text-[10px] text-[#888780] uppercase tracking-wide font-medium">
                    Total gastado
                  </span>
                </div>
                <p className="text-xl font-semibold text-[#2C2C2A] tracking-[-0.03em]">
                  {formatCurrency(p.totalSpent)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-[#E1F5EE] bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-7 w-7 rounded-md bg-[#FEF3C7] flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-[#92400E]" />
                  </div>
                  <span className="text-[10px] text-[#888780] uppercase tracking-wide font-medium">
                    Notas clinicas
                  </span>
                </div>
                <p className="text-xl font-semibold text-[#2C2C2A] tracking-[-0.03em]">
                  {p._count?.soapNotes ?? p.soapNotes?.length ?? 0}
                </p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-[#E1F5EE] bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-7 w-7 rounded-md bg-[#E1F5EE] flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-[#1D9E75]" />
                  </div>
                  <span className="text-[10px] text-[#888780] uppercase tracking-wide font-medium">
                    Ultima visita
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#2C2C2A] tracking-[-0.03em]">
                  {formatDate(p.lastVisitDate)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="bg-[#F1EFE8] h-9 p-0.5 flex-wrap">
            <TabsTrigger
              value="activity"
              className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md data-[state=active]:text-[#534AB7]"
            >
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Actividad
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md data-[state=active]:text-[#534AB7]"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Informacion
            </TabsTrigger>
            <TabsTrigger
              value="appointments"
              className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md data-[state=active]:text-[#534AB7]"
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Citas
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md data-[state=active]:text-[#534AB7]"
            >
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
              Notas clinicas
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md data-[state=active]:text-[#534AB7]"
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Facturacion
            </TabsTrigger>
            <TabsTrigger
              value="conversations"
              className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md data-[state=active]:text-[#534AB7]"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Conversaciones
            </TabsTrigger>
            <TabsTrigger
              value="followups"
              className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md data-[state=active]:text-[#534AB7]"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Seguimientos
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="text-xs h-8 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md data-[state=active]:text-[#534AB7]"
            >
              <Paperclip className="h-3.5 w-3.5 mr-1.5" />
              Documentos
            </TabsTrigger>
          </TabsList>

          {/* TAB: Actividad (Activity Timeline) */}
          <TabsContent value="activity">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Actividad del paciente
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <CardContent className="p-4">
                {(() => {
                  type TimelineEntry = { id: string; date: string; type: 'created' | 'appointment' | 'soap' | 'invoice' | 'followup' | 'conversation'; label: string; detail: string; module?: string }
                  const entries: TimelineEntry[] = []

                  // Patient created
                  entries.push({
                    id: `created-${p.id}`,
                    date: p.createdAt,
                    type: 'created',
                    label: 'Paciente registrado',
                    detail: `${p.fullName} fue dado de alta en el sistema`,
                  })

                  // Appointments
                  for (const apt of p.appointments) {
                    entries.push({
                      id: apt.id,
                      date: apt.date,
                      type: 'appointment',
                      label: apt.status === 'completed' ? 'Cita completada' : apt.status === 'cancelled' ? 'Cita cancelada' : apt.status === 'no_show' ? 'No asistió a cita' : apt.status === 'confirmed' ? 'Cita confirmada' : 'Cita agendada',
                      detail: `${apt.startTime} - ${apt.service?.name || 'Consulta'} ${apt.doctor ? `(${apt.doctor.name})` : ''}`,
                      module: 'agenda',
                    })
                  }

                  // SOAP notes
                  for (const note of p.soapNotes) {
                    entries.push({
                      id: note.id,
                      date: note.createdAt,
                      type: 'soap',
                      label: 'Nota clínica firmada',
                      detail: note.diagnosis || note.assessment?.slice(0, 60) || 'Nota SOAP',
                      module: 'flow',
                    })
                  }

                  // Invoices
                  for (const inv of p.invoices) {
                    entries.push({
                      id: inv.id,
                      date: inv.createdAt,
                      type: 'invoice',
                      label: inv.paymentStatus === 'paid' ? 'Pago recibido' : inv.status === 'timbrada' ? 'CFDI timbrada' : 'Factura generada',
                      detail: `${formatCurrency(inv.total)} — ${inv.concepto || 'Consulta'}`,
                      module: 'bill',
                    })
                  }

                  // Follow-ups
                  for (const fu of followUps) {
                    entries.push({
                      id: fu.id,
                      date: fu.completedAt || fu.createdAt,
                      type: 'followup',
                      label: fu.status === 'completed' ? 'Seguimiento completado' : 'Seguimiento creado',
                      detail: `${fu.type === 'call' ? 'Llamada' : fu.type === 'message' ? 'Mensaje' : fu.type === 'reminder' ? 'Recordatorio' : fu.type === 'appointment' ? 'Agendar cita' : 'Nota'}${fu.notes ? `: ${fu.notes.slice(0, 40)}` : ''}`,
                    })
                  }

                  // Conversations
                  if (p.conversations) {
                    for (const conv of p.conversations) {
                      entries.push({
                        id: conv.id,
                        date: conv.lastMessageAt,
                        type: 'conversation',
                        label: `Conversación por ${conv.channel === 'whatsapp' ? 'WhatsApp' : conv.channel === 'instagram' ? 'Instagram' : 'Messenger'}`,
                        detail: conv.status === 'active' ? 'Conversación activa' : conv.status === 'closed' ? 'Conversación cerrada' : 'Transferida a humano',
                        module: 'desk',
                      })
                    }
                  }

                  // Sort by date descending
                  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                  const timelineConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
                    created: { icon: UserPlus, color: '#534AB7', bg: '#EEEDFE' },
                    appointment: { icon: Calendar, color: '#1D9E75', bg: '#E1F5EE' },
                    soap: { icon: FileText, color: '#534AB7', bg: '#EEEDFE' },
                    invoice: { icon: Receipt, color: '#D97706', bg: '#FEF3C7' },
                    followup: { icon: Clock, color: '#3B82F6', bg: '#DBEAFE' },
                    conversation: { icon: MessageSquare, color: '#1D9E75', bg: '#E1F5EE' },
                  }

                  if (entries.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity className="h-10 w-10 text-[#888780]/30 mb-3" />
                        <p className="text-sm text-[#888780]">Sin actividad registrada</p>
                      </div>
                    )
                  }

                  return (
                    <ScrollArea className="max-h-[500px]">
                      <div className="space-y-0">
                        {entries.map((entry, i) => {
                          const config = timelineConfig[entry.type]
                          const Icon = config.icon
                          const isLast = i === entries.length - 1
                          return (
                            <div key={entry.id} className="flex gap-3 group cursor-pointer" onClick={() => { if (entry.module) setActiveModule(entry.module as 'agenda' | 'flow' | 'bill' | 'desk') }}>
                              {/* Timeline line + dot */}
                              <div className="flex flex-col items-center">
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`} style={{ backgroundColor: config.bg }}>
                                  <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                                </div>
                                {!isLast && <div className="w-px flex-1 bg-[#E1F5EE] min-h-[8px]" />}
                              </div>
                              {/* Content */}
                              <div className={`pb-4 flex-1`}>
                                <p className="text-xs font-medium text-[#2C2C2A]">{entry.label}</p>
                                <p className="text-[10px] text-[#888780] mt-0.5">{entry.detail}</p>
                                <p className="text-[9px] text-[#888780]/60 mt-0.5">{formatDate(entry.date)} · {formatTime(entry.date)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Informacion */}
          <TabsContent value="info">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Informacion del paciente
                  </CardTitle>
                  <Button
                    className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-8 text-xs gap-1.5"
                    onClick={handleSavePatient}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Guardando...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Activity className="h-3 w-3" />
                        Guardado
                      </>
                    ) : (
                      <>
                        Guardar cambios
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Personal info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-[#888780] uppercase tracking-wide">
                      Datos personales
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#888780]">Nombre completo</Label>
                        <Input
                          className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                          value={String(editForm.fullName || '')}
                          onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Telefono</Label>
                          <Input
                            className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                            value={String(editForm.phone || '')}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Email</Label>
                          <Input
                            className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                            value={String(editForm.email || '')}
                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Fecha de nacimiento</Label>
                          <Input
                            type="date"
                            className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                            value={String(editForm.birthDate || '')}
                            onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Genero</Label>
                          <Select
                            value={String(editForm.gender || '')}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, gender: v }))}
                          >
                            <SelectTrigger className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M">Masculino</SelectItem>
                              <SelectItem value="F">Femenino</SelectItem>
                              <SelectItem value="other">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#888780]">RFC</Label>
                        <Input
                          className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                          value={String(editForm.rfc || '')}
                          onChange={(e) => setEditForm((f) => ({ ...f, rfc: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#888780]">Direccion</Label>
                        <Input
                          className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                          value={String(editForm.address || '')}
                          onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clinical + CRM info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-[#888780] uppercase tracking-wide">
                      Datos clinicos
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#888780]">Alergias</Label>
                        <Input
                          className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                          value={String(editForm.allergies || '')}
                          onChange={(e) => setEditForm((f) => ({ ...f, allergies: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#888780]">Notas generales</Label>
                        <Textarea
                          className="text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20 min-h-[72px]"
                          value={String(editForm.notes || '')}
                          onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Separator className="bg-[#E1F5EE]" />

                    <h4 className="text-xs font-semibold text-[#888780] uppercase tracking-wide">
                      CRM & Segmentacion
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Fuente</Label>
                          <Select
                            value={String(editForm.source || 'walk_in')}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, source: v }))}
                          >
                            <SelectTrigger className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="walk_in">Walk-in</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="referral">Referencia</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Segmento</Label>
                          <Select
                            value={String(editForm.segment || 'new')}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, segment: v }))}
                          >
                            <SelectTrigger className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Nuevo</SelectItem>
                              <SelectItem value="active">Activo</SelectItem>
                              <SelectItem value="inactive">Inactivo</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                              <SelectItem value="churned">Abandonado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Canal preferido</Label>
                          <Select
                            value={String(editForm.preferredChannel || 'whatsapp')}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, preferredChannel: v }))}
                          >
                            <SelectTrigger className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">LTV</Label>
                          <div className="h-8 px-3 flex items-center rounded-md bg-[#F1EFE8] border border-[#E1F5EE] text-sm text-[#2C2C2A]">
                            {formatCurrency(p.ltv)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-[#E1F5EE]" />

                    <h4 className="text-xs font-semibold text-[#991B1B] uppercase tracking-wide flex items-center gap-1">
                      <Siren className="h-3 w-3" />
                      Contacto de emergencia
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#888780]">Nombre</Label>
                        <Input
                          className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                          value={String(editForm.emergencyContactName || '')}
                          onChange={(e) => setEditForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                          placeholder="Nombre del contacto de emergencia"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Teléfono</Label>
                          <Input
                            className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                            value={String(editForm.emergencyContactPhone || '')}
                            onChange={(e) => setEditForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                            placeholder="+52 55 1234 5678"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Relación</Label>
                          <Select
                            value={String(editForm.emergencyContactRelation || '')}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, emergencyContactRelation: v }))}
                          >
                            <SelectTrigger className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="esposo/a">Esposo/a</SelectItem>
                              <SelectItem value="padre">Padre</SelectItem>
                              <SelectItem value="madre">Madre</SelectItem>
                              <SelectItem value="hijo/a">Hijo/a</SelectItem>
                              <SelectItem value="amigo">Amigo</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-[#E1F5EE]" />

                    <h4 className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Seguro médico
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Aseguradora</Label>
                          <Input
                            className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                            value={String(editForm.insuranceProvider || '')}
                            onChange={(e) => setEditForm((f) => ({ ...f, insuranceProvider: e.target.value }))}
                            placeholder="Ej. GNP, AXA, MetLife"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#888780]">Número de póliza</Label>
                          <Input
                            className="h-8 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                            value={String(editForm.insurancePolicyNumber || '')}
                            onChange={(e) => setEditForm((f) => ({ ...f, insurancePolicyNumber: e.target.value }))}
                            placeholder="Ej. POL-123456"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Citas */}
          <TabsContent value="appointments">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Historial de citas
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <CardContent className="p-0">
                {(!p.appointments || p.appointments.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-8 w-8 text-[#888780]/30 mb-2" />
                    <p className="text-sm text-[#888780]">Sin citas registradas</p>
                    <p className="text-xs text-[#888780]/70 mt-0.5">
                      Las citas agendadas aparecera aqui
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="divide-y divide-[#E1F5EE]">
                      {p.appointments.map((apt, i) => (
                        <motion.div
                          key={apt.id}
                          className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#F1EFE8]/50 transition-colors group"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div className="h-9 w-9 rounded-lg bg-[#F1EFE8] flex items-center justify-center shrink-0">
                            <Calendar className="h-4 w-4 text-[#888780]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#2C2C2A]">
                                {formatShortDate(apt.date)}
                              </span>
                              <span className="text-xs text-[#888780]">
                                {apt.startTime} - {apt.endTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {apt.doctor && (
                                <span className="text-[11px] text-[#888780]">
                                  {apt.doctor.name}
                                </span>
                              )}
                              {apt.service && (
                                <>
                                  <span className="text-[10px] text-[#888780]">·</span>
                                  <span className="text-[11px] text-[#888780]">
                                    {apt.service.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <AppointmentStatusBadge status={apt.status} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-[#888780] hover:text-red-500 transition-opacity"
                            onClick={() => handleDeleteAppointmentFromProfile(apt.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Notas clinicas */}
          <TabsContent value="notes">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Notas clinicas (SOAP)
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <CardContent className="p-0">
                {(!p.soapNotes || p.soapNotes.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Stethoscope className="h-8 w-8 text-[#888780]/30 mb-2" />
                    <p className="text-sm text-[#888780]">Sin notas clinicas</p>
                    <p className="text-xs text-[#888780]/70 mt-0.5">
                      Las notas SOAP de consulta aparecera aqui
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="divide-y divide-[#E1F5EE]">
                      {p.soapNotes.map((note, i) => (
                        <motion.div
                          key={note.id}
                          className="px-6 py-4 hover:bg-[#F1EFE8]/50 transition-colors"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center shrink-0">
                              <FileText className="h-3.5 w-3.5 text-[#1D9E75]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#2C2C2A]">
                                  {formatShortDate(note.createdAt)}
                                </span>
                                {note.doctor && (
                                  <span className="text-[11px] text-[#888780]">
                                    — {note.doctor.name}
                                  </span>
                                )}
                              </div>
                              {note.diagnosis && (
                                <p className="text-[11px] text-[#1D9E75] font-medium mt-0.5 truncate">
                                  Dx: {note.diagnosis}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* SOAP sections */}
                          <div className="ml-11 space-y-1.5">
                            {note.subjective && (
                              <div className="text-xs">
                                <span className="font-semibold text-[#534AB7]">S: </span>
                                <span className="text-[#888780] line-clamp-2">{note.subjective}</span>
                              </div>
                            )}
                            {note.objective && (
                              <div className="text-xs">
                                <span className="font-semibold text-[#1D9E75]">O: </span>
                                <span className="text-[#888780] line-clamp-2">{note.objective}</span>
                              </div>
                            )}
                            {note.assessment && (
                              <div className="text-xs">
                                <span className="font-semibold text-[#92400E]">A: </span>
                                <span className="text-[#888780] line-clamp-2">{note.assessment}</span>
                              </div>
                            )}
                            {note.plan && (
                              <div className="text-xs">
                                <span className="font-semibold text-[#888780]">P: </span>
                                <span className="text-[#888780] line-clamp-2">{note.plan}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Facturacion */}
          <TabsContent value="billing">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Historial de facturacion
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <CardContent className="p-0">
                {(!p.invoices || p.invoices.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Receipt className="h-8 w-8 text-[#888780]/30 mb-2" />
                    <p className="text-sm text-[#888780]">Sin facturas</p>
                    <p className="text-xs text-[#888780]/70 mt-0.5">
                      Las facturas generadas aparecera aqui
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="divide-y divide-[#E1F5EE]">
                      {p.invoices.map((inv, i) => (
                        <motion.div
                          key={inv.id}
                          className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#F1EFE8]/50 transition-colors group"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div className="h-9 w-9 rounded-lg bg-[#F1EFE8] flex items-center justify-center shrink-0">
                            <Receipt className="h-4 w-4 text-[#888780]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#2C2C2A]">
                                {inv.concepto || 'Factura'}
                              </span>
                              <span className="text-xs text-[#888780]">
                                {formatShortDate(inv.createdAt)}
                              </span>
                            </div>
                            {inv.cfdiUuid && (
                              <p className="text-[10px] text-[#888780] mt-0.5 font-mono truncate">
                                UUID: {inv.cfdiUuid}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium text-[#2C2C2A]">
                              {formatCurrency(inv.total)}
                            </p>
                            <div className="flex items-center gap-1.5 justify-end mt-0.5">
                              <InvoiceStatusBadge status={inv.status} />
                              <PaymentStatusBadge paymentStatus={inv.paymentStatus} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {inv.paymentStatus === 'unpaid' && inv.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-[#1D9E75] hover:bg-[#E1F5EE]"
                                onClick={async () => {
                                  const res = await fetch('/api/invoices', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ invoiceId: inv.id, paymentStatus: 'paid', formaPago: '01' }),
                                  })
                                  if (res.ok && selectedPatientId) {
                                    setToast({ message: 'Pago registrado', type: 'success' })
                                    fetchPatientProfile(selectedPatientId)
                                  }
                                }}
                                title="Marcar como pagado"
                              >
                                <DollarSign className="h-3 w-3" />
                              </Button>
                            )}
                            {inv.paymentStatus === 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-[#D97706] hover:bg-[#FEF3C7]"
                                onClick={async () => {
                                  if (!confirm('¿Eliminar el pago? La factura volverá a pendiente.')) return
                                  const res = await fetch('/api/invoices', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ invoiceId: inv.id, paymentStatus: 'unpaid' }),
                                  })
                                  if (res.ok && selectedPatientId) {
                                    setToast({ message: 'Pago eliminado', type: 'success' })
                                    fetchPatientProfile(selectedPatientId)
                                  }
                                }}
                                title="Eliminar pago"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-[#888780] hover:text-red-500"
                              onClick={() => handleDeleteInvoiceFromProfile(inv.id)}
                              disabled={isDeleting}
                              title="Eliminar factura"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Conversaciones */}
          <TabsContent value="conversations">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Conversaciones
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <CardContent className="p-4">
                {(!p.conversations || p.conversations.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-10 w-10 text-[#888780]/30 mb-3" />
                    <p className="text-sm text-[#888780]">Sin conversaciones registradas</p>
                    <p className="text-xs text-[#888780]/60 mt-1">
                      Las conversaciones por WhatsApp, Instagram y Messenger aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {p.conversations.map((conv, i) => {
                        const isExpanded = expandedConversation === conv.id
                        const channelConfig: Record<string, { label: string; color: string; bg: string }> = {
                          whatsapp: { label: 'WhatsApp', color: '#1D9E75', bg: '#E1F5EE' },
                          instagram: { label: 'Instagram', color: '#D97706', bg: '#FEF3C7' },
                          messenger: { label: 'Messenger', color: '#3B82F6', bg: '#DBEAFE' },
                        }
                        const ch = channelConfig[conv.channel] || channelConfig.whatsapp
                        const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
                          active: { label: 'Activa', bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]' },
                          closed: { label: 'Cerrada', bg: 'bg-[#F1EFE8]', text: 'text-[#888780]' },
                          handed_off: { label: 'Transferida', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
                        }
                        const st = statusConfig[conv.status] || statusConfig.active
                        return (
                          <motion.div
                            key={conv.id}
                            className="rounded-lg border border-[#E1F5EE] overflow-hidden"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <button
                              type="button"
                              className="w-full p-3 flex items-center justify-between hover:bg-[#F1EFE8]/50 transition-colors"
                              onClick={() => setExpandedConversation(isExpanded ? null : conv.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: ch.bg }}>
                                  <MessageSquare className="h-3.5 w-3.5" style={{ color: ch.color }} />
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[#2C2C2A]">{ch.label}</span>
                                    <Badge className={`${st.bg} ${st.text} border-0 text-[9px] px-1.5 py-0`}>
                                      {st.label}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] text-[#888780]">
                                    {formatDate(conv.lastMessageAt)}
                                  </span>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-[#888780]" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-[#888780]" />
                              )}
                            </button>
                            {isExpanded && conv.messages && conv.messages.length > 0 && (
                              <div className="px-3 pb-3 space-y-2 border-t border-[#E1F5EE] pt-2">
                                {conv.messages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                                        msg.direction === 'inbound'
                                          ? 'bg-[#F1EFE8] text-[#2C2C2A]'
                                          : 'bg-[#534AB7] text-white'
                                      }`}
                                    >
                                      <p>{msg.content}</p>
                                      <p className={`text-[9px] mt-1 ${msg.direction === 'inbound' ? 'text-[#888780]' : 'text-white/60'}`}>
                                        {formatTime(msg.createdAt)}
                                        {msg.senderType === 'agent' && ' · Agente IA'}
                                        {msg.senderType === 'patient' && ' · Paciente'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {isExpanded && (!conv.messages || conv.messages.length === 0) && (
                              <div className="px-3 pb-3 border-t border-[#E1F5EE] pt-2">
                                <p className="text-[10px] text-[#888780] text-center py-2">Sin mensajes en esta conversación</p>
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Seguimientos */}
          <TabsContent value="followups">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Seguimientos
                  </CardTitle>
                  <Button
                    className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-7 text-xs gap-1"
                    onClick={() => setShowNewFollowUp(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Nuevo seguimiento
                  </Button>
                </div>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <CardContent className="p-4">
                {isLoadingFollowUps ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                    <span className="ml-2 text-xs text-[#888780]">Cargando...</span>
                  </div>
                ) : followUps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-10 w-10 text-[#888780]/30 mb-3" />
                    <p className="text-sm text-[#888780]">Sin seguimientos</p>
                    <p className="text-xs text-[#888780]/60 mt-1">Crea un seguimiento para hacer seguimiento de este paciente</p>
                    <Button
                      className="mt-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-8 text-xs gap-1.5"
                      onClick={() => setShowNewFollowUp(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nuevo seguimiento
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {followUps.map((fu, i) => {
                        const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
                          call: { icon: PhoneCall, label: 'Llamada', color: '#1D9E75' },
                          message: { icon: MessageSquare, label: 'Mensaje', color: '#534AB7' },
                          appointment: { icon: CalendarClock, label: 'Agendar cita', color: '#3B82F6' },
                          reminder: { icon: Bell, label: 'Recordatorio', color: '#D97706' },
                          note: { icon: FileText, label: 'Nota', color: '#888780' },
                        }
                        const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
                          pending: { label: 'Pendiente', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
                          completed: { label: 'Completado', bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]' },
                          cancelled: { label: 'Cancelado', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
                          snoozed: { label: 'Pospuesto', bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]' },
                        }
                        const tConfig = typeConfig[fu.type] || typeConfig.note
                        const sConfig = statusConfig[fu.status] || statusConfig.pending
                        const TIcon = tConfig.icon
                        return (
                          <motion.div
                            key={fu.id}
                            className="p-3 rounded-lg border border-[#E1F5EE] hover:border-[#1D9E75]/30 transition-colors"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${tConfig.color}20`, color: tConfig.color }}>
                                  <TIcon className="h-3 w-3" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-[#2C2C2A]">{tConfig.label}</p>
                                  {fu.notes && <p className="text-[10px] text-[#888780] mt-0.5 line-clamp-2">{fu.notes}</p>}
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={`${sConfig.bg} ${sConfig.text} border-0 text-[9px] px-1.5 py-0`}>
                                      {sConfig.label}
                                    </Badge>
                                    {fu.dueDate && (
                                      <span className="text-[9px] text-[#888780]">
                                        {fu.status === 'completed' ? 'Completado' : 'Vence'}: {formatShortDate(fu.dueDate)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {fu.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-[#1D9E75] hover:bg-[#E1F5EE]"
                                      onClick={() => handleUpdateFollowUp(fu.id, { status: 'completed' })}
                                      title="Marcar como completado"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-[#534AB7] hover:bg-[#EEEDFE]"
                                      onClick={() => {
                                        const newDate = prompt('Nueva fecha (YYYY-MM-DD):', fu.dueDate ? new Date(fu.dueDate).toISOString().split('T')[0] : '')
                                        if (newDate) handleUpdateFollowUp(fu.id, { status: 'snoozed', dueDate: newDate })
                                      }}
                                      title="Posponer"
                                    >
                                      <Clock className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                                {fu.status === 'snoozed' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-[#1D9E75] hover:bg-[#E1F5EE]"
                                    onClick={() => handleUpdateFollowUp(fu.id, { status: 'completed' })}
                                    title="Marcar como completado"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                )}
                                {fu.status !== 'completed' && fu.status !== 'cancelled' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-[#888780] hover:text-red-500 hover:bg-red-50"
                                    onClick={() => handleUpdateFollowUp(fu.id, { status: 'cancelled' })}
                                    title="Cancelar"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}

                {/* New follow-up dialog */}
                {showNewFollowUp && (
                  <motion.div
                    className="mt-4 p-3 rounded-lg bg-[#F1EFE8] border border-[#E1F5EE] space-y-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-xs font-medium text-[#2C2C2A]">Nuevo seguimiento</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-[#888780]">Tipo</Label>
                        <Select value={newFollowUp.type} onValueChange={(v) => setNewFollowUp(f => ({ ...f, type: v }))}>
                          <SelectTrigger className="h-8 text-xs bg-white border-[#E1F5EE]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Llamada</SelectItem>
                            <SelectItem value="message">Mensaje</SelectItem>
                            <SelectItem value="appointment">Agendar cita</SelectItem>
                            <SelectItem value="reminder">Recordatorio</SelectItem>
                            <SelectItem value="note">Nota</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-[#888780]">Fecha límite</Label>
                        <Input
                          type="date"
                          className="h-8 text-xs bg-white border-[#E1F5EE]"
                          value={newFollowUp.dueDate}
                          onChange={(e) => setNewFollowUp(f => ({ ...f, dueDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-[#888780]">Notas</Label>
                      <Textarea
                        className="text-xs bg-white border-[#E1F5EE] min-h-[60px]"
                        placeholder="Notas sobre el seguimiento..."
                        value={newFollowUp.notes}
                        onChange={(e) => setNewFollowUp(f => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 h-8 text-xs bg-[#534AB7] hover:bg-[#534AB7]/90 text-white"
                        onClick={handleCreateFollowUp}
                        disabled={isCreatingFollowUp}
                      >
                        {isCreatingFollowUp ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                        Crear seguimiento
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 text-xs text-[#888780]"
                        onClick={() => { setShowNewFollowUp(false); setNewFollowUp({ type: 'call', dueDate: '', notes: '' }) }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Documentos */}
          <TabsContent value="documents">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Documentos y estudios
                  </CardTitle>
                  <Button
                    className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-7 text-xs gap-1"
                    onClick={() => { setShowNewDocument(true); setNewDocType('file') }}
                  >
                    <Plus className="h-3 w-3" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <CardContent className="p-4">
                {/* Category filters */}
                <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'study', label: 'Estudios' },
                    { value: 'xray', label: 'Radiografias' },
                    { value: 'lab', label: 'Laboratorio' },
                    { value: 'prescription', label: 'Recetas' },
                    { value: 'insurance', label: 'Seguro' },
                    { value: 'other', label: 'Otros' },
                  ].map((cat) => {
                    const isActive = docFilterCategory === cat.value
                    return (
                      <motion.button
                        key={cat.value}
                        onClick={() => {
                          setDocFilterCategory(cat.value)
                          if (selectedPatientId) fetchDocuments(selectedPatientId)
                        }}
                        className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full transition-all duration-200 font-medium ${
                          isActive
                            ? 'bg-[#534AB7] text-white shadow-sm'
                            : 'bg-white text-[#888780] hover:bg-[#F1EFE8] border border-[#E1F5EE]'
                        }`}
                        whileTap={{ scale: 0.97 }}
                      >
                        {cat.label}
                      </motion.button>
                    )
                  })}
                </div>

                {isLoadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                    <span className="ml-2 text-xs text-[#888780]">Cargando documentos...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Paperclip className="h-10 w-10 text-[#888780]/30 mb-3" />
                    <p className="text-sm text-[#888780]">Sin documentos</p>
                    <p className="text-xs text-[#888780]/60 mt-1">
                      Carga estudios, radiografias, recetas o agrega enlaces a estudios en linea
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-8 text-xs gap-1.5"
                        onClick={() => { setShowNewDocument(true); setNewDocType('file') }}
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        Cargar archivo
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 text-xs gap-1.5 border-[#534AB7] text-[#534AB7] hover:bg-[#EEEDFE]"
                        onClick={() => { setShowNewDocument(true); setNewDocType('link') }}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Agregar enlace
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {documents.map((doc, i) => {
                        const catConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
                          study: { label: 'Estudio', icon: FileText, color: '#534AB7', bg: '#EEEDFE' },
                          xray: { label: 'Radiografia', icon: ImageIcon, color: '#1D9E75', bg: '#E1F5EE' },
                          lab: { label: 'Laboratorio', icon: Activity, color: '#3B82F6', bg: '#DBEAFE' },
                          prescription: { label: 'Receta', icon: FileText, color: '#D97706', bg: '#FEF3C7' },
                          insurance: { label: 'Seguro', icon: Shield, color: '#1D9E75', bg: '#E1F5EE' },
                          other: { label: 'Otro', icon: Paperclip, color: '#888780', bg: '#F1EFE8' },
                        }
                        const cConfig = catConfig[doc.category] || catConfig.other
                        const CIcon = cConfig.icon
                        const isLink = doc.type === 'link'
                        const isImage = doc.fileType?.startsWith('image/')
                        const isPdf = doc.fileType === 'application/pdf'

                        function formatFileSize(bytes: number | null): string {
                          if (!bytes) return ''
                          if (bytes < 1024) return `${bytes} B`
                          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
                          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                        }

                        return (
                          <motion.div
                            key={doc.id}
                            className="p-3 rounded-lg border border-[#E1F5EE] hover:border-[#1D9E75]/30 transition-colors group"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <div className="flex items-start gap-3">
                              {/* Preview / Icon */}
                              <div className="shrink-0">
                                {isLink ? (
                                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cConfig.bg }}>
                                    <ExternalLink className="h-4 w-4" style={{ color: cConfig.color }} />
                                  </div>
                                ) : isImage && doc.fileUrl ? (
                                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-[#F1EFE8]">
                                    <img
                                      src={doc.fileUrl}
                                      alt={doc.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cConfig.bg }}>
                                    <CIcon className="h-4 w-4" style={{ color: cConfig.color }} />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-medium text-[#2C2C2A] truncate">{doc.name}</p>
                                  {isLink ? (
                                    <Badge className="bg-[#DBEAFE] text-[#3B82F6] border-0 text-[9px] px-1.5 py-0">
                                      Enlace
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-[#F1EFE8] text-[#888780] border-0 text-[9px] px-1.5 py-0">
                                      {isPdf ? 'PDF' : isImage ? 'Imagen' : 'Archivo'}
                                    </Badge>
                                  )}
                                  <Badge className={`${cConfig.bg} border-0 text-[9px] px-1.5 py-0`} style={{ color: cConfig.color }}>
                                    {cConfig.label}
                                  </Badge>
                                </div>
                                {doc.description && (
                                  <p className="text-[10px] text-[#888780] mt-0.5 line-clamp-1">{doc.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] text-[#888780]/60">
                                    {doc.date ? formatDate(doc.date) : formatDate(doc.createdAt)}
                                  </span>
                                  {doc.fileSize && (
                                    <span className="text-[9px] text-[#888780]/60">
                                      {formatFileSize(doc.fileSize)}
                                    </span>
                                  )}
                                  {doc.fileName && (
                                    <span className="text-[9px] text-[#888780]/60 truncate max-w-[120px]">
                                      {doc.fileName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isLink && doc.linkUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-[#3B82F6] hover:bg-[#DBEAFE]"
                                    onClick={() => window.open(doc.linkUrl, '_blank')}
                                    title="Abrir enlace"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                                {!isLink && doc.fileUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-[#1D9E75] hover:bg-[#E1F5EE]"
                                    onClick={() => {
                                      const a = document.createElement('a')
                                      a.href = doc.fileUrl!
                                      a.download = doc.fileName || doc.name
                                      a.target = '_blank'
                                      a.click()
                                    }}
                                    title="Descargar"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-[#888780] hover:text-red-500 hover:bg-red-50"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}

                {/* New document dialog */}
                {showNewDocument && (
                  <motion.div
                    className="mt-4 p-4 rounded-lg bg-[#F1EFE8] border border-[#E1F5EE] space-y-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Type toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`flex-1 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                          newDocType === 'file'
                            ? 'bg-[#534AB7] text-white'
                            : 'bg-white text-[#888780] hover:bg-white/80'
                        }`}
                        onClick={() => setNewDocType('file')}
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        Cargar archivo
                      </button>
                      <button
                        type="button"
                        className={`flex-1 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                          newDocType === 'link'
                            ? 'bg-[#534AB7] text-white'
                            : 'bg-white text-[#888780] hover:bg-white/80'
                        }`}
                        onClick={() => setNewDocType('link')}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Enlace en linea
                      </button>
                    </div>

                    {/* File upload area */}
                    {newDocType === 'file' && (
                      <div className="space-y-2">
                        <Label className="text-[10px] text-[#888780]">Archivo</Label>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.dicom,.dcm,.doc,.docx,.xls,.xlsx,.txt"
                            className="hidden"
                            id="doc-file-input"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) setUploadFile(f)
                            }}
                          />
                          <label
                            htmlFor="doc-file-input"
                            className="flex items-center justify-center gap-2 h-16 rounded-lg border-2 border-dashed border-[#E1F5EE] bg-white hover:bg-[#E1F5EE]/30 cursor-pointer transition-colors"
                          >
                            {uploadFile ? (
                              <>
                                <FileText className="h-4 w-4 text-[#1D9E75]" />
                                <div className="text-left">
                                  <p className="text-xs font-medium text-[#2C2C2A] truncate max-w-[200px]">{uploadFile.name}</p>
                                  <p className="text-[9px] text-[#888780]">{(uploadFile.size / 1024).toFixed(1)} KB — Click para cambiar</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <FileUp className="h-4 w-4 text-[#888780]" />
                                <div className="text-left">
                                  <p className="text-xs text-[#888780]">Click para seleccionar archivo</p>
                                  <p className="text-[9px] text-[#888780]/60">PDF, imagenes, Word, Excel — Max 5MB</p>
                                </div>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Link input */}
                    {newDocType === 'link' && (
                      <div className="space-y-2">
                        <Label className="text-[10px] text-[#888780]">URL del enlace</Label>
                        <Input
                          placeholder="https://portal.pacientes.com/estudio/12345"
                          className="h-8 text-xs bg-white border-[#E1F5EE] focus:border-[#534AB7]"
                          value={newDocForm.linkUrl}
                          onChange={(e) => setNewDocForm((f) => ({ ...f, linkUrl: e.target.value }))}
                        />
                        <p className="text-[9px] text-[#888780]/60">
                          Pega la URL del estudio en linea, portal de paciente, o cualquier enlace relevante
                        </p>
                      </div>
                    )}

                    {/* Common fields */}
                    <div className="space-y-2">
                      <Label className="text-[10px] text-[#888780]">Nombre del documento</Label>
                      <Input
                        placeholder={newDocType === 'file' ? 'Radiografia toracica PA' : 'Estudio de laboratorio en linea'}
                        className="h-8 text-xs bg-white border-[#E1F5EE] focus:border-[#534AB7]"
                        value={newDocForm.name}
                        onChange={(e) => setNewDocForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-[#888780]">Categoria</Label>
                        <Select
                          value={newDocForm.category}
                          onValueChange={(v) => setNewDocForm((f) => ({ ...f, category: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white border-[#E1F5EE]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="study">Estudio</SelectItem>
                            <SelectItem value="xray">Radiografia</SelectItem>
                            <SelectItem value="lab">Laboratorio</SelectItem>
                            <SelectItem value="prescription">Receta</SelectItem>
                            <SelectItem value="insurance">Seguro</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-[#888780]">Fecha del estudio</Label>
                        <Input
                          type="date"
                          className="h-8 text-xs bg-white border-[#E1F5EE]"
                          value={newDocForm.date}
                          onChange={(e) => setNewDocForm((f) => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] text-[#888780]">Descripcion (opcional)</Label>
                      <Textarea
                        className="text-xs bg-white border-[#E1F5EE] min-h-[50px]"
                        placeholder="Notas sobre el documento o estudio..."
                        value={newDocForm.description}
                        onChange={(e) => setNewDocForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 h-8 text-xs bg-[#534AB7] hover:bg-[#534AB7]/90 text-white"
                        onClick={newDocType === 'file' ? handleCreateFileDocument : handleCreateLinkDocument}
                        disabled={isCreatingDocument || (newDocType === 'file' ? !uploadFile : !newDocForm.linkUrl)}
                      >
                        {isCreatingDocument ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : newDocType === 'file' ? (
                          <FileUp className="h-3 w-3 mr-1" />
                        ) : (
                          <Link2 className="h-3 w-3 mr-1" />
                        )}
                        {newDocType === 'file' ? 'Cargar documento' : 'Guardar enlace'}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 text-xs text-[#888780]"
                        onClick={() => {
                          setShowNewDocument(false)
                          setNewDocForm({ name: '', category: 'study', description: '', date: '', linkUrl: '' })
                          setUploadFile(null)
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    )
  }

  // ─── RENDER ─────────────────────────────────────────

  return (
    <>
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <div key="list">{ListView()}</div>
        ) : (
          <div key="profile">{ProfileView()}</div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <ToastNotification />}
      </AnimatePresence>
    </>
  )
}
