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

---

# Sinap — Multi-Channel Meta Integration (WhatsApp + Instagram + Messenger) + Embedded Signup Architecture

## Date: 2026-03-05

### Summary
Extended the Meta integration from WhatsApp-only to support all 3 Meta channels: WhatsApp Business, Instagram DM, and Facebook Messenger. Added a new `MetaConnection` model for per-channel token storage, updated the webhook to detect and route inbound messages from any channel, created the OAuth endpoint for Embedded Signup preparation, and updated the Settings UI and Desk Inbox with multi-channel dashboards and indicators.

### Files Modified

1. **`prisma/schema.prisma`** — Added `MetaConnection` model
   - New model with: `channel`, `businessId`, `phoneNumberId`, `pageId`, `accessToken`, `tokenExpiresAt`, `status`, `businessName`, `oauthCode`, `scopes`
   - `@@unique([clinicId, channel])` — one connection per channel per clinic
   - `@@map("meta_connections")` for clean table naming
   - Added `metaConnections MetaConnection[]` relation to Clinic model
   - Kept existing `wabaId`, `phoneNumberId`, `metaAccessToken`, `igBusinessId`, `fbPageId` on Clinic for backward compat
   - Ran `npx prisma db push` successfully

2. **`/src/lib/meta-client.ts`** — Multi-channel support
   - Added `MetaChannel` type: `'whatsapp' | 'instagram' | 'messenger'`
   - Added `MetaChannelConfig` interface for channel-specific credentials
   - Updated `ParsedWebhookMessage` to include `channel`, `igUserId`, `psid`, `pageId`, `senderName`
   - Added `MetaClient.createForChannel()` factory method
   - Added `sendInstagramMessage()`, `sendInstagramMediaMessage()` — sends to `POST /v21.0/{ig-user-id}/messages`
   - Added `sendMessengerMessage()`, `sendMessengerMediaMessage()` — sends to `POST /v21.0/{page-id}/messages`
   - Added `MetaClient.detectChannel()` static method — detects channel from webhook payload structure
   - Updated `parseWebhookPayload()` to handle all 3 channel payload formats:
     - WhatsApp: `entry[].changes[].value.messages[]`
     - Instagram: `entry[].changes[].value.messages[]` with `ig_id` indicator
     - Messenger: `entry[].messaging[]` at entry level
   - Added `getClinicMetaConnection()` — gets a specific channel's active connection
   - Added `getClinicMetaConnections()` — gets all connections for a clinic
   - Updated `validateMetaToken()` — accepts optional `resource` param for channel-specific validation

3. **`/src/app/api/webhooks/meta/route.ts`** — Multi-channel inbound processing
   - POST handler now detects channel from payload via `MetaClient.detectChannel()`
   - Added `findClinicByChannel()` — finds clinic from MetaConnection table (or legacy Clinic fields)
   - `handleIncomingMessage()` now:
     - Creates patients with platform-specific IDs (WhatsApp: phone, Instagram/Messenger: `channel:userId`)
     - Creates conversations with the correct `channel` field
     - Routes AI responses through the appropriate channel via `sendAIResponse()`
   - `sendAIResponse()` tries MetaConnection first, falls back to legacy Clinic fields
   - Gracefully saves AI response locally if no channel connection exists

4. **`/src/app/api/meta/connect/route.ts`** — Multi-channel configuration
   - POST: Accepts `channel` parameter (`whatsapp` | `instagram` | `messenger`)
     - Validates required fields per channel (WhatsApp: WABA+Phone, Instagram: IG Business+Page, Messenger: Page)
     - Validates token against channel-specific resource
     - Creates/updates `MetaConnection` record via `upsert`
     - Also updates legacy Clinic fields for backward compat
   - GET: Returns all connections for a clinic
     - Queries `MetaConnection` table first (new source of truth)
     - Falls back to legacy Clinic fields if no MetaConnection records
     - Validates token freshness for active connections
   - DELETE: Accepts optional `channel` param
     - With channel: disconnects only that channel
     - Without channel: disconnects all (legacy behavior)

5. **`/src/app/api/meta/oauth/route.ts`** — NEW: Embedded Signup preparation
   - GET: Returns OAuth URL for Meta Embedded Signup
     - Requires `META_APP_ID` and `META_CONFIG_ID` env vars
     - Generates state with clinicId + timestamp (10min expiry)
     - Scopes: `whatsapp_business_messaging`, `whatsapp_business_management`, `business_management`, `instagram_manage_messages`, `pages_messaging`, `pages_manage_metadata`
     - Returns setup instructions if env vars not configured
   - POST: Handles OAuth callback
     - Decodes state, validates timestamp
     - Exchanges code for access token via `/v21.0/oauth/access_token`
     - Gets granted permissions
     - Gets WABA ID, phone number ID
     - Gets Instagram Business Account from page
     - Creates MetaConnection records for each channel
     - Updates legacy Clinic fields for backward compat

6. **`/src/components/sinap/settings-pages.tsx`** — Multi-channel dashboard UI
   - Replaced single `MetaIntegrationCard` with `MetaIntegrationDashboard` component
   - `ChannelConnectionCard` — per-channel connection card with:
     - WhatsApp: green icon, WABA ID + Phone Number ID fields
     - Instagram: pink icon, IG Business ID + Page ID fields
     - Messenger: blue icon, Page ID + Access Token fields
     - Status badges: Conectado (green) / Desconectado (amber)
     - Connection forms with test/save buttons
     - Disconnect button when connected
   - Webhook configuration section showing:
     - Webhook URL
     - Verify Token status
     - Per-channel connection status dots
   - Embedded Signup section (Stage 2):
     - Explains the feature
     - Shows required env vars (META_APP_ID, META_APP_SECRET, META_CONFIG_ID)
     - Disabled button with "Requiere registro como Meta Tech Provider" tooltip
     - If OAuth configured: shows "Iniciar onboarding automatico" button

7. **`/src/components/sinap/desk-inbox.tsx`** — Per-channel connection indicators
   - Replaced `whatsappConnected` with `channelConnections` state (Record<string, boolean>)
   - Fetches all channel connections from `/api/meta/connect`
   - Chat header now shows 3 channel indicators:
     - Each with colored dot (green=connected, gray=disconnected)
     - Channel icon (Phone/Instagram/Facebook)
     - Channel label (hidden on small screens)
   - Shows "Simulacion" badge only when NO channels are connected
   - Added warning below message input when selected conversation's channel is not connected:
     - "Este canal no esta conectado — mensaje solo se guarda localmente"

### Architecture
```
Meta WhatsApp ──POST──> /api/webhooks/meta ──> detectChannel()
Meta Instagram ──POST──> /api/webhooks/meta ──> detectChannel()  
Meta Messenger ──POST──> /api/webhooks/meta ──> detectChannel()
                                                      ├── findClinicByChannel()
                                                      ├── Find/create Patient (channel-aware ID)
                                                      ├── Find/create Conversation (with channel)
                                                      ├── Create inbound Message
                                                      ├── Trigger AI Orchestrator
                                                      ├── sendAIResponse() → MetaClient.createForChannel()
                                                      └── Create outbound Message

Settings ──> /api/meta/connect ──> MetaConnection table (per channel)
Settings ──> /api/meta/oauth ──> Embedded Signup (Stage 2, requires env vars)

Desk Inbox ──> /api/meta/connect ──> Per-channel connection status
```

### Environment Variables
- `META_WEBHOOK_VERIFY_TOKEN` — Webhook verification (existing)
- `META_APP_ID` — Meta App ID for Embedded Signup (new, optional)
- `META_APP_SECRET` — Meta App Secret for OAuth (new, optional)
- `META_CONFIG_ID` — Embedded Signup config ID (new, optional)

### TypeScript Status
- Zero errors in all modified files
- Dev server running successfully on port 3000
