import { Worker } from 'bullmq'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { scanQueue } from '@/jobs/queue'
import { monitorQueue, type MonitorJobData } from '@/jobs/monitor-queue'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function scheduleActiveMonitors(): Promise<void> {
  const { data: monitors, error } = await admin()
    .from('monitors')
    .select('id, user_id, url, schedule')
    .eq('active', true)

  if (error) {
    console.error('[monitor-scheduler] Failed to load monitors:', error.message)
    return
  }
  if (!monitors || monitors.length === 0) return

  const existing = await monitorQueue.getRepeatableJobs()
  const existingNames = new Set(existing.map((j) => j.name))

  for (const m of monitors) {
    const jobName = `monitor-${m.id}`
    if (!existingNames.has(jobName)) {
      await monitorQueue.add(
        jobName,
        { monitorId: m.id, userId: m.user_id, url: m.url, modules: ['seo', 'geo', 'ai', 'security'] },
        { repeat: { pattern: m.schedule } }
      )
    }
  }
  console.log(`[monitor-scheduler] Active: ${monitors.length}, newly scheduled: ${monitors.length - existingNames.size}`)
}

const worker = new Worker<MonitorJobData>(
  'monitors',
  async (job) => {
    const { monitorId, userId, url, modules } = job.data

    const { data: scan, error } = await admin()
      .from('scans')
      .insert({ user_id: userId, url, status: 'queued' })
      .select('id')
      .single()

    if (error || !scan) {
      console.error('[monitor-worker] Failed to create scan:', error?.message)
      return
    }

    await admin()
      .from('monitor_runs')
      .insert({ monitor_id: monitorId, scan_id: scan.id })

    await scanQueue.add('run-scan', {
      scanId: scan.id,
      url,
      modules,
      userId,
      monitorId,
    })

    console.log(`[monitor-worker] Enqueued scan ${scan.id} for monitor ${monitorId}`)
  },
  { connection: { url: redisUrl, maxRetriesPerRequest: null as null }, concurrency: 3 }
)

worker.on('failed', (job, err) => {
  console.error(`[monitor-worker] Job ${job?.id} failed:`, err.message)
})

export default worker
