import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ScoreGauge from '@/components/dashboard/ScoreGauge'
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus'
import SeverityBadge from '@/components/dashboard/SeverityBadge'
import ScoreRadar from '@/components/dashboard/ScoreRadar'
import AiRecommendations from '@/components/dashboard/AiRecommendations'
import { getGradeLabel, getGrade } from '@/lib/scoring'
import type { Scan, ScanIssueRow } from '@/types'

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: scan, error } = await supabase
    .from('scans')
    .select('*, scan_issues(*)')
    .eq('id', id)
    .single()

  if (error || !scan) notFound()

  const typedScan = scan as Scan & { scan_issues: ScanIssueRow[] }
  const issues = typedScan.scan_issues ?? []

  const modules = [
    { key: 'seo',      label: 'SEO',           score: typedScan.seo_score,  color: '#22d3ee' },
    { key: 'geo',      label: 'GEO',           score: typedScan.geo_score,  color: '#a78bfa' },
    { key: 'ai',       label: 'AI Visibility', score: typedScan.ai_score,   color: '#34d399' },
    { key: 'security', label: 'Security',      score: typedScan.sec_score,  color: '#fb7185' },
  ]

  const issuesByModule = {
    seo: issues.filter((i) => i.module === 'seo'),
    geo: issues.filter((i) => i.module === 'geo'),
    ai: issues.filter((i) => i.module === 'ai'),
    security: issues.filter((i) => i.module === 'security'),
  }

  const issueCountBySeverity = (list: ScanIssueRow[]) => ({
    critical: list.filter((i) => i.severity === 'critical').length,
    high: list.filter((i) => i.severity === 'high').length,
    medium: list.filter((i) => i.severity === 'medium').length,
    low: list.filter((i) => i.severity === 'low').length,
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <RealtimeStatus scanId={id} initialScan={typedScan as unknown as Scan} />
          {typedScan.status === 'done' && (
            <div className="flex items-center gap-2">
              <a href={`/api/report/${id}`} download
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                HTML
              </a>
              <a href={`/api/report/${id}?format=pdf`} download
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PDF
              </a>
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold text-white truncate">{typedScan.url}</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {typedScan.completed_at
            ? `Completed ${new Date(typedScan.completed_at).toLocaleString()} · ${typedScan.scan_duration ? `${(typedScan.scan_duration / 1000).toFixed(1)}s` : ''}`
            : `Started ${new Date(typedScan.created_at).toLocaleString()}`
          }
        </p>
      </div>

      {typedScan.overall_score != null && (
        <>
          {/* Overall score */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8 mb-6 flex items-center gap-10">
            <ScoreGauge score={typedScan.overall_score} size="lg" showGrade />
            <div>
              <div className="text-slate-400 text-sm mb-1">NexSight Score</div>
              <div className="text-4xl font-bold text-white mb-1">{typedScan.overall_score}<span className="text-slate-500 text-xl">/100</span></div>
              <div className="text-slate-300 text-sm">{getGradeLabel(getGrade(typedScan.overall_score))}</div>
              <div className="flex gap-4 mt-4">
                {['critical', 'high', 'medium'].map((sev) => {
                  const count = issues.filter((i) => i.severity === sev).length
                  if (count === 0) return null
                  return (
                    <div key={sev} className="text-center">
                      <div className="text-lg font-bold text-white">{count}</div>
                      <div className="text-xs text-slate-500 capitalize">{sev}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Score radar chart */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="text-slate-400 text-sm font-medium mb-4">Score Breakdown</div>
            <ScoreRadar
              seo={typedScan.seo_score ?? 0}
              geo={typedScan.geo_score ?? 0}
              ai={typedScan.ai_score ?? 0}
              security={typedScan.sec_score ?? 0}
            />
          </div>

          {/* Module scores */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {modules.map(({ key, label, score, color }) => (
              <div key={key} className="bg-[#0f172a] border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-sm font-medium">{label}</span>
                  <span className="text-xs text-slate-600 font-mono">{issuesByModule[key as keyof typeof issuesByModule].length} issues</span>
                </div>
                <ScoreGauge score={score ?? 0} size="sm" />
                <div className="mt-3 flex gap-2 text-xs text-slate-500">
                  {Object.entries(issueCountBySeverity(issuesByModule[key as keyof typeof issuesByModule])).map(([sev, cnt]) =>
                    cnt > 0 ? <span key={sev}>{cnt} {sev}</span> : null
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {typedScan.status === 'done' && <AiRecommendations scanId={id} />}

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
                    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
                    return (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
                  })
                  .map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-400 uppercase">{issue.module}</span>
                      </td>
                      <td className="px-6 py-4">
                        <SeverityBadge severity={issue.severity} />
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{issue.code}</code>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-white font-medium">{issue.title}</div>
                        {issue.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{issue.description}</div>}
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

      {typedScan.status === 'failed' && typedScan.error_message && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
          <h3 className="text-red-400 font-medium mb-2">Scan failed</h3>
          <p className="text-red-300 text-sm font-mono">{typedScan.error_message}</p>
        </div>
      )}
    </div>
  )
}
