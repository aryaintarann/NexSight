import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/auth/api-auth'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { generateHtmlReport } from '@/lib/report/html'
import { generatePdfReport } from '@/lib/report/pdf'
import type { Scan, ScanIssueRow } from '@/types'

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
  const format = request.nextUrl.searchParams.get('format') ?? 'html'

  const { data: scan } = await admin()
    .from('scans')
    .select('*, scan_issues(*)')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  if (scan.status !== 'done') return NextResponse.json({ error: 'Scan not completed yet' }, { status: 400 })

  const typedScan = scan as Scan & { scan_issues: ScanIssueRow[] }
  const hostname = new URL(scan.url).hostname.replace(/\./g, '-')

  if (format === 'pdf') {
    const pdfBuffer = await generatePdfReport(typedScan)
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="nexsight-${hostname}-${id.slice(0, 8)}.pdf"`,
      },
    })
  }

  const html = generateHtmlReport(typedScan)
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="nexsight-${hostname}-${id.slice(0, 8)}.html"`,
    },
  })
}
