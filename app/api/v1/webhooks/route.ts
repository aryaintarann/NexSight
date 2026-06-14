import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/auth/api-auth'
import { createClient as createAdmin } from '@supabase/supabase-js'
import crypto from 'crypto'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const VALID_EVENTS = ['scan.done', 'scan.failed']

export async function POST(request: NextRequest) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { url, events } = body as { url?: string; events?: string[] }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const secret = crypto.randomBytes(32).toString('hex')
  const selectedEvents = Array.isArray(events)
    ? events.filter((e) => VALID_EVENTS.includes(e))
    : VALID_EVENTS

  if (selectedEvents.length === 0) {
    return NextResponse.json({ error: `events must include at least one of: ${VALID_EVENTS.join(', ')}` }, { status: 400 })
  }

  const { data: hook, error } = await admin()
    .from('webhooks')
    .insert({ user_id: auth.userId, url, secret, events: selectedEvents })
    .select('id, url, events, active, created_at')
    .single()

  if (error || !hook) return NextResponse.json({ error: 'Failed to register webhook' }, { status: 500 })

  return NextResponse.json(
    { ...hook, secret, warning: 'Store the secret — use it to verify X-NexSight-Signature on incoming requests.' },
    { status: 201 }
  )
}

export async function GET(request: NextRequest) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: hooks } = await admin()
    .from('webhooks')
    .select('id, url, events, active, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ webhooks: hooks ?? [] })
}
