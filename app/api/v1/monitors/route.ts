import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/auth/api-auth'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { monitorQueue } from '@/jobs/monitor-queue'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const VALID_SCHEDULES = ['0 */6 * * *', '0 0 * * *', '0 0 * * 1']

export async function POST(request: NextRequest) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { url, schedule = '0 0 * * *', notify_email, alert_on_drop, alert_below } = body as {
    url?: string
    schedule?: string
    notify_email?: string
    alert_on_drop?: number
    alert_below?: number
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!notify_email || typeof notify_email !== 'string' || !notify_email.includes('@')) {
    return NextResponse.json({ error: 'notify_email is required (valid email address)' }, { status: 400 })
  }
  if (!VALID_SCHEDULES.includes(schedule)) {
    return NextResponse.json({
      error: `Invalid schedule. Valid values: ${VALID_SCHEDULES.join(', ')}`,
    }, { status: 400 })
  }

  const { data: monitor, error } = await admin()
    .from('monitors')
    .insert({
      user_id: auth.userId,
      url,
      schedule,
      notify_email,
      alert_on_drop: typeof alert_on_drop === 'number' ? alert_on_drop : null,
      alert_below: typeof alert_below === 'number' ? alert_below : null,
    })
    .select('id, url, schedule, active, notify_email, alert_on_drop, alert_below, created_at')
    .single()

  if (error || !monitor) {
    console.error('[monitors/post] DB error:', error?.message)
    return NextResponse.json({ error: 'Failed to create monitor' }, { status: 500 })
  }

  try {
    const jobName = `monitor-${monitor.id}`
    await monitorQueue.removeRepeatable(jobName, { pattern: schedule }).catch(() => {})
    await monitorQueue.add(
      jobName,
      { monitorId: monitor.id, userId: auth.userId, url, modules: ['seo', 'geo', 'ai', 'security'] },
      { repeat: { pattern: schedule } }
    )
  } catch (queueErr) {
    console.error('[monitors/post] Failed to schedule BullMQ job:', queueErr)
    await admin()
      .from('monitors')
      .update({ active: false })
      .eq('id', monitor.id)
      .then(undefined, () => {})
    return NextResponse.json({ error: 'Monitor created but scheduling failed — please retry' }, { status: 503 })
  }

  return NextResponse.json(monitor, { status: 201 })
}

export async function GET(request: NextRequest) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: monitors, error } = await admin()
    .from('monitors')
    .select('id, url, schedule, active, notify_email, alert_on_drop, alert_below, last_score, last_run_at, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch monitors' }, { status: 500 })

  return NextResponse.json({ monitors: monitors ?? [] })
}
