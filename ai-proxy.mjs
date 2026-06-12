// Lightweight AI proxy — runs on the same machine that can reach internal-api.z.ai
// Forwards AI requests from Vercel to the internal Z-AI API
import http from 'node:http'

const ZAI_BASE_URL = 'https://internal-api.z.ai/v1'
const API_KEY = 'Z.ai'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiM2I0OGUwZjAtN2I2NC00MzY3LTk3ZDYtNGMxYzQ1NWM2MzA4IiwiY2hhdF9pZCI6ImNoYXQtN2JlMGRhZDUtMWE4Ny00ZjFlLThhZTItMzE2ZWRmZmZkNjJiIiwicGxhdGZvcm0iOiJ6YWkifQ.a_1wytk_upNlP_i9DHsGUkqlLFQM_qm-c2bX7-3iDGI'
const USER_ID = '3b48e0f0-7b64-4367-97d6-4c1c455c6308'
const PORT = process.env.AI_PROXY_PORT || 3456

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  // Only handle POST /chat/completions
  if (req.method !== 'POST' || !req.url?.includes('chat/completions')) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  let body = ''
  for await (const chunk of req) body += chunk

  try {
    const zaiRes = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Z-AI-From': 'Z',
        'X-Token': TOKEN,
        'X-User-Id': USER_ID,
      },
      body,
    })

    const data = await zaiRes.text()
    res.writeHead(zaiRes.status, { 'Content-Type': 'application/json' })
    res.end(data)
  } catch (err) {
    console.error('[AI Proxy] Error:', err.message)
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => {
  console.log(`[AI Proxy] Listening on port ${PORT}`)
})
