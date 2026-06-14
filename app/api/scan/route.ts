import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scanQueue } from '@/jobs/queue'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip)

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.', resetIn: rl.resetIn },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.resetIn),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
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

  const supabase = await createClient()
  const { data: scan, error } = await supabase
    .from('scans')
    .insert({ url, status: 'queued' })
    .select()
    .single()

  if (error || !scan) {
    return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })
  }

  await scanQueue.add('run-scan', { scanId: scan.id, url, modules })

  return NextResponse.json(
    { scan_id: scan.id, status: 'queued', url, created_at: scan.created_at },
    {
      status: 201,
      headers: { 'X-RateLimit-Remaining': String(rl.remaining) },
    }
  )
}
