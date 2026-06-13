import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scanQueue } from '@/jobs/queue'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { url, modules = ['seo', 'geo', 'ai', 'security'] } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Validate URL and block private IPs (SSRF protection)
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 })
    }
    const hostname = parsed.hostname
    const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^::1$/, /^localhost$/i]
    if (privateRanges.some((r) => r.test(hostname))) {
      return NextResponse.json({ error: 'Private IP addresses are not allowed' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }

  const { data: scan, error } = await supabase
    .from('scans')
    .insert({ user_id: user.id, url, status: 'queued' })
    .select()
    .single()

  if (error || !scan) {
    return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })
  }

  await scanQueue.add('run-scan', { scanId: scan.id, url, modules, userId: user.id })

  return NextResponse.json({ scan_id: scan.id, status: 'queued', url, created_at: scan.created_at }, { status: 201 })
}
