// ─── Token Vault — Encrypt/decrypt Meta access tokens at rest ──────
// Follows the guide: tokens must be encrypted in the database,
// only the backend decrypts when invoking Meta APIs.
// Uses AES-256-GCM with META_TOKEN_ENCRYPTION_KEY.

import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12       // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16  // 128-bit auth tag
const KEY_LENGTH = 32       // 256-bit key

/**
 * Get or derive the encryption key from environment.
 * META_TOKEN_ENCRYPTION_KEY can be a 64-char hex string or any passphrase
 * (which gets derived via SHA-256).
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.META_TOKEN_ENCRYPTION_KEY
  if (!envKey) {
    // In development, fall back to a derived key from APP_SECRET
    const fallback = process.env.META_APP_SECRET || process.env.NEXTAUTH_SECRET
    if (!fallback) {
      throw new Error('META_TOKEN_ENCRYPTION_KEY or META_APP_SECRET must be set for token encryption')
    }
    return crypto.createHash('sha256').update(fallback).digest()
  }

  // If it's a 64-char hex string, use directly
  if (/^[0-9a-f]{64}$/i.test(envKey)) {
    return Buffer.from(envKey, 'hex')
  }

  // Otherwise derive key from passphrase
  return crypto.createHash('sha256').update(envKey).digest()
}

/**
 * Encrypt a plaintext token string.
 * Returns a base64-encoded string containing: iv + authTag + ciphertext
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()

  // Concatenate: iv (12 bytes) + authTag (16 bytes) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt a previously encrypted token string.
 * Expects base64-encoded string containing: iv + authTag + ciphertext
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(ciphertext, 'base64')

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted token format')
  }

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Check if a string looks like an encrypted token (base64 with sufficient length).
 * This is a heuristic — plaintext tokens are not base64-encoded by Meta.
 */
export function isEncryptedToken(value: string): boolean {
  if (!value || value.length < 24) return false
  // Base64 regex check — encrypted tokens are always base64
  return /^[A-Za-z0-9+/]+=*$/.test(value) && value.length > 40
}

/**
 * Smart decrypt: if the token appears encrypted, decrypt it;
 * otherwise return as-is (for backward compat with plaintext tokens).
 */
export function smartDecryptToken(token: string): string {
  if (isEncryptedToken(token)) {
    try {
      return decryptToken(token)
    } catch {
      // If decryption fails, it might be a plaintext token that happens
      // to look like base64 — return as-is
      return token
    }
  }
  return token
}

/**
 * Generate a new META_TOKEN_ENCRYPTION_KEY for production.
 * Run this once and store the result in Vercel env vars.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}

// CLI utility: generate and print a new key
// Usage: npx tsx -e "import { generateEncryptionKey } from './src/lib/meta/token-vault'; console.log(generateEncryptionKey())"
