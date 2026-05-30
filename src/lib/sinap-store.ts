import { create } from 'zustand'

export type SinapModule = 'os' | 'agenda' | 'desk' | 'flow' | 'bill' | 'grow' | 'sight' | 'hub' | 'config'

export type FeatureFlagState = 'on' | 'assist' | 'off'

interface FeatureFlag {
  id: string
  module: SinapModule
  name: string
  description: string
  state: FeatureFlagState
}

interface DoctorProfile {
  name: string
  specialty: string
  license: string
  email: string
  phone: string
}

interface ClinicProfile {
  name: string
  rfc: string
  address: string
  city: string
  state: string
  phone: string
  email: string
}

interface ServiceItem {
  id: string
  name: string
  duration: number
  price: number
  category: string
  isActive: boolean
}

interface ScheduleConfig {
  workDays: string
  workStart: string
  workEnd: string
  slotMinutes: number
}

export interface SinapEvent {
  id: string
  eventType: string
  sourceAgent: string
  targetAgent?: string
  payload: string
  createdAt: string
}

export interface SoapNoteItem {
  id: string
  patientId: string
  patientName: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  status: 'draft' | 'approved' | 'signed'
  createdAt: string
  aiGenerated?: boolean
}

interface SinapStore {
  activeModule: SinapModule
  setActiveModule: (module: SinapModule) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  clinicMode: 'solo' | 'clinic'
  setClinicMode: (mode: 'solo' | 'clinic') => void
  clinicName: string
  setClinicName: (name: string) => void
  plan: 'starter' | 'pro' | 'enterprise'
  featureFlags: FeatureFlag[]
  setFeatureFlag: (id: string, state: FeatureFlagState) => void
  // Auth
  isLoggedIn: boolean
  setIsLoggedIn: (v: boolean) => void
  // Onboarding
  onboardingComplete: boolean
  setOnboardingComplete: (v: boolean) => void
  // Profile data
  doctorProfile: DoctorProfile
  setDoctorProfile: (p: Partial<DoctorProfile>) => void
  clinicProfile: ClinicProfile
  setClinicProfile: (p: Partial<ClinicProfile>) => void
  services: ServiceItem[]
  setServices: (s: ServiceItem[]) => void
  schedule: ScheduleConfig
  setSchedule: (s: Partial<ScheduleConfig>) => void
  // Event Bus
  recentEvents: SinapEvent[]
  addRecentEvent: (event: SinapEvent) => void
  // SOAP Notes
  soapNotes: SoapNoteItem[]
  addSoapNote: (note: SoapNoteItem) => void
  updateSoapNote: (id: string, updates: Partial<SoapNoteItem>) => void
}

const defaultFeatureFlags: FeatureFlag[] = [
  { id: 'desk-auto-reply', module: 'desk', name: 'Auto-respuesta', description: 'IA responde automaticamente a pacientes', state: 'assist' },
  { id: 'desk-appointment', module: 'desk', name: 'Agendamiento automatico', description: 'IA agenda citas desde conversaciones', state: 'assist' },
  { id: 'flow-soap', module: 'flow', name: 'Notas SOAP', description: 'IA genera notas SOAP a partir de consulta', state: 'assist' },
  { id: 'flow-preconsulta', module: 'flow', name: 'Pre-consulta', description: 'IA recaba datos antes de la consulta', state: 'on' },
  { id: 'bill-auto-cfdi', module: 'bill', name: 'CFDI automatico', description: 'IA genera facturas al terminar consulta', state: 'assist' },
  { id: 'bill-reminders', module: 'bill', name: 'Recordatorios de pago', description: 'IA envia recordatorios de facturas pendientes', state: 'off' },
  { id: 'grow-reactivation', module: 'grow', name: 'Reactivacion', description: 'IA identifica y contacta pacientes inactivos', state: 'assist' },
  { id: 'grow-segments', module: 'grow', name: 'Segmentacion', description: 'IA segmenta pacientes automaticamente', state: 'on' },
  { id: 'sight-alerts', module: 'sight', name: 'Alertas proactivas', description: 'IA detecta anomalias y genera alertas', state: 'on' },
  { id: 'sight-reports', module: 'sight', name: 'Reportes automaticos', description: 'IA genera reportes semanales', state: 'assist' },
  { id: 'hub-scheduling', module: 'hub', name: 'Optimizacion de agenda', description: 'IA optimiza agenda de multiples doctores', state: 'off' },
  { id: 'hub-inventory', module: 'hub', name: 'Inventario inteligente', description: 'IA sugiere reabastecimiento de insumos', state: 'off' },
]

const defaultSoapNotes: SoapNoteItem[] = [
  {
    id: 'soap1',
    patientId: 'p4',
    patientName: 'Roberto Jimenez Salazar',
    subjective: 'Paciente masculino de 45 anos que acude a revision de lesion en dorso de mano derecha. Refiere que la lesion ha crecido en los ultimos 2 meses. Niega dolor, pero reporta prurito ocasional. No antecedentes de lesiones similares. Sin tratamiento previo.',
    objective: 'A la exploracion fisica: lesion papulosa de 6mm de diametro en dorso de mano derecha, bordes bien definidos, color cafe oscuro, superficie ligeramente verrugosa. No signos de sangrado. Piel circundante sin alteraciones. Resto de la exploracion sin hallazgos patologicos.',
    assessment: 'Lesion pigmentada en dorso de mano derecha, probable nevo melanocitico compuesto. No se observan signos clinicos de malignidad (criterios ABCDE dentro de parametros normales). Se sugiere biopsia excisional para confirmacion histopatologica.',
    plan: '1. Biopsia excisional de lesion en dorso de mano derecha programada para proxima sesion.\n2. Estudio histopatologico con inmunohistoquimica si es necesario.\n3. Seguimiento en 15 dias post-biopsia para revision de resultados y cura.\n4. Indicar al paciente signos de alarma (cambio de color, tamano, sangrado).',
    status: 'approved',
    createdAt: '2026-05-30T10:00:00Z',
    aiGenerated: true,
  },
  {
    id: 'soap2',
    patientId: 'p1',
    patientName: 'Maria Garcia Lopez',
    subjective: 'Paciente femenina de 32 anos con dermatitis atopica en flexuras de codos desde hace 3 semanas. Refiere prurito intenso que interrumpe su sueno. Ha usado cremas hidratantes sin mejoria. Antecedente de dermatitis en la infancia.',
    objective: 'Pendiente exploracion fisica.',
    assessment: 'Dermatitis atopica en brote agudo. Diagnosticos diferenciales: dermatitis de contacto, eczema numular.',
    plan: '1. Emoliente de alta hidratacion post-bano.\n2. Corticoide topico de potencia moderada en zonas afectadas por 2 semanas.\n3. Antihistaminico oral para control de prurito nocturno.\n4. Control en 15 dias.',
    status: 'draft',
    createdAt: '2026-05-30T14:00:00Z',
    aiGenerated: true,
  },
]

const defaultRecentEvents: SinapEvent[] = [
  { id: 'evt1', eventType: 'cita_agendada', sourceAgent: 'desk', targetAgent: 'flow', payload: 'Maria Garcia Lopez - 09:00', createdAt: '2026-05-30T09:05:00Z' },
  { id: 'evt2', eventType: 'factura_generada', sourceAgent: 'bill', targetAgent: 'desk', payload: '$1,500 MXN - Roberto Jimenez', createdAt: '2026-05-30T09:12:00Z' },
  { id: 'evt3', eventType: 'soap_borrador_listo', sourceAgent: 'flow', targetAgent: 'os', payload: 'Roberto Jimenez Salazar', createdAt: '2026-05-30T09:25:00Z' },
  { id: 'evt4', eventType: 'cita_completada', sourceAgent: 'flow', targetAgent: 'bill', payload: 'Roberto Jimenez Salazar - 10:00', createdAt: '2026-05-30T10:45:00Z' },
  { id: 'evt5', eventType: 'paciente_nuevo', sourceAgent: 'desk', targetAgent: 'grow', payload: 'Fernando Diaz Vega', createdAt: '2026-05-30T08:30:00Z' },
]

export const useSinapStore = create<SinapStore>((set) => ({
  activeModule: 'os',
  setActiveModule: (module) => set({ activeModule: module }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  clinicMode: 'clinic',
  setClinicMode: (mode) => set({ clinicMode: mode }),
  clinicName: 'Clinica San Angel',
  setClinicName: (name) => set({ clinicName: name }),
  plan: 'pro',
  featureFlags: defaultFeatureFlags,
  setFeatureFlag: (id, state) =>
    set((s) => ({
      featureFlags: s.featureFlags.map((f) => (f.id === id ? { ...f, state } : f)),
    })),
  // Auth
  isLoggedIn: false,
  setIsLoggedIn: (v) => set({ isLoggedIn: v }),
  // Onboarding
  onboardingComplete: false,
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
  // Profile data
  doctorProfile: {
    name: 'Dr. Alejandro Ruiz',
    specialty: 'Dermatologia',
    license: '12345678',
    email: 'aruiz@clinicasanangel.mx',
    phone: '+52 55 1234 5678',
  },
  setDoctorProfile: (p) => set((s) => ({ doctorProfile: { ...s.doctorProfile, ...p } })),
  clinicProfile: {
    name: 'Clinica San Angel',
    rfc: 'CSA230515ABC',
    address: 'Av. Insurgentes Sur 1234, Col. San Angel',
    city: 'Ciudad de Mexico',
    state: 'CDMX',
    phone: '+52 55 1234 5678',
    email: 'contacto@clinicasanangel.mx',
  },
  setClinicProfile: (p) => set((s) => ({ clinicProfile: { ...s.clinicProfile, ...p } })),
  services: [
    { id: 'svc1', name: 'Consulta general', duration: 30, price: 1200, category: 'Consulta', isActive: true },
    { id: 'svc2', name: 'Revision dermatologica', duration: 45, price: 1500, category: 'Consulta', isActive: true },
    { id: 'svc3', name: 'Tratamiento laser', duration: 45, price: 2800, category: 'Procedimiento', isActive: true },
    { id: 'svc4', name: 'Crioterapia', duration: 30, price: 1800, category: 'Procedimiento', isActive: true },
    { id: 'svc5', name: 'Biopsia', duration: 60, price: 3500, category: 'Procedimiento', isActive: true },
    { id: 'svc6', name: 'Consulta estetica', duration: 30, price: 2000, category: 'Estetica', isActive: true },
  ],
  setServices: (s) => set({ services: s }),
  schedule: {
    workDays: '1,2,3,4,5',
    workStart: '09:00',
    workEnd: '18:00',
    slotMinutes: 30,
  },
  setSchedule: (s) => set((prev) => ({ schedule: { ...prev.schedule, ...s } })),
  // Event Bus
  recentEvents: defaultRecentEvents,
  addRecentEvent: (event) => set((s) => ({ recentEvents: [event, ...s.recentEvents].slice(0, 50) })),
  // SOAP Notes
  soapNotes: defaultSoapNotes,
  addSoapNote: (note) => set((s) => ({ soapNotes: [note, ...s.soapNotes] })),
  updateSoapNote: (id, updates) => set((s) => ({
    soapNotes: s.soapNotes.map((n) => n.id === id ? { ...n, ...updates } : n),
  })),
}))
