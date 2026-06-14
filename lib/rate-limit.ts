import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
})

const WINDOW_SECONDS = 3600
const MAX_REQUESTS = 5

export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean
  remaining: number
  resetIn: number
}> {
  const key = `rl:${ip}`
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, WINDOW_SECONDS)
    const ttl = await redis.ttl(key)
    return {
      allowed: count <= MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - count),
      resetIn: ttl > 0 ? ttl : WINDOW_SECONDS,
    }
  } catch {
    // If Redis is unavailable, allow the request (fail open)
    return { allowed: true, remaining: MAX_REQUESTS, resetIn: WINDOW_SECONDS }
  }
}
