// ─── Webhook Router — Normalize and route Meta webhook events ──────
// Converts channel-specific payloads into a unified NormalizedInboundMessage
// that the Desk, CRM, and AI orchestrator can consume without knowing
// the source channel's payload structure.

import type { MetaChannel } from '@/lib/meta-client'

// ─── Normalized Inbound Message ──────────────────────────────
// This is the stable internal contract that Desk relies on.
// Changing this type requires updating all consumers.

export type NormalizedMessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'reaction'
  | 'location'
  | 'interactive'
  | 'unknown'

export interface NormalizedInboundMessage {
  /** Stable event ID from the provider (for idempotency) */
  providerEventId: string
  /** Clinic ID resolved from the webhook payload */
  clinicId: string | null
  /** Which channel this message came from */
  channel: MetaChannel
  /** External conversation ID (WABA thread, IG thread, etc.) */
  externalConversationId: string
  /** External message ID (wamid, mid, etc.) */
  externalMessageId: string
  /** Sender's ID on the platform */
  externalSenderId: string
  /** Sender display name if available */
  senderDisplayName?: string
  /** Sender phone (WhatsApp only) */
  senderPhone?: string
  /** Normalized message type */
  messageType: NormalizedMessageType
  /** Text content (for text/interactive/caption) */
  text?: string
  /** Media URL if available */
  mediaUrl?: string
  /** Media ID for later download */
  mediaId?: string
  /** MIME type of media */
  mimeType?: string
  /** ISO timestamp */
  receivedAt: string
  /** Raw payload for audit/debug */
  rawPayload: unknown
}

// ─── Channel Normalizers ─────────────────────────────────────

interface RawWebhookEntry {
  id?: string
  messaging?: Array<Record<string, unknown>>
  changes?: Array<Record<string, unknown>>
}

/**
 * Normalize a WhatsApp webhook payload into our internal format.
 */
export function normalizeWhatsAppMessage(
  entry: RawWebhookEntry,
  change: Record<string, unknown>,
  msg: Record<string, unknown>
): NormalizedInboundMessage {
  const value = change.value as Record<string, unknown> | undefined
  const metadata = value?.metadata as Record<string, unknown> | undefined

  const from = (msg.from as string) || ''
  const msgId = (msg.id as string) || ''
  const msgType = (msg.type as string) || 'text'

  // Determine normalized message type
  let messageType: NormalizedMessageType = 'text'
  if (['image', 'document', 'audio', 'video'].includes(msgType)) {
    messageType = msgType as NormalizedMessageType
  } else if (msgType === 'interactive') {
    messageType = 'interactive'
  } else if (msgType === 'location') {
    messageType = 'location'
  } else if (msgType === 'reaction') {
    messageType = 'reaction'
  }

  // Extract text content
  let text: string | undefined
  if (msgType === 'text' && msg.text) {
    text = ((msg.text as Record<string, unknown>).body as string) || ''
  } else if (msgType === 'interactive' && msg.interactive) {
    const intObj = msg.interactive as Record<string, unknown>
    if (intObj.button_reply) {
      text = ((intObj.button_reply as Record<string, unknown>).title as string) || ''
    } else if (intObj.list_reply) {
      text = ((intObj.list_reply as Record<string, unknown>).title as string) || ''
    } else {
      text = '[Respuesta interactiva]'
    }
  }

  // Extract media info
  const mediaObj = (msg[msgType] as Record<string, unknown>) || {}
  const mediaId = (mediaObj.id as string) || undefined
  const caption = (mediaObj.caption as string) || undefined
  const mimeType = (mediaObj.mime_type as string) || undefined

  if (caption && text) {
    text = `${caption} — ${text}`
  } else if (caption) {
    text = caption
  }

  // Build conversation ID from WABA ID + sender phone
  const wabaId = (metadata?.phone_number_id as string) || entry.id || ''
  const externalConversationId = `wa:${from}`

  return {
    providerEventId: msgId,
    clinicId: null, // Resolved later by the webhook handler
    channel: 'whatsapp',
    externalConversationId,
    externalMessageId: msgId,
    externalSenderId: from,
    senderPhone: from,
    messageType,
    text,
    mediaId,
    mimeType,
    receivedAt: new Date(parseInt(msg.timestamp as string || '0', 10) * 1000 || Date.now()).toISOString(),
    rawPayload: msg,
  }
}

/**
 * Normalize a Messenger webhook payload into our internal format.
 */
export function normalizeMessengerMessage(
  entry: RawWebhookEntry,
  messagingEvent: Record<string, unknown>
): NormalizedInboundMessage {
  const sender = messagingEvent.sender as Record<string, unknown> | undefined
  const message = messagingEvent.message as Record<string, unknown> | undefined
  if (!message) {
    return {
      providerEventId: `messenger:empty:${Date.now()}`,
      clinicId: null,
      channel: 'messenger',
      externalConversationId: `ms:${(sender?.id as string) || ''}`,
      externalMessageId: `messenger:empty:${Date.now()}`,
      externalSenderId: (sender?.id as string) || '',
      messageType: 'unknown',
      receivedAt: new Date().toISOString(),
      rawPayload: messagingEvent,
    }
  }

  const senderId = (sender?.id as string) || ''
  const mid = (message.mid as string) || ''
  const pageId = entry.id || ''

  // Determine message type
  let messageType: NormalizedMessageType = 'text'
  const attachments = message.attachments as Array<Record<string, unknown>> | undefined
  if (attachments && attachments.length > 0) {
    const attType = (attachments[0].type as string) || ''
    if (attType === 'image') messageType = 'image'
    else if (attType === 'audio') messageType = 'audio'
    else if (attType === 'video') messageType = 'video'
    else if (attType === 'file') messageType = 'document'
  }

  // Quick replies → interactive
  if (message.quick_reply) {
    messageType = 'interactive'
  }

  const text = (message.text as string) || undefined
  const mediaUrl = attachments?.[0]?.payload
    ? ((attachments[0].payload as Record<string, unknown>).url as string) || undefined
    : undefined

  return {
    providerEventId: mid,
    clinicId: null,
    channel: 'messenger',
    externalConversationId: `ms:${senderId}`,
    externalMessageId: mid,
    externalSenderId: senderId,
    messageType,
    text,
    mediaUrl,
    receivedAt: new Date(parseInt(messagingEvent.timestamp as string || '0', 10) || Date.now()).toISOString(),
    rawPayload: messagingEvent,
  }
}

/**
 * Normalize an Instagram webhook payload into our internal format.
 */
export function normalizeInstagramMessage(
  entry: RawWebhookEntry,
  change: Record<string, unknown>,
  msg: Record<string, unknown>
): NormalizedInboundMessage {
  const from = (msg.from as string) || ''
  const msgId = (msg.id as string) || ''
  const msgType = (msg.type as string) || 'text'

  // Map Instagram message types
  let messageType: NormalizedMessageType = 'text'
  if (['image', 'document', 'audio', 'video'].includes(msgType)) {
    messageType = msgType as NormalizedMessageType
  } else if (msgType === 'interactive') {
    messageType = 'interactive'
  } else if (msgType === 'reaction') {
    messageType = 'reaction'
  } else if (msgType === 'share') {
    messageType = 'unknown'
  }

  // Extract text
  let text: string | undefined
  if (msgType === 'text' && msg.text) {
    text = ((msg.text as Record<string, unknown>).body as string) || ''
  }

  // Extract media info
  const mediaObj = (msg[msgType] as Record<string, unknown>) || {}
  const mediaId = (mediaObj.id as string) || undefined
  const caption = (mediaObj.caption as string) || undefined

  if (caption) {
    text = text ? `${caption} — ${text}` : caption
  }

  const igUserId = (msg.ig_user_id as string) || from

  return {
    providerEventId: msgId,
    clinicId: null,
    channel: 'instagram',
    externalConversationId: `ig:${from}`,
    externalMessageId: msgId,
    externalSenderId: from,
    senderDisplayName: (msg.ig_username as string) || undefined,
    messageType,
    text,
    mediaId,
    receivedAt: new Date(parseInt(msg.timestamp as string || '0', 10) * 1000 || Date.now()).toISOString(),
    rawPayload: msg,
  }
}

/**
 * Route a raw webhook entry to the appropriate normalizer.
 * Returns an array of NormalizedInboundMessage (may be empty for status-only events).
 */
export function normalizeWebhookEntry(
  entry: Record<string, unknown>,
  detectedChannel: MetaChannel
): NormalizedInboundMessage[] {
  const results: NormalizedInboundMessage[] = []
  const typedEntry = entry as RawWebhookEntry

  try {
    // Messenger: entry.messaging[]
    if (detectedChannel === 'messenger' && typedEntry.messaging) {
      for (const msg of typedEntry.messaging) {
        // Skip non-message events (delivery, read, etc.)
        if (!msg.message) continue
        results.push(normalizeMessengerMessage(typedEntry, msg))
      }
      return results
    }

    // WhatsApp / Instagram: entry.changes[]
    const changes = typedEntry.changes as Array<Record<string, unknown>> | undefined
    if (!changes) return results

    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined
      if (!value) continue

      // Only process messages (skip statuses)
      const messages = value.messages as Array<Record<string, unknown>> | undefined
      if (!messages) continue

      for (const msg of messages) {
        if (detectedChannel === 'instagram') {
          results.push(normalizeInstagramMessage(typedEntry, change, msg))
        } else {
          results.push(normalizeWhatsAppMessage(typedEntry, change, msg))
        }
      }
    }
  } catch (error) {
    console.error('[WebhookRouter] normalizeWebhookEntry error:', error)
  }

  return results
}
