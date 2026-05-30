'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { conversations as initialConversations, type Conversation, type ConversationMessage } from '@/lib/mock-data'
import { eventBus } from '@/lib/event-bus'
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Instagram,
  Facebook,
  Clock,
  User,
  Tag,
  Heart,
  AlertTriangle,
  ChevronRight,
  Bot,
  Loader2,
} from 'lucide-react'

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
      <div className="bg-[#534AB7] text-white rounded-xl px-4 py-2.5 max-w-[75%]">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-white/70" />
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DeskInbox() {
  const [convList, setConvList] = useState<Conversation[]>(initialConversations)
  const [selectedConversation, setSelectedConversation] = useState<Conversation>(convList[0])
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const filteredConversations = convList.filter((c) =>
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConversation, isTyping])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isTyping) return

    const userMsg: ConversationMessage = {
      id: `m${Date.now()}`,
      direction: 'inbound',
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    }

    // Add user message to conversation
    const updatedConv = {
      ...selectedConversation,
      messages: [...selectedConversation.messages, userMsg],
      lastMessage: userMsg.text,
      lastTime: userMsg.time,
    }

    setConvList(prev => prev.map(c => c.id === updatedConv.id ? updatedConv : c))
    setSelectedConversation(updatedConv)
    setMessageInput('')
    setIsTyping(true)

    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          clinicId: 'demo',
          patientId: selectedConversation.patientId,
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

      // Emit event for conversation handled
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

      // Check if the routed agent suggests an appointment
      const lowerMsg = userMsg.text.toLowerCase()
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
      // Fallback if API fails
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

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Left panel - Conversation list */}
      <Card className="border-[#E1F5EE] bg-white w-80 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
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
              className="pl-8 h-8 text-xs bg-[#F1EFE8] border-[#E1F5EE]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <Separator className="bg-[#E1F5EE]" />
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'bg-[#EEEDFE] border border-[#534AB7]/20'
                    : 'hover:bg-[#F1EFE8]'
                }`}
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
                        <Badge className="bg-[#534AB7] text-white border-0 text-[9px] h-4 min-w-[16px] flex items-center justify-center">
                          {conv.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Center panel - Chat view */}
      <Card className="border-[#E1F5EE] bg-white flex-1 flex flex-col">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-[#E1F5EE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#E1F5EE] flex items-center justify-center">
              <span className="text-sm font-medium text-[#1D9E75]">
                {selectedConversation?.patientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#2C2C2A]">
                {selectedConversation?.patientName}
              </p>
              <div className="flex items-center gap-1.5">
                <ChannelIcon channel={selectedConversation?.channel || 'whatsapp'} />
                <ChannelLabel channel={selectedConversation?.channel || 'whatsapp'} />
              </div>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Simulacion
          </Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {selectedConversation?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                    msg.direction === 'inbound'
                      ? 'bg-[#F1EFE8] text-[#2C2C2A]'
                      : msg.isAI
                      ? 'bg-[#534AB7] text-white'
                      : 'bg-[#1D9E75] text-white'
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
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#E1F5EE]">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              className="flex-1 h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
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
            <Button
              size="icon"
              className="bg-[#534AB7] hover:bg-[#534AB7]/90 h-9 w-9"
              onClick={handleSendMessage}
              disabled={isTyping || !messageInput.trim()}
            >
              {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Right panel - Conversation detail */}
      <Card className="border-[#E1F5EE] bg-white w-72 shrink-0 flex flex-col hidden xl:flex">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium tracking-[-0.03em]">
            Detalle
          </CardTitle>
        </CardHeader>
        <Separator className="bg-[#E1F5EE]" />
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Patient info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-[#888780]" />
                <span className="text-xs font-medium text-[#888780] uppercase tracking-wide">
                  Paciente
                </span>
              </div>
              <p className="text-sm font-medium text-[#2C2C2A]">
                {selectedConversation?.patientName}
              </p>
            </div>

            {/* Intent */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-[#888780]" />
                <span className="text-xs font-medium text-[#888780] uppercase tracking-wide">
                  Intencion
                </span>
              </div>
              <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-xs">
                {selectedConversation?.intent}
              </Badge>
            </div>

            {/* Sentiment */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-[#888780]" />
                <span className="text-xs font-medium text-[#888780] uppercase tracking-wide">
                  Sentimiento
                </span>
              </div>
              <SentimentBadge sentiment={selectedConversation?.sentiment || 'neutral'} />
            </div>

            {/* Channel */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-[#888780]" />
                <span className="text-xs font-medium text-[#888780] uppercase tracking-wide">
                  Canal
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ChannelIcon channel={selectedConversation?.channel || 'whatsapp'} />
                <span className="text-sm text-[#2C2C2A]">
                  {selectedConversation?.channel === 'whatsapp'
                    ? 'WhatsApp'
                    : selectedConversation?.channel === 'instagram'
                    ? 'Instagram DM'
                    : 'Facebook Messenger'}
                </span>
              </div>
            </div>

            {/* Last activity */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-[#888780]" />
                <span className="text-xs font-medium text-[#888780] uppercase tracking-wide">
                  Ultima actividad
                </span>
              </div>
              <p className="text-sm text-[#2C2C2A]">{selectedConversation?.lastTime}</p>
            </div>

            <Separator className="bg-[#E1F5EE]" />

            {/* AI suggestion */}
            <div className="bg-[#EEEDFE] rounded-lg p-3">
              <p className="text-[10px] font-medium text-[#534AB7] uppercase tracking-wide mb-1.5">
                Sugerencia IA
              </p>
              <p className="text-xs text-[#2C2C2A] leading-relaxed">
                {selectedConversation?.intent === 'Cotizacion'
                  ? 'El paciente pregunta por precio. Sugiere agendar primera cita con enlace de pago.'
                  : selectedConversation?.intent === 'Reactivacion'
                  ? 'Paciente inactiva. Ofrece horario flexible o promocion de reactivacion.'
                  : selectedConversation?.intent === 'Confirmacion de cita'
                  ? 'Confirma la cita y envia recordatorio con ubicacion de la clinica.'
                  : 'Responde de forma empatica y ofrece soluciones concretas.'}
              </p>
              <Button
                size="sm"
                className="mt-2 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-xs h-7"
              >
                Usar sugerencia
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
