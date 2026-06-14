import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendScoreAlert } from '@/lib/email/send'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function checkMonitorAlert(
  scanId: string,
  monitorId: string,
  overallScore: number
): Promise<void> {
  const { data: monitor, error: monitorError } = await admin()
    .from('monitors')
    .select('id, url, alert_on_drop, alert_below, notify_email, active')
    .eq('id', monitorId)
    .single()

  if (monitorError && monitorError.code !== 'PGRST116') {
    console.error('[alerts] monitor lookup failed:', monitorError.message)
  }
  if (!monitor || !monitor.active) return

  // Get the two most recent runs for this monitor
  const { data: runs } = await admin()
    .from('monitor_runs')
    .select('id, score, scan_id')
    .eq('monitor_id', monitorId)
    .order('created_at', { ascending: false })
    .limit(2)

  const currentRun = runs?.find((r) => r.scan_id === scanId)
  const prevRun = runs?.find((r) => r.scan_id !== scanId)
  const prevScore = prevRun?.score ?? null

  // Update current run with score + prev_score
  if (currentRun) {
    await admin()
      .from('monitor_runs')
      .update({ score: overallScore, prev_score: prevScore })
      .eq('id', currentRun.id)
  }

  // Cache last_score + last_run_at on the monitor row
  await admin()
    .from('monitors')
    .update({ last_score: overallScore, last_run_at: new Date().toISOString() })
    .eq('id', monitorId)

  // Evaluate alert conditions
  let shouldAlert = false

  if (monitor.alert_on_drop !== null && prevScore !== null) {
    const drop = prevScore - overallScore
    if (drop >= monitor.alert_on_drop) shouldAlert = true
  }

  if (monitor.alert_below !== null && overallScore < monitor.alert_below) {
    shouldAlert = true
  }

  if (!shouldAlert) return

  await sendScoreAlert({
    to: monitor.notify_email,
    url: monitor.url,
    score: overallScore,
    prevScore,
    scanId,
  }).catch((e: Error) => console.error('[alerts] email send failed:', e.message))

  if (currentRun) {
    await admin()
      .from('monitor_runs')
      .update({ alerted: true })
      .eq('id', currentRun.id)
  }
}
