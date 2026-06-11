'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useSinapStore } from '@/lib/sinap-store'
import { eventBus } from '@/lib/event-bus'
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Instagram,
  Facebook,
  Clock,
  Tag,
  Heart,
  AlertTriangle,
  ChevronRight,
  Bot,
  Loader2,
  Calendar,
  FileText,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Local types (previously imported from mock-data)
interface ConversationMessage {
  id: string
  direction: 'inbound' | 'outbound'
  text: string
  time: string
  agent?: string
  isAI?: boolean
}

interface Conversation {
  id: string
  patientId: string
  patientName: string
  channel: 'whatsapp' | 'instagram' | 'facebook'
  lastMessage: string
  lastTime: string
  unread: number
  intent?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  messages: ConversationMessage[]
}

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'whatsapp':
      return <Phone className="h-3.5 w-3.5 text-green-600" />
    case 'instagram':
      return <Instagram className="h-3.5 w-3.5 text-pink-500" />
    case 'facebook':
      return <Facebook className="h-3.5 w-3.5 text-blue-600" />
    default:
      return <MessageSquare className="h-3.5 w-3.5" />
  }
}

function ChannelLabel({ channel }: { channel: string }) {
  const labels: Record<string, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
  }
  return <span className="text-[10px] text-[#888780]">{labels[channel] || channel}</span>
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    positive: { color: '#1D9E75', bg: '#E1F5EE', label: 'Positivo' },
    neutral: { color: '#888780', bg: '#F1EFE8', label: 'Neutral' },
    negative: { color: '#E53E3E', bg: '#FEE2E2', label: 'Negativo' },
  }
  const s = config[sentiment] || config.neutral
  return (
    <Badge
      className="text-[10px] border-0 font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </Badge>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="bg-[#534AB7] text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%]">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-white/70" />
          <div className="flex gap-1.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-white/60"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-white/60"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            />
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-white/60"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick reply suggestions based on conversation intent
function getQuickReplies(intent?: string): string[] {
  switch (intent) {
    case 'Cotizacion':
      return ['Agendar primera cita', 'Enviar precios', 'Horarios disponibles']
    case 'Reactivacion':
      return ['Ofrecer horario flexible', 'Promocion reactivacion', 'Agendar cita']
    case 'Confirmacion de cita':
    case 'Confirmacion':
      return ['Confirmar cita', 'Reagendar', 'Cancelar cita']
    case 'Agendamiento':
    case 'Agendamiento urgente':
      return ['Disponibilidad hoy', 'Disponibilidad esta semana', 'Primera consulta']
    default:
      return ['Agendar cita', 'Informacion de precios', 'Horarios disponibles']
  }
}

// Map API conversation to UI conversation
function mapApiConversation(apiConv: Record<string, unknown>): Conversation {
  const patient = apiConv.patient as Record<string, unknown> | null
  const messages = (apiConv.messages as Array<Record<string, unknown>>) || []
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null

  return {
    id: apiConv.id as string,
    patientId: (apiConv.patientId as string) || '',
    patientName: patient?.fullName as string || 'Desconocido',
    channel: (apiConv.channel as 'whatsapp' | 'instagram' | 'facebook') || 'whatsapp',
    lastMessage: lastMessage ? (lastMessage.content as string) : '',
    lastTime: lastMessage
      ? new Date(lastMessage.createdAt as string).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      : '',
    unread: messages.filter(m => m.direction === 'inbound').length > 0 ? 1 : 0,
    intent: (apiConv.intent as string) || undefined,
    sentiment: (apiConv.sentiment as 'positive' | 'neutral' | 'negative') || 'neutral',
    messages: messages.map((m) => ({
      id: m.id as string,
      direction: m.direction as 'inbound' | 'outbound',
      text: m.content as string,
      time: new Date(m.createdAt as string).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      agent: m.agentName as string | undefined,
      isAI: m.aiGenerated as boolean || false,
    })),
  }
}

export function DeskInbox() {
  const { clinicId, setClinicId, clinicSlug, isDemoMode } = useSinapStore()
  const [convList, setConvList] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [channelConnections, setChannelConnections] = useState<Record<string, boolean>>({
    whatsapp: false,
    instagram: false,
    messenger: false,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  // Check channel connection statuses
  useEffect(() => {
    async function checkConnections() {
      if (!clinicId) return
      try {
        const res = await fetch(`/api/meta/connect?clinicId=${clinicId}`)
        if (res.ok) {
          const data = await res.json()
          const connections = data.connections || []
          const connMap: Record<string, boolean> = {
            whatsapp: false,
            instagram: false,
            messenger: false,
          }
          connections.forEach((c: { channel: string; connected: boolean }) => {
            connMap[c.channel] = c.connected
          })
          setChannelConnections(connMap)
        }
      } catch {
        setChannelConnections({ whatsapp: false, instagram: false, messenger: false })
      }
    }
    checkConnections()
  }, [clinicId])

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    if (!clinicId) return
    // Only show loading spinner on the first fetch (not during polling refreshes)
    setIsLoading(prev => prev === true && convList.length === 0 ? true : false)
    try {
      const res = await fetch(`/api/conversations?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.conversations || []).map(mapApiConversation)
        setConvList(mapped)
        // If a conversation is selected, update it with the latest messages
        if (selectedConversation) {
          const updated = mapped.find(c => c.id === selectedConversation.id)
          if (updated) {
            setSelectedConversation(updated)
          }
        } else if (mapped.length > 0) {
          setSelectedConversation(mapped[0])
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clinicId, convList.length, selectedConversation])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Poll for new messages every 10 seconds so incoming WhatsApp messages appear in real-time
  useEffect(() => {
    if (!clinicId) return
    const interval = setInterval(() => {
      fetchConversations()
    }, 10_000)
    return () => clearInterval(interval)
  }, [clinicId, fetchConversations])

  // Auto-seed demo data in demo mode when no conversations exist
  const handleSeedDemo = useCallback(async () => {
    setIsSeeding(true)
    try {
      const seedRes = await fetch('/api/demo/seed', { method: 'POST' })
      const seedData = await seedRes.json()
      if (seedData.clinicId && !clinicId) {
        setClinicId(seedData.clinicId)
      }
      // Refresh conversations after seeding
      await fetchConversations()
    } catch (err) {
      console.error('Failed to seed demo data:', err)
    } finally {
      setIsSeeding(false)
    }
  }, [clinicId, setClinicId, fetchConversations])

  // Auto-seed on first load in demo mode if empty
  useEffect(() => {
    if (!isDemoMode || !clinicId || isLoading || convList.length > 0 || isSeeding) return
    // Only auto-seed once — if conversations are empty after loading
    handleSeedDemo()
  }, [isDemoMode, clinicId, isLoading, convList.length, isSeeding, handleSeedDemo])

  const filteredConversations = convList.filter((c) =>
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConversation, isTyping])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isTyping || !selectedConversation) return

    const msgText = messageInput.trim()
    const msgTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

    // Doctor's message is always OUTBOUND (sent by the clinic staff)
    const userMsg: ConversationMessage = {
      id: `m${Date.now()}`,
      direction: 'outbound',
      text: msgText,
      time: msgTime,
    }

    const updatedConv = {
      ...selectedConversation,
      messages: [...selectedConversation.messages, userMsg],
      lastMessage: userMsg.text,
      lastTime: userMsg.time,
    }

    setConvList(prev => prev.map(c => c.id === updatedConv.id ? updatedConv : c))
    setSelectedConversation(updatedConv)
    setMessageInput('')

    // Check if the channel is connected (real WhatsApp/Instagram/Messenger)
    const channelKey = selectedConversation.channel === 'facebook' ? 'messenger' : selectedConversation.channel
    const isChannelConnected = channelConnections[channelKey]

    if (isChannelConnected) {
      // ── Real mode: Send the doctor's message directly via the connected channel ──
      setIsTyping(true)
      try {
        const sendRes = await fetch('/api/meta/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId: clinicId || 'demo',
            conversationId: selectedConversation.id,
            content: msgText,
            channel: selectedConversation.channel,
          }),
        })

        if (!sendRes.ok) {
          console.error('[Desk] Failed to send message via channel')
        }
      } catch (err) {
        console.error('[Desk] Meta send error:', err)
      } finally {
        setIsTyping(false)
      }
    } else {
      // ── Simulation mode: Use orchestrator for AI auto-response (demo/simulation) ──
      setIsTyping(true)

      // Persist the doctor's outbound message (fire and forget)
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          clinicId: clinicId || 'demo',
          direction: 'outbound',
          content: msgText,
          senderType: 'doctor',
          channel: selectedConversation.channel,
        }),
      }).catch(() => {
        // Silently handle persistence errors — UI already updated
      })

      try {
        const response = await fetch('/api/orchestrator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msgText,
            clinicId: clinicId || 'demo',
            conversationId: selectedConversation.id,
            conversationHistory: selectedConversation.messages.map(m => ({
              direction: m.direction,
              text: m.text,
            })),
          }),
        })

        const data = await response.json()

        const aiMsg: ConversationMessage = {
          id: `m${Date.now() + 1}`,
          direction: 'outbound',
          text: data.response || 'Disculpe, no pude procesar su mensaje. Un miembro del personal le atendera pronto.',
          time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          agent: data.agent || 'Sinap Desk',
          isAI: true,
        }

        const finalConv = {
          ...updatedConv,
          messages: [...updatedConv.messages, aiMsg],
          lastMessage: aiMsg.text,
          lastTime: aiMsg.time,
        }

        setConvList(prev => prev.map(c => c.id === finalConv.id ? finalConv : c))
        setSelectedConversation(finalConv)

        // Persist the AI response message (fire and forget)
        fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            clinicId: clinicId || 'demo',
            direction: 'outbound',
            content: aiMsg.text,
            senderType: 'agent',
            agentName: data.agent || 'Sinap Desk',
            aiGenerated: true,
            channel: selectedConversation.channel,
          }),
        }).catch(() => {
          // Silently handle persistence errors — UI already updated
        })

        eventBus.emit(
          'demo',
          'conversacion_atendida',
          'desk',
          'os',
          JSON.stringify({
            patientId: selectedConversation.patientId,
            patientName: selectedConversation.patientName,
            agent: data.routedAgent || 'desk',
          })
        )

        const lowerMsg = msgText.toLowerCase()
        if (lowerMsg.includes('cita') || lowerMsg.includes('agendar') || lowerMsg.includes('horario')) {
          eventBus.emit(
            'demo',
            'cita_agendada',
            'desk',
            'flow',
            JSON.stringify({
              patientId: selectedConversation.patientId,
              patientName: selectedConversation.patientName,
            })
          )
        }
      } catch {
        const errorMsg: ConversationMessage = {
          id: `m${Date.now() + 1}`,
          direction: 'outbound',
          text: 'Disculpe, hay un problema temporal de conexion. Por favor intente de nuevo en un momento.',
          time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          agent: 'Sinap Desk',
          isAI: true,
        }

        const finalConv = {
          ...updatedConv,
          messages: [...updatedConv.messages, errorMsg],
          lastMessage: errorMsg.text,
          lastTime: errorMsg.time,
        }

        setConvList(prev => prev.map(c => c.id === finalConv.id ? finalConv : c))
        setSelectedConversation(finalConv)
      } finally {
        setIsTyping(false)
      }
    }
  }

  const handleQuickReply = (reply: string) => {
    setMessageInput(reply)
  }

  const quickReplies = getQuickReplies(selectedConversation?.intent)

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel - Conversation list */}
      <motion.div
        className="h-full shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-[#E1F5EE] bg-white w-80 flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Conversaciones
              </CardTitle>
              <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                {convList.length} activas
              </Badge>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#888780]" />
              <Input
                placeholder="Buscar paciente..."
                className="pl-8 h-8 text-xs bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <Separator className="bg-[#E1F5EE] shrink-0" />
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <MessageSquare className="h-8 w-8 text-[#888780]/30 mb-2" />
                  <p className="text-xs text-[#888780] mb-3">No hay conversaciones</p>
                  {isDemoMode && (
                    <Button
                      size="sm"
                      className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-xs h-7"
                      onClick={handleSeedDemo}
                      disabled={isSeeding}
                    >
                      {isSeeding ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1.5" />
                          Cargar datos demo
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv, i) => (
                  <motion.button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedConversation?.id === conv.id
                        ? 'bg-[#EEEDFE] border border-[#534AB7]/20'
                        : 'hover:bg-[#F1EFE8]'
                    }`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-[#1D9E75]">
                          {conv.patientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#2C2C2A] truncate">
                            {conv.patientName}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <ChannelIcon channel={conv.channel} />
                            <span className="text-[10px] text-[#888780]">{conv.lastTime}</span>
                          </div>
                        </div>
                        <p className="text-xs text-[#888780] truncate mt-0.5">
                          {conv.lastMessage}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <ChannelLabel channel={conv.channel} />
                          {conv.unread > 0 && (
                            <motion.span
                              className="bg-[#534AB7] text-white text-[9px] h-4 min-w-[16px] rounded-full flex items-center justify-center px-1"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 400 }}
                            >
                              {conv.unread}
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </motion.div>

      {/* Center panel - Chat view */}
      <motion.div
        className="flex-1 h-full min-w-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-[#E1F5EE] bg-white h-full flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-[#E1F5EE] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                    <span className="text-sm font-medium text-[#1D9E75]">
                      {selectedConversation.patientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C2C2A]">
                      {selectedConversation.patientName}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <ChannelIcon channel={selectedConversation.channel || 'whatsapp'} />
                      <ChannelLabel channel={selectedConversation.channel || 'whatsapp'} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['whatsapp', 'instagram', 'messenger'] as const).map((ch) => {
                    const isConnected = channelConnections[ch]
                    const iconMap = { whatsapp: Phone, instagram: Instagram, messenger: Facebook }
                    const labelMap = { whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger' }
                    const ChIcon = iconMap[ch]
                    return (
                      <div
                        key={ch}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                          isConnected
                            ? 'bg-[#E1F5EE] text-[#1D9E75]'
                            : 'bg-[#F1EFE8] text-[#888780]'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <ChIcon className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">{labelMap[ch]}</span>
                      </div>
                    )
                  })}
                  {!channelConnections.whatsapp && !channelConnections.instagram && !channelConnections.messenger && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] ml-1">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Simulacion
                    </Badge>
                  )}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-3">
                  {selectedConversation.messages.map((msg, i) => (
                    <motion.div
                      key={msg.id}
                      className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, delay: i * 0.02 }}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 relative ${
                          msg.direction === 'inbound'
                            ? 'bg-[#F1EFE8] text-[#2C2C2A] rounded-2xl rounded-bl-sm'
                            : msg.isAI
                            ? 'bg-[#534AB7] text-white rounded-2xl rounded-br-sm'
                            : 'bg-[#1D9E75] text-white rounded-2xl rounded-br-sm'
                        }`}
                      >
                        {msg.direction === 'outbound' && msg.agent && (
                          <div className="flex items-center gap-1.5 mb-1">
                            {msg.isAI && <Bot className="h-3 w-3 text-white/70" />}
                            <Badge
                              className="text-[9px] border-0 py-0 px-1.5 bg-white/20 text-white"
                            >
                              {msg.agent}
                            </Badge>
                            {msg.isAI && (
                              <Badge className="text-[8px] border-0 py-0 px-1 bg-white/20 text-white">
                                IA
                              </Badge>
                            )}
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.direction === 'inbound' ? 'text-[#888780]' : 'text-white/60'
                          }`}
                        >
                          {msg.time}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick replies */}
              {quickReplies.length > 0 && !isTyping && (
                <div className="px-4 py-2 border-t border-[#E1F5EE]/50 shrink-0">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {quickReplies.map((reply) => (
                      <motion.button
                        key={reply}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-[#534AB7]/30 text-[#534AB7] hover:bg-[#EEEDFE] transition-colors whitespace-nowrap"
                        onClick={() => handleQuickReply(reply)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {reply}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-4 py-3 border-t border-[#E1F5EE] shrink-0">
                {selectedConversation && !channelConnections[selectedConversation.channel === 'facebook' ? 'messenger' : selectedConversation.channel] && (
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <WifiOff className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] text-amber-600">
                      Este canal no esta conectado — mensaje solo se guarda localmente
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Escribe un mensaje..."
                    className="flex-1 h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20 transition-colors"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={isTyping}
                  />
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button
                      size="icon"
                      className="bg-[#534AB7] hover:bg-[#534AB7]/90 h-9 w-9 transition-all"
                      onClick={handleSendMessage}
                      disabled={isTyping || !messageInput.trim()}
                    >
                      {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageSquare className="h-12 w-12 text-[#888780]/30 mb-4" />
              <p className="text-sm font-medium text-[#2C2C2A]">
                {isLoading ? 'Cargando conversaciones...' : 'Selecciona una conversación'}
              </p>
              <p className="text-xs text-[#888780] mt-1">
                {isLoading ? '' : 'Elige una conversación de la lista para comenzar'}
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Right panel - Conversation detail + AI suggestion */}
      <motion.div
        className="hidden xl:flex h-full shrink-0"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border-[#E1F5EE] bg-white w-72 flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4 shrink-0">
            <CardTitle className="text-sm font-medium tracking-[-0.03em]">
              Detalle
            </CardTitle>
          </CardHeader>
          <Separator className="bg-[#E1F5EE] shrink-0" />

          {selectedConversation ? (
            <>
              {/* Patient details */}
              <div className="flex-1 min-h-0 overflow-y-auto sinap-scroll px-3 py-3 space-y-2.5">
                {/* Patient info */}
                <div className="bg-[#F8F7F3] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-semibold text-[#1D9E75]">
                        {selectedConversation.patientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2C2C2A] truncate">
                        {selectedConversation.patientName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ChannelIcon channel={selectedConversation.channel || 'whatsapp'} />
                        <ChannelLabel channel={selectedConversation.channel || 'whatsapp'} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Intent */}
                <div className="bg-[#F8F7F3] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tag className="h-3 w-3 text-[#888780]" />
                    <span className="text-[9px] font-medium text-[#888780] uppercase tracking-wide">
                      Intencion
                    </span>
                  </div>
                  <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[11px] leading-tight">
                    {selectedConversation.intent || 'General'}
                  </Badge>
                </div>

                {/* Sentiment & Activity row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#F8F7F3] rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Heart className="h-3 w-3 text-[#888780]" />
                      <span className="text-[9px] font-medium text-[#888780] uppercase tracking-wide">
                        Sentimiento
                      </span>
                    </div>
                    <SentimentBadge sentiment={selectedConversation.sentiment || 'neutral'} />
                  </div>
                  <div className="bg-[#F8F7F3] rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Clock className="h-3 w-3 text-[#888780]" />
                      <span className="text-[9px] font-medium text-[#888780] uppercase tracking-wide">
                        Actividad
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#2C2C2A]">{selectedConversation.lastTime}</p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-7 text-[10px] border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE] justify-center px-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    Agendar cita
                  </Button>
                  <Button variant="outline" className="flex-1 h-7 text-[10px] border-[#534AB7] text-[#534AB7] hover:bg-[#EEEDFE] justify-center px-2">
                    <FileText className="h-3 w-3 mr-1" />
                    Historial
                  </Button>
                </div>
              </div>

              {/* AI suggestion */}
              <div className="shrink-0 px-3 pb-3 pt-1 border-t border-[#E1F5EE]">
                <motion.div
                  className="bg-gradient-to-br from-[#534AB7] to-[#6C63F0] rounded-xl p-3.5 shadow-lg shadow-[#534AB7]/20"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-white tracking-wide">
                      Sugerencia IA
                    </p>
                  </div>
                  <p className="text-[11px] text-white/90 leading-relaxed mb-2.5">
                    {selectedConversation?.intent === 'Cotizacion'
                      ? 'El paciente pregunta por precio. Sugiere agendar primera cita con enlace de pago.'
                      : selectedConversation?.intent === 'Reactivacion'
                      ? 'Paciente inactiva. Ofrece horario flexible o promocion de reactivacion.'
                      : selectedConversation?.intent === 'Confirmacion de cita'
                      ? 'Confirma la cita y envia recordatorio con ubicacion de la clinica.'
                      : 'Responde de forma empatica y ofrece soluciones concretas.'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {getQuickReplies(selectedConversation?.intent).slice(0, 2).map((reply) => (
                      <motion.button
                        key={reply}
                        className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors whitespace-nowrap border border-white/20"
                        onClick={() => handleQuickReply(reply)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {reply}
                      </motion.button>
                    ))}
                  </div>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      className="bg-white text-[#534AB7] hover:bg-white/90 text-[11px] h-7 w-full rounded-lg font-semibold shadow-sm"
                    >
                      Usar sugerencia
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-xs text-[#888780] text-center">Selecciona una conversación</p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
