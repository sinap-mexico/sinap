'use client'

import { useState } from 'react'
import { useSinapStore } from '@/lib/sinap-store'
import { defaultServicesBySpecialty } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Building2,
  ArrowRight,
  ArrowLeft,
  Zap,
  Shield,
  Hand,
  CheckCircle,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  MessageSquare,
  Smartphone,
} from 'lucide-react'

const SPECIALTIES = [
  'Dermatología', 'Odontología', 'Medicina General', 'Psicología',
  'Nutrición', 'Oftalmología', 'Cardiología', 'Otro',
]

const MEXICAN_STATES = [
  'CDMX', 'Estado de México', 'Jalisco', 'Nuevo León', 'Puebla',
  'Guanajuato', 'Chihuahua', 'Veracruz', 'Michoacán', 'Querétaro',
  'Sonora', 'Yucatán', 'Baja California', 'Sinaloa', 'Coahuila',
  'Aguascalientes', 'Hidalgo', 'Quintana Roo', 'Tamaulipas', 'Oaxaca',
  'Tabasco', 'Morelos', 'Colima', 'Baja California Sur', 'Zacatecas',
  'Nayarit', 'Durango', 'Guerrero', 'Tlaxcala', 'Campeche', 'Chiapas',
]

const TOTAL_STEPS = 8

export function OnboardingFlow() {
  const store = useSinapStore()
  const [step, setStep] = useState(0)
  const [accountType, setAccountType] = useState<'solo' | 'clinic' | ''>('')
  const [personalData, setPersonalData] = useState({
    name: '', specialty: '', license: '', email: '', phone: '',
  })
  const [clinicData, setClinicData] = useState({
    name: '', rfc: '', address: '', city: '', state: '',
  })
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [workStart, setWorkStart] = useState('09:00')
  const [workEnd, setWorkEnd] = useState('18:00')
  const [slotMinutes, setSlotMinutes] = useState(30)
  const [services, setServices] = useState<{ name: string; duration: number; price: number; category: string }[]>([])
  const [aiMode, setAiMode] = useState<'full' | 'assist' | 'manual' | ''>('')
  const [metaStep, setMetaStep] = useState(0)

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const canNext = () => {
    switch (step) {
      case 0: return accountType !== ''
      case 1: return personalData.name !== '' && personalData.specialty !== ''
      case 2: return clinicData.name !== ''
      case 3: return workDays.length > 0
      case 4: return services.length > 0
      case 5: return aiMode !== ''
      case 6: return true
      case 7: return true
      default: return true
    }
  }

  const handleNext = () => {
    if (step === 0 && accountType) {
      store.setClinicMode(accountType)
    }
    if (step === 1) {
      store.setDoctorProfile({
        name: personalData.name,
        specialty: personalData.specialty,
        license: personalData.license,
        email: personalData.email,
        phone: personalData.phone,
      })
      // Pre-populate services based on specialty
      const specialtyServices = defaultServicesBySpecialty[personalData.specialty] || defaultServicesBySpecialty['Medicina General']
      if (services.length === 0) {
        setServices(specialtyServices)
      }
    }
    if (step === 2) {
      store.setClinicProfile({
        name: clinicData.name,
        rfc: clinicData.rfc,
        address: clinicData.address,
        city: clinicData.city,
        state: clinicData.state,
      })
      store.setClinicName(clinicData.name)
    }
    if (step === 3) {
      store.setSchedule({
        workDays: workDays.join(','),
        workStart,
        workEnd,
        slotMinutes,
      })
    }
    if (step === 4) {
      store.setServices(services.map((s, i) => ({
        id: `svc${i + 1}`,
        name: s.name,
        duration: s.duration,
        price: s.price,
        category: s.category,
        isActive: true,
      })))
    }
    if (step === 7) {
      store.setOnboardingComplete(true)
      return
    }
    setStep(step + 1)
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  const toggleWorkDay = (day: number) => {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const addService = () => {
    setServices([...services, { name: '', duration: 30, price: 0, category: 'Consulta' }])
  }

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const updateService = (index: number, field: string, value: string | number) => {
    setServices(services.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const dayLabels: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mie', 4: 'Jue', 5: 'Vie', 6: 'Sab' }

  return (
    <div className="min-h-screen bg-[#F1EFE8] flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Progress */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#888780]">Paso {step + 1} de {TOTAL_STEPS}</span>
          <span className="text-xs text-[#1D9E75] font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-[#E1F5EE]" />
      </div>

      {/* Step content */}
      <Card className="w-full max-w-2xl border-0 shadow-lg bg-white">
        <CardContent className="p-6 sm:p-8">
          {/* Step 0: Account Type */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
                Tipo de cuenta
              </h2>
              <p className="text-sm text-[#888780] mb-6">
                Selecciona la opcion que mejor describe tu practica
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setAccountType('solo')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    accountType === 'solo'
                      ? 'border-[#534AB7] bg-[#EEEDFE]'
                      : 'border-[#E1F5EE] hover:border-[#534AB7]/40'
                  }`}
                >
                  <User className={`h-8 w-8 mb-3 ${accountType === 'solo' ? 'text-[#534AB7]' : 'text-[#888780]'}`} />
                  <p className="text-sm font-medium text-[#2C2C2A]">Especialista independiente</p>
                  <p className="text-xs text-[#888780] mt-1">Trabajas por tu cuenta en un consultorio</p>
                </button>
                <button
                  onClick={() => setAccountType('clinic')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    accountType === 'clinic'
                      ? 'border-[#534AB7] bg-[#EEEDFE]'
                      : 'border-[#E1F5EE] hover:border-[#534AB7]/40'
                  }`}
                >
                  <Building2 className={`h-8 w-8 mb-3 ${accountType === 'clinic' ? 'text-[#534AB7]' : 'text-[#888780]'}`} />
                  <p className="text-sm font-medium text-[#2C2C2A]">Tengo una clinica</p>
                  <p className="text-xs text-[#888780] mt-1">Administras una clinica con multiples doctores</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Personal Data */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
                Datos personales
              </h2>
              <p className="text-sm text-[#888780] mb-6">
                Informacion del doctor principal
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-[#888780]">Nombre completo</Label>
                  <Input
                    placeholder="Dr. Nombre Apellido"
                    className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={personalData.name}
                    onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Especialidad</Label>
                  <Select
                    value={personalData.specialty}
                    onValueChange={(v) => setPersonalData({ ...personalData, specialty: v })}
                  >
                    <SelectTrigger className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                      <SelectValue placeholder="Selecciona especialidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Cedula profesional</Label>
                  <Input
                    placeholder="12345678"
                    className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={personalData.license}
                    onChange={(e) => setPersonalData({ ...personalData, license: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Correo electronico</Label>
                  <Input
                    type="email"
                    placeholder="tu@correo.com"
                    className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={personalData.email}
                    onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Telefono</Label>
                  <Input
                    placeholder="+52 55 1234 5678"
                    className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={personalData.phone}
                    onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Clinic Data */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
                Datos del consultorio
              </h2>
              <p className="text-sm text-[#888780] mb-6">
                {accountType === 'clinic' ? 'Informacion de la clinica' : 'Informacion de tu consultorio'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-[#888780]">
                    Nombre del {accountType === 'clinic' ? 'clinica' : 'consultorio'}
                  </Label>
                  <Input
                    placeholder={accountType === 'clinic' ? 'Clinica San Angel' : 'Consultorio Dr. Ruiz'}
                    className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={clinicData.name}
                    onChange={(e) => setClinicData({ ...clinicData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">RFC</Label>
                  <Input
                    placeholder="CSA230515ABC"
                    className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE] font-mono"
                    value={clinicData.rfc}
                    onChange={(e) => setClinicData({ ...clinicData, rfc: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Direccion</Label>
                  <Input
                    placeholder="Av. Insurgentes Sur 1234"
                    className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={clinicData.address}
                    onChange={(e) => setClinicData({ ...clinicData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Ciudad</Label>
                  <Input
                    placeholder="Ciudad de Mexico"
                    className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={clinicData.city}
                    onChange={(e) => setClinicData({ ...clinicData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Estado</Label>
                  <Select
                    value={clinicData.state}
                    onValueChange={(v) => setClinicData({ ...clinicData, state: v })}
                  >
                    <SelectTrigger className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEXICAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
                Horario de trabajo
              </h2>
              <p className="text-sm text-[#888780] mb-6">
                Define tus dias y horarios de atencion
              </p>
              <div className="space-y-6">
                <div>
                  <Label className="text-xs text-[#888780] mb-3 block">Dias de trabajo</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleWorkDay(day)}
                        className={`h-10 w-14 rounded-lg text-sm font-medium transition-all ${
                          workDays.includes(day)
                            ? 'bg-[#1D9E75] text-white'
                            : 'bg-[#F1EFE8] text-[#888780] hover:bg-[#E1F5EE]'
                        }`}
                      >
                        {dayLabels[day]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Hora de inicio</Label>
                    <Input
                      type="time"
                      className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Hora de fin</Label>
                    <Input
                      type="time"
                      className="h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Duracion de cita</Label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map((d) => (
                      <button
                        key={d}
                        onClick={() => setSlotMinutes(d)}
                        className={`h-10 px-4 rounded-lg text-sm font-medium transition-all ${
                          slotMinutes === d
                            ? 'bg-[#534AB7] text-white'
                            : 'bg-[#F1EFE8] text-[#888780] hover:bg-[#EEEDFE]'
                        }`}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Services */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
                Servicios
              </h2>
              <p className="text-sm text-[#888780] mb-6">
                Configura los servicios que ofreces. Ya pre-llenamos basandote en tu especialidad.
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto sinap-scroll">
                {services.map((svc, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-[#F1EFE8]">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <Input
                        placeholder="Nombre del servicio"
                        className="h-8 text-xs bg-white border-[#E1F5EE] sm:col-span-2"
                        value={svc.name}
                        onChange={(e) => updateService(i, 'name', e.target.value)}
                      />
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#888780] shrink-0" />
                        <Input
                          type="number"
                          placeholder="30"
                          className="h-8 text-xs bg-white border-[#E1F5EE] w-16"
                          value={svc.duration}
                          onChange={(e) => updateService(i, 'duration', parseInt(e.target.value) || 0)}
                        />
                        <span className="text-[10px] text-[#888780]">min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-[#888780] shrink-0" />
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8 text-xs bg-white border-[#E1F5EE] w-24"
                          value={svc.price}
                          onChange={(e) => updateService(i, 'price', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeService(i)}
                      className="p-1.5 text-[#888780] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="mt-4 w-full h-9 border-dashed border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE] text-xs"
                onClick={addService}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar servicio
              </Button>
            </div>
          )}

          {/* Step 5: AI Config */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
                Configurar IA
              </h2>
              <p className="text-sm text-[#888780] mb-6">
                Elige como quieres que la inteligencia artificial trabaje contigo
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setAiMode('full')}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${
                    aiMode === 'full'
                      ? 'border-[#534AB7] bg-[#EEEDFE]'
                      : 'border-[#E1F5EE] hover:border-[#534AB7]/40'
                  }`}
                >
                  <Zap className={`h-7 w-7 mb-3 ${aiMode === 'full' ? 'text-[#534AB7]' : 'text-[#888780]'}`} />
                  <p className="text-sm font-medium text-[#2C2C2A]">IA completa</p>
                  <p className="text-[11px] text-[#888780] mt-1">La IA responde y agenda automaticamente</p>
                </button>
                <button
                  onClick={() => setAiMode('assist')}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${
                    aiMode === 'assist'
                      ? 'border-[#1D9E75] bg-[#E1F5EE]'
                      : 'border-[#E1F5EE] hover:border-[#1D9E75]/40'
                  }`}
                >
                  <Shield className={`h-7 w-7 mb-3 ${aiMode === 'assist' ? 'text-[#1D9E75]' : 'text-[#888780]'}`} />
                  <p className="text-sm font-medium text-[#2C2C2A]">Asistida</p>
                  <p className="text-[11px] text-[#888780] mt-1">La IA sugiere, tu apruebas antes de enviar</p>
                </button>
                <button
                  onClick={() => setAiMode('manual')}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${
                    aiMode === 'manual'
                      ? 'border-[#888780] bg-[#F1EFE8]'
                      : 'border-[#E1F5EE] hover:border-[#888780]/40'
                  }`}
                >
                  <Hand className={`h-7 w-7 mb-3 ${aiMode === 'manual' ? 'text-[#888780]' : 'text-[#888780]'}`} />
                  <p className="text-sm font-medium text-[#2C2C2A]">Manual</p>
                  <p className="text-[11px] text-[#888780] mt-1">Tu controlas toda la comunicacion</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Meta Connection */}
          {step === 6 && (
            <div>
              <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
                Conexion Meta Business
              </h2>
              <p className="text-sm text-[#888780] mb-6">
                Conecta WhatsApp Business, Instagram y Facebook Messenger
              </p>
              <div className="space-y-4">
                {[
                  { step: 1, label: 'Crear cuenta en Meta for Developers', icon: Globe, desc: 'Ve a developers.facebook.com y crea una app de negocio' },
                  { step: 2, label: 'Configurar WhatsApp Business API', icon: MessageSquare, desc: 'Registra tu numero de negocio y verifica la cuenta' },
                  { step: 3, label: 'Conectar Instagram Business', icon: Smartphone, desc: 'Vincula tu cuenta de Instagram Business con Meta' },
                  { step: 4, label: 'Obtener token de acceso', icon: Shield, desc: 'Genera un token de acceso de larga duracion para Sinap' },
                ].map((item) => (
                  <div
                    key={item.step}
                    className={`flex items-start gap-3 p-4 rounded-lg transition-all ${
                      metaStep >= item.step ? 'bg-[#E1F5EE]' : 'bg-[#F1EFE8]'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      metaStep >= item.step ? 'bg-[#1D9E75] text-white' : 'bg-[#888780]/20 text-[#888780]'
                    }`}>
                      {metaStep >= item.step ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-medium">{item.step}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-[#888780]" />
                        <p className="text-sm font-medium text-[#2C2C2A]">{item.label}</p>
                      </div>
                      <p className="text-xs text-[#888780] mt-1">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setMetaStep(Math.max(metaStep, item.step))}
                      className="text-[#534AB7] hover:text-[#534AB7]/70 shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="text-[#888780] hover:text-[#534AB7] text-xs"
                  onClick={() => setStep(7)}
                >
                  Configurar despues
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 7: Done */}
          {step === 7 && (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-[#1D9E75] mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
                Todo listo
              </h2>
              <p className="text-sm text-[#888780] mb-6 max-w-sm mx-auto">
                Tu plataforma Sinap esta configurada y lista para usar. Puedes ajustar cualquier configuracion despues.
              </p>
              <div className="flex items-center justify-center gap-6 text-xs text-[#888780]">
                <div className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-[#534AB7]" />
                  <span>IA {aiMode === 'full' ? 'completa' : aiMode === 'assist' ? 'asistida' : 'manual'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-[#1D9E75]" />
                  <span>{accountType === 'clinic' ? 'Clinica' : 'Independiente'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#1D9E75]" />
                  <span>{services.length} servicios</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E1F5EE]">
            <Button
              variant="ghost"
              className="text-[#888780] hover:text-[#2C2C2A] text-sm"
              onClick={handlePrev}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white text-sm font-medium h-10"
              onClick={handleNext}
              disabled={!canNext()}
            >
              {step === 7 ? 'Ir al dashboard' : 'Siguiente'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
