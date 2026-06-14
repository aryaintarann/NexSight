import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getScoreColor } from '@/lib/scoring'
import ScoreGauge from '@/components/dashboard/ScoreGauge'
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus'
import SeverityBadge from '@/components/dashboard/SeverityBadge'
import DownloadButtons from './DownloadButtons'
import RadarWrapper from './RadarWrapper'
import type { Scan, ScanIssueRow } from '@/types'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const

function moduleLabel(mod: string) {
  return { seo: 'SEO', geo: 'GEO', ai: 'AI Visibility', security: 'Security' }[mod] ?? mod.toUpperCase()
}

export default async function ResultPage({
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

  const hostname = (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()
  const scannedAt = scan.completed_at
    ? new Date(scan.completed_at).toLocaleString()
    : new Date(scan.created_at).toLocaleString()

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
              <span className="text-cyan-400 text-sm font-bold">N</span>
            </div>
            <span className="font-semibold text-white">NexSight</span>
          </Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← New Scan
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-1 break-all">{hostname}</h1>
          <p className="text-slate-400 text-sm break-all">{scan.url}</p>
          {scan.status === 'done' && (
            <p className="text-slate-500 text-xs mt-1">Scanned {scannedAt}</p>
          )}
        </div>

        <div className="mb-6">
          <RealtimeStatus scanId={id} initialScan={typedScan} />
        </div>

        {scan.status === 'failed' && (
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-6 text-center">
            <p className="text-red-400 font-medium mb-2">Scan failed</p>
            <p className="text-slate-400 text-sm">{scan.error_message ?? 'An unknown error occurred.'}</p>
            <Link href="/" className="mt-4 inline-block text-cyan-400 text-sm hover:underline">
              Try another URL →
            </Link>
          </div>
        )}

        {(scan.status === 'queued' || scan.status === 'running') && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-10 text-center">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-300 font-medium">Scanning your website…</p>
            <p className="text-slate-500 text-sm mt-1">This typically takes 30–90 seconds</p>
          </div>
        )}

        {scan.status === 'done' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col items-center gap-4">
                <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">NexSight Score</p>
                <ScoreGauge score={scan.overall_score ?? 0} size="lg" showGrade />
                <div className="flex gap-4 text-xs text-center">
                  {[
                    { label: 'Critical', count: issues.filter((i) => i.severity === 'critical').length, color: 'text-red-400' },
                    { label: 'High', count: issues.filter((i) => i.severity === 'high').length, color: 'text-orange-400' },
                    { label: 'Medium', count: issues.filter((i) => i.severity === 'medium').length, color: 'text-yellow-400' },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className={`font-bold text-base ${s.color}`}>{s.count}</p>
                      <p className="text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
                <RadarWrapper
                  seo={scan.seo_score ?? 0}
                  geo={scan.geo_score ?? 0}
                  ai={scan.ai_score ?? 0}
                  security={scan.sec_score ?? 0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'SEO', score: scan.seo_score ?? 0, mod: 'seo' },
                { label: 'GEO', score: scan.geo_score ?? 0, mod: 'geo' },
                { label: 'AI Visibility', score: scan.ai_score ?? 0, mod: 'ai' },
                { label: 'Security', score: scan.sec_score ?? 0, mod: 'security' },
              ].map((m) => {
                const issueCount = issues.filter((i) => i.module === m.mod).length
                return (
                  <div key={m.mod} className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-2">
                    <ScoreGauge score={m.score} size="sm" label={m.label} showGrade />
                    <p className="text-slate-500 text-xs">{issueCount} issue{issueCount !== 1 ? 's' : ''}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Download Report</h2>
              <DownloadButtons scanId={id} />
            </div>

            {issues.length > 0 ? (
              <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                  <h2 className="font-semibold text-white">{issues.length} Issue{issues.length !== 1 ? 's' : ''} Found</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="text-left px-5 py-3 font-medium">Severity</th>
                        <th className="text-left px-5 py-3 font-medium">Module</th>
                        <th className="text-left px-5 py-3 font-medium">Issue</th>
                        <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SEVERITY_ORDER.flatMap((sev) =>
                        issues
                          .filter((i) => i.severity === sev)
                          .map((issue) => (
                            <tr key={`${issue.code}-${issue.title}`} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                              <td className="px-5 py-3 whitespace-nowrap">
                                <SeverityBadge severity={issue.severity} />
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                <span className="text-xs font-mono text-cyan-400/80 bg-cyan-400/10 px-2 py-0.5 rounded">
                                  {moduleLabel(issue.module)}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <p className="text-white font-medium text-xs">{issue.title}</p>
                                {issue.code && (
                                  <p className="text-slate-500 text-xs mt-0.5 font-mono">{issue.code}</p>
                                )}
                              </td>
                              <td className="px-5 py-3 text-slate-400 text-xs hidden md:table-cell max-w-xs">
                                {issue.recommendation}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-8 text-center">
                <p className="text-emerald-400 font-medium text-lg">No issues found!</p>
                <p className="text-slate-400 text-sm mt-1">Your website passed all checks.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
