import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHtmlReport } from '@/lib/report/html'
import type { Scan, ScanIssueRow } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: scan, error } = await supabase
    .from('scans')
    .select('*, scan_issues(*)')
    .eq('id', id)
    .single()

  if (error || !scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  }

  if (scan.status !== 'done') {
    return NextResponse.json({ error: 'Scan not completed yet' }, { status: 400 })
  }

  const html = generateHtmlReport(scan as Scan & { scan_issues: ScanIssueRow[] })
  const hostname = new URL(scan.url).hostname.replace(/\./g, '-')
  const filename = `nexsight-report-${hostname}-${id.slice(0, 8)}.html`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
