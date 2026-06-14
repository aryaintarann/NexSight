import crypto from 'crypto'
import axios from 'axios'
import { createClient as createAdmin } from '@supabase/supabase-js'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function fireWebhooks(
  userId: string,
  event: 'scan.done' | 'scan.failed',
  payload: { scan_id: string; url: string; status: string; overall_score?: number | null }
): Promise<void> {
  const { data: hooks, error: hooksError } = await admin()
    .from('webhooks')
    .select('url, secret')
    .eq('user_id', userId)
    .eq('active', true)
    .contains('events', [event])

  if (hooksError) {
    console.error('[webhooks/send] DB error fetching hooks:', hooksError.message)
    return
  }
  if (!hooks || hooks.length === 0) return

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  })

  await Promise.allSettled(
    hooks.map(async (hook) => {
      const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex')
      await axios.post(hook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-NexSight-Event': event,
          'X-NexSight-Signature': `sha256=${sig}`,
        },
        timeout: 10000,
      })
    })
  )
}
