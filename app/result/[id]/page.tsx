import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGrade, getGradeLabel, getScoreColor } from '@/lib/scoring'
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus'
import DownloadButtons from './DownloadButtons'
import RadarWrapper from './RadarWrapper'
import type { Scan, ScanIssueRow } from '@/types'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#ef4444', textClass: 'text-red-400' },
  high:     { label: 'High',     color: '#f97316', textClass: 'text-orange-400' },
  medium:   { label: 'Medium',   color: '#eab308', textClass: 'text-yellow-400' },
  low:      { label: 'Low',      color: '#64748b', textClass: 'text-slate-400' },
  info:     { label: 'Info',     color: '#3b82f6', textClass: 'text-blue-400' },
}

const MODULE_MAP: Record<string, string> = {
  seo: 'SEO', geo: 'GEO', ai: 'AI', security: 'Security',
}

function ScoreBar({ score }: { score: number }) {
  const color = getScoreColor(score)
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-sm font-semibold text-white w-7 text-right tabular-nums">{score}</span>
    </div>
  )
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
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
  const grade    = getGrade(scan.overall_score ?? 0)
  const gradeLbl = getGradeLabel(grade)
  const mainColor = getScoreColor(scan.overall_score ?? 0)

  const sevCounts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high:     issues.filter((i) => i.severity === 'high').length,
    medium:   issues.filter((i) => i.severity === 'medium').length,
    low:      issues.filter((i) => i.severity === 'low').length,
    info:     issues.filter((i) => i.severity === 'info').length,
  }

  const modules = [
    { key: 'seo',      label: 'SEO',        score: scan.seo_score ?? 0 },
    { key: 'geo',      label: 'GEO',        score: scan.geo_score ?? 0 },
    { key: 'ai',       label: 'AI Search',  score: scan.ai_score  ?? 0 },
    { key: 'security', label: 'Security',   score: scan.sec_score ?? 0 },
  ]

  return (
    <div className="min-h-screen bg-[#030712] text-white">

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="h-14 border-b border-white/5 flex items-center px-6">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded bg-cyan-400/15 flex items-center justify-center">
              <span className="text-cyan-400 text-xs font-bold">N</span>
            </div>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">NexSight</span>
          </Link>
          <div className="flex items-center gap-5">
            {scan.status !== 'done' && scan.status !== 'failed' && (
              <RealtimeStatus scanId={id} initialScan={typedScan} />
            )}
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← New scan
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* ── URL ─────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">Scan result</p>
          <h1 className="text-2xl font-semibold text-white truncate">{hostname}</h1>
          <p className="text-sm text-slate-600 mt-0.5 truncate">{scan.url}</p>
        </div>

        {/* ── FAILED ──────────────────────────────────────── */}
        {scan.status === 'failed' && (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-10 text-center space-y-3">
            <p className="text-red-400 font-medium">Scan failed</p>
            <p className="text-sm text-slate-500">{scan.error_message ?? 'An unknown error occurred.'}</p>
            <Link href="/" className="inline-block mt-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              Try another URL →
            </Link>
          </div>
        )}

        {/* ── LOADING ─────────────────────────────────────── */}
        {(scan.status === 'queued' || scan.status === 'running') && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-14 text-center space-y-4">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-white font-medium">Analyzing your website</p>
              <p className="text-sm text-slate-600">SEO · GEO · AI visibility · Security</p>
            </div>
            <RealtimeStatus scanId={id} initialScan={typedScan} />
          </div>
        )}

        {/* ── DONE ────────────────────────────────────────── */}
        {scan.status === 'done' && (
          <>
            {/* Score hero */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="p-8 flex flex-col sm:flex-row items-center gap-8">

                {/* Big score */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-7xl font-bold tabular-nums" style={{ color: mainColor }}>
                    {scan.overall_score ?? 0}
                  </span>
                  <span className="text-xs text-slate-600 uppercase tracking-widest">out of 100</span>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-20 bg-white/5" />
                <div className="sm:hidden w-24 h-px bg-white/5" />

                {/* Grade + modules */}
                <div className="flex-1 w-full space-y-5">
                  <div>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xl font-semibold" style={{ color: mainColor }}>Grade {grade}</span>
                    </div>
                    <p className="text-sm text-slate-500">{gradeLbl}</p>
                  </div>

                  <div className="space-y-2.5">
                    {modules.map((m) => (
                      <div key={m.key} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-16 shrink-0">{m.label}</span>
                        <ScoreBar score={m.score} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Severity strip */}
              {issues.length > 0 && (
                <div className="border-t border-white/5 px-8 py-3 flex items-center gap-6">
                  <span className="text-xs text-slate-600">{issues.length} issues</span>
                  {SEVERITY_ORDER.filter((s) => sevCounts[s] > 0).map((s) => (
                    <span key={s} className={`text-xs ${SEVERITY_CONFIG[s].textClass}`}>
                      {sevCounts[s]} {SEVERITY_CONFIG[s].label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Radar + Download */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-xs text-slate-600 uppercase tracking-widest mb-4">Distribution</p>
                <RadarWrapper
                  seo={scan.seo_score ?? 0}
                  geo={scan.geo_score ?? 0}
                  ai={scan.ai_score ?? 0}
                  security={scan.sec_score ?? 0}
                />
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-xs text-slate-600 uppercase tracking-widest mb-4">Export Report</p>
                <DownloadButtons scanId={id} />
              </div>
            </div>

            {/* Issues */}
            {issues.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-sm font-medium text-slate-400">{issues.length} Issues Found</h2>

                {SEVERITY_ORDER.map((sev) => {
                  const group = issues.filter((i) => i.severity === sev)
                  if (group.length === 0) return null
                  const cfg = SEVERITY_CONFIG[sev]
                  return (
                    <div key={sev}>
                      {/* Group header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                        <span className={`text-xs font-medium ${cfg.textClass}`}>{cfg.label}</span>
                        <span className="text-xs text-slate-700">· {group.length}</span>
                      </div>

                      {/* Issue rows */}
                      <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                        {group.map((issue, i) => (
                          <div
                            key={`${issue.code}-${i}`}
                            className="flex gap-0 bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
                          >
                            {/* Severity bar */}
                            <div className="w-0.5 shrink-0" style={{ background: cfg.color }} />

                            <div className="px-5 py-4 flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white leading-snug">{issue.title}</p>
                                  {issue.description && (
                                    <p className="text-xs text-slate-600 mt-1">{issue.description}</p>
                                  )}
                                  {issue.recommendation && (
                                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                      <span className="text-slate-600">Fix: </span>
                                      {issue.recommendation}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-slate-600 font-mono shrink-0 mt-0.5">
                                  {MODULE_MAP[issue.module] ?? issue.module.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center space-y-2">
                <p className="text-white font-medium">No issues found</p>
                <p className="text-sm text-slate-600">Your website passed all checks.</p>
              </div>
            )}

            {/* Footer CTA */}
            <div className="flex items-center justify-between pt-2 pb-6">
              <p className="text-sm text-slate-600">Want to scan another site?</p>
              <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                New scan →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
