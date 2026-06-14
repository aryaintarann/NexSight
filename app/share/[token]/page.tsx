import { notFound } from 'next/navigation'
import { createClient as createAdmin } from '@supabase/supabase-js'
import ScoreGauge from '@/components/dashboard/ScoreGauge'
import SeverityBadge from '@/components/dashboard/SeverityBadge'
import ScoreRadar from '@/components/dashboard/ScoreRadar'
import { getGrade, getGradeLabel } from '@/lib/scoring'
import type { Scan, ScanIssueRow } from '@/types'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: scan } = await admin()
    .from('scans')
    .select('*, scan_issues(*)')
    .eq('share_token', token)
    .single()

  if (!scan || scan.status !== 'done') notFound()

  const typedScan = scan as Scan & { scan_issues: ScanIssueRow[] }
  const issues = typedScan.scan_issues ?? []

  return (
    <div className="min-h-screen bg-[#020617] p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-cyan-400 text-sm font-semibold mb-1">NexSight Report</div>
            <h1 className="text-xl font-bold text-white truncate max-w-2xl">{typedScan.url}</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {typedScan.completed_at
                ? `Scanned ${new Date(typedScan.completed_at).toLocaleString()}`
                : ''}
            </p>
          </div>
          <a
            href="/dashboard/new-scan"
            className="text-sm text-cyan-400 hover:text-cyan-300 border border-cyan-900 hover:border-cyan-700 px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            Scan your site →
          </a>
        </div>

        {/* Overall score */}
        {typedScan.overall_score != null && (
          <>
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8 mb-6 flex items-center gap-10">
              <ScoreGauge score={typedScan.overall_score} size="lg" showGrade />
              <div>
                <div className="text-slate-400 text-sm mb-1">NexSight Score</div>
                <div className="text-4xl font-bold text-white mb-1">
                  {typedScan.overall_score}
                  <span className="text-slate-500 text-xl">/100</span>
                </div>
                <div className="text-slate-300 text-sm">{getGradeLabel(getGrade(typedScan.overall_score))}</div>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 mb-6">
              <div className="text-slate-400 text-sm font-medium mb-4">Score Breakdown</div>
              <ScoreRadar
                seo={typedScan.seo_score ?? 0}
                geo={typedScan.geo_score ?? 0}
                ai={typedScan.ai_score ?? 0}
                security={typedScan.sec_score ?? 0}
              />
            </div>
          </>
        )}

        {/* Issues table */}
        {issues.length > 0 && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-white font-semibold">Issues ({issues.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Module', 'Severity', 'Code', 'Issue', 'Recommendation'].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {issues
                    .sort((a, b) => {
                      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
                      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
                    })
                    .map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-slate-400 uppercase">{issue.module}</span>
                        </td>
                        <td className="px-6 py-4"><SeverityBadge severity={issue.severity} /></td>
                        <td className="px-6 py-4">
                          <code className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{issue.code}</code>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-sm text-white font-medium">{issue.title}</div>
                          {issue.description && (
                            <div className="text-xs text-slate-500 mt-0.5 truncate">{issue.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-xs text-slate-400 leading-relaxed">{issue.recommendation}</div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
