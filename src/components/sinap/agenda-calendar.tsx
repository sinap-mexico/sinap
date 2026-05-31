'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSinapStore } from '@/lib/sinap-store'
import { appointments as mockAppointments, patients, staffMembers } from '@/lib/mock-data'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'

type AppointmentStatus = 'confirmed' | 'pending' | 'scheduled' | 'cancelled' | 'no-show'

interface AgendaAppointment {
  id: string
  patientId: string
  patientName: string
  time: string
  duration: number
  status: AppointmentStatus
  type: string
  isAI?: boolean
}

const statusConfig: Record<AppointmentStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  confirmed: { label: 'Confirmada', color: '#1D9E75', bg: '#E1F5EE', icon: CheckCircle },
  pending: { label: 'Pendiente', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  scheduled: { label: 'Agendada', color: '#534AB7', bg: '#EEEDFE', icon: CalendarIcon },
  cancelled: { label: 'Cancelada', color: '#888780', bg: '#F1EFE8', icon: XCircle },
  'no-show': { label: 'No asistio', color: '#E53E3E', bg: '#FEE2E2', icon: AlertCircle },
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

export function AgendaCalendar() {
  const { schedule, clinicMode, services } = useSinapStore()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<AgendaAppointment | null>(null)
  const [appointmentList, setAppointmentList] = useState<AgendaAppointment[]>(mockAppointments.map(a => ({ ...a, isAI: a.status === 'scheduled' })))

  const [newPatient, setNewPatient] = useState('')
  const [newService, setNewService] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const workStart = parseTime(schedule.workStart)
  const workEnd = parseTime(schedule.workEnd)

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

  const getAppointmentsForDate = useCallback((date: Date) => {
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    if (isToday) {
      return appointmentList
    }
    const seed = date.getDate() + date.getMonth() * 31
    if (seed % 3 === 0) {
      return appointmentList.slice(0, 3).map(a => ({ ...a, time: formatTimeSlot(workStart + (seed % 5) * 60) }))
    }
    return []
  }, [appointmentList, workStart])

  const getAppointmentAtSlot = useCallback((timeMinutes: number, dateAppointments: AgendaAppointment[]) => {
    return dateAppointments.find(apt => {
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
    setNewDate(currentDate.toISOString().split('T')[0])
    setShowNewDialog(true)
  }

  const handleAppointmentClick = (apt: AgendaAppointment) => {
    setSelectedAppointment(apt)
    setShowDetailDialog(true)
  }

  const handleCreateAppointment = () => {
    if (!newPatient || !newService || !newTime) return
    const patient = patients.find(p => p.id === newPatient)
    const newApt: AgendaAppointment = {
      id: `a${Date.now()}`,
      patientId: newPatient,
      patientName: patient?.name || newPatient,
      time: newTime,
      duration: 30,
      status: 'scheduled',
      type: newService,
    }
    setAppointmentList([...appointmentList, newApt])
    setShowNewDialog(false)
    setNewPatient('')
    setNewService('')
    setNewNotes('')
  }

  const handleConfirmAppointment = (aptId: string) => {
    setAppointmentList(prev => prev.map(a => a.id === aptId ? { ...a, status: 'confirmed' as AppointmentStatus } : a))
    setShowDetailDialog(false)
  }

  const handleCancelAppointment = (aptId: string) => {
    setAppointmentList(prev => prev.map(a => a.id === aptId ? { ...a, status: 'cancelled' as AppointmentStatus } : a))
    setShowDetailDialog(false)
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const formatDate = (date: Date) => {
    return `${dayNames[date.getDay()]} ${date.getDate()} de ${monthNames[date.getMonth()]}`
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
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
                {staffMembers.filter(s => s.specialty !== 'Recepcion').map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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

                  {timeSlots.map((minutes) => {
                    const dateApts = getAppointmentsForDate(currentDate)
                    const apt = getAppointmentAtSlot(minutes, dateApts)
                    const isStart = apt && parseTime(apt.time) === minutes

                    if (apt && !isStart) return null

                    return (
                      <div
                        key={minutes}
                        className="h-14 border-b border-[#E1F5EE]/50 relative cursor-pointer hover:bg-[#F1EFE8]/50 transition-colors"
                        onClick={() => !apt && handleSlotClick(formatTimeSlot(minutes))}
                      >
                        {isStart && apt && (
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAppointmentClick(apt)
                            }}
                            className={`absolute inset-x-2 top-1 rounded-lg p-2 text-left transition-all hover:shadow-md ${
                              apt.status === 'cancelled' ? 'bg-[#F1EFE8]/60' :
                              apt.isAI ? 'bg-[#534AB7]/10 border border-[#534AB7]/20' :
                              apt.status === 'confirmed' ? 'bg-[#E1F5EE] border border-[#1D9E75]/20' :
                              'bg-[#FEF3C7]/60 border border-[#D97706]/20'
                            }`}
                            style={{ height: `${(apt.duration / schedule.slotMinutes) * 56 - 8}px` }}
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
                          </motion.button>
                        )}
                        {!apt && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-[#888780]" />
                          </div>
                        )}
                      </div>
                    )
                  })}
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
                        const apt = getAppointmentAtSlot(minutes, dayApts)
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
                                  apt.status === 'cancelled' ? 'bg-[#F1EFE8]/80' :
                                  apt.isAI ? 'bg-[#534AB7]/10' :
                                  apt.status === 'confirmed' ? 'bg-[#E1F5EE]' :
                                  'bg-[#FEF3C7]/60'
                                }`}
                              >
                                <p className="text-[9px] font-medium text-[#2C2C2A] truncate">
                                  {apt.patientName.split(' ').slice(0, 2).join(' ')}
                                </p>
                                <p className="text-[8px] text-[#888780] truncate">{apt.type}</p>
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
              <Select value={newPatient} onValueChange={setNewPatient}>
                <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                  <SelectValue placeholder="Buscar paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clinicMode === 'clinic' && (
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Doctor</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                    <SelectValue placeholder="Seleccionar doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.filter(s => s.specialty !== 'Recepcion').map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Servicio</Label>
              <Select value={newService} onValueChange={setNewService}>
                <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.isActive).map(s => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name} — ${s.price.toLocaleString()} ({s.duration}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                disabled={!newPatient || !newService || !newTime}
              >
                Agendar
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
                  <p className="text-sm font-medium text-[#2C2C2A]">{selectedAppointment.patientName}</p>
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
              </div>
              {selectedAppointment.status !== 'cancelled' && (
                <div className="flex gap-2">
                  {selectedAppointment.status !== 'confirmed' && (
                    <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                      <Button
                        className="w-full bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white text-sm h-9"
                        onClick={() => handleConfirmAppointment(selectedAppointment.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirmar
                      </Button>
                    </motion.div>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-sm h-9"
                    onClick={() => handleCancelAppointment(selectedAppointment.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
