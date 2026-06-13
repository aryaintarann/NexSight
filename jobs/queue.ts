import { Queue } from 'bullmq'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const scanQueue = new Queue('scans', {
  connection: { url: redisUrl, maxRetriesPerRequest: null as null },
})
