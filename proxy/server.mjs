/**
 * Z-AI Proxy Server
 *
 * This server runs alongside the Sinap app and proxies requests to
 * internal-api.z.ai (which is only accessible from Z.ai's internal network).
 *
 * Vercel serverless functions can't reach internal-api.z.ai, so they call
 * this proxy instead.
 *
 * Usage: node proxy/server.js
 * Default port: 3456
 */

import http from 'http'
import https from 'https'
import { URL } from 'url'

const TARGET = 'https://internal-api.z.ai'
const PORT = parseInt(process.env.ZAI_PROXY_PORT || '3456', 10)

// Allowed paths (security: only proxy chat completions)
const ALLOWED_PATHS = ['/v1/chat/completions', '/v1/chat/completions/vision']

const server = http.createServer(async (req, res) => {
  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Z-AI-From, X-Chat-Id, X-User-Id, X-Token',
      'Access-Control-Max-Age': '86400',
    })
    return res.end()
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  // Only allow specific paths
  if (!ALLOWED_PATHS.some(p => req.url?.startsWith(p))) {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Path not allowed' }))
  }

  // Verify auth header exists
  const token = req.headers['x-token']
  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Missing X-Token header' }))
  }

  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)

    const targetUrl = new URL(req.url || '/', TARGET)

    const proxyHeaders = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Authorization': req.headers['authorization'] || '',
      'X-Z-AI-From': req.headers['x-z-ai-from'] || 'Z',
      'X-Token': Array.isArray(token) ? token[0] : token,
      'Content-Length': body.length.toString(),
    }

    if (req.headers['x-chat-id']) {
      proxyHeaders['X-Chat-Id'] = Array.isArray(req.headers['x-chat-id'])
        ? req.headers['x-chat-id'][0]
        : req.headers['x-chat-id']
    }
    if (req.headers['x-user-id']) {
      proxyHeaders['X-User-Id'] = Array.isArray(req.headers['x-user-id'])
        ? req.headers['x-user-id'][0]
        : req.headers['x-user-id']
    }

    const proxyReq = https.request(targetUrl.href, {
      method: 'POST',
      headers: proxyHeaders,
      timeout: 30000,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      })
      proxyRes.pipe(res)
    })

    proxyReq.on('error', (e) => {
      console.error('Proxy error:', e.message)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: `Proxy error: ${e.message}` }))
    })

    proxyReq.on('timeout', () => {
      proxyReq.destroy()
      res.writeHead(504, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Upstream timeout' }))
    })

    proxyReq.write(body)
    proxyReq.end()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Proxy request error:', msg)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: msg }))
  }
})

server.listen(PORT, () => {
  console.log(`Z-AI Proxy running on port ${PORT}`)
  console.log(`Proxying to ${TARGET}`)
})
