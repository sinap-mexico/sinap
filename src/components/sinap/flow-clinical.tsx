'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useSinapStore, type FeatureFlagState } from '@/lib/sinap-store'
import { eventBus } from '@/lib/event-bus'
import {
  Activity,
  CheckCircle2,
  Edit3,
  Sparkles,
  FileText,
  Clock,
  Stethoscope,
  Loader2,
  Send,
  AlertCircle,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  UserCircle,
  XCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function FeatureFlagPill({ state, onStateChange }: { state: FeatureFlagState; onStateChange: (s: FeatureFlagState) => void }) {
  return (
    <div className="inline-flex rounded-full bg-[#F1EFE8] p-0.5">
      {(['on', 'assist', 'off'] as FeatureFlagState[]).map((s) => (
        <button
          key={s}
          onClick={() => onStateChange(s)}
          className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
            state === s
              ? s === 'on'
                ? 'bg-[#534AB7] text-white'
                : s === 'assist'
                ? 'bg-[#1D9E75] text-white'
                : 'bg-[#888780] text-white'
              : 'text-[#888780] hover:text-[#2C2C2A]'
          }`}
        >
          {s === 'on' ? 'AUTO' : s === 'assist' ? 'ASSIST' : 'OFF'}
        </button>
      ))}
    </div>
  )
}

interface PreConsultaQuestion {
  question: string
  answer: string
}

type FlowTab = 'preconsulta' | 'soap'

interface FlowAppointment {
  id: string
  patientId: string
  patientName: string
  time: string
  duration: number
  status: string
  type: string
  doctorId?: string
  doctorName?: string
  serviceId?: string
}

/** Full SOAP note type — mirrors the DB-backed data from /api/soap-notes */
interface SoapNote {
  id: string
  patientId: string
  patientName: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  doctorApproved: boolean
  doctorSignedAt: string | null
  doctorName: string
  appointmentId: string | null
  aiGenerated: boolean
  aiSuggested: boolean
  createdAt: string
  updatedAt?: string
}

/** Patient search result for manual note creation */
interface PatientOption {
  id: string
  fullName: string
  phone?: string | null
}

const soapSections = [
  { key: 'subjective', label: 'Subjetivo', badge: 'S', color: '#1D9E75', bgColor: '#E1F5EE', borderColor: 'border-l-[#1D9E75]' },
  { key: 'objective', label: 'Objetivo', badge: 'O', color: '#1D9E75', bgColor: '#E1F5EE', borderColor: 'border-l-[#1D9E75]' },
  { key: 'assessment', label: 'Assessment', badge: 'A', color: '#534AB7', bgColor: '#EEEDFE', borderColor: 'border-l-[#534AB7]' },
  { key: 'plan', label: 'Plan', badge: 'P', color: '#534AB7', bgColor: '#EEEDFE', borderColor: 'border-l-[#534AB7]' },
] as const

/** Map raw API response to our SoapNote interface */
function mapApiNote(note: Record<string, unknown>): SoapNote {
  return {
    id: (note.id as string) || '',
    patientId: (note.patientId as string) || '',
    patientName: (note.patientName as string) || 'Paciente',
    subjective: (note.subjective as string) || '',
    objective: (note.objective as string) || '',
    assessment: (note.assessment as string) || '',
    plan: (note.plan as string) || '',
    doctorApproved: (note.doctorApproved as boolean) || false,
    doctorSignedAt: (note.doctorSignedAt as string) || null,
    doctorName: (note.doctorName as string) || '',
    appointmentId: (note.appointmentId as string) || null,
    aiGenerated: (note.aiGenerated as boolean) || false,
    aiSuggested: (note.aiSuggested as boolean) || false,
    createdAt: (note.createdAt as string) || new Date().toISOString(),
    updatedAt: (note.updatedAt as string) || undefined,
  }
}

export function FlowClinical() {
  const { featureFlags, setFeatureFlag, doctorProfile, clinicId, setClinicId, clinicSlug, doctors } = useSinapStore()
  const soapFlag = featureFlags.find((f) => f.id === 'flow-soap')
  const preconsultaFlag = featureFlags.find((f) => f.id === 'flow-preconsulta')

  // Appointments from API
  const [pendingPreconsultas, setPendingPreconsultas] = useState<FlowAppointment[]>([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true)

  const [activeTab, setActiveTab] = useState<FlowTab>('preconsulta')
  const [selectedPatient, setSelectedPatient] = useState<FlowAppointment | null>(null)

  // Pre-consulta state
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [preConsultaQuestions, setPreConsultaQuestions] = useState<PreConsultaQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [preConsultaComplete, setPreConsultaComplete] = useState(false)
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState(false)

  // SOAP editing state
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // SOAP notes — single source of truth from API
  const [soapNotes, setSoapNotes] = useState<SoapNote[]>([])
  const [isLoadingSoapNotes, setIsLoadingSoapNotes] = useState(false)
  const [selectedSoapNote, setSelectedSoapNote] = useState<SoapNote | null>(null)

  // Approve & sign state
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  // Error state
  const [soapError, setSoapError] = useState<string | null>(null)

  // Manual note creation state
  const [showNewNoteDialog, setShowNewNoteDialog] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [isSearchingPatients, setIsSearchingPatients] = useState(false)
  const [newNoteFields, setNewNoteFields] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  })
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [isCreatingBlank, setIsCreatingBlank] = useState(false)

  // PDF export state
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  // Ref for auto-scrolling to the generate button when pre-consulta completes
  const generateButtonRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Ref to avoid re-fetching SOAP notes too aggressively
  const soapFetchRef = useRef(false)

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

  // Fetch appointments from API
  useEffect(() => {
    if (!clinicId) return
    async function fetchAppointments() {
      setIsLoadingAppointments(true)
      try {
        const res = await fetch(`/api/appointments?clinicId=${clinicId}&includeHistory=true`)
        if (res.ok) {
          const data = await res.json()
          const mapped: FlowAppointment[] = (data.appointments || [])
            .filter((a: Record<string, unknown>) => {
              const s = a.status as string
              return s === 'pending' || s === 'confirmed' || s === 'scheduled'
            })
            .map((a: Record<string, unknown>) => ({
              id: a.id as string,
              patientId: a.patientId as string,
              patientName: (a.patient as Record<string, unknown>)?.fullName as string || 'Paciente',
              time: a.startTime as string || '',
              duration: (a.service as Record<string, unknown>)?.duration as number || 30,
              status: a.status as string,
              type: (a.service as Record<string, unknown>)?.name as string || 'Consulta',
              doctorId: a.doctorId as string,
              doctorName: (a.doctor as Record<string, unknown>)?.name as string,
              serviceId: a.serviceId as string,
            }))
          setPendingPreconsultas(mapped.slice(0, 10))
          if (mapped.length > 0 && !selectedPatient) {
            setSelectedPatient(mapped[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch appointments:', err)
      } finally {
        setIsLoadingAppointments(false)
      }
    }
    fetchAppointments()
  }, [clinicId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh SOAP notes from the API — called after every mutation
  // Returns the refreshed mapped notes so callers can use the latest data
  const refreshSoapNotes = useCallback(async (): Promise<SoapNote[]> => {
    if (!clinicId) return []
    setIsLoadingSoapNotes(true)
    try {
      const res = await fetch(`/api/soap-notes?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        const mapped: SoapNote[] = (data.soapNotes || []).map(mapApiNote)
        setSoapNotes(mapped)
        // Update selected note if it still exists
        if (selectedSoapNote) {
          const updated = mapped.find((n) => n.id === selectedSoapNote.id)
          setSelectedSoapNote(updated || mapped[0] || null)
        } else if (mapped.length > 0) {
          setSelectedSoapNote(mapped[0])
        }
        return mapped
      }
    } catch (err) {
      console.error('Failed to refresh SOAP notes:', err)
    } finally {
      setIsLoadingSoapNotes(false)
    }
    return []
  }, [clinicId, selectedSoapNote])

  // Initial fetch of SOAP notes
  useEffect(() => {
    if (!clinicId) return
    refreshSoapNotes()
  }, [clinicId])

  // Auto-scroll to generate button when pre-consulta completes
  useEffect(() => {
    if (preConsultaComplete && generateButtonRef.current) {
      setTimeout(() => {
        generateButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [preConsultaComplete])

  // Auto-scroll chat to bottom when questions/answers change
  useEffect(() => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 50)
    }
  }, [currentQuestionIndex, preConsultaQuestions])

  // Search patients for manual note creation
  const searchPatients = useCallback(async (query: string) => {
    if (!clinicId || query.trim().length < 2) {
      setPatientOptions([])
      return
    }
    setIsSearchingPatients(true)
    try {
      const res = await fetch(`/api/patients?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        const filtered: PatientOption[] = (data.patients || [])
          .filter((p: Record<string, unknown>) => {
            const name = (p.fullName as string || '').toLowerCase()
            return name.includes(query.toLowerCase())
          })
          .map((p: Record<string, unknown>) => ({
            id: p.id as string,
            fullName: p.fullName as string,
            phone: p.phone as string | null,
          }))
          .slice(0, 8)
        setPatientOptions(filtered)
      }
    } catch (err) {
      console.error('Failed to search patients:', err)
    } finally {
      setIsSearchingPatients(false)
    }
  }, [clinicId])

  // Debounced patient search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(patientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch, searchPatients])

  const handleStartPreConsulta = useCallback(async () => {
    if (!selectedPatient) return

    setIsGeneratingQuestions(true)
    setPreConsultaQuestions([])
    setCurrentQuestionIndex(0)
    setPreConsultaComplete(false)

    try {
      const response = await fetch('/api/preconsulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.patientId,
          clinicId: clinicId || 'demo',
          specialty: doctorProfile.specialty,
          appointmentType: selectedPatient.type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar preguntas de pre-consulta')
      }

      if (data.questions && Array.isArray(data.questions)) {
        const questions: PreConsultaQuestion[] = data.questions.map((q: string) => ({
          question: q,
          answer: '',
        }))
        setPreConsultaQuestions(questions)
      } else {
        throw new Error('La IA no generó preguntas válidas')
      }
    } catch {
      setPreConsultaQuestions([
        { question: '¿Cuál es el motivo principal de su consulta?', answer: '' },
        { question: '¿Desde cuándo presenta estos síntomas?', answer: '' },
        { question: 'En una escala del 1 al 10, ¿qué tan intenso es su molestia?', answer: '' },
        { question: '¿Tiene antecedentes de enfermedades relevantes?', answer: '' },
        { question: '¿Qué medicamentos toma actualmente?', answer: '' },
      ])
    } finally {
      setIsGeneratingQuestions(false)
    }
  }, [selectedPatient, doctorProfile.specialty, clinicId])

  const handleAnswerQuestion = () => {
    if (!currentAnswer.trim()) return

    setPreConsultaQuestions(prev => prev.map((q, i) =>
      i === currentQuestionIndex ? { ...q, answer: currentAnswer.trim() } : q
    ))
    setCurrentAnswer('')

    if (currentQuestionIndex < preConsultaQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      setPreConsultaComplete(true)
    }
  }

  const handleGenerateSOAP = async () => {
    setIsGeneratingSOAP(true)
    setSoapError(null)
    try {
      const responses = preConsultaQuestions
        .filter(q => q.answer)
        .map(q => ({ question: q.question, answer: q.answer }))

      // Fetch patient medical history before generating SOAP
      let patientHistory = ''
      try {
        const patientRes = await fetch(`/api/patients/${selectedPatient?.patientId}`)
        if (patientRes.ok) {
          const patientData = await patientRes.json()
          const p = patientData.patient
          if (p) {
            const parts: string[] = []
            if (p.medicalHistory) parts.push(`Antecedentes: ${p.medicalHistory}`)
            if (p.allergies) parts.push(`Alergias: ${p.allergies}`)
            if (p.notes) parts.push(`Notas clinicas: ${p.notes}`)
            patientHistory = parts.join('. ')
          }
        }
      } catch (e) {
        console.error('Failed to fetch patient history for SOAP generation:', e)
      }

      const response = await fetch('/api/soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient?.patientId || '',
          clinicId: clinicId || 'demo',
          doctorId: selectedPatient?.doctorId || doctorProfile.id || doctors[0]?.id || '',
          appointmentId: selectedPatient?.id || '',
          specialty: doctorProfile.specialty,
          preConsultaResponses: responses,
          patientHistory: patientHistory || undefined,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al generar la nota SOAP')
      }

      const data = await response.json()

      if (data.subjective) {
        // Refresh from DB to get the persisted note with correct IDs
        const refreshedNotes = await refreshSoapNotes()

        // Find the newly created note in the refreshed data (fixes stale closure race condition)
        if (data.soapNoteId) {
          const found = refreshedNotes.find(n => n.id === data.soapNoteId)
          if (found) {
            setSelectedSoapNote(found)
          } else {
            setSelectedSoapNote({
              id: data.soapNoteId,
              patientId: selectedPatient?.patientId || '',
              patientName: selectedPatient?.patientName || 'Paciente',
              subjective: data.subjective,
              objective: data.objective,
              assessment: data.assessment,
              plan: data.plan,
              doctorApproved: false,
              doctorSignedAt: null,
              doctorName: '',
              appointmentId: selectedPatient?.id || null,
              aiGenerated: true,
              aiSuggested: true,
              createdAt: new Date().toISOString(),
            })
          }
        }

        // Save pre-consulta data to the appointment and update status to in_progress
        if (selectedPatient?.id) {
          try {
            await fetch('/api/appointments', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                appointmentId: selectedPatient.id,
                status: 'in_progress',
                preConsultCompleted: true,
                preConsultData: JSON.stringify(responses),
              }),
            })
          } catch (e) {
            console.error('Failed to update appointment with pre-consulta data:', e)
          }
        }

        setActiveTab('soap')

        eventBus.emit(clinicId || 'demo', 'soap_borrador_listo', 'flow', 'os',
          JSON.stringify({ patientName: selectedPatient?.patientName, noteId: data.soapNoteId })
        )
      } else {
        throw new Error('La IA no generó contenido válido. Intente de nuevo.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al generar la nota SOAP'
      setSoapError(message)
      console.error('SOAP generation error:', err)
    } finally {
      setIsGeneratingSOAP(false)
    }
  }

  // Manual SOAP note creation
  const handleCreateManualNote = async () => {
    if (!clinicId || !selectedPatientId) return
    setIsCreatingNote(true)
    setSoapError(null)

    try {
      const res = await fetch('/api/soap-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          patientId: selectedPatientId,
          doctorId: doctorProfile.id || doctors[0]?.id || '',
          subjective: newNoteFields.subjective || null,
          objective: newNoteFields.objective || null,
          assessment: newNoteFields.assessment || null,
          plan: newNoteFields.plan || null,
          aiGenerated: false,
          aiSuggested: false,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al crear la nota')
      }

      await refreshSoapNotes()

      // Select the newly created note
      const data = await res.json()
      if (data.soapNote?.id) {
        const refreshRes = await fetch(`/api/soap-notes?clinicId=${clinicId}`)
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          const found = (refreshData.soapNotes || []).map(mapApiNote).find((n: SoapNote) => n.id === data.soapNote.id)
          if (found) setSelectedSoapNote(found)
        }
      }

      // Reset dialog state
      setShowNewNoteDialog(false)
      setPatientSearch('')
      setSelectedPatientId('')
      setSelectedPatientName('')
      setNewNoteFields({ subjective: '', objective: '', assessment: '', plan: '' })

      eventBus.emit(clinicId, 'soap_borrador_listo', 'flow', 'os',
        JSON.stringify({ patientName: selectedPatientName, noteId: data.soapNote?.id })
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la nota'
      setSoapError(message)
      console.error('Failed to create manual SOAP note:', err)
    } finally {
      setIsCreatingNote(false)
    }
  }

  const handleApproveNote = async (noteId: string) => {
    const note = soapNotes.find(n => n.id === noteId)
    if (!note) return
    setSelectedSoapNote(note)
    setShowApproveDialog(true)
  }

  const confirmApprove = async () => {
    if (!selectedSoapNote) return

    setIsApproving(true)
    try {
      const res = await fetch(`/api/soap-notes/${selectedSoapNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al aprobar la nota')
      }

      // Optimistic local update
      setSelectedSoapNote(prev => prev ? {
        ...prev,
        doctorApproved: true,
        doctorSignedAt: new Date().toISOString(),
        aiSuggested: false,
      } : null)

      // Update appointment status to completed
      if (selectedSoapNote.appointmentId) {
        try {
          const aptRes = await fetch('/api/appointments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appointmentId: selectedSoapNote.appointmentId,
              status: 'completed',
            }),
          })

          // Auto-create a pending invoice for the completed appointment
          // The invoice links to the appointment and pre-fills data from it
          if (aptRes.ok && clinicId) {
            try {
              // Fetch the appointment to get service/price info
              const aptData = await aptRes.json()
              const apt = aptData.appointment
              if (apt && apt.patientId) {
                // Check if an invoice already exists for this appointment
                const existingInvRes = await fetch(`/api/invoices?clinicId=${clinicId}&appointmentId=${selectedSoapNote.appointmentId}`)
                let hasExistingInvoice = false
                if (existingInvRes.ok) {
                  const existingInvData = await existingInvRes.json()
                  hasExistingInvoice = (existingInvData.invoices || []).length > 0
                }

                if (!hasExistingInvoice) {
                  // Get service price from the appointment's service
                  const serviceName = apt.service?.name || 'Consulta'
                  const servicePrice = apt.service?.price || 0

                  await fetch('/api/invoices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      clinicId,
                      patientId: apt.patientId,
                      appointmentId: selectedSoapNote.appointmentId,
                      concepto: serviceName,
                      subtotal: servicePrice,
                      iva: 0,
                      ivaRate: 0,
                      total: servicePrice,
                      status: 'pending',
                      paymentStatus: 'unpaid',
                    }),
                  })

                  // Update patient metrics (totalVisits, lastVisitDate, segment)
                  try {
                    const { updatePatientMetrics } = await import('@/app/api/patients/route')
                    await updatePatientMetrics(apt.patientId)
                  } catch (e) {
                    console.error('Failed to update patient metrics:', e)
                  }
                }
              }
            } catch (e) {
              console.error('Failed to auto-create invoice:', e)
            }
          }
        } catch (e) {
          console.error('Failed to update appointment status to completed:', e)
        }
      }

      // Refresh from server to get the real doctorSignedAt
      await refreshSoapNotes()

      eventBus.emit(clinicId || 'demo', 'nota_soap_firmada', 'flow', 'bill',
        JSON.stringify({ patientName: selectedSoapNote.patientName, noteId: selectedSoapNote.id })
      )

      eventBus.emit(clinicId || 'demo', 'cita_completada', 'flow', 'os',
        JSON.stringify({ patientName: selectedSoapNote.patientName, appointmentId: selectedSoapNote.appointmentId })
      )
    } catch (err) {
      console.error('Failed to approve SOAP note:', err)
      setSoapError(err instanceof Error ? err.message : 'Error al firmar la nota')
    } finally {
      setIsApproving(false)
      setShowApproveDialog(false)
    }
  }

  const handleExportPDF = async () => {
    if (!selectedSoapNote) return

    setIsExportingPDF(true)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const response = await fetch(`/api/soap-notes/${selectedSoapNote.id}/pdf?tz=${encodeURIComponent(timezone)}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Error al generar PDF' }))
        throw new Error(data.error || 'Error al generar PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `SOAP_${selectedSoapNote.patientName.replace(/\s+/g, '_')}_${new Date(selectedSoapNote.createdAt).toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the object URL after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (err) {
      console.error('Failed to export PDF:', err)
      alert(err instanceof Error ? err.message : 'Error al generar PDF')
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Cancelar esta cita?')) return
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, { method: 'DELETE' })
      if (res.ok) {
        setPendingPreconsultas(prev => prev.filter(a => a.id !== appointmentId))
        if (selectedPatient?.id === appointmentId) {
          const remaining = pendingPreconsultas.filter(a => a.id !== appointmentId)
          setSelectedPatient(remaining[0] || null)
        }
      }
    } catch (err) {
      console.error('Failed to cancel appointment:', err)
    }
  }

  const handleEditField = (noteId: string, field: string, value: string) => {
    const note = soapNotes.find(n => n.id === noteId)
    if (note?.doctorApproved) return

    setEditingNote(noteId)
    setEditField(field)
    setEditValue(value)
  }

  const handleSaveEdit = async () => {
    if (!editingNote || !editField) return
    setIsSavingEdit(true)

    try {
      const res = await fetch(`/api/soap-notes/${editingNote}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [editField]: editValue }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al guardar')
      }

      // Optimistic local update
      setSoapNotes(prev => prev.map(n =>
        n.id === editingNote ? { ...n, [editField]: editValue } : n
      ))
      setSelectedSoapNote(prev => prev?.id === editingNote ? { ...prev, [editField]: editValue } : prev)

      // Also refresh from server to stay in sync
      await refreshSoapNotes()
    } catch (err) {
      console.error('Failed to save SOAP edit:', err)
      setSoapError(err instanceof Error ? err.message : 'Error al guardar los cambios')
      // Revert by refreshing
      await refreshSoapNotes()
    } finally {
      setIsSavingEdit(false)
      setEditingNote(null)
      setEditField(null)
      setEditValue('')
    }
  }

  const handleCreateBlankSOAP = async () => {
    if (!clinicId || !selectedPatient) return
    setIsCreatingBlank(true)
    setSoapError(null)
    try {
      const res = await fetch('/api/soap-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          patientId: selectedPatient.patientId,
          doctorId: selectedPatient.doctorId || doctorProfile.id || doctors[0]?.id || '',
          appointmentId: selectedPatient.id || '',
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          aiGenerated: false,
          aiSuggested: false,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al crear la nota SOAP')
      }

      const refreshedNotes = await refreshSoapNotes()
      // Select the newly created note (first one since list is ordered desc)
      if (refreshedNotes.length > 0) {
        setSelectedSoapNote(refreshedNotes[0])
        // Open all sections in edit mode by triggering edit on the first field
        setEditingNote(refreshedNotes[0].id)
        setEditField('subjective')
        setEditValue('')
      }
    } catch (err) {
      console.error('Failed to create blank SOAP note:', err)
      setSoapError(err instanceof Error ? err.message : 'Error al crear la nota SOAP')
    } finally {
      setIsCreatingBlank(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    const note = soapNotes.find(n => n.id === noteId)
    if (!note) return

    const isSigned = note.doctorApproved
    const msg = isSigned
      ? 'Esta nota ya está firmada. ¿Estás seguro de que deseas eliminarla? Esta acción no se puede deshacer.'
      : '¿Eliminar esta nota? Esta acción no se puede deshacer.'

    if (!confirm(msg)) return

    try {
      const res = await fetch(`/api/soap-notes/${noteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al eliminar')
      }
      // Remove locally and refresh
      setSoapNotes(prev => prev.filter(n => n.id !== noteId))
      if (selectedSoapNote?.id === noteId) {
        const remaining = soapNotes.filter(n => n.id !== noteId)
        setSelectedSoapNote(remaining[0] || null)
      }
      await refreshSoapNotes()
    } catch (err) {
      console.error('Failed to delete SOAP note:', err)
      setSoapError(err instanceof Error ? err.message : 'Error al eliminar la nota')
    }
  }

  // Progress calculation for pre-consulta
  const preConsultaProgress = preConsultaQuestions.length > 0
    ? (preConsultaQuestions.filter(q => q.answer).length / preConsultaQuestions.length) * 100
    : 0

  const soapIsOff = soapFlag?.state === 'off'

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Error toast */}
      {soapError && (
        <motion.div
          className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{soapError}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-red-500 hover:text-red-700"
            onClick={() => setSoapError(null)}
          >
            Cerrar
          </Button>
        </motion.div>
      )}

      {/* Feature flags indicator */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#534AB7]" />
          <span className="text-sm font-medium text-[#2C2C2A]">Modo SOAP</span>
          <FeatureFlagPill
            state={soapFlag?.state || 'assist'}
            onStateChange={(s) => setFeatureFlag('flow-soap', s)}
          />
        </div>
        <Separator orientation="vertical" className="h-6 bg-[#E1F5EE]" />
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-[#1D9E75]" />
          <span className="text-sm font-medium text-[#2C2C2A]">Pre-consulta</span>
          <FeatureFlagPill
            state={preconsultaFlag?.state || 'on'}
            onStateChange={(s) => setFeatureFlag('flow-preconsulta', s)}
          />
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        {!soapIsOff && (
          <Button
            variant={activeTab === 'preconsulta' ? 'default' : 'outline'}
            className={`text-xs h-8 transition-all ${activeTab === 'preconsulta' ? 'bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white' : 'border-[#E1F5EE] text-[#888780]'}`}
            onClick={() => setActiveTab('preconsulta')}
          >
            <Stethoscope className="h-3.5 w-3.5 mr-1" />
            Pre-consulta
          </Button>
        )}
        <Button
          variant={activeTab === 'soap' ? 'default' : 'outline'}
          className={`text-xs h-8 transition-all ${activeTab === 'soap' ? 'bg-[#534AB7] hover:bg-[#534AB7]/90 text-white' : 'border-[#E1F5EE] text-[#888780]'}`}
          onClick={() => setActiveTab('soap')}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          Notas SOAP ({soapNotes.length})
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'preconsulta' && !soapIsOff && (
          <motion.div
            key="preconsulta"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          >
            {/* Pre-consulta queue */}
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Cola de pre-consulta
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <ScrollArea className="max-h-[calc(100vh-380px)]">
                <div className="p-3 space-y-2">
                  {isLoadingAppointments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                    </div>
                  ) : pendingPreconsultas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Clock className="h-8 w-8 text-[#888780]/30 mb-2" />
                      <p className="text-xs text-[#888780]">No hay citas pendientes</p>
                    </div>
                  ) : (
                    pendingPreconsultas.map((apt, i) => (
                      <motion.button
                        key={apt.id}
                        onClick={() => {
                          setSelectedPatient(apt)
                          setPreConsultaQuestions([])
                          setPreConsultaComplete(false)
                          setCurrentQuestionIndex(0)
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          selectedPatient?.id === apt.id
                            ? 'bg-[#E1F5EE] border border-[#1D9E75]/30'
                            : 'hover:bg-[#F1EFE8]'
                        }`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ x: 2 }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#2C2C2A]">
                            {apt.patientName}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-[#888780]">{apt.time}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancelAppointment(apt.id)
                              }}
                              className="p-0.5 rounded hover:bg-[#FEE2E2] text-[#888780] hover:text-[#E53E3E] transition-colors"
                              title="Cancelar cita"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[#888780] mt-0.5">{apt.type}</p>
                        <Badge
                          className={`mt-1.5 text-[9px] border-0 ${
                            apt.status === 'confirmed'
                              ? 'bg-[#E1F5EE] text-[#1D9E75]'
                              : 'bg-[#FEF3C7] text-[#D97706]'
                          }`}
                        >
                          {apt.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                        </Badge>
                      </motion.button>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-[#E1F5EE]">
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    className="w-full bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white text-xs h-8"
                    onClick={handleStartPreConsulta}
                    disabled={isGeneratingQuestions || !selectedPatient}
                  >
                    {isGeneratingQuestions ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Generando preguntas...</>
                    ) : (
                      <><Stethoscope className="h-3.5 w-3.5 mr-1" />Iniciar pre-consulta</>
                    )}
                  </Button>
                </motion.div>
              </div>
            </Card>

            {/* Pre-consulta chat interface */}
            <Card className="border-[#E1F5EE] bg-white lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                      Pre-consulta IA
                    </CardTitle>
                    <p className="text-xs text-[#888780] mt-0.5">
                      {selectedPatient?.patientName || 'Seleccionar paciente'} - {selectedPatient?.type || ''}
                    </p>
                  </div>
                  <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {doctorProfile.specialty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {preConsultaQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <motion.div
                      className="h-16 w-16 rounded-full bg-[#EEEDFE] flex items-center justify-center mb-4"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Stethoscope className="h-8 w-8 text-[#534AB7]" />
                    </motion.div>
                    <p className="text-sm font-medium text-[#2C2C2A]">
                      Seleccione un paciente e inicie la pre-consulta
                    </p>
                    <p className="text-xs text-[#888780] mt-1 max-w-sm">
                      La IA generará preguntas personalizadas basadas en la especialidad y tipo de cita.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#888780]">Progreso</span>
                        <span className="text-[10px] text-[#534AB7] font-medium">{Math.round(preConsultaProgress)}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F1EFE8] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[#1D9E75] rounded-full"
                          animate={{ width: `${preConsultaProgress}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* When pre-consulta is COMPLETE: show compact summary + generate button */}
                    {preConsultaComplete ? (
                      <div className="space-y-4">
                        {/* Summary of responses */}
                        <div className="rounded-lg border border-[#E1F5EE] divide-y divide-[#E1F5EE]">
                          {preConsultaQuestions.filter(q => q.answer).map((q, i) => (
                            <div key={i} className="px-3 py-2 flex flex-col gap-0.5">
                              <p className="text-[10px] text-[#888780] leading-tight">{q.question}</p>
                              <p className="text-xs font-medium text-[#2C2C2A]">{q.answer}</p>
                            </div>
                          ))}
                        </div>

                        {/* Generate SOAP button — OUTSIDE ScrollArea, always clickable */}
                        <div className="p-3 rounded-lg bg-[#E1F5EE]">
                          <p className="text-xs text-[#1D9E75] font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Pre-consulta completada
                          </p>
                          <p className="text-[10px] text-[#888780] mt-0.5">
                            {preConsultaQuestions.filter(q => q.answer).length} respuestas recopiladas
                          </p>
                        </div>
                        <Button
                          className="w-full bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-12 text-sm font-medium shadow-md shadow-[#534AB7]/20 relative z-50"
                          onClick={handleGenerateSOAP}
                          disabled={isGeneratingSOAP}
                        >
                          {isGeneratingSOAP ? (
                            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generando nota SOAP...</>
                          ) : (
                            <><Sparkles className="h-4 w-4 mr-1.5" />Generar nota SOAP con IA</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* When still answering: show chat interface */}
                        <div ref={chatContainerRef} className="max-h-[350px] overflow-y-auto pr-2 space-y-3">
                          {preConsultaQuestions.map((q, i) => (
                            <div key={i}>
                              {/* Question bubble (AI) */}
                              <div className="flex justify-start mb-2">
                                <div className="bg-[#534AB7] text-white rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Badge className="text-[9px] border-0 py-0 px-1.5 bg-white/20 text-white">
                                      Sinap Flow
                                    </Badge>
                                    <Badge className="text-[8px] border-0 py-0 px-1 bg-white/20 text-white">
                                      IA
                                    </Badge>
                                  </div>
                                  <p className="text-sm">{q.question}</p>
                                </div>
                              </div>
                              {/* Answer (if provided) */}
                              {q.answer && (
                                <div className="flex justify-end mb-2">
                                  <div className="bg-[#E1F5EE] text-[#2C2C2A] rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                                    <p className="text-sm">{q.answer}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Input area */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[#E1F5EE]">
                          <div className="flex-1">
                            <p className="text-[10px] text-[#534AB7] mb-1 font-medium">
                              Pregunta {currentQuestionIndex + 1} de {preConsultaQuestions.length}
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Escriba la respuesta del paciente..."
                                className="flex-1 h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20 transition-colors"
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleAnswerQuestion()
                                  }
                                }}
                              />
                              <Button
                                size="icon"
                                className="bg-[#534AB7] hover:bg-[#534AB7]/90 h-9 w-9"
                                onClick={handleAnswerQuestion}
                                disabled={!currentAnswer.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'soap' && (
          <motion.div
            key="soap"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          >
            {/* SOAP notes list */}
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Notas SOAP
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-[#1D9E75] hover:text-[#1D9E75] hover:bg-[#E1F5EE]"
                      onClick={() => {
                        setPatientSearch('')
                        setSelectedPatientId('')
                        setSelectedPatientName('')
                        setNewNoteFields({ subjective: '', objective: '', assessment: '', plan: '' })
                        setPatientOptions([])
                        setShowNewNoteDialog(true)
                      }}
                      title="Nueva nota manual"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-[#888780] hover:text-[#534AB7]"
                      onClick={refreshSoapNotes}
                      disabled={isLoadingSoapNotes}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSoapNotes ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <ScrollArea className="max-h-[calc(100vh-380px)]">
                <div className="p-3 space-y-2">
                  {isLoadingSoapNotes && soapNotes.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                    </div>
                  ) : soapNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="h-8 w-8 text-[#888780]/30 mb-2" />
                      <p className="text-xs text-[#888780]">Sin notas SOAP</p>
                      <p className="text-[10px] text-[#888780]/60 mt-1">
                        {soapIsOff
                          ? 'Crea una nota manual con el botón +'
                          : 'Inicie una pre-consulta o cree una nota manual'}
                      </p>
                      <Button
                        className="mt-3 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-xs h-7"
                        onClick={() => {
                          setPatientSearch('')
                          setSelectedPatientId('')
                          setSelectedPatientName('')
                          setNewNoteFields({ subjective: '', objective: '', assessment: '', plan: '' })
                          setPatientOptions([])
                          setShowNewNoteDialog(true)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Nueva nota
                      </Button>
                    </div>
                  ) : (
                    soapNotes.map((note, i) => (
                      <motion.button
                        key={note.id}
                        onClick={() => setSelectedSoapNote(note)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                          selectedSoapNote?.id === note.id
                            ? 'bg-[#EEEDFE] border border-[#534AB7]/20'
                            : 'hover:bg-[#F1EFE8]'
                        }`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ x: 2 }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#2C2C2A] truncate">
                            {note.patientName}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-[#888780] hover:text-red-500 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNote(note.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-[#888780] mt-0.5">
                          {new Date(note.createdAt).toLocaleDateString('es-MX')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge
                            className={`text-[9px] border-0 ${
                              note.doctorApproved
                                ? 'bg-[#534AB7] text-white'
                                : 'bg-[#FEF3C7] text-[#D97706]'
                            }`}
                          >
                            {note.doctorApproved ? 'Firmada' : 'Borrador'}
                          </Badge>
                          {note.aiGenerated && !note.doctorApproved && (
                            <Badge className="text-[9px] border-0 bg-[#EEEDFE] text-[#534AB7]">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                              IA
                            </Badge>
                          )}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* SOAP Note Detail - Timeline style with color-coded borders */}
            <Card className="border-[#E1F5EE] bg-white lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                      Nota SOAP
                    </CardTitle>
                    <p className="text-xs text-[#888780] mt-0.5">
                      {selectedSoapNote?.patientName || 'Seleccionar nota'} - {selectedSoapNote ? new Date(selectedSoapNote.createdAt).toLocaleDateString('es-MX') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedSoapNote && (
                      <Badge className={`text-[10px] border-0 ${
                        selectedSoapNote.doctorApproved
                          ? 'bg-[#534AB7] text-white'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        {selectedSoapNote.doctorApproved ? 'Firmada' : 'Borrador'}
                      </Badge>
                    )}
                    <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {soapIsOff ? 'Manual' : soapFlag?.state === 'on' ? 'AUTO' : 'IA Assist'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSoapNote ? (
                  <>
                    {/* Signed indicator */}
                    {selectedSoapNote.doctorApproved && selectedSoapNote.doctorSignedAt && (
                      <motion.div
                        className="rounded-lg bg-[#534AB7]/5 border border-[#534AB7]/20 p-3 flex items-center gap-2"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <ShieldCheck className="h-5 w-5 text-[#534AB7]" />
                        <div>
                          <p className="text-sm font-medium text-[#534AB7]">
                            Firmada por {selectedSoapNote.doctorName || doctorProfile.name}
                          </p>
                          <p className="text-[10px] text-[#888780]">
                            {new Date(selectedSoapNote.doctorSignedAt).toLocaleString('es-MX', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* SOAP sections with color-coded left borders and timeline feel */}
                    {soapSections.map((section, idx) => {
                      const content = selectedSoapNote[section.key as keyof SoapNote] as string
                      const isAI = selectedSoapNote.aiGenerated
                      const isSuggested = selectedSoapNote.aiSuggested && (section.key === 'assessment' || section.key === 'plan')
                      const isReadOnly = selectedSoapNote.doctorApproved

                      return (
                        <motion.div
                          key={section.key}
                          className={`rounded-lg p-4 border-l-4 ${section.borderColor} relative`}
                          style={{ backgroundColor: section.bgColor }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          {/* Timeline connector */}
                          {idx < soapSections.length - 1 && (
                            <div className="absolute left-[-2px] bottom-[-20px] w-[2px] h-5 bg-[#E1F5EE]" />
                          )}

                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                className="text-[10px] border-0 text-white"
                                style={{ backgroundColor: section.color }}
                              >
                                {section.badge}
                              </Badge>
                              <span className="text-sm font-medium text-[#2C2C2A]">{section.label}</span>
                              {(isAI || isSuggested) && !selectedSoapNote.doctorApproved && (
                                <Badge
                                  className="bg-white text-[10px] border"
                                  style={{ color: section.color, borderColor: section.color + '30' }}
                                >
                                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                  {isSuggested ? 'Sugerido por IA' : 'Generado por IA'}
                                </Badge>
                              )}
                            </div>
                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-[#888780] hover:text-[#534AB7]"
                                onClick={() => handleEditField(selectedSoapNote.id, section.key, content)}
                              >
                                <Edit3 className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                            )}
                            {isReadOnly && (
                              <Badge className="text-[9px] border-0 bg-white/80 text-[#888780]">
                                <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                                Solo lectura
                              </Badge>
                            )}
                          </div>
                          <p className={`text-sm text-[#2C2C2A] leading-relaxed whitespace-pre-line ${isReadOnly ? 'opacity-80' : ''}`}>
                            {content || <span className="text-[#888780]/60 italic">Sin contenido</span>}
                          </p>
                        </motion.div>
                      )
                    })}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      {!selectedSoapNote.doctorApproved && (
                        <motion.div whileTap={{ scale: 0.97 }}>
                          <Button
                            className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-9"
                            onClick={() => handleApproveNote(selectedSoapNote.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Aprobar y firmar
                          </Button>
                        </motion.div>
                      )}
                      {selectedSoapNote.doctorApproved && (
                        <Badge className="bg-[#534AB7] text-white border-0 text-xs py-1.5 px-3">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Nota aprobada y firmada
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        className="border-[#E1F5EE] text-[#2C2C2A] h-9"
                        onClick={handleExportPDF}
                        disabled={isExportingPDF}
                      >
                        {isExportingPDF ? (
                          <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generando...</>
                        ) : (
                          <><FileText className="h-4 w-4 mr-1.5" />Exportar PDF</>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-[#EEEDFE] flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-[#534AB7]" />
                    </div>
                    <p className="text-sm font-medium text-[#2C2C2A]">
                      Seleccione una nota SOAP para ver
                    </p>
                    <p className="text-xs text-[#888780] mt-1">
                      {soapIsOff
                        ? 'Cree una nota manual con el botón +'
                        : 'Inicie una pre-consulta o cree una nota manual'}
                    </p>
                    <Button
                      className="mt-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-xs h-8"
                      onClick={() => {
                        setPatientSearch('')
                        setSelectedPatientId('')
                        setSelectedPatientName('')
                        setNewNoteFields({ subjective: '', objective: '', assessment: '', plan: '' })
                        setPatientOptions([])
                        setShowNewNoteDialog(true)
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nueva nota manual
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Manual SOAP Note Dialog */}
      <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em] flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#534AB7]" />
              Nueva nota SOAP
            </DialogTitle>
            <DialogDescription className="text-sm text-[#888780]">
              Cree una nota SOAP manualmente. Los campos se pueden editar después de crear la nota.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Patient selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#2C2C2A]">Paciente *</label>
              {selectedPatientId ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#E1F5EE] border border-[#1D9E75]/30">
                  <UserCircle className="h-4 w-4 text-[#1D9E75]" />
                  <span className="text-sm text-[#2C2C2A] flex-1">{selectedPatientName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-[#888780] hover:text-red-500"
                    onClick={() => {
                      setSelectedPatientId('')
                      setSelectedPatientName('')
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#888780]" />
                  <Input
                    placeholder="Buscar paciente por nombre..."
                    className="pl-8 h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  {isSearchingPatients && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-[#534AB7]" />
                  )}
                  {patientOptions.length > 0 && !selectedPatientId && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-[#E1F5EE] shadow-lg max-h-48 overflow-y-auto">
                      {patientOptions.map((p) => (
                        <button
                          key={p.id}
                          className="w-full text-left p-2.5 hover:bg-[#F1EFE8] transition-colors flex items-center gap-2"
                          onClick={() => {
                            setSelectedPatientId(p.id)
                            setSelectedPatientName(p.fullName)
                            setPatientSearch('')
                            setPatientOptions([])
                          }}
                        >
                          <UserCircle className="h-4 w-4 text-[#888780]" />
                          <div>
                            <p className="text-sm text-[#2C2C2A]">{p.fullName}</p>
                            {p.phone && <p className="text-[10px] text-[#888780]">{p.phone}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {patientSearch.length >= 2 && patientOptions.length === 0 && !isSearchingPatients && (
                    <p className="text-[10px] text-[#888780] mt-1">No se encontraron pacientes</p>
                  )}
                </div>
              )}
            </div>

            {/* SOAP fields */}
            {soapSections.map((section) => (
              <div key={section.key} className="space-y-1.5">
                <label className="text-xs font-medium text-[#2C2C2A] flex items-center gap-1.5">
                  <Badge
                    className="text-[9px] border-0 text-white px-1.5"
                    style={{ backgroundColor: section.color }}
                  >
                    {section.badge}
                  </Badge>
                  {section.label}
                </label>
                <Textarea
                  placeholder={
                    section.key === 'subjective' ? 'Síntomas y motivo de consulta del paciente...' :
                    section.key === 'objective' ? 'Hallazgos objetivos, signos vitales, exploración física...' :
                    section.key === 'assessment' ? 'Diagnósticos, diagnósticos diferenciales...' :
                    'Plan de tratamiento, medicamentos, seguimiento...'
                  }
                  className="min-h-[80px] text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
                  value={newNoteFields[section.key as keyof typeof newNoteFields]}
                  onChange={(e) => setNewNoteFields(prev => ({ ...prev, [section.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-sm"
              onClick={() => setShowNewNoteDialog(false)}
              disabled={isCreatingNote}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-sm"
              onClick={handleCreateManualNote}
              disabled={isCreatingNote || !selectedPatientId}
            >
              {isCreatingNote ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Creando...</>
              ) : (
                <><FileText className="h-3.5 w-3.5 mr-1" />Crear nota</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={!!editField} onOpenChange={() => { setEditField(null); setEditValue('') }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em]">
              Editar {editField === 'subjective' ? 'Subjetivo' : editField === 'objective' ? 'Objetivo' : editField === 'assessment' ? 'Assessment' : 'Plan'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            className="min-h-[150px] text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-sm" onClick={() => { setEditField(null); setEditValue('') }}>
              Cancelar
            </Button>
            <Button
              className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-sm"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Guardando...</>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve & Sign Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#534AB7]" />
              Aprobar y firmar nota SOAP
            </DialogTitle>
            <DialogDescription className="text-sm text-[#888780]">
              Al firmar esta nota, confirma que ha revisado y aprobado el contenido. La nota no podrá ser editada después de firmarla.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-[#E1F5EE]">
            <p className="text-xs text-[#1D9E75] font-medium">Paciente: {selectedSoapNote?.patientName}</p>
            <p className="text-[10px] text-[#888780] mt-0.5">
              Fecha: {selectedSoapNote ? new Date(selectedSoapNote.createdAt).toLocaleDateString('es-MX') : ''}
            </p>
            {selectedSoapNote?.aiGenerated && (
              <p className="text-[10px] text-[#D97706] mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Esta nota fue generada por IA. Al firmarla, usted asume responsabilidad del contenido.
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-[#EEEDFE]">
            <p className="text-xs text-[#534AB7] font-medium">Firmará como:</p>
            <p className="text-sm text-[#2C2C2A] mt-0.5">{doctorProfile.name}</p>
            <p className="text-[10px] text-[#888780]">Cédula: {doctorProfile.license}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-sm"
              onClick={() => setShowApproveDialog(false)}
              disabled={isApproving}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white text-sm"
              onClick={confirmApprove}
              disabled={isApproving}
            >
              {isApproving ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Firmando...</>
              ) : (
                <><ShieldCheck className="h-3.5 w-3.5 mr-1" />Confirmar firma</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
