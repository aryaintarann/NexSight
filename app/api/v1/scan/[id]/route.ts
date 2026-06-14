import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/auth/api-auth'
import { createClient as createAdmin } from '@supabase/supabase-js'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: scan } = await admin()
    .from('scans')
    .select('id, url, status, overall_score, seo_score, geo_score, ai_score, sec_score, scan_duration, error_message, created_at, completed_at')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

  return NextResponse.json({
    id: scan.id,
    url: scan.url,
    status: scan.status,
    overall_score: scan.overall_score,
    scores: {
      seo: scan.seo_score,
      geo: scan.geo_score,
      ai: scan.ai_score,
      security: scan.sec_score,
    },
    scan_duration_ms: scan.scan_duration,
    error_message: scan.error_message ?? undefined,
    created_at: scan.created_at,
    completed_at: scan.completed_at,
  })
}
