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
}

const defaultFeatureFlags: FeatureFlag[] = [
  { id: 'desk-auto-reply', module: 'desk', name: 'Auto-respuesta', description: 'IA responde automáticamente a pacientes', state: 'assist' },
  { id: 'desk-appointment', module: 'desk', name: 'Agendamiento automático', description: 'IA agenda citas desde conversaciones', state: 'assist' },
  { id: 'flow-soap', module: 'flow', name: 'Notas SOAP', description: 'IA genera notas SOAP a partir de consulta', state: 'assist' },
  { id: 'flow-preconsulta', module: 'flow', name: 'Pre-consulta', description: 'IA recaba datos antes de la consulta', state: 'on' },
  { id: 'bill-auto-cfdi', module: 'bill', name: 'CFDI automático', description: 'IA genera facturas al terminar consulta', state: 'assist' },
  { id: 'bill-reminders', module: 'bill', name: 'Recordatorios de pago', description: 'IA envía recordatorios de facturas pendientes', state: 'off' },
  { id: 'grow-reactivation', module: 'grow', name: 'Reactivación', description: 'IA identifica y contacta pacientes inactivos', state: 'assist' },
  { id: 'grow-segments', module: 'grow', name: 'Segmentación', description: 'IA segmenta pacientes automáticamente', state: 'on' },
  { id: 'sight-alerts', module: 'sight', name: 'Alertas proactivas', description: 'IA detecta anomalías y genera alertas', state: 'on' },
  { id: 'sight-reports', module: 'sight', name: 'Reportes automáticos', description: 'IA genera reportes semanales', state: 'assist' },
  { id: 'hub-scheduling', module: 'hub', name: 'Optimización de agenda', description: 'IA optimiza agenda de múltiples doctores', state: 'off' },
  { id: 'hub-inventory', module: 'hub', name: 'Inventario inteligente', description: 'IA sugiere reabastecimiento de insumos', state: 'off' },
]

export const useSinapStore = create<SinapStore>((set) => ({
  activeModule: 'os',
  setActiveModule: (module) => set({ activeModule: module }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  clinicMode: 'clinic',
  setClinicMode: (mode) => set({ clinicMode: mode }),
  clinicName: 'Clínica San Ángel',
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
    specialty: 'Dermatología',
    license: '12345678',
    email: 'aruiz@clinicasanangel.mx',
    phone: '+52 55 1234 5678',
  },
  setDoctorProfile: (p) => set((s) => ({ doctorProfile: { ...s.doctorProfile, ...p } })),
  clinicProfile: {
    name: 'Clínica San Ángel',
    rfc: 'CSA230515ABC',
    address: 'Av. Insurgentes Sur 1234, Col. San Ángel',
    city: 'Ciudad de México',
    state: 'CDMX',
    phone: '+52 55 1234 5678',
    email: 'contacto@clinicasanangel.mx',
  },
  setClinicProfile: (p) => set((s) => ({ clinicProfile: { ...s.clinicProfile, ...p } })),
  services: [
    { id: 'svc1', name: 'Consulta general', duration: 30, price: 1200, category: 'Consulta', isActive: true },
    { id: 'svc2', name: 'Revisión dermatológica', duration: 45, price: 1500, category: 'Consulta', isActive: true },
    { id: 'svc3', name: 'Tratamiento láser', duration: 45, price: 2800, category: 'Procedimiento', isActive: true },
    { id: 'svc4', name: 'Crioterapia', duration: 30, price: 1800, category: 'Procedimiento', isActive: true },
    { id: 'svc5', name: 'Biopsia', duration: 60, price: 3500, category: 'Procedimiento', isActive: true },
    { id: 'svc6', name: 'Consulta estética', duration: 30, price: 2000, category: 'Estética', isActive: true },
  ],
  setServices: (s) => set({ services: s }),
  schedule: {
    workDays: '1,2,3,4,5',
    workStart: '09:00',
    workEnd: '18:00',
    slotMinutes: 30,
  },
  setSchedule: (s) => set((prev) => ({ schedule: { ...prev.schedule, ...s } })),
}))
