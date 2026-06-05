# Sinap — Meta Cloud API (WhatsApp) Integration Work Log

## Date: 2026-06-05

### Summary
Implemented full Meta Cloud API (WhatsApp) integration for the Sinap SaaS platform. This enables clinics to connect their WhatsApp Business API, receive inbound messages via webhooks, auto-respond via the AI orchestrator, and send outbound messages through the Meta Graph API.

### Files Created

1. **`/src/lib/meta-client.ts`** — Full Meta Graph API client
   - `MetaClient` class with methods: `sendTextMessage`, `sendTemplateMessage`, `sendMediaMessage`, `markAsRead`, `getMediaUrl`, `downloadMedia`
   - Static methods: `verifyWebhook`, `parseWebhookPayload`
   - Helper functions: `getClinicMetaConfig`, `validateMetaToken`
   - Proper timeout handling (15s) and error handling
   - Types: `MetaConfig`, `MetaSendResponse`, `ParsedWebhookMessage`, `TemplateComponent`

2. **`/src/app/api/webhooks/meta/route.ts`** — Webhook endpoint
   - GET handler: Webhook verification using `META_WEBHOOK_VERIFY_TOKEN` env var
   - POST handler: Inbound message processing
     - Always returns 200 immediately (Meta requirement)
     - Processes asynchronously: finds clinic by wabaId, finds/creates patient by phone, finds/creates conversation, creates message record, triggers AI orchestrator, sends AI response via WhatsApp
   - Status update handling (delivered, read, failed)

3. **`/src/app/api/meta/connect/route.ts`** — Connection configuration endpoint
   - POST: Validates token via Meta API, saves config to Clinic record
   - GET: Checks connection status, validates token freshness
   - DELETE: Disconnects by clearing Meta fields from Clinic

4. **`/src/app/api/meta/templates/route.ts`** — Template management endpoint
   - GET: Lists WhatsApp templates from Meta API
   - POST: Creates a new template via Meta API

### Files Modified

5. **`prisma/schema.prisma`** — Added `wamid String?` field to Message model
   - Tracks WhatsApp message ID for status updates
   - Pushed to database successfully

6. **`/src/app/api/orchestrator/route.ts`** — WhatsApp bridging
   - After generating AI response, checks if conversation is WhatsApp channel and clinic has Meta config
   - If so, sends response via `MetaClient.sendTextMessage()` to patient's phone
   - Stores `wamid` on the outbound Message record for status tracking
   - Gracefully handles WhatsApp send failures (doesn't fail the orchestrator)

7. **`/src/components/sinap/settings-pages.tsx`** — Integrations tab
   - Replaced static "Conectar API" button with `MetaIntegrationCard` component
   - Dynamic connection status badge (Conectado / Sin conectar)
   - When disconnected: "Conectar API" button opens form with fields for wabaId, phoneNumberId, accessToken, igBusinessId, fbPageId
   - Password-style input for access token with show/hide toggle
   - "Probar conexion" button validates token before saving
   - "Guardar" button saves configuration
   - Webhook URL displayed for easy copying
   - When connected: shows business name, WABA/Phone ID, "Ver plantillas" button, "Desconectar" button
   - Template management section with status badges (Aprobada, Pendiente, etc.)

8. **`/src/components/sinap/desk-inbox.tsx`** — WhatsApp connection indicator
   - Added `whatsappConnected` state, fetched from `/api/meta/connect`
   - Chat header badge: "WhatsApp conectado" (green) when connected, "Simulacion" (amber) when not
   - Uses Wifi/WifiOff icons for visual clarity

### Environment Variables Required
- `META_WEBHOOK_VERIFY_TOKEN` — Token for webhook verification (set in Vercel/hosting)

### Webhook URL
- Production: `https://sinap-nine.vercel.app/api/webhooks/meta`
- Must be configured in Meta App Dashboard under Webhooks

### Architecture
```
Meta WhatsApp ──POST──> /api/webhooks/meta ──> Parse payload
                                                      ├── Find/create Patient
                                                      ├── Find/create Conversation
                                                      ├── Create inbound Message (w/ wamid)
                                                      ├── Trigger AI Orchestrator
                                                      ├── Send AI response via MetaClient
                                                      └── Create outbound Message (w/ wamid)

Desk Inbox ──> /api/orchestrator ──> AI Response
                                    ├── If WhatsApp + Meta config → send via MetaClient
                                    └── Store wamid on Message record

Settings ──> /api/meta/connect ──> Validate + save Meta config
Settings ──> /api/meta/templates ──> List/create WhatsApp templates
```

### Lint Status
- No errors in src/ files (only warnings about unused eslint-disable directives in settings-pages.tsx from pre-existing code)
- Dev server running successfully on port 3000
