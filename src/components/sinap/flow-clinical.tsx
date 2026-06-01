'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useSinapStore, type FeatureFlagState, type SoapNoteItem } from '@/lib/sinap-store'
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

const soapSections = [
  { key: 'subjective', label: 'Subjetivo', badge: 'S', color: '#1D9E75', bgColor: '#E1F5EE', borderColor: 'border-l-[#1D9E75]' },
  { key: 'objective', label: 'Objetivo', badge: 'O', color: '#1D9E75', bgColor: '#E1F5EE', borderColor: 'border-l-[#1D9E75]' },
  { key: 'assessment', label: 'Assessment', badge: 'A', color: '#534AB7', bgColor: '#EEEDFE', borderColor: 'border-l-[#534AB7]' },
  { key: 'plan', label: 'Plan', badge: 'P', color: '#534AB7', bgColor: '#EEEDFE', borderColor: 'border-l-[#534AB7]' },
] as const

export function FlowClinical() {
  const { featureFlags, setFeatureFlag, soapNotes, addSoapNote, updateSoapNote, doctorProfile, clinicId, setClinicId, clinicSlug } = useSinapStore()
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

  // Selected SOAP note for viewing
  const [selectedSoapNote, setSelectedSoapNote] = useState<SoapNoteItem | null>(soapNotes[0] || null)

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
  }, [clinicId])

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

      if (data.questions && Array.isArray(data.questions)) {
        const questions: PreConsultaQuestion[] = data.questions.map((q: string) => ({
          question: q,
          answer: '',
        }))
        setPreConsultaQuestions(questions)
      }
    } catch {
      setPreConsultaQuestions([
        { question: 'Cual es el motivo principal de su consulta?', answer: '' },
        { question: 'Desde cuando presenta estos sintomas?', answer: '' },
        { question: 'En una escala del 1 al 10, que tan intenso es su molestia?', answer: '' },
        { question: 'Tiene antecedentes de enfermedades relevantes?', answer: '' },
        { question: 'Que medicamentos toma actualmente?', answer: '' },
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
    try {
      const responses = preConsultaQuestions
        .filter(q => q.answer)
        .map(q => ({ question: q.question, answer: q.answer }))

      const response = await fetch('/api/soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient?.patientId || '',
          clinicId: clinicId || 'demo',
          specialty: doctorProfile.specialty,
          preConsultaResponses: responses,
        }),
      })

      const data = await response.json()

      if (data.subjective) {
        const newNote: SoapNoteItem = {
          id: `soap_${Date.now()}`,
          patientId: selectedPatient?.patientId || '',
          patientName: selectedPatient?.patientName || 'Paciente',
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan,
          status: 'draft',
          createdAt: new Date().toISOString(),
          aiGenerated: true,
        }
        addSoapNote(newNote)
        setSelectedSoapNote(newNote)
        setActiveTab('soap')

        eventBus.emit('demo', 'soap_borrador_listo', 'flow', 'os',
          JSON.stringify({ patientName: selectedPatient?.patientName, noteId: newNote.id })
        )
      }
    } catch {
      // Error handling
    } finally {
      setIsGeneratingSOAP(false)
    }
  }

  const handleApproveNote = (noteId: string) => {
    updateSoapNote(noteId, { status: 'approved' })
    if (selectedSoapNote?.id === noteId) {
      setSelectedSoapNote(prev => prev ? { ...prev, status: 'approved' } : null)
    }
  }

  const handleEditField = (noteId: string, field: string, value: string) => {
    setEditingNote(noteId)
    setEditField(field)
    setEditValue(value)
  }

  const handleSaveEdit = () => {
    if (!editingNote || !editField) return
    updateSoapNote(editingNote, { [editField]: editValue })
    if (selectedSoapNote?.id === editingNote) {
      setSelectedSoapNote(prev => prev ? { ...prev, [editField]: editValue } : null)
    }
    setEditingNote(null)
    setEditField(null)
    setEditValue('')
  }

  // Progress calculation for pre-consulta
  const preConsultaProgress = preConsultaQuestions.length > 0
    ? (preConsultaQuestions.filter(q => q.answer).length / preConsultaQuestions.length) * 100
    : 0

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
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
        <Button
          variant={activeTab === 'preconsulta' ? 'default' : 'outline'}
          className={`text-xs h-8 transition-all ${activeTab === 'preconsulta' ? 'bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white' : 'border-[#E1F5EE] text-[#888780]'}`}
          onClick={() => setActiveTab('preconsulta')}
        >
          <Stethoscope className="h-3.5 w-3.5 mr-1" />
          Pre-consulta
        </Button>
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
        {activeTab === 'preconsulta' && (
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
                          <span className="text-[10px] text-[#888780]">{apt.time}</span>
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
                      La IA generara preguntas personalizadas basadas en la especialidad y tipo de cita.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
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

                    {/* Questions and answers */}
                    <ScrollArea className="max-h-[350px] pr-2">
                      <div className="space-y-3">
                        {preConsultaQuestions.map((q, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
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
                              <motion.div
                                className="flex justify-end mb-2"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                              >
                                <div className="bg-[#E1F5EE] text-[#2C2C2A] rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                                  <p className="text-sm">{q.answer}</p>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Input area */}
                    {!preConsultaComplete && preConsultaQuestions.length > 0 && (
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
                            <motion.div whileTap={{ scale: 0.9 }}>
                              <Button
                                size="icon"
                                className="bg-[#534AB7] hover:bg-[#534AB7]/90 h-9 w-9"
                                onClick={handleAnswerQuestion}
                                disabled={!currentAnswer.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Generate SOAP button */}
                    {preConsultaComplete && (
                      <motion.div
                        className="pt-3 border-t border-[#E1F5EE]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="p-3 rounded-lg bg-[#E1F5EE] mb-3">
                          <p className="text-xs text-[#1D9E75] font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Pre-consulta completada
                          </p>
                          <p className="text-[10px] text-[#888780] mt-0.5">
                            {preConsultaQuestions.filter(q => q.answer).length} respuestas recopiladas
                          </p>
                        </div>
                        <motion.div whileTap={{ scale: 0.98 }}>
                          <Button
                            className="w-full bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9"
                            onClick={handleGenerateSOAP}
                            disabled={isGeneratingSOAP}
                          >
                            {isGeneratingSOAP ? (
                              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generando nota SOAP...</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-1.5" />Generar nota SOAP con IA</>
                            )}
                          </Button>
                        </motion.div>
                      </motion.div>
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
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Notas SOAP
                </CardTitle>
              </CardHeader>
              <Separator className="bg-[#E1F5EE]" />
              <ScrollArea className="max-h-[calc(100vh-380px)]">
                <div className="p-3 space-y-2">
                  {soapNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="h-8 w-8 text-[#888780]/30 mb-2" />
                      <p className="text-xs text-[#888780]">Sin notas SOAP</p>
                    </div>
                  ) : (
                    soapNotes.map((note, i) => (
                      <motion.button
                        key={note.id}
                        onClick={() => setSelectedSoapNote(note)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
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
                        </div>
                        <p className="text-[10px] text-[#888780] mt-0.5">
                          {new Date(note.createdAt).toLocaleDateString('es-MX')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge
                            className={`text-[9px] border-0 ${
                              note.status === 'approved'
                                ? 'bg-[#E1F5EE] text-[#1D9E75]'
                                : note.status === 'signed'
                                ? 'bg-[#534AB7] text-white'
                                : 'bg-[#FEF3C7] text-[#D97706]'
                            }`}
                          >
                            {note.status === 'approved' ? 'Aprobada' : note.status === 'signed' ? 'Firmada' : 'Borrador'}
                          </Badge>
                          {note.aiGenerated && (
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
                    {selectedSoapNote?.status && (
                      <Badge className={`text-[10px] border-0 ${
                        selectedSoapNote.status === 'approved'
                          ? 'bg-[#E1F5EE] text-[#1D9E75]'
                          : selectedSoapNote.status === 'signed'
                          ? 'bg-[#534AB7] text-white'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        {selectedSoapNote.status === 'approved' ? 'Aprobada' : selectedSoapNote.status === 'signed' ? 'Firmada' : 'Borrador'}
                      </Badge>
                    )}
                    <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {soapFlag?.state === 'on' ? 'AUTO' : 'IA Assist'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSoapNote ? (
                  <>
                    {/* SOAP sections with color-coded left borders and timeline feel */}
                    {soapSections.map((section, idx) => {
                      const content = selectedSoapNote[section.key as keyof SoapNoteItem] as string
                      const isAI = selectedSoapNote.aiGenerated
                      const isSuggested = section.key === 'assessment' || section.key === 'plan'

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
                              {(isAI || isSuggested) && (
                                <Badge
                                  className="bg-white text-[10px] border"
                                  style={{ color: section.color, borderColor: section.color + '30' }}
                                >
                                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                  {isSuggested ? 'Sugerido por IA' : 'Generado por IA'}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-[#888780] hover:text-[#534AB7]"
                              onClick={() => handleEditField(selectedSoapNote.id, section.key, content)}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                          </div>
                          <p className="text-sm text-[#2C2C2A] leading-relaxed whitespace-pre-line">{content}</p>
                        </motion.div>
                      )
                    })}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      {selectedSoapNote.status !== 'approved' && (
                        <motion.div whileTap={{ scale: 0.97 }}>
                          <Button
                            className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-9"
                            onClick={() => handleApproveNote(selectedSoapNote.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Aprobar nota
                          </Button>
                        </motion.div>
                      )}
                      {selectedSoapNote.status === 'approved' && (
                        <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-xs py-1 px-3">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Nota aprobada por el medico
                        </Badge>
                      )}
                      <Button variant="outline" className="border-[#E1F5EE] text-[#2C2C2A] h-9">
                        <FileText className="h-4 w-4 mr-1.5" />
                        Exportar PDF
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
                      O inicie una pre-consulta para generar una nueva nota
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
            <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-sm" onClick={handleSaveEdit}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
