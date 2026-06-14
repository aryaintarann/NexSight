import { Queue } from 'bullmq'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const monitorQueue = new Queue('monitors', {
  connection: { url: redisUrl, maxRetriesPerRequest: null as null },
})

export interface MonitorJobData {
  monitorId: string
  userId: string
  url: string
  modules: string[]
}
