import crypto from 'crypto'

export function generateApiKey(): { fullKey: string; keyHash: string; keyPrefix: string } {
  const random = crypto.randomBytes(32).toString('hex')
  const fullKey = `nxs_${random}`
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex')
  const keyPrefix = fullKey.slice(0, 12)  // "nxs_" + 8 hex chars
  return { fullKey, keyHash, keyPrefix }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex')
}
