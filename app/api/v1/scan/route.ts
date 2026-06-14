import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/auth/api-auth'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { scanQueue } from '@/jobs/queue'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { url, modules = ['seo', 'geo', 'ai', 'security'] } = body as { url?: string; modules?: string[] }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const { data: scan, error } = await admin()
    .from('scans')
    .insert({ user_id: auth.userId, url, status: 'queued' })
    .select()
    .single()

  if (error || !scan) return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })

  try {
    await scanQueue.add('run-scan', { scanId: scan.id, url, modules, userId: auth.userId })
  } catch (err) {
    console.error('[scan] Failed to enqueue scan:', err)
    await admin().from('scans').update({ status: 'failed', error_message: 'Queue unavailable' }).eq('id', scan.id)
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }

  return NextResponse.json(
    { scan_id: scan.id, status: 'queued', url, created_at: scan.created_at },
    { status: 201 }
  )
}
