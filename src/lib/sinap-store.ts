import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type SinapModule = 'os' | 'agenda' | 'patients' | 'desk' | 'flow' | 'bill' | 'grow' | 'sight' | 'hub' | 'config'

export type FeatureFlagState = 'on' | 'assist' | 'off'

interface FeatureFlag {
  id: string
  module: SinapModule
  name: string
  description: string
  state: FeatureFlagState
}

interface DoctorProfile {
  id: string
  name: string
  specialty: string
  license: string
  email: string
  phone: string
}

export interface DoctorItem {
  id: string
  clinicId: string
  name: string
  email?: string | null
  phone?: string | null
  specialty?: string | null
  license?: string | null
  color: string
  isActive: boolean
  workDays: string
  workStart: string
  workEnd: string
  slotMinutes: number
}

interface ClinicProfile {
  name: string
  rfc: string
  regimenFiscal: string
  address: string
  city: string
  state: string
  phone: string
  email: string
}

export interface ServiceItem {
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

interface SinapStore {
  activeModule: SinapModule
  setActiveModule: (module: SinapModule) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  clinicMode: 'solo' | 'clinic'
  setClinicMode: (mode: 'solo' | 'clinic') => void
  clinicName: string
  setClinicName: (name: string) => void
  clinicId: string
  setClinicId: (id: string) => void
  clinicSlug: string
  setClinicSlug: (slug: string) => void
  plan: 'starter' | 'pro' | 'enterprise'
  setPlan: (plan: 'starter' | 'pro' | 'enterprise') => void
  featureFlags: FeatureFlag[]
  setFeatureFlag: (id: string, state: FeatureFlagState) => void
  // Auth
  isLoggedIn: boolean
  setIsLoggedIn: (v: boolean) => void
  // Onboarding
  onboardingComplete: boolean
  setOnboardingComplete: (v: boolean) => void
  // Demo mode
  isDemoMode: boolean
  setIsDemoMode: (v: boolean) => void
  // Profile data
  doctorProfile: DoctorProfile
  setDoctorProfile: (p: Partial<DoctorProfile>) => void
  clinicProfile: ClinicProfile
  setClinicProfile: (p: Partial<ClinicProfile>) => void
  services: ServiceItem[]
  setServices: (s: ServiceItem[]) => void
  schedule: ScheduleConfig
  setSchedule: (s: Partial<ScheduleConfig>) => void
  // Doctors (multi-doctor for clinic mode)
  doctors: DoctorItem[]
  setDoctors: (doctors: DoctorItem[]) => void
  addDoctor: (doctor: DoctorItem) => void
  updateDoctor: (id: string, updates: Partial<DoctorItem>) => void
  removeDoctor: (id: string) => void
  isLoadingDoctors: boolean
  setIsLoadingDoctors: (v: boolean) => void
  // Event Bus
  recentEvents: SinapEvent[]
  addRecentEvent: (event: SinapEvent) => void
  // Trial
  trialDaysRemaining: number
  setTrialDaysRemaining: (days: number) => void
  isTrialExpired: boolean
  setIsTrialExpired: (v: boolean) => void
  // Reset
  resetStore: () => void
  // Clear for real account login — removes demo data
  clearForRealLogin: () => void
}

const defaultFeatureFlags: FeatureFlag[] = [
  { id: 'desk-auto-reply', module: 'desk', name: 'Auto-respuesta', description: 'IA responde automaticamente a pacientes', state: 'assist' },
  { id: 'desk-appointment', module: 'desk', name: 'Agendamiento automatico', description: 'IA agenda citas desde conversaciones', state: 'assist' },
  { id: 'desk-reminders', module: 'desk', name: 'Recordatorios de cita', description: 'Envio automatico de recordatorio 24h antes de la cita por WhatsApp', state: 'on' },
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

// No default events — new accounts should start clean.
// Demo mode seeds its own events via /api/demo/seed.
const defaultRecentEvents: SinapEvent[] = []

// No default services — new accounts should start clean.
// Demo mode seeds its own services via /api/demo/seed.
const defaultServices: ServiceItem[] = []

export const useSinapStore = create<SinapStore>()(
  persist(
    (set) => ({
      activeModule: 'os',
      setActiveModule: (module) => set({ activeModule: module }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      clinicMode: 'clinic',
      setClinicMode: (mode) => set({ clinicMode: mode }),
      clinicName: '',
      setClinicName: (name) => set({ clinicName: name }),
      clinicId: '',
      setClinicId: (id) => set({ clinicId: id }),
      clinicSlug: '',
      setClinicSlug: (slug) => set({ clinicSlug: slug }),
      plan: 'enterprise',
      setPlan: (plan) => set({ plan }),
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
      // Demo mode
      isDemoMode: false,
      setIsDemoMode: (v) => set({ isDemoMode: v }),
      // Profile data
      doctorProfile: {
        id: '',
        name: '',
        specialty: '',
        license: '',
        email: '',
        phone: '',
      },
      setDoctorProfile: (p) => set((s) => ({ doctorProfile: { ...s.doctorProfile, ...p } })),
      clinicProfile: {
        name: '',
        rfc: '',
        regimenFiscal: '',
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
      },
      setClinicProfile: (p) => set((s) => ({ clinicProfile: { ...s.clinicProfile, ...p } })),
      services: defaultServices,
      setServices: (s) => set({ services: s }),
      schedule: {
        workDays: '1,2,3,4,5',
        workStart: '09:00',
        workEnd: '18:00',
        slotMinutes: 30,
      },
      setSchedule: (s) => set((prev) => ({ schedule: { ...prev.schedule, ...s } })),
      // Doctors
      doctors: [],
      setDoctors: (doctors) => set({ doctors }),
      addDoctor: (doctor) => set((s) => ({ doctors: [...s.doctors, doctor] })),
      updateDoctor: (id, updates) => set((s) => ({
        doctors: s.doctors.map((d) => d.id === id ? { ...d, ...updates } : d),
      })),
      removeDoctor: (id) => set((s) => ({ doctors: s.doctors.filter((d) => d.id !== id) })),
      isLoadingDoctors: false,
      setIsLoadingDoctors: (v) => set({ isLoadingDoctors: v }),
      // Trial
      trialDaysRemaining: 7,
      setTrialDaysRemaining: (days) => set({ trialDaysRemaining: days }),
      isTrialExpired: false,
      setIsTrialExpired: (v) => set({ isTrialExpired: v }),
      // Event Bus
      recentEvents: defaultRecentEvents,
      addRecentEvent: (event) => set((s) => ({ recentEvents: [event, ...s.recentEvents].slice(0, 50) })),
      // Reset — clears everything back to defaults (used for logout)
      resetStore: () => set({
        activeModule: 'os',
        sidebarCollapsed: false,
        onboardingComplete: false,
        isLoggedIn: false,
        isDemoMode: false,
        clinicId: '',
        clinicName: '',
        clinicSlug: '',
        clinicMode: 'clinic',
        plan: 'enterprise',
        trialDaysRemaining: 7,
        isTrialExpired: false,
        doctorProfile: {
          id: '',
          name: '',
          specialty: '',
          license: '',
          email: '',
          phone: '',
        },
        clinicProfile: {
          name: '',
          rfc: '',
          regimenFiscal: '',
          address: '',
          city: '',
          state: '',
          phone: '',
          email: '',
        },
        services: [],
        schedule: {
          workDays: '1,2,3,4,5',
          workStart: '09:00',
          workEnd: '18:00',
          slotMinutes: 30,
        },
        featureFlags: defaultFeatureFlags,
        doctors: [],
        recentEvents: [],
      }),
      // Clear for real account login — removes demo data but keeps structure
      clearForRealLogin: () => set({
        activeModule: 'os',
        sidebarCollapsed: false,
        isDemoMode: false,
        clinicId: '',
        clinicName: '',
        clinicSlug: '',
        clinicMode: 'clinic',
        plan: 'enterprise',
        trialDaysRemaining: 7,
        isTrialExpired: false,
        doctorProfile: {
          id: '',
          name: '',
          specialty: '',
          license: '',
          email: '',
          phone: '',
        },
        clinicProfile: {
          name: '',
          rfc: '',
          regimenFiscal: '',
          address: '',
          city: '',
          state: '',
          phone: '',
          email: '',
        },
        services: [],
        schedule: {
          workDays: '1,2,3,4,5',
          workStart: '09:00',
          workEnd: '18:00',
          slotMinutes: 30,
        },
        featureFlags: defaultFeatureFlags,
        doctors: [],
        recentEvents: [],
      }),
    }),
    {
      name: 'sinap-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields — volatile data like events/soap stays as defaults
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        isLoggedIn: state.isLoggedIn,
        isDemoMode: state.isDemoMode,
        clinicMode: state.clinicMode,
        clinicName: state.clinicName,
        clinicId: state.clinicId,
        clinicSlug: state.clinicSlug,
        plan: state.plan,
        featureFlags: state.featureFlags,
        doctorProfile: state.doctorProfile,
        clinicProfile: state.clinicProfile,
        services: state.services,
        schedule: state.schedule,
        activeModule: state.activeModule,
        doctors: state.doctors,
        trialDaysRemaining: state.trialDaysRemaining,
        isTrialExpired: state.isTrialExpired,
      }),
    }
  )
)
