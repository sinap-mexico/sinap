'use client'

import { useState } from 'react'
import { useSinapStore, type FeatureFlagState, type SinapModule } from '@/lib/sinap-store'
import { clinic } from '@/lib/mock-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Briefcase,
  Clock,
  Zap,
  Link2,
  CreditCard,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Globe,
  MessageSquare,
  Calendar,
  Database,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const moduleIcons: Record<string, React.ElementType> = {
  desk: MessageSquare,
  flow: Zap,
  bill: CreditCard,
  grow: Building2,
  sight: Database,
  hub: Building2,
}

const moduleLabels: Record<string, string> = {
  desk: 'Sinap Desk',
  flow: 'Sinap Flow',
  bill: 'Sinap Bill',
  grow: 'Sinap Grow',
  sight: 'Sinap Sight',
  hub: 'Sinap Hub',
}

function TriToggle({
  state,
  onStateChange,
}: {
  state: FeatureFlagState
  onStateChange: (s: FeatureFlagState) => void
}) {
  return (
    <div className="inline-flex rounded-full bg-[#F1EFE8] p-0.5">
      {([
        { key: 'on' as FeatureFlagState, label: 'ON', color: '#534AB7' },
        { key: 'assist' as FeatureFlagState, label: 'ASSIST', color: '#1D9E75' },
        { key: 'off' as FeatureFlagState, label: 'OFF', color: '#888780' },
      ]).map((opt) => (
        <button
          key={opt.key}
          onClick={() => onStateChange(opt.key)}
          className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
            state === opt.key ? 'text-white' : 'text-[#888780] hover:text-[#2C2C2A]'
          }`}
          style={state === opt.key ? { backgroundColor: opt.color } : undefined}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const tabVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

export function SettingsPages() {
  const store = useSinapStore()
  const [activeTab, setActiveTab] = useState('perfil')

  const [doctorName, setDoctorName] = useState(store.doctorProfile.name)
  const [doctorEmail, setDoctorEmail] = useState(store.doctorProfile.email)
  const [doctorPhone, setDoctorPhone] = useState(store.doctorProfile.phone)
  const [doctorSpecialty, setDoctorSpecialty] = useState(store.doctorProfile.specialty)
  const [doctorLicense, setDoctorLicense] = useState(store.doctorProfile.license)

  const [clinicName, setClinicName] = useState(store.clinicProfile.name)
  const [clinicRfc, setClinicRfc] = useState(store.clinicProfile.rfc)
  const [clinicAddress, setClinicAddress] = useState(store.clinicProfile.address)
  const [clinicCity, setClinicCity] = useState(store.clinicProfile.city)
  const [clinicState, setClinicState] = useState(store.clinicProfile.state)
  const [clinicPhone, setClinicPhone] = useState(store.clinicProfile.phone)
  const [clinicEmail, setClinicEmail] = useState(store.clinicProfile.email)

  const [localServices, setLocalServices] = useState(store.services)

  const [workStart, setWorkStart] = useState(store.schedule.workStart)
  const [workEnd, setWorkEnd] = useState(store.schedule.workEnd)
  const [slotMinutes, setSlotMinutes] = useState(store.schedule.slotMinutes)

  const grouped = store.featureFlags.reduce(
    (acc, flag) => {
      if (!acc[flag.module]) acc[flag.module] = []
      acc[flag.module].push(flag)
      return acc
    },
    {} as Record<string, typeof store.featureFlags>
  )

  const handleSaveProfile = () => {
    store.setDoctorProfile({ name: doctorName, email: doctorEmail, phone: doctorPhone, specialty: doctorSpecialty, license: doctorLicense })
  }

  const handleSaveClinic = () => {
    store.setClinicProfile({ name: clinicName, rfc: clinicRfc, address: clinicAddress, city: clinicCity, state: clinicState, phone: clinicPhone, email: clinicEmail })
    store.setClinicName(clinicName)
  }

  const handleSaveSchedule = () => {
    store.setSchedule({ workStart, workEnd, slotMinutes })
  }

  const toggleServiceActive = (id: string) => {
    setLocalServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s))
  }

  const handleSaveServices = () => {
    store.setServices(localServices)
  }

  const addNewService = () => {
    setLocalServices(prev => [...prev, { id: `svc${Date.now()}`, name: '', duration: 30, price: 0, category: 'Consulta', isActive: true }])
  }

  const removeService = (id: string) => {
    setLocalServices(prev => prev.filter(s => s.id !== id))
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F1EFE8] h-9 flex-wrap">
          <TabsTrigger value="perfil" className="text-xs h-7 px-3">
            <User className="h-3.5 w-3.5 mr-1" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="clinica" className="text-xs h-7 px-3">
            <Building2 className="h-3.5 w-3.5 mr-1" />
            Clinica
          </TabsTrigger>
          <TabsTrigger value="servicios" className="text-xs h-7 px-3">
            <Briefcase className="h-3.5 w-3.5 mr-1" />
            Servicios
          </TabsTrigger>
          <TabsTrigger value="horarios" className="text-xs h-7 px-3">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="ia" className="text-xs h-7 px-3">
            <Zap className="h-3.5 w-3.5 mr-1" />
            IA
          </TabsTrigger>
          <TabsTrigger value="integraciones" className="text-xs h-7 px-3">
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Integraciones
          </TabsTrigger>
          <TabsTrigger value="plan" className="text-xs h-7 px-3">
            <CreditCard className="h-3.5 w-3.5 mr-1" />
            Plan
          </TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil">
          <motion.div variants={tabVariants} initial="hidden" animate="visible">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#534AB7]" />
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Perfil del doctor
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="h-16 w-16 rounded-full bg-[#EEEDFE] flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <span className="text-lg font-medium text-[#534AB7]">
                      {doctorName.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 2)}
                    </span>
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium text-[#2C2C2A]">{doctorName}</p>
                    <p className="text-xs text-[#888780]">{doctorSpecialty}</p>
                  </div>
                </div>
                <Separator className="bg-[#E1F5EE]" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Nombre completo</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={doctorName} onChange={e => setDoctorName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Especialidad</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={doctorSpecialty} onChange={e => setDoctorSpecialty(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Cedula profesional</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] font-mono focus:border-[#534AB7]" value={doctorLicense} onChange={e => setDoctorLicense(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Correo electronico</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={doctorEmail} onChange={e => setDoctorEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Telefono</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={doctorPhone} onChange={e => setDoctorPhone(e.target.value)} />
                  </div>
                </div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm" onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-1" />
                    Guardar cambios
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Clinica */}
        <TabsContent value="clinica">
          <motion.div variants={tabVariants} initial="hidden" animate="visible">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#534AB7]" />
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Datos de la clinica
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-[#888780]">Nombre de la clinica</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={clinicName} onChange={e => setClinicName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">RFC</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] font-mono focus:border-[#534AB7]" value={clinicRfc} onChange={e => setClinicRfc(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Regimen fiscal</Label>
                    <Select defaultValue="601">
                      <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="601">601 - General de Ley Personas Morales</SelectItem>
                        <SelectItem value="603">603 - Personas Fisicas con Actividad Empresarial</SelectItem>
                        <SelectItem value="612">612 - Personas Fisicas con Actividades Profesionales</SelectItem>
                        <SelectItem value="621">621 - Incorporacion Fiscal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-[#888780]">Direccion</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Ciudad</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={clinicCity} onChange={e => setClinicCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Estado</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={clinicState} onChange={e => setClinicState(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Telefono</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Correo electronico</Label>
                    <Input className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} />
                  </div>
                </div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm" onClick={handleSaveClinic}>
                    <Save className="h-4 w-4 mr-1" />
                    Guardar cambios
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Servicios */}
        <TabsContent value="servicios">
          <motion.div variants={tabVariants} initial="hidden" animate="visible">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-[#534AB7]" />
                    <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                      Servicios
                    </CardTitle>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs border-[#1D9E75] text-[#1D9E75]" onClick={addNewService}>
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto sinap-scroll">
                  {localServices.map((svc, i) => (
                    <motion.div
                      key={svc.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#F1EFE8]"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                        <Input className="h-8 text-xs bg-white border-[#E1F5EE] sm:col-span-2" value={svc.name} onChange={(e) => setLocalServices(prev => prev.map(s => s.id === svc.id ? { ...s, name: e.target.value } : s))} placeholder="Nombre del servicio" />
                        <Select value={svc.category} onValueChange={(v) => setLocalServices(prev => prev.map(s => s.id === svc.id ? { ...s, category: v } : s))}>
                          <SelectTrigger className="h-8 text-xs bg-white border-[#E1F5EE]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Consulta">Consulta</SelectItem>
                            <SelectItem value="Procedimiento">Procedimiento</SelectItem>
                            <SelectItem value="Estetica">Estetica</SelectItem>
                            <SelectItem value="Estudio">Estudio</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#888780] shrink-0">$</span>
                          <Input type="number" className="h-8 text-xs bg-white border-[#E1F5EE]" value={svc.price} onChange={(e) => setLocalServices(prev => prev.map(s => s.id === svc.id ? { ...s, price: parseInt(e.target.value) || 0 } : s))} />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-[10px] text-[#888780]">{svc.duration}min</span>
                          <Switch checked={svc.isActive} onCheckedChange={() => toggleServiceActive(svc.id)} />
                        </div>
                      </div>
                      <button onClick={() => removeService(svc.id)} className="p-1.5 text-[#888780] hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button className="mt-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm" onClick={handleSaveServices}>
                    <Save className="h-4 w-4 mr-1" />
                    Guardar servicios
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Horarios */}
        <TabsContent value="horarios">
          <motion.div variants={tabVariants} initial="hidden" animate="visible">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#534AB7]" />
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Horarios de atencion
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Hora de inicio</Label>
                    <Input type="time" className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={workStart} onChange={e => setWorkStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780]">Hora de fin</Label>
                    <Input type="time" className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]" value={workEnd} onChange={e => setWorkEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Duracion de cita</Label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map((d) => (
                      <motion.button
                        key={d}
                        onClick={() => setSlotMinutes(d)}
                        className={`h-9 px-4 rounded-lg text-sm font-medium transition-all ${
                          slotMinutes === d
                            ? 'bg-[#534AB7] text-white'
                            : 'bg-[#F1EFE8] text-[#888780] hover:bg-[#EEEDFE]'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {d} min
                      </motion.button>
                    ))}
                  </div>
                </div>
                <Separator className="bg-[#E1F5EE]" />
                <div>
                  <Label className="text-xs text-[#888780] mb-3 block">Excepciones (vacaciones)</Label>
                  <p className="text-xs text-[#888780]">Las excepciones de horario se configuraran desde la agenda.</p>
                </div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm" onClick={handleSaveSchedule}>
                    <Save className="h-4 w-4 mr-1" />
                    Guardar horario
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* IA Feature Flags */}
        <TabsContent value="ia">
          <motion.div variants={tabVariants} initial="hidden" animate="visible">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[#534AB7]" />
                    <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                      Feature Flags
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#534AB7]" />
                      ON = Auto
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#1D9E75]" />
                      ASSIST = Hibrido
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#888780]" />
                      OFF = Manual
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(grouped).map(([module, flags], mIdx) => {
                    const Icon = moduleIcons[module] || Zap
                    return (
                      <motion.div
                        key={module}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: mIdx * 0.1 }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-6 w-6 rounded bg-[#EEEDFE] flex items-center justify-center">
                            <Icon className="h-3.5 w-3.5 text-[#534AB7]" />
                          </div>
                          <span className="text-sm font-medium text-[#2C2C2A]">
                            {moduleLabels[module] || module}
                          </span>
                        </div>
                        <div className="space-y-3 pl-8">
                          {flags.map((flag) => (
                            <div key={flag.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F1EFE8]">
                              <div className="flex-1 min-w-0 mr-4">
                                <p className="text-sm font-medium text-[#2C2C2A]">{flag.name}</p>
                                <p className="text-xs text-[#888780] mt-0.5">{flag.description}</p>
                              </div>
                              <TriToggle state={flag.state} onStateChange={(s) => store.setFeatureFlag(flag.id, s)} />
                            </div>
                          ))}
                        </div>
                        <Separator className="bg-[#E1F5EE] mt-4" />
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Integraciones */}
        <TabsContent value="integraciones">
          <motion.div variants={tabVariants} initial="hidden" animate="visible">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-[#534AB7]" />
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Estado de integraciones
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-[#F1EFE8]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[#1D9E75]" />
                      <span className="text-sm font-medium text-[#2C2C2A]">Meta Business API</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Sin conectar
                    </Badge>
                  </div>
                  <p className="text-xs text-[#888780]">
                    WhatsApp Business API no conectada. Las conversaciones son simuladas.
                  </p>
                  <Button variant="outline" className="mt-2 h-7 text-xs border-[#534AB7] text-[#534AB7]">
                    <Globe className="h-3 w-3 mr-1" />
                    Conectar API
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-[#F1EFE8]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#1D9E75]" />
                      <span className="text-sm font-medium text-[#2C2C2A]">Facturama</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                      <Database className="h-3 w-3 mr-1" />
                      Sandbox
                    </Badge>
                  </div>
                  <p className="text-xs text-[#888780]">
                    Conectado en modo sandbox. CFDIs no son fiscales.
                  </p>
                  <div className="mt-2 inline-flex rounded-full bg-white p-0.5">
                    <button className="px-3 py-1 rounded-full text-[10px] font-medium bg-amber-500 text-white">Sandbox</button>
                    <button className="px-3 py-1 rounded-full text-[10px] font-medium text-[#888780] hover:text-[#2C2C2A]">Produccion</button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#F1EFE8]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#1D9E75]" />
                      <span className="text-sm font-medium text-[#2C2C2A]">Google Calendar</span>
                    </div>
                    <Badge className="bg-[#F1EFE8] text-[#888780] border-0 text-[10px]">
                      Desactivado
                    </Badge>
                  </div>
                  <p className="text-xs text-[#888780]">
                    Sincroniza tus citas con Google Calendar.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <Switch />
                    <span className="text-xs text-[#888780]">Activar sincronizacion</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#E1F5EE]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#1D9E75]" />
                      <span className="text-sm font-medium text-[#2C2C2A]">Sinap OS</span>
                    </div>
                    <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[10px]">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  </div>
                  <p className="text-xs text-[#888780]">
                    Orchestrador funcionando. 7 agentes conectados. Ultimo latido: hace 2s.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Plan */}
        <TabsContent value="plan">
          <motion.div variants={tabVariants} initial="hidden" animate="visible">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#534AB7]" />
                  <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                    Plan actual
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`p-5 rounded-xl border-2 transition-all ${store.plan === 'starter' ? 'border-[#1D9E75] bg-[#E1F5EE]' : 'border-[#E1F5EE] hover:border-[#1D9E75]/30'}`}>
                    <p className="text-sm font-medium text-[#2C2C2A]">Starter</p>
                    <p className="text-2xl font-medium text-[#2C2C2A] mt-1">$499<span className="text-sm text-[#888780]">/mes</span></p>
                    <ul className="mt-3 space-y-1.5">
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#1D9E75]" /> 1 doctor</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#1D9E75]" /> 200 conversaciones/mes</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#1D9E75]" /> Sinap Desk + Flow</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#1D9E75]" /> Facturacion basica</li>
                    </ul>
                    {store.plan === 'starter' && (
                      <Badge className="mt-3 bg-[#1D9E75] text-white border-0 text-[10px]">Plan actual</Badge>
                    )}
                  </div>

                  <div className={`p-5 rounded-xl border-2 ${store.plan === 'pro' ? 'border-[#534AB7] bg-[#EEEDFE]' : 'border-[#E1F5EE]'} relative`}>
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#534AB7] text-white border-0 text-[10px]">Popular</Badge>
                    </div>
                    <p className="text-sm font-medium text-[#2C2C2A]">Pro</p>
                    <p className="text-2xl font-medium text-[#2C2C2A] mt-1">$1,299<span className="text-sm text-[#888780]">/mes</span></p>
                    <ul className="mt-3 space-y-1.5">
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#534AB7]" /> 3 doctores</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#534AB7]" /> 1000 conversaciones/mes</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#534AB7]" /> Todos los modulos</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#534AB7]" /> Analitica avanzada</li>
                    </ul>
                    {store.plan === 'pro' ? (
                      <Badge className="mt-3 bg-[#534AB7] text-white border-0 text-[10px]">Plan actual</Badge>
                    ) : (
                      <Button className="mt-3 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-xs h-7 w-full">Mejorar</Button>
                    )}
                  </div>

                  <div className={`p-5 rounded-xl border-2 ${store.plan === 'enterprise' ? 'border-[#0F2D26] bg-[#0F2D26]/5' : 'border-[#E1F5EE] hover:border-[#0F2D26]/30'} transition-all`}>
                    <p className="text-sm font-medium text-[#2C2C2A]">Enterprise</p>
                    <p className="text-2xl font-medium text-[#2C2C2A] mt-1">Custom</p>
                    <ul className="mt-3 space-y-1.5">
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#0F2D26]" /> Doctores ilimitados</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#0F2D26]" /> Conversaciones ilimitadas</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#0F2D26]" /> API personalizada</li>
                      <li className="text-xs text-[#888780] flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-[#0F2D26]" /> Soporte dedicado</li>
                    </ul>
                    {store.plan === 'enterprise' ? (
                      <Badge className="mt-3 bg-[#0F2D26] text-white border-0 text-[10px]">Plan actual</Badge>
                    ) : (
                      <Button variant="outline" className="mt-3 text-xs h-7 w-full border-[#0F2D26] text-[#0F2D26]">Contactar ventas</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
