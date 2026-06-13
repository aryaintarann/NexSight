import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendations } from '@/lib/ai/recommendations'
import type { Scan, ScanIssueRow } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: scan } = await supabase
    .from('scans')
    .select('*, scan_issues(*)')
    .eq('id', id)
    .single()

  if (!scan || scan.status !== 'done') {
    return NextResponse.json({ recommendations: [] })
  }

  const typedScan = scan as Scan & { scan_issues: ScanIssueRow[] }
  const topIssues = typedScan.scan_issues
    .filter((i) => ['critical', 'high', 'medium'].includes(i.severity))
    .slice(0, 8)
    .map((i) => ({ module: i.module, severity: i.severity, title: i.title, code: i.code }))

  const recommendations = await generateRecommendations(
    typedScan.url,
    typedScan.overall_score ?? 0,
    topIssues
  )

  return NextResponse.json({ recommendations })
}
