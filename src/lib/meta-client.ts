// ─── Meta Cloud API Client — Multi-channel ──────────────────
// Handles: WhatsApp, Instagram DM, Facebook Messenger
// Text messages, template messages, media messages,
// message status, webhook verification, and payload parsing.

import { db } from '@/lib/db'

// ─── Types ──────────────────────────────────────────────────

export type MetaChannel = 'whatsapp' | 'instagram' | 'messenger'

export interface MetaConfig {
  phoneNumberId: string
  accessToken: string
  wabaId: string
}

export interface MetaChannelConfig {
  channel: MetaChannel
  accessToken: string
  businessId: string   // WABA ID (whatsapp), IG Business ID (instagram), Page ID (messenger)
  phoneNumberId?: string  // Only for WhatsApp
  pageId?: string         // For Instagram DMs and Messenger
}

export interface MetaSendResponse {
  messageId: string   // wamid or message ID
  whatsappId: string  // recipient phone or user ID
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters: Array<{
    type: 'text' | 'image' | 'document'
    text?: string
    image?: { link: string }
    document?: { link: string }
  }>
}

export interface ParsedWebhookMessage {
  channel: MetaChannel
  clinicWabaId: string
  from: string          // sender phone or user ID
  messageId: string     // wamid or message ID
  timestamp: number
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'interactive' | 'template' | 'system'
  text?: string
  mediaId?: string
  mediaUrl?: string
  mimeType?: string
  caption?: string
  interactiveResponse?: string
  buttonReply?: string
  status?: 'sent' | 'delivered' | 'read' | 'failed'
  errors?: Array<{ code: number; message: string }>
  // Instagram/Messenger specific
  igUserId?: string     // Instagram user ID
  psid?: string         // Page-scoped ID (Messenger)
  pageId?: string       // Facebook Page ID
  senderName?: string   // Sender display name
}

// ─── Meta Client Class ─────────────────────────────────────

const META_API_VERSION = 'v21.0'
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`
const REQUEST_TIMEOUT_MS = 15_000

class MetaClient {
  private config: MetaConfig
  private channelConfig: MetaChannelConfig | null

  constructor(config: MetaConfig, channelConfig?: MetaChannelConfig) {
    this.config = config
    this.channelConfig = channelConfig || null
  }

  // ─── Factory: Create client for a specific channel ────────
  static createForChannel(channel: MetaChannel, connection: {
    accessToken: string
    businessId?: string | null
    phoneNumberId?: string | null
    pageId?: string | null
  }): MetaClient {
    const channelConfig: MetaChannelConfig = {
      channel,
      accessToken: connection.accessToken,
      businessId: connection.businessId || '',
      phoneNumberId: connection.phoneNumberId || undefined,
      pageId: connection.pageId || undefined,
    }

    const metaConfig: MetaConfig = {
      phoneNumberId: connection.phoneNumberId || '',
      accessToken: connection.accessToken,
      wabaId: connection.businessId || '',
    }

    return new MetaClient(metaConfig, channelConfig)
  }

  // ─── Send text message (channel-aware) ───────────────────
  async sendTextMessage(to: string, text: string): Promise<MetaSendResponse> {
    // If we have channel config, route to the right channel
    if (this.channelConfig) {
      switch (this.channelConfig.channel) {
        case 'whatsapp':
          return this.sendWhatsAppText(to, text)
        case 'instagram':
          return this.sendInstagramMessage(to, text)
        case 'messenger':
          return this.sendMessengerMessage(to, text)
      }
    }
    // Default: WhatsApp
    return this.sendWhatsAppText(to, text)
  }

  // ─── Send media message (channel-aware) ──────────────────
  async sendMediaMessage(
    to: string,
    type: 'image' | 'document' | 'audio' | 'video',
    mediaUrl: string,
    caption?: string
  ): Promise<MetaSendResponse> {
    if (this.channelConfig) {
      switch (this.channelConfig.channel) {
        case 'instagram':
          return this.sendInstagramMediaMessage(to, type, mediaUrl, caption)
        case 'messenger':
          return this.sendMessengerMediaMessage(to, type, mediaUrl, caption)
        case 'whatsapp':
        default:
          return this.sendWhatsAppMedia(to, type, mediaUrl, caption)
      }
    }
    return this.sendWhatsAppMedia(to, type, mediaUrl, caption)
  }

  // ─── WhatsApp: Send text message ─────────────────────────
  private async sendWhatsAppText(to: string, text: string): Promise<MetaSendResponse> {
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    }
    return this.sendWhatsAppRequest(body)
  }

  // ─── WhatsApp: Send media message ────────────────────────
  private async sendWhatsAppMedia(
    to: string,
    type: 'image' | 'document' | 'audio' | 'video',
    mediaUrl: string,
    caption?: string
  ): Promise<MetaSendResponse> {
    const mediaObj: Record<string, unknown> = { link: mediaUrl }
    if (caption && (type === 'image' || type === 'document')) {
      mediaObj.caption = caption
    }

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type,
      [type]: mediaObj,
    }

    return this.sendWhatsAppRequest(body)
  }

  // ─── WhatsApp: Send template message ─────────────────────
  async sendTemplateMessage(
    to: string,
    templateName: string,
    language: string,
    components?: TemplateComponent[]
  ): Promise<MetaSendResponse> {
    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
      },
    }

    if (components && components.length > 0) {
      (body.template as Record<string, unknown>).components = components
    }

    return this.sendWhatsAppRequest(body)
  }

  // ─── Instagram: Send text message ────────────────────────
  async sendInstagramMessage(to: string, text: string): Promise<MetaSendResponse> {
    const igUserId = this.channelConfig?.businessId
    if (!igUserId) throw new Error('Instagram Business ID no configurado')

    const body = {
      recipient: { id: to },
      message: { text },
    }

    return this.sendInstagramRequest(igUserId, body)
  }

  // ─── Instagram: Send media message ───────────────────────
  async sendInstagramMediaMessage(
    to: string,
    type: 'image' | 'document' | 'audio' | 'video',
    mediaUrl: string,
    caption?: string
  ): Promise<MetaSendResponse> {
    const igUserId = this.channelConfig?.businessId
    if (!igUserId) throw new Error('Instagram Business ID no configurado')

    const attachmentPayload: Record<string, unknown> = { url: mediaUrl }
    if (caption) {
      attachmentPayload.is_reusable = true
    }
    const attachment: Record<string, unknown> = {
      type: type === 'image' ? 'image' : type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'file',
      payload: attachmentPayload,
    }

    const body = {
      recipient: { id: to },
      message: {
        attachment,
      },
    }

    return this.sendInstagramRequest(igUserId, body)
  }

  // ─── Messenger: Send text message ────────────────────────
  async sendMessengerMessage(to: string, text: string): Promise<MetaSendResponse> {
    const pageId = this.channelConfig?.pageId || this.channelConfig?.businessId
    if (!pageId) throw new Error('Facebook Page ID no configurado')

    const body = {
      recipient: { id: to },
      message: { text },
    }

    return this.sendMessengerRequest(pageId, body)
  }

  // ─── Messenger: Send media message ───────────────────────
  async sendMessengerMediaMessage(
    to: string,
    type: 'image' | 'document' | 'audio' | 'video',
    mediaUrl: string,
    caption?: string
  ): Promise<MetaSendResponse> {
    const pageId = this.channelConfig?.pageId || this.channelConfig?.businessId
    if (!pageId) throw new Error('Facebook Page ID no configurado')

    const attachmentPayload: Record<string, unknown> = { url: mediaUrl }
    if (caption) {
      attachmentPayload.is_reusable = true
    }
    const attachment: Record<string, unknown> = {
      type: type === 'image' ? 'image' : type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'file',
      payload: attachmentPayload,
    }

    const body = {
      recipient: { id: to },
      message: {
        attachment,
      },
    }

    return this.sendMessengerRequest(pageId, body)
  }

  // ─── Mark message as read ───────────────────────────────
  async markAsRead(messageId: string): Promise<void> {
    const url = `${META_BASE_URL}/${messageId}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
        }),
        signal: controller.signal,
      })
    } catch (error) {
      console.error('[MetaClient] markAsRead error:', error)
    } finally {
      clearTimeout(timeout)
    }
  }

  // ─── Get media URL from media ID ────────────────────────
  async getMediaUrl(mediaId: string): Promise<string> {
    const url = `${META_BASE_URL}/${mediaId}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.config.accessToken}` },
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`Meta API error: ${res.status}`)
      }

      const data = await res.json()
      return data.url as string
    } finally {
      clearTimeout(timeout)
    }
  }

  // ─── Download media content ─────────────────────────────
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(mediaUrl, {
        headers: { 'Authorization': `Bearer ${this.config.accessToken}` },
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`Meta media download error: ${res.status}`)
      }

      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } finally {
      clearTimeout(timeout)
    }
  }

  // ─── Internal: Send WhatsApp API request ─────────────────
  private async sendWhatsAppRequest(body: Record<string, unknown>): Promise<MetaSendResponse> {
    const url = `${META_BASE_URL}/${this.config.phoneNumberId}/messages`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'Unknown error')
        throw new Error(`Meta API error (${res.status}): ${errorBody}`)
      }

      const data = await res.json()

      const messageId = data.messages?.[0]?.id || ''
      const whatsappId = data.contacts?.[0]?.wa_id || ''

      return { messageId, whatsappId }
    } finally {
      clearTimeout(timeout)
    }
  }

  // ─── Internal: Send Instagram API request ────────────────
  private async sendInstagramRequest(igUserId: string, body: Record<string, unknown>): Promise<MetaSendResponse> {
    const url = `${META_BASE_URL}/${igUserId}/messages`
    const token = this.channelConfig?.accessToken || this.config.accessToken
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'Unknown error')
        throw new Error(`Instagram API error (${res.status}): ${errorBody}`)
      }

      const data = await res.json()
      const messageId = data.message_id || data.messages?.[0]?.id || ''
      const whatsappId = (body.recipient as Record<string, unknown>)?.id as string || ''

      return { messageId, whatsappId }
    } finally {
      clearTimeout(timeout)
    }
  }

  // ─── Internal: Send Messenger API request ────────────────
  private async sendMessengerRequest(pageId: string, body: Record<string, unknown>): Promise<MetaSendResponse> {
    const url = `${META_BASE_URL}/${pageId}/messages`
    const token = this.channelConfig?.accessToken || this.config.accessToken
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'Unknown error')
        throw new Error(`Messenger API error (${res.status}): ${errorBody}`)
      }

      const data = await res.json()
      const messageId = data.message_id || data.messages?.[0]?.id || ''
      const whatsappId = (body.recipient as Record<string, unknown>)?.id as string || ''

      return { messageId, whatsappId }
    } finally {
      clearTimeout(timeout)
    }
  }

  // ─── Static: Verify webhook challenge ────────────────────
  static verifyWebhook(mode: string, token: string, verifyToken: string): string | null {
    if (mode === 'subscribe' && token === verifyToken) {
      return null // Caller should return hub.challenge
    }
    return null // Verification failed
  }

  // ─── Static: Detect channel from webhook payload ─────────
  static detectChannel(body: Record<string, unknown>): MetaChannel {
    const entries = body.entry as Array<Record<string, unknown>> | undefined
    if (!entries || !Array.isArray(entries) || entries.length === 0) return 'whatsapp'

    const entry = entries[0]

    // Messenger has top-level messaging array
    if (entry.messaging && Array.isArray(entry.messaging)) return 'messenger'

    // Check changes for Instagram vs WhatsApp
    const changes = entry.changes as Array<Record<string, unknown>> | undefined
    if (changes && Array.isArray(changes) && changes.length > 0) {
      const change = changes[0]
      const value = change.value as Record<string, unknown> | undefined
      if (value) {
        // Instagram-specific indicators
        if ((value as Record<string, unknown>).ig_id || ((value as Record<string, unknown>).metadata as Record<string, unknown> | undefined)?.ig_id) return 'instagram'
        // Check if messages contain Instagram-specific fields
        const messages = value.messages as Array<Record<string, unknown>> | undefined
        if (messages && Array.isArray(messages) && messages.length > 0) {
          if (messages[0].ig_user_id || messages[0].ig_username) return 'instagram'
        }
      }
    }

    return 'whatsapp'
  }

  // ─── Static: Parse incoming webhook payload ──────────────
  static parseWebhookPayload(body: Record<string, unknown>): ParsedWebhookMessage[] {
    const results: ParsedWebhookMessage[] = []

    try {
      const channel = MetaClient.detectChannel(body)
      const entries = body.entry as Array<Record<string, unknown>> | undefined
      if (!entries || !Array.isArray(entries)) return results

      for (const entry of entries) {
        const entryId = entry.id as string || ''

        // ── Handle Messenger payload (entry.messaging[]) ──────
        if (channel === 'messenger') {
          const messaging = entry.messaging as Array<Record<string, unknown>> | undefined
          if (messaging && Array.isArray(messaging)) {
            for (const msg of messaging) {
              const sender = msg.sender as Record<string, unknown> | undefined
              const message = msg.message as Record<string, unknown> | undefined
              if (!message) continue

              const parsed: ParsedWebhookMessage = {
                channel: 'messenger',
                clinicWabaId: entryId,
                from: (sender?.id as string) || '',
                messageId: (message.mid as string) || '',
                timestamp: parseInt(msg.timestamp as string || '0', 10),
                type: 'text',
                psid: (sender?.id as string) || '',
                pageId: entryId,
              }

              // Extract text
              if (message.text) {
                parsed.text = message.text as string
              }

              // Extract attachments
              const attachments = message.attachments as Array<Record<string, unknown>> | undefined
              if (attachments && attachments.length > 0) {
                const att = attachments[0]
                const attType = att.type as string
                const attPayload = att.payload as Record<string, unknown> | undefined
                const attUrl = attPayload?.url as string || ''
                if (attType === 'image') {
                  parsed.type = 'image'
                  parsed.mediaUrl = attUrl
                } else if (attType === 'file' || attType === 'document') {
                  parsed.type = 'document'
                  parsed.mediaUrl = attUrl
                } else if (attType === 'audio') {
                  parsed.type = 'audio'
                  parsed.mediaUrl = attUrl
                } else if (attType === 'video') {
                  parsed.type = 'video'
                  parsed.mediaUrl = attUrl
                }
              }

              // Quick replies
              if (message.quick_reply) {
                parsed.interactiveResponse = (message.quick_reply as Record<string, unknown>).payload as string || ''
                parsed.buttonReply = parsed.text || ''
              }

              if (!parsed.text && parsed.type !== 'text') {
                parsed.text = `[${parsed.type}]`
              }

              results.push(parsed)
            }
          }
          continue
        }

        // ── Handle WhatsApp / Instagram payload (entry.changes[]) ──
        const changes = entry.changes as Array<Record<string, unknown>> | undefined
        if (!changes || !Array.isArray(changes)) continue

        for (const change of changes) {
          const value = change.value as Record<string, unknown> | undefined
          if (!value) continue

          // ── Handle incoming messages ────────────────
          const messages = value.messages as Array<Record<string, unknown>> | undefined
          if (messages && Array.isArray(messages)) {
            for (const msg of messages) {
              const parsed: ParsedWebhookMessage = {
                channel,
                clinicWabaId: entryId,
                from: (msg.from as string) || '',
                messageId: (msg.id as string) || '',
                timestamp: parseInt(msg.timestamp as string || '0', 10),
                type: (msg.type as ParsedWebhookMessage['type']) || 'text',
              }

              // Instagram-specific fields
              if (channel === 'instagram') {
                parsed.igUserId = (msg.ig_user_id as string) || undefined
                // Instagram uses the same from field but it's an IG user ID
                // The business ID for Instagram is the ig_id in metadata
              }

              // Extract text content
              if (msg.type === 'text' && msg.text) {
                const textObj = msg.text as Record<string, unknown>
                parsed.text = (textObj.body as string) || ''
              }

              // Extract image content
              if (msg.type === 'image' && msg.image) {
                const imgObj = msg.image as Record<string, unknown>
                parsed.mediaId = (imgObj.id as string) || ''
                parsed.caption = (imgObj.caption as string) || ''
                parsed.mimeType = (imgObj.mime_type as string) || ''
              }

              // Extract document content
              if (msg.type === 'document' && msg.document) {
                const docObj = msg.document as Record<string, unknown>
                parsed.mediaId = (docObj.id as string) || ''
                parsed.caption = (docObj.caption as string) || ''
                parsed.mimeType = (docObj.mime_type as string) || ''
              }

              // Extract audio content
              if (msg.type === 'audio' && msg.audio) {
                const audioObj = msg.audio as Record<string, unknown>
                parsed.mediaId = (audioObj.id as string) || ''
                parsed.mimeType = (audioObj.mime_type as string) || ''
              }

              // Extract video content
              if (msg.type === 'video' && msg.video) {
                const vidObj = msg.video as Record<string, unknown>
                parsed.mediaId = (vidObj.id as string) || ''
                parsed.caption = (vidObj.caption as string) || ''
                parsed.mimeType = (vidObj.mime_type as string) || ''
              }

              // Extract interactive response
              if (msg.type === 'interactive' && msg.interactive) {
                const intObj = msg.interactive as Record<string, unknown>
                if (intObj.button_reply) {
                  parsed.buttonReply = ((intObj.button_reply as Record<string, unknown>).title as string) || ''
                  parsed.interactiveResponse = ((intObj.button_reply as Record<string, unknown>).id as string) || ''
                } else if (intObj.list_reply) {
                  parsed.buttonReply = ((intObj.list_reply as Record<string, unknown>).title as string) || ''
                  parsed.interactiveResponse = ((intObj.list_reply as Record<string, unknown>).id as string) || ''
                } else if (intObj.nfm_reply) {
                  parsed.interactiveResponse = JSON.stringify(intObj.nfm_reply)
                }
                parsed.text = parsed.buttonReply || parsed.interactiveResponse || '[Respuesta interactiva]'
              }

              // Handle errors in the message
              if (msg.errors) {
                parsed.errors = (msg.errors as Array<{ code: number; message: string }>)
              }

              results.push(parsed)
            }
          }

          // ── Handle message status updates ───────────
          const statuses = value.statuses as Array<Record<string, unknown>> | undefined
          if (statuses && Array.isArray(statuses)) {
            for (const status of statuses) {
              const parsed: ParsedWebhookMessage = {
                channel,
                clinicWabaId: entryId,
                from: (status.recipient_id as string) || '',
                messageId: (status.id as string) || '',
                timestamp: parseInt(status.timestamp as string || '0', 10),
                type: 'system',
                status: (status.status as 'sent' | 'delivered' | 'read' | 'failed') || undefined,
                errors: status.errors as Array<{ code: number; message: string }> | undefined,
              }

              results.push(parsed)
            }
          }
        }
      }
    } catch (error) {
      console.error('[MetaClient] parseWebhookPayload error:', error)
    }

    return results
  }
}

// ─── Helper: Get Meta config for a clinic from DB (legacy) ──
export async function getClinicMetaConfig(clinicId: string): Promise<MetaConfig | null> {
  if (!db) return null

  try {
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        wabaId: true,
        phoneNumberId: true,
        metaAccessToken: true,
      },
    })

    if (!clinic?.wabaId || !clinic?.phoneNumberId || !clinic?.metaAccessToken) {
      return null
    }

    return {
      wabaId: clinic.wabaId,
      phoneNumberId: clinic.phoneNumberId,
      accessToken: clinic.metaAccessToken,
    }
  } catch (error) {
    console.error('[MetaClient] getClinicMetaConfig error:', error)
    return null
  }
}

// ─── Helper: Get MetaConnection for a specific channel ──────
export async function getClinicMetaConnection(clinicId: string, channel: string): Promise<MetaChannelConfig | null> {
  if (!db) return null

  try {
    const connection = await db.metaConnection.findUnique({
      where: {
        clinicId_channel: { clinicId, channel },
        status: 'active',
      },
    })

    if (!connection) return null

    return {
      channel: connection.channel as MetaChannel,
      accessToken: connection.accessToken,
      businessId: connection.businessId || '',
      phoneNumberId: connection.phoneNumberId || undefined,
      pageId: connection.pageId || undefined,
    }
  } catch (error) {
    console.error('[MetaClient] getClinicMetaConnection error:', error)
    return null
  }
}

// ─── Helper: Get all MetaConnections for a clinic ───────────
export async function getClinicMetaConnections(clinicId: string): Promise<Array<MetaChannelConfig & { status: string; businessName?: string; id: string }>> {
  if (!db) return []

  try {
    const connections = await db.metaConnection.findMany({
      where: { clinicId },
    })

    return connections.map(c => ({
      id: c.id,
      channel: c.channel as MetaChannel,
      accessToken: c.accessToken,
      businessId: c.businessId || '',
      phoneNumberId: c.phoneNumberId || undefined,
      pageId: c.pageId || undefined,
      status: c.status,
      businessName: c.businessName || undefined,
    }))
  } catch (error) {
    console.error('[MetaClient] getClinicMetaConnections error:', error)
    return []
  }
}

// ─── Helper: Validate a Meta access token ──────────────────
export async function validateMetaToken(accessToken: string, resource?: string): Promise<{ valid: boolean; businessName?: string; id?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const endpoint = resource ? `${META_BASE_URL}/${resource}` : `${META_BASE_URL}/me`
    const url = `${endpoint}?access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url, { signal: controller.signal })

    if (!res.ok) {
      return { valid: false }
    }

    const data = await res.json()
    return {
      valid: true,
      businessName: data.name || data.username || undefined,
      id: data.id || undefined,
    }
  } catch {
    return { valid: false }
  } finally {
    clearTimeout(timeout)
  }
}

export { MetaClient }
export { META_API_VERSION, META_BASE_URL }
