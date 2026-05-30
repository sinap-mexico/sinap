import { create } from 'zustand'

export type SinapModule = 'os' | 'desk' | 'flow' | 'bill' | 'grow' | 'sight' | 'hub' | 'config'

export type FeatureFlagState = 'on' | 'assist' | 'off'

interface FeatureFlag {
  id: string
  module: SinapModule
  name: string
  description: string
  state: FeatureFlagState
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
}))
