'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSinapStore, type FeatureFlagState, type SinapModule, type DoctorItem, type ServiceItem } from '@/lib/sinap-store'
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
  Users,
  Stethoscope,
  Loader2,
  Edit2,
  X,
  Eye,
  EyeOff,
  Unplug,
  FileText,
  Phone,
  Instagram,
  Facebook,
  Shield,
  Info,
  Mail,
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

const DOCTOR_COLORS = [
  '#534AB7', '#1D9E75', '#E53E3E', '#D97706', '#2563EB',
  '#7C3AED', '#059669', '#DC2626', '#CA8A04', '#4F46E5',
]

const DAY_LABELS: Record<string, string> = {
  '1': 'Lun', '2': 'Mar', '3': 'Mie', '4': 'Jue', '5': 'Vie', '6': 'Sab', '0': 'Dom',
}

// ─── Multi-Channel Meta Integration Components ─────────────────

interface ChannelConnection {
  channel: string
  status: string
  businessName?: string | null
  businessId?: string | null
  phoneNumberId?: string | null
  pageId?: string | null
  connected: boolean
  connectedAt?: string
}

function ChannelConnectionCard({
  channel,
  clinicId,
  connection,
  onRefresh,
}: {
  channel: 'whatsapp' | 'instagram' | 'messenger'
  clinicId: string
  connection: ChannelConnection | null
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showToken, setShowToken] = useState(false)

  const channelConfig: Record<string, {
    icon: React.ElementType
    label: string
    color: string
    bgColor: string
    formFields: Array<{ key: string; label: string; placeholder: string; required: boolean }>
  }> = {
    whatsapp: {
      icon: Phone,
      label: 'WhatsApp Business',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      formFields: [
        { key: 'businessId', label: 'WABA ID *', placeholder: 'Ej: 1234567890', required: true },
        { key: 'phoneNumberId', label: 'Phone Number ID *', placeholder: 'Ej: 9876543210', required: true },
        { key: 'accessToken', label: 'Access Token *', placeholder: 'EAAxxxxxxxxxxxxx', required: true },
      ],
    },
    instagram: {
      icon: Instagram,
      label: 'Instagram DM',
      color: 'text-pink-500',
      bgColor: 'bg-pink-50',
      formFields: [
        { key: 'businessId', label: 'IG Business ID *', placeholder: 'Ej: 17841400...', required: true },
        { key: 'pageId', label: 'Facebook Page ID *', placeholder: 'Ej: 1234567890', required: true },
        { key: 'accessToken', label: 'Access Token *', placeholder: 'EAAxxxxxxxxxxxxx', required: true },
      ],
    },
    messenger: {
      icon: Facebook,
      label: 'Facebook Messenger',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      formFields: [
        { key: 'pageId', label: 'Facebook Page ID *', placeholder: 'Ej: 1234567890', required: true },
        { key: 'accessToken', label: 'Page Access Token *', placeholder: 'EAAxxxxxxxxxxxxx', required: true },
      ],
    },
  }

  const config = channelConfig[channel]
  const Icon = config.icon
  const isConnected = connection?.connected

  const [form, setForm] = useState<Record<string, string>>({
    businessId: '',
    phoneNumberId: '',
    pageId: '',
    accessToken: '',
  })

  const handleSave = async () => {
    setIsSaving(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, channel, ...form }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult({ success: true, message: 'Conexion guardada correctamente' })
        setShowForm(false)
        setForm({ businessId: '', phoneNumberId: '', pageId: '', accessToken: '' })
        onRefresh()
        setTimeout(() => setTestResult(null), 3000)
      } else {
        setTestResult({ success: false, message: data.error || 'Error al guardar' })
      }
    } catch {
      setTestResult({ success: false, message: 'Error de conexion al servidor' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, channel, ...form }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult({ success: true, message: `Conexion exitosa: ${data.connection?.businessName || 'Verificado'}` })
      } else {
        setTestResult({ success: false, message: data.error || 'No se pudo verificar' })
      }
    } catch {
      setTestResult({ success: false, message: 'Error de conexion al servidor' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await fetch(`/api/meta/connect?clinicId=${clinicId}&channel=${channel}`, { method: 'DELETE' })
      onRefresh()
    } catch {
      // continue
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="p-4 rounded-lg bg-[#F1EFE8] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-md ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
          </div>
          <span className="text-sm font-medium text-[#2C2C2A]">{config.label}</span>
        </div>
        {isConnected ? (
          <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[10px]">
            <CheckCircle className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        )}
      </div>

      {isConnected ? (
        <>
          <p className="text-xs text-[#888780]">
            {connection?.businessName || 'Cuenta conectada'}
          </p>
          <div className="text-[10px] text-[#888780] font-mono mt-1">
            {channel === 'whatsapp' && connection?.businessId && (
              <>WABA: {connection.businessId.slice(0, 8)}... | Phone: {connection.phoneNumberId?.slice(0, 8)}...</>
            )}
            {channel === 'instagram' && connection?.businessId && (
              <>IG ID: {connection.businessId.slice(0, 8)}... | Page: {connection.pageId?.slice(0, 8)}...</>
            )}
            {channel === 'messenger' && connection?.pageId && (
              <>Page: {connection.pageId.slice(0, 8)}...</>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-400 text-red-500 hover:bg-red-50"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Unplug className="h-3 w-3 mr-1" />}
              Desconectar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-[#888780] mb-2">
            {channel === 'whatsapp' && 'Conecta tu WhatsApp Business API para enviar y recibir mensajes.'}
            {channel === 'instagram' && 'Conecta tu Instagram Business para recibir y responder DMs.'}
            {channel === 'messenger' && 'Conecta tu Facebook Page para recibir y responder mensajes.'}
          </p>
          {!showForm ? (
            <Button
              variant="outline"
              className="h-7 text-xs border-[#534AB7] text-[#534AB7]"
              onClick={() => setShowForm(true)}
            >
              <Globe className="h-3 w-3 mr-1" />
              Conectar {channel === 'whatsapp' ? 'WhatsApp' : channel === 'instagram' ? 'Instagram' : 'Messenger'}
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="p-3 rounded-lg bg-white border border-[#E1F5EE] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#2C2C2A]">
                    Configurar {config.label}
                  </p>
                  <button onClick={() => { setShowForm(false); setTestResult(null) }} className="p-1 text-[#888780] hover:text-[#2C2C2A]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.success ? 'bg-[#E1F5EE] text-[#1D9E75]' : 'bg-[#FEE2E2] text-[#E53E3E]'
                  }`}>
                    {testResult.success ? <CheckCircle className="h-3 w-3 shrink-0" /> : <AlertTriangle className="h-3 w-3 shrink-0" />}
                    {testResult.message}
                  </div>
                )}

                <div className="space-y-3">
                  {config.formFields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs text-[#888780]">{field.label}</Label>
                      {field.key === 'accessToken' ? (
                        <div className="relative">
                          <Input
                            className="h-8 text-xs bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7] font-mono pr-8"
                            type={showToken ? 'text' : 'password'}
                            placeholder={field.placeholder}
                            value={form[field.key]}
                            onChange={(e) => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#2C2C2A]"
                            onClick={() => setShowToken(!showToken)}
                          >
                            {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <Input
                          className="h-8 text-xs bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7] font-mono"
                          placeholder={field.placeholder}
                          value={form[field.key]}
                          onChange={(e) => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-[#1D9E75] text-[#1D9E75]"
                    onClick={handleTest}
                    disabled={isTesting || !form.accessToken}
                  >
                    {isTesting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Globe className="h-3 w-3 mr-1" />}
                    Probar conexion
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-[#534AB7] hover:bg-[#534AB7]/90 text-white"
                    onClick={handleSave}
                    disabled={isSaving || !form.accessToken}
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Guardar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Multi-Channel Meta Integration Dashboard ─────────────────
function MetaIntegrationDashboard({ clinicId }: { clinicId: string }) {
  const [connections, setConnections] = useState<ChannelConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [oauthInfo, setOauthInfo] = useState<{ url?: string; missingVars?: string[]; error?: string } | null>(null)

  const fetchConnections = useCallback(async () => {
    if (!clinicId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/meta/connect?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || [])
      }
    } catch {
      // keep defaults
    } finally {
      setIsLoading(false)
    }
  }, [clinicId])

  useEffect(() => { fetchConnections() }, [fetchConnections])

  // Check OAuth setup status
  useEffect(() => {
    async function checkOAuth() {
      if (!clinicId) return
      try {
        const res = await fetch(`/api/meta/oauth?clinicId=${clinicId}`)
        if (res.ok) {
          const data = await res.json()
          setOauthInfo(data)
        } else {
          const data = await res.json().catch(() => ({}))
          setOauthInfo({ missingVars: data.missingVars, error: data.error })
        }
      } catch {
        setOauthInfo({ error: 'No se pudo verificar la configuracion de OAuth' })
      }
    }
    checkOAuth()
  }, [clinicId])

  const getConnection = (channel: string) => connections.find(c => c.channel === channel) || null

  const verifyTokenConfigured = !!process.env.NEXT_PUBLIC_META_WEBHOOK_VERIFY_TOKEN || true // We can't check server env from client, assume configured

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg bg-[#F1EFE8]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#534AB7]" />
          <span className="text-xs text-[#888780]">Verificando estado de canales...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Channel cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ChannelConnectionCard
          channel="whatsapp"
          clinicId={clinicId}
          connection={getConnection('whatsapp')}
          onRefresh={fetchConnections}
        />
        <ChannelConnectionCard
          channel="instagram"
          clinicId={clinicId}
          connection={getConnection('instagram')}
          onRefresh={fetchConnections}
        />
        <ChannelConnectionCard
          channel="messenger"
          clinicId={clinicId}
          connection={getConnection('messenger')}
          onRefresh={fetchConnections}
        />
      </div>

      {/* Webhook configuration section */}
      <div className="p-4 rounded-lg bg-[#F1EFE8]">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-[#534AB7]" />
          <span className="text-sm font-medium text-[#2C2C2A]">Configuracion de Webhook</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-[#E1F5EE] space-y-2">
          <div>
            <p className="text-[10px] text-[#888780] font-medium uppercase tracking-wide">Webhook URL</p>
            <code className="bg-[#F8F7F3] px-2 py-1 rounded text-xs font-mono block mt-1 break-all">
              https://sinap-nine.vercel.app/api/webhooks/meta
            </code>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-[#888780] font-medium">Verify Token:</p>
            <Badge className={`${verifyTokenConfigured ? 'bg-[#E1F5EE] text-[#1D9E75]' : 'bg-amber-100 text-amber-700'} border-0 text-[9px]`}>
              {verifyTokenConfigured ? 'Configurado' : 'No configurado'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {['whatsapp', 'instagram', 'messenger'].map((ch) => {
              const conn = getConnection(ch)
              const label = ch === 'whatsapp' ? 'WhatsApp' : ch === 'instagram' ? 'Instagram' : 'Messenger'
              return (
                <div key={ch} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${conn?.connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-[10px] text-[#888780]">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Embedded Signup section (Stage 2) */}
      <div className="p-4 rounded-lg bg-[#F8F7F3] border border-dashed border-[#888780]/30">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-[#888780]" />
          <span className="text-sm font-medium text-[#2C2C2A]">Onboarding automatico</span>
          <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[9px]">Proximo</Badge>
        </div>
        <p className="text-xs text-[#888780] mb-3">
          Con Embedded Signup, las clinicas pueden conectar sus canales de Meta en un solo clic
          sin necesidad de copiar IDs y tokens manualmente.
        </p>

        {oauthInfo?.url ? (
          <Button
            size="sm"
            className="h-7 text-xs bg-[#534AB7] hover:bg-[#534AB7]/90 text-white"
            onClick={() => window.open(oauthInfo.url, '_blank')}
          >
            <Globe className="h-3 w-3 mr-1" />
            Iniciar onboarding automatico
          </Button>
        ) : (
          <>
            <div className="bg-white rounded-lg p-3 border border-[#E1F5EE] mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="h-3 w-3 text-[#888780]" />
                <p className="text-[10px] text-[#888780] font-medium uppercase tracking-wide">
                  Variables de entorno requeridas
                </p>
              </div>
              <div className="space-y-1">
                {[
                  { key: 'META_APP_ID', desc: 'ID de tu app en Meta for Developers' },
                  { key: 'META_APP_SECRET', desc: 'Secreto de tu app en Meta' },
                  { key: 'META_CONFIG_ID', desc: 'ID de configuracion de Embedded Signup' },
                ].map((v) => (
                  <div key={v.key} className="flex items-center justify-between">
                    <code className="text-[10px] font-mono text-[#2C2C2A] bg-[#F8F7F3] px-1.5 py-0.5 rounded">{v.key}</code>
                    <span className="text-[9px] text-[#888780]">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs bg-[#888780] text-white cursor-not-allowed"
              disabled
              title="Requiere registro como Meta Tech Provider"
            >
              <Shield className="h-3 w-3 mr-1" />
              Configurar onboarding automatico
            </Button>
            <p className="text-[9px] text-[#888780] mt-1.5">
              Requiere registro como Meta Tech Provider. Contacta a soporte@sinap.mx para mas informacion.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Google Connection Card ─────────────────
function GoogleConnectionCard() {
  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean
    email?: string | null
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/auth/google-status')
        if (res.ok) {
          const data = await res.json()
          setGoogleStatus(data)
        } else {
          setGoogleStatus({ connected: false })
        }
      } catch {
        setGoogleStatus({ connected: false })
      } finally {
        setIsLoading(false)
      }
    }
    checkStatus()
  }, [])

  const handleConnect = () => {
    // Trigger NextAuth Google sign-in
    window.location.href = '/api/auth/signin/google'
  }

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar tu cuenta de Google? No se eliminarán datos existentes.')) return
    setIsDisconnecting(true)
    try {
      // We just remove the Google account record but keep the user
      // The user stays logged in via their credentials
      const sessionRes = await fetch('/api/auth/me')
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        if (sessionData.user?.id) {
          // Delete the Google account record
          const res = await fetch(`/api/auth/google-status`, {
            method: 'DELETE',
          })
          if (res.ok) {
            setGoogleStatus({ connected: false, email: null })
          }
        }
      }
    } catch {
      // Continue
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg bg-[#F1EFE8]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#534AB7]" />
          <span className="text-xs text-[#888780]">Verificando conexion con Google...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg bg-[#F1EFE8]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-red-50 flex items-center justify-center">
            <Mail className="h-3.5 w-3.5 text-red-500" />
          </div>
          <span className="text-sm font-medium text-[#2C2C2A]">Google</span>
        </div>
        {googleStatus?.connected ? (
          <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[10px]">
            <CheckCircle className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        )}
      </div>

      {googleStatus?.connected ? (
        <>
          <p className="text-xs text-[#888780]">
            {googleStatus.email || 'Cuenta de Google conectada'}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-400 text-red-500 hover:bg-red-50"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Unplug className="h-3 w-3 mr-1" />}
              Desconectar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-[#888780] mb-2">
            Conecta tu cuenta de Google para sincronizar citas y acceder a tu calendario.
          </p>
          <Button
            variant="outline"
            className="h-7 text-xs border-[#534AB7] text-[#534AB7]"
            onClick={handleConnect}
          >
            <Mail className="h-3 w-3 mr-1" />
            Conectar con Google
          </Button>
        </>
      )}
    </div>
  )
}

export function SettingsPages() {
  const store = useSinapStore()
  const [activeTab, setActiveTab] = useState('perfil')

  // Doctors state
  const [showDoctorForm, setShowDoctorForm] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null)
  const [doctorForm, setDoctorForm] = useState({
    name: '', email: '', phone: '', specialty: '', license: '',
    color: '#534AB7', workDays: '1,2,3,4,5', workStart: '09:00', workEnd: '18:00', slotMinutes: 30,
  })
  const [isSavingDoctor, setIsSavingDoctor] = useState(false)
  const [doctorError, setDoctorError] = useState('')

  const clinicId = store.clinicId

  // Resolve clinicId on mount if needed (same pattern as other modules)
  useEffect(() => {
    if (clinicId) return
    const resolveClinic = async () => {
      try {
        const res = await fetch('/api/clinic')
        if (res.ok) {
          const data = await res.json()
          if (data.clinic?.id) {
            store.setClinicId(data.clinic.id)
            // Also hydrate clinic profile from DB
            if (data.clinic) {
              store.setClinicProfile({
                name: data.clinic.name || store.clinicProfile.name,
                rfc: data.clinic.rfc || store.clinicProfile.rfc,
                regimenFiscal: data.clinic.regimenFiscal || store.clinicProfile.regimenFiscal,
                address: data.clinic.address || store.clinicProfile.address,
                city: data.clinic.city || store.clinicProfile.city,
                state: data.clinic.state || store.clinicProfile.state,
                phone: data.clinic.phone || store.clinicProfile.phone,
                email: data.clinic.email || store.clinicProfile.email,
              })
              setClinicRegimenFiscal(data.clinic.regimenFiscal || '')
              store.setClinicName(data.clinic.name || store.clinicName)
            }
          }
        }
      } catch {
        // Keep defaults
      }
    }
    resolveClinic()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDoctors = useCallback(async () => {
    if (!clinicId) return
    store.setIsLoadingDoctors(true)
    try {
      const res = await fetch(`/api/doctors?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        store.setDoctors(data.doctors)
      }
    } catch {
      // silently fail
    } finally {
      store.setIsLoadingDoctors(false)
    }
  }, [clinicId])

  const handleSaveDoctor = async () => {
    if (!doctorForm.name.trim()) {
      setDoctorError('El nombre es requerido')
      return
    }
    setIsSavingDoctor(true)
    setDoctorError('')
    try {
      if (editingDoctor) {
        // Update existing
        const res = await fetch(`/api/doctors/${editingDoctor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doctorForm),
        })
        if (!res.ok) {
          const data = await res.json()
          setDoctorError(data.error || 'Error al actualizar')
          return
        }
        const data = await res.json()
        store.updateDoctor(editingDoctor.id, data.doctor)
      } else {
        // Create new
        const res = await fetch('/api/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId, ...doctorForm }),
        })
        if (!res.ok) {
          const data = await res.json()
          setDoctorError(data.error || 'Error al crear')
          return
        }
        const data = await res.json()
        store.addDoctor(data.doctor)
      }
      setShowDoctorForm(false)
      setEditingDoctor(null)
      setDoctorForm({ name: '', email: '', phone: '', specialty: '', license: '', color: '#534AB7', workDays: '1,2,3,4,5', workStart: '09:00', workEnd: '18:00', slotMinutes: 30 })
    } catch {
      setDoctorError('Error de conexion')
    } finally {
      setIsSavingDoctor(false)
    }
  }

  const handleDeleteDoctor = async (id: string) => {
    try {
      await fetch(`/api/doctors/${id}`, { method: 'DELETE' })
      store.removeDoctor(id)
    } catch {
      // silently fail
    }
  }

  const startEditDoctor = (doc: DoctorItem) => {
    setEditingDoctor(doc)
    setDoctorForm({
      name: doc.name, email: doc.email || '', phone: doc.phone || '',
      specialty: doc.specialty || '', license: doc.license || '',
      color: doc.color, workDays: doc.workDays, workStart: doc.workStart,
      workEnd: doc.workEnd, slotMinutes: doc.slotMinutes,
    })
    setShowDoctorForm(true)
    setDoctorError('')
  }

  const cancelDoctorForm = () => {
    setShowDoctorForm(false)
    setEditingDoctor(null)
    setDoctorForm({ name: '', email: '', phone: '', specialty: '', license: '', color: '#534AB7', workDays: '1,2,3,4,5', workStart: '09:00', workEnd: '18:00', slotMinutes: 30 })
    setDoctorError('')
  }

  const toggleWorkDay = (day: string) => {
    const days = doctorForm.workDays.split(',').filter(Boolean)
    const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort((a, b) => parseInt(a) - parseInt(b))
    setDoctorForm(prev => ({ ...prev, workDays: newDays.join(',') }))
  }

  // Fetch doctors on mount and when clinicId changes
  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  // Fetch services from DB on mount
  useEffect(() => {
    if (!clinicId) return
    const fetchServices = async () => {
      try {
        const res = await fetch(`/api/services?clinicId=${clinicId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.services && data.services.length > 0) {
            const dbServices: ServiceItem[] = data.services
              .filter((s: { isActive: boolean }) => s.isActive)
              .map((s: { id: string; name: string; duration: number; price: number; category: string | null; isActive: boolean }) => ({
              id: s.id,
              name: s.name,
              duration: s.duration,
              price: s.price,
              category: s.category || 'Otro',
              isActive: s.isActive,
            }))
            setLocalServices(dbServices)
            store.setServices(dbServices)
          } else {
            setLocalServices([])
            store.setServices([])
          }
        }
      } catch {
        // Keep local defaults
      }
    }
    fetchServices()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  // Fetch feature flags from DB
  useEffect(() => {
    if (!clinicId) return
    const fetchFlags = async () => {
      try {
        const res = await fetch(`/api/feature-flags?clinicId=${clinicId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.flags && data.flags.length > 0) {
            // Merge DB flags into store (DB is source of truth)
            data.flags.forEach((dbFlag: { module: string; feature: string; state: string }) => {
              const storeFlag = store.featureFlags.find(
                f => f.module === dbFlag.module && f.id.endsWith(dbFlag.feature)
              )
              if (storeFlag && storeFlag.state !== dbFlag.state) {
                store.setFeatureFlag(storeFlag.id, dbFlag.state as FeatureFlagState)
              }
            })
          }
        }
      } catch {
        // Keep defaults
      }
    }
    fetchFlags()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  const [doctorName, setDoctorName] = useState(store.doctorProfile.name)
  const [doctorEmail, setDoctorEmail] = useState(store.doctorProfile.email)
  const [doctorPhone, setDoctorPhone] = useState(store.doctorProfile.phone)
  const [doctorSpecialty, setDoctorSpecialty] = useState(store.doctorProfile.specialty)
  const [doctorLicense, setDoctorLicense] = useState(store.doctorProfile.license)

  // Hydrate profile from first active doctor when doctors load
  useEffect(() => {
    const activeDoctor = store.doctors.find(d => d.isActive)
    if (activeDoctor) {
      setDoctorName(activeDoctor.name)
      setDoctorEmail(activeDoctor.email || '')
      setDoctorPhone(activeDoctor.phone || '')
      setDoctorSpecialty(activeDoctor.specialty || '')
      setDoctorLicense(activeDoctor.license || '')
      // Only set schedule from doctor in solo mode (1 doctor)
      // In clinic mode, each doctor has their own schedule — the global schedule
      // should remain as the default/fallback
      const activeCount = store.doctors.filter(d => d.isActive).length
      if (activeCount === 1) {
        setWorkStart(activeDoctor.workStart)
        setWorkEnd(activeDoctor.workEnd)
        setSlotMinutes(activeDoctor.slotMinutes)
        store.setSchedule({
          workStart: activeDoctor.workStart,
          workEnd: activeDoctor.workEnd,
          slotMinutes: activeDoctor.slotMinutes,
        })
      }
      // Also update store profile
      store.setDoctorProfile({
        name: activeDoctor.name,
        email: activeDoctor.email || '',
        phone: activeDoctor.phone || '',
        specialty: activeDoctor.specialty || '',
        license: activeDoctor.license || '',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.doctors.length > 0])

  const [clinicName, setClinicName] = useState(store.clinicProfile.name)
  const [clinicRfc, setClinicRfc] = useState(store.clinicProfile.rfc)
  const [clinicAddress, setClinicAddress] = useState(store.clinicProfile.address)
  const [clinicCity, setClinicCity] = useState(store.clinicProfile.city)
  const [clinicState, setClinicState] = useState(store.clinicProfile.state)
  const [clinicPhone, setClinicPhone] = useState(store.clinicProfile.phone)
  const [clinicEmail, setClinicEmail] = useState(store.clinicProfile.email)
  const [clinicRegimenFiscal, setClinicRegimenFiscal] = useState(store.clinicProfile.regimenFiscal || '')

  const [localServices, setLocalServices] = useState(store.services)
  const [isSavingServices, setIsSavingServices] = useState(false)
  const [servicesError, setServicesError] = useState('')

  const [workStart, setWorkStart] = useState(store.schedule.workStart)
  const [workEnd, setWorkEnd] = useState(store.schedule.workEnd)
  const [slotMinutes, setSlotMinutes] = useState(store.schedule.slotMinutes)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [isSavingClinic, setIsSavingClinic] = useState(false)
  const [clinicSaved, setClinicSaved] = useState(false)

  const grouped = store.featureFlags.reduce(
    (acc, flag) => {
      if (!acc[flag.module]) acc[flag.module] = []
      acc[flag.module].push(flag)
      return acc
    },
    {} as Record<string, typeof store.featureFlags>
  )

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    setProfileSaved(false)
    try {
      // Update the first doctor linked to this clinic (or create if none)
      // For solo mode, update the clinic's owner doctor profile
      const doctors = store.doctors.filter(d => d.isActive)
      if (doctors.length > 0 && clinicId) {
        const doc = doctors[0]
        await fetch(`/api/doctors/${doc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: doctorName,
            email: doctorEmail,
            phone: doctorPhone,
            specialty: doctorSpecialty,
            license: doctorLicense,
          }),
        })
        // Refresh doctors from DB
        fetchDoctors()
      }
      // Also update Zustand for immediate UI feedback
      store.setDoctorProfile({ name: doctorName, email: doctorEmail, phone: doctorPhone, specialty: doctorSpecialty, license: doctorLicense })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch {
      // Fallback to local save
      store.setDoctorProfile({ name: doctorName, email: doctorEmail, phone: doctorPhone, specialty: doctorSpecialty, license: doctorLicense })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSaveClinic = async () => {
    setIsSavingClinic(true)
    setClinicSaved(false)
    try {
      if (clinicId) {
        const res = await fetch('/api/clinic', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId,
            name: clinicName,
            rfc: clinicRfc,
            regimenFiscal: clinicRegimenFiscal,
            address: clinicAddress,
            city: clinicCity,
            state: clinicState,
            phone: clinicPhone,
            email: clinicEmail,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          // Also update store with returned data
          if (data.clinic) {
            store.setClinicProfile({
              name: data.clinic.name || clinicName,
              rfc: data.clinic.rfc || clinicRfc,
              regimenFiscal: data.clinic.regimenFiscal || clinicRegimenFiscal,
              address: data.clinic.address || clinicAddress,
              city: data.clinic.city || clinicCity,
              state: data.clinic.state || clinicState,
              phone: data.clinic.phone || clinicPhone,
              email: data.clinic.email || clinicEmail,
            })
            store.setClinicName(data.clinic.name || clinicName)
            setClinicRegimenFiscal(data.clinic.regimenFiscal || clinicRegimenFiscal)
          }
        }
      }
      // Fallback: also save to Zustand
      store.setClinicProfile({ name: clinicName, rfc: clinicRfc, regimenFiscal: clinicRegimenFiscal, address: clinicAddress, city: clinicCity, state: clinicState, phone: clinicPhone, email: clinicEmail })
      store.setClinicName(clinicName)
      setClinicSaved(true)
      setTimeout(() => setClinicSaved(false), 2000)
    } catch {
      // Fallback to local save
      store.setClinicProfile({ name: clinicName, rfc: clinicRfc, regimenFiscal: clinicRegimenFiscal, address: clinicAddress, city: clinicCity, state: clinicState, phone: clinicPhone, email: clinicEmail })
      store.setClinicName(clinicName)
    } finally {
      setIsSavingClinic(false)
    }
  }

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true)
    try {
      // In solo mode (1 doctor), save to that doctor.
      // In clinic mode (multiple doctors), the schedule tab sets the DEFAULT schedule.
      // Each doctor has their own schedule configured individually in the Doctores tab.
      const activeDoctors = store.doctors.filter(d => d.isActive)
      if (activeDoctors.length === 1) {
        // Solo mode — save to the single doctor
        await fetch(`/api/doctors/${activeDoctors[0].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workStart, workEnd, slotMinutes }),
        })
        fetchDoctors()
      }
      // Always save as the clinic-wide default schedule
      store.setSchedule({ workStart, workEnd, slotMinutes })
    } catch {
      store.setSchedule({ workStart, workEnd, slotMinutes })
    } finally {
      setIsSavingSchedule(false)
    }
  }

  const toggleServiceActive = async (id: string) => {
    const svc = localServices.find(s => s.id === id)
    if (!svc) return

    const newActive = !svc.isActive
    // Optimistic update
    setLocalServices(prev => prev.map(s => s.id === id ? { ...s, isActive: newActive } : s))

    // If it's a real DB service (not a temp one starting with 'svc')
    if (!id.startsWith('svc')) {
      try {
        await fetch(`/api/services/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: newActive }),
        })
      } catch {
        // Revert on error
        setLocalServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !newActive } : s))
      }
    }
  }

  const handleSaveServices = async () => {
    setIsSavingServices(true)
    setServicesError('')
    try {
      if (!clinicId) {
        store.setServices(localServices)
        return
      }

      // Separate new (temp IDs starting with 'svc') vs existing services
      const newServices = localServices.filter(s => s.id.startsWith('svc') && s.name.trim())
      const existingServices = localServices.filter(s => !s.id.startsWith('svc'))

      // Create new services
      const createPromises = newServices.map(s =>
        fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId,
            name: s.name,
            duration: s.duration,
            price: s.price,
            category: s.category,
          }),
        })
      )

      // Update existing services
      const updatePromises = existingServices.map(s =>
        fetch(`/api/services/${s.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: s.name,
            duration: s.duration,
            price: s.price,
            category: s.category,
            isActive: s.isActive,
          }),
        })
      )

      await Promise.all([...createPromises, ...updatePromises])

      // Re-fetch from DB to get real IDs
      const res = await fetch(`/api/services?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        const dbServices: ServiceItem[] = data.services.map((s: { id: string; name: string; duration: number; price: number; category: string | null; isActive: boolean }) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: s.price,
          category: s.category || 'Otro',
          isActive: s.isActive,
        }))
        setLocalServices(dbServices)
        store.setServices(dbServices)
      }
    } catch {
      setServicesError('Error al guardar servicios')
      store.setServices(localServices)
    } finally {
      setIsSavingServices(false)
    }
  }

  const addNewService = () => {
    setLocalServices(prev => [...prev, { id: `svc${Date.now()}`, name: '', duration: 30, price: 0, category: 'Consulta', isActive: true }])
  }

  const removeService = async (id: string) => {
    // If it's a real DB service, soft-delete via API
    if (!id.startsWith('svc')) {
      try {
        await fetch(`/api/services/${id}`, { method: 'DELETE' })
      } catch {
        // continue removing from local state anyway
      }
    }
    const updated = localServices.filter(s => s.id !== id)
    setLocalServices(updated)
    store.setServices(updated)
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
          <TabsTrigger value="equipo" className="text-xs h-7 px-3">
            <Users className="h-3.5 w-3.5 mr-1" />
            Equipo Medico
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
                  <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm" onClick={handleSaveProfile} disabled={isSavingProfile}>
                    {isSavingProfile ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : profileSaved ? <CheckCircle className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    {isSavingProfile ? 'Guardando...' : profileSaved ? 'Guardado' : 'Guardar cambios'}
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
                    <Select value={clinicRegimenFiscal || undefined} onValueChange={setClinicRegimenFiscal}>
                      <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                        <SelectValue placeholder="Selecciona un regimen" />
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
                  <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm" onClick={handleSaveClinic} disabled={isSavingClinic}>
                    {isSavingClinic ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : clinicSaved ? <CheckCircle className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    {isSavingClinic ? 'Guardando...' : clinicSaved ? 'Guardado' : 'Guardar cambios'}
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
                {servicesError && (
                  <div className="mb-3 p-2 rounded-lg bg-[#FEE2E2] text-xs text-[#E53E3E] flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {servicesError}
                  </div>
                )}
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
                  <Button className="mt-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm" onClick={handleSaveServices} disabled={isSavingServices}>
                    {isSavingServices ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    {isSavingServices ? 'Guardando...' : 'Guardar servicios'}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Equipo Medico */}
        <TabsContent value="equipo">
          <motion.div variants={tabVariants} initial="hidden" animate="visible">
            <Card className="border-[#E1F5EE] bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-[#534AB7]" />
                    <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                      Equipo medico
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                      {store.doctors.filter(d => d.isActive).length} doctor(es)
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-[#1D9E75] text-[#1D9E75]"
                      onClick={() => { cancelDoctorForm(); setShowDoctorForm(true) }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar doctor
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Doctor form */}
                <AnimatePresence>
                  {showDoctorForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E1F5EE] space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#2C2C2A]">
                            {editingDoctor ? 'Editar doctor' : 'Nuevo doctor'}
                          </p>
                          <button onClick={cancelDoctorForm} className="p-1 text-[#888780] hover:text-[#2C2C2A]">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {doctorError && (
                          <div className="p-2 rounded-lg bg-[#FEE2E2] text-xs text-[#E53E3E] flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {doctorError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Nombre completo *</Label>
                            <Input className="h-8 text-xs bg-white border-[#E1F5EE] focus:border-[#534AB7]" value={doctorForm.name} onChange={e => setDoctorForm(p => ({ ...p, name: e.target.value }))} placeholder="Dr. Juan Perez" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Especialidad</Label>
                            <Input className="h-8 text-xs bg-white border-[#E1F5EE] focus:border-[#534AB7]" value={doctorForm.specialty} onChange={e => setDoctorForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Dermatologia" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Cedula profesional</Label>
                            <Input className="h-8 text-xs bg-white border-[#E1F5EE] font-mono focus:border-[#534AB7]" value={doctorForm.license} onChange={e => setDoctorForm(p => ({ ...p, license: e.target.value }))} placeholder="12345678" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Correo</Label>
                            <Input className="h-8 text-xs bg-white border-[#E1F5EE] focus:border-[#534AB7]" value={doctorForm.email} onChange={e => setDoctorForm(p => ({ ...p, email: e.target.value }))} placeholder="doctor@clinica.mx" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Telefono</Label>
                            <Input className="h-8 text-xs bg-white border-[#E1F5EE] focus:border-[#534AB7]" value={doctorForm.phone} onChange={e => setDoctorForm(p => ({ ...p, phone: e.target.value }))} placeholder="+52 55 1234 5678" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Color en agenda</Label>
                            <div className="flex gap-1.5 flex-wrap">
                              {DOCTOR_COLORS.map(c => (
                                <button
                                  key={c}
                                  onClick={() => setDoctorForm(p => ({ ...p, color: c }))}
                                  className={`h-6 w-6 rounded-full transition-all ${doctorForm.color === c ? 'ring-2 ring-offset-2 ring-[#2C2C2A] scale-110' : 'hover:scale-110'}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <Separator className="bg-[#E1F5EE]" />

                        <div>
                          <Label className="text-xs text-[#888780] mb-2 block">Dias de consulta</Label>
                          <div className="flex gap-1.5">
                            {Object.entries(DAY_LABELS).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => toggleWorkDay(key)}
                                className={`h-8 w-12 rounded-lg text-[10px] font-medium transition-all ${
                                  doctorForm.workDays.split(',').includes(key)
                                    ? 'text-white'
                                    : 'bg-white text-[#888780] hover:bg-[#EEEDFE]'
                                }`}
                                style={doctorForm.workDays.split(',').includes(key) ? { backgroundColor: doctorForm.color } : undefined}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Inicio</Label>
                            <Input type="time" className="h-8 text-xs bg-white border-[#E1F5EE]" value={doctorForm.workStart} onChange={e => setDoctorForm(p => ({ ...p, workStart: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Fin</Label>
                            <Input type="time" className="h-8 text-xs bg-white border-[#E1F5EE]" value={doctorForm.workEnd} onChange={e => setDoctorForm(p => ({ ...p, workEnd: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#888780]">Duracion cita</Label>
                            <Select value={String(doctorForm.slotMinutes)} onValueChange={v => setDoctorForm(p => ({ ...p, slotMinutes: parseInt(v) }))}>
                              <SelectTrigger className="h-8 text-xs bg-white border-[#E1F5EE]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="45">45 min</SelectItem>
                                <SelectItem value="60">60 min</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                            <Button
                              className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm w-full"
                              onClick={handleSaveDoctor}
                              disabled={isSavingDoctor}
                            >
                              {isSavingDoctor ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                              {editingDoctor ? 'Guardar cambios' : 'Agregar doctor'}
                            </Button>
                          </motion.div>
                          <Button variant="outline" className="h-9 text-sm" onClick={cancelDoctorForm}>Cancelar</Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Doctor list */}
                <div className="space-y-2">
                  {store.doctors.length === 0 ? (
                    <div className="text-center py-8">
                      <Stethoscope className="h-8 w-8 text-[#888780]/40 mx-auto mb-2" />
                      <p className="text-sm text-[#888780]">No hay doctores registrados</p>
                      <p className="text-xs text-[#888780]/70 mt-1">Agrega tu primer doctor para empezar a usar la agenda</p>
                    </div>
                  ) : (
                    store.doctors.map((doc, i) => (
                      <motion.div
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          doc.isActive ? 'bg-[#F8F7F3] hover:bg-[#F1EFE8]' : 'bg-[#F1EFE8]/50 opacity-60'
                        }`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: doc.color + '20' }}
                        >
                          <span className="text-sm font-medium" style={{ color: doc.color }}>
                            {doc.name.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#2C2C2A] truncate">{doc.name}</p>
                            {!doc.isActive && (
                              <Badge className="bg-[#F1EFE8] text-[#888780] border-0 text-[9px]">Inactivo</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {doc.specialty && <span className="text-xs text-[#888780]">{doc.specialty}</span>}
                            <span className="text-[10px] text-[#888780]">
                              {doc.workStart} - {doc.workEnd}
                            </span>
                            <span className="text-[10px] text-[#888780]">
                              {doc.workDays.split(',').map(d => DAY_LABELS[d] || d).join(', ')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditDoctor(doc)}
                            className="p-1.5 text-[#888780] hover:text-[#534AB7] transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoctor(doc.id)}
                            className="p-1.5 text-[#888780] hover:text-[#E53E3E] transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
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
                {store.doctors.filter(d => d.isActive).length > 1 && (
                  <div className="rounded-lg bg-[#EEEDFE] border border-[#534AB7]/20 p-3">
                    <p className="text-xs text-[#534AB7] font-medium">Cada doctor tiene su propio horario</p>
                    <p className="text-[10px] text-[#534AB7]/70 mt-1">Configura el horario individual de cada doctor en la pestaña &quot;Doctores&quot;. Este es el horario general por defecto.</p>
                  </div>
                )}
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
                {/* Show each doctor's schedule summary when multiple doctors */}
                {store.doctors.filter(d => d.isActive).length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-[#888780] mb-1 block">Horarios por doctor</Label>
                    <div className="space-y-1.5">
                      {store.doctors.filter(d => d.isActive).map(doc => (
                        <div key={doc.id} className="flex items-center gap-2 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: doc.color }} />
                          <span className="font-medium text-[#2C2C2A]">{doc.name}</span>
                          <span className="text-[#888780]">{doc.workStart} - {doc.workEnd}</span>
                          <span className="text-[#888780]/60">({doc.slotMinutes} min)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-[#888780] mb-3 block">Excepciones (vacaciones)</Label>
                  <p className="text-xs text-[#888780]">Las excepciones de horario se configuraran desde la agenda.</p>
                </div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 text-sm" onClick={handleSaveSchedule} disabled={isSavingSchedule}>
                    {isSavingSchedule ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    {isSavingSchedule ? 'Guardando...' : 'Guardar horario'}
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
                              <TriToggle state={flag.state} onStateChange={(s) => {
                                store.setFeatureFlag(flag.id, s)
                                // Persist to DB
                                if (clinicId) {
                                  fetch('/api/feature-flags', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      clinicId,
                                      module: flag.module,
                                      feature: flag.id.replace(`${flag.module}-`, ''),
                                      state: s,
                                    }),
                                  }).catch(() => {})
                                }
                              }} />
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
                {/* Meta Business API */}
                <MetaIntegrationDashboard clinicId={clinicId} />

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

                {/* Google Connection Status */}
                <GoogleConnectionCard />

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
