import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGrade, getGradeLabel, getScoreColor } from '@/lib/scoring'
import ScoreGauge from '@/components/dashboard/ScoreGauge'
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus'
import SeverityBadge from '@/components/dashboard/SeverityBadge'
import DownloadButtons from './DownloadButtons'
import RadarWrapper from './RadarWrapper'
import type { Scan, ScanIssueRow } from '@/types'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const

const SEVERITY_META = {
  critical: { label: 'Critical', bg: 'bg-red-950/40', border: 'border-red-800/40', text: 'text-red-400', dot: 'bg-red-500' },
  high:     { label: 'High',     bg: 'bg-orange-950/30', border: 'border-orange-800/40', text: 'text-orange-400', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   bg: 'bg-yellow-950/20', border: 'border-yellow-800/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  low:      { label: 'Low',      bg: 'bg-slate-800/30', border: 'border-slate-700/40', text: 'text-slate-400', dot: 'bg-slate-500' },
  info:     { label: 'Info',     bg: 'bg-blue-950/20', border: 'border-blue-800/30', text: 'text-blue-400', dot: 'bg-blue-500' },
}

const MODULES = [
  { key: 'seo' as const, label: 'SEO', icon: '🔍', desc: 'Search Engine Optimization' },
  { key: 'geo' as const, label: 'GEO', icon: '🌐', desc: 'Generative Engine Optimization' },
  { key: 'ai'  as const, label: 'AI',  icon: '🤖', desc: 'AI Search Visibility' },
  { key: 'sec' as const, label: 'Security', icon: '🔒', desc: 'Security & Headers' },
]

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-white font-bold text-sm w-8 text-right">{score}</span>
    </div>
  )
}

function moduleLabel(mod: string) {
  return { seo: 'SEO', geo: 'GEO', ai: 'AI', security: 'Security' }[mod] ?? mod.toUpperCase()
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
  const scannedAt = scan.completed_at ? new Date(scan.completed_at).toLocaleString() : null
  const duration = scan.scan_duration ? `${(scan.scan_duration / 1000).toFixed(1)}s` : null

  const grade = getGrade(scan.overall_score ?? 0)
  const gradeLabel = getGradeLabel(grade)
  const overallColor = getScoreColor(scan.overall_score ?? 0)

  const severityCounts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high:     issues.filter((i) => i.severity === 'high').length,
    medium:   issues.filter((i) => i.severity === 'medium').length,
    low:      issues.filter((i) => i.severity === 'low').length,
    info:     issues.filter((i) => i.severity === 'info').length,
  }

  const moduleScores = {
    seo: scan.seo_score ?? 0,
    geo: scan.geo_score ?? 0,
    ai:  scan.ai_score  ?? 0,
    sec: scan.sec_score ?? 0,
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="border-b border-slate-800/60 px-6 py-4 sticky top-0 bg-[#020617]/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
              <span className="text-cyan-400 text-xs font-bold">N</span>
            </div>
            <span className="font-semibold text-white text-sm">NexSight</span>
          </Link>
          <div className="flex items-center gap-4">
            <RealtimeStatus scanId={id} initialScan={typedScan} />
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg">
              ← New Scan
            </Link>
          </div>
        </div>
      </header>

      {/* URL banner */}
      <div className="border-b border-slate-800/40 bg-[#0a0f1e] px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Scan Target</p>
              <h1 className="text-lg font-bold text-white">{hostname}</h1>
              <p className="text-slate-500 text-xs mt-0.5 break-all max-w-lg">{scan.url}</p>
            </div>
            {scannedAt && (
              <div className="text-right shrink-0">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Completed</p>
                <p className="text-slate-300 text-sm">{scannedAt}</p>
                {duration && <p className="text-slate-500 text-xs mt-0.5">Duration: {duration}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Failed state */}
        {scan.status === 'failed' && (
          <div className="bg-red-950/20 border border-red-800/40 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-xl">✕</span>
            </div>
            <p className="text-red-400 font-semibold text-lg mb-2">Scan Failed</p>
            <p className="text-slate-400 text-sm max-w-md mx-auto">{scan.error_message ?? 'An unknown error occurred while scanning.'}</p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-[#020617] font-semibold rounded-xl text-sm hover:bg-cyan-300 transition-colors">
              Try Another URL →
            </Link>
          </div>
        )}

        {/* Loading state */}
        {(scan.status === 'queued' || scan.status === 'running') && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <div className="absolute inset-2 rounded-full border border-cyan-400/20 border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <p className="text-white font-semibold text-lg mb-2">Analyzing your website…</p>
            <p className="text-slate-500 text-sm mb-6">Running SEO, GEO, AI visibility, and security checks</p>
            <div className="flex justify-center gap-6 text-xs text-slate-600">
              {['SEO', 'GEO', 'AI', 'Security'].map((m) => (
                <div key={m} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50 animate-pulse" />
                  {m}
                </div>
              ))}
            </div>
          </div>
        )}

        {scan.status === 'done' && (
          <>
            {/* ── Hero Score Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Overall score */}
              <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 50% 50%, ${overallColor}, transparent 70%)` }} />
                <p className="text-slate-400 text-xs uppercase tracking-widest font-medium relative z-10">Overall Score</p>
                <ScoreGauge score={scan.overall_score ?? 0} size="lg" showGrade />
                <div className="text-center relative z-10">
                  <p className="font-semibold text-sm" style={{ color: overallColor }}>{gradeLabel}</p>
                </div>
              </div>

              {/* Severity summary + module bars */}
              <div className="lg:col-span-3 bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-5">
                {/* Severity row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Critical', count: severityCounts.critical, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'High',     count: severityCounts.high,     color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                    { label: 'Medium',   count: severityCounts.medium,   color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                  ].map((s) => (
                    <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Module score bars */}
                <div className="space-y-3">
                  {MODULES.map((m) => {
                    const score = moduleScores[m.key as keyof typeof moduleScores]
                    const color = getScoreColor(score)
                    const count = issues.filter((i) => i.module === (m.key === 'sec' ? 'security' : m.key)).length
                    return (
                      <div key={m.key} className="flex items-center gap-3">
                        <span className="text-sm w-4">{m.icon}</span>
                        <span className="text-slate-300 text-xs w-16 shrink-0">{m.label}</span>
                        <ScoreBar score={score} color={color} />
                        <span className="text-slate-500 text-xs w-16 text-right shrink-0">
                          {count} issue{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Radar + Download ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-4">Score Distribution</p>
                <RadarWrapper
                  seo={moduleScores.seo}
                  geo={moduleScores.geo}
                  ai={moduleScores.ai}
                  security={moduleScores.sec}
                />
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-4">Download Report</p>
                  <p className="text-slate-400 text-sm mb-6">
                    Export the full analysis including all {issues.length} issues, module scores, and recommendations.
                  </p>
                </div>
                <div className="space-y-2">
                  <DownloadButtons scanId={id} />
                </div>
              </div>
            </div>

            {/* ── Issues ── */}
            {issues.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white">{issues.length} Issue{issues.length !== 1 ? 's' : ''} Found</h2>
                  <div className="flex gap-2">
                    {SEVERITY_ORDER.filter((s) => severityCounts[s] > 0).map((s) => {
                      const m = SEVERITY_META[s]
                      return (
                        <span key={s} className={`text-xs px-2 py-0.5 rounded-md border ${m.bg} ${m.border} ${m.text}`}>
                          {severityCounts[s]} {m.label}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {SEVERITY_ORDER.map((sev) => {
                  const sevIssues = issues.filter((i) => i.severity === sev)
                  if (sevIssues.length === 0) return null
                  const meta = SEVERITY_META[sev]
                  return (
                    <div key={sev} className={`border rounded-2xl overflow-hidden ${meta.border}`}>
                      {/* Severity header */}
                      <div className={`px-5 py-3 flex items-center gap-2 ${meta.bg} border-b ${meta.border}`}>
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        <span className={`font-semibold text-sm ${meta.text}`}>{meta.label}</span>
                        <span className="text-slate-500 text-xs">— {sevIssues.length} issue{sevIssues.length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Issue rows */}
                      <div className="bg-[#0a0f1e] divide-y divide-slate-800/60">
                        {sevIssues.map((issue, idx) => (
                          <div key={`${issue.code}-${idx}`} className="px-5 py-4 hover:bg-slate-800/20 transition-colors">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-mono text-cyan-400/70 bg-cyan-400/10 px-2 py-0.5 rounded mt-0.5 shrink-0">
                                {moduleLabel(issue.module)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm leading-snug">{issue.title}</p>
                                {issue.code && (
                                  <p className="text-slate-600 text-xs font-mono mt-0.5">{issue.code}</p>
                                )}
                                {issue.description && (
                                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{issue.description}</p>
                                )}
                                {issue.recommendation && (
                                  <div className="mt-2 flex gap-2">
                                    <span className="text-cyan-400 text-xs shrink-0 mt-0.5">→</span>
                                    <p className="text-slate-300 text-xs leading-relaxed">{issue.recommendation}</p>
                                  </div>
                                )}
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
              <div className="bg-emerald-950/10 border border-emerald-800/30 rounded-2xl p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-emerald-400 text-2xl">✓</span>
                </div>
                <p className="text-emerald-400 font-semibold text-xl mb-1">All Clear!</p>
                <p className="text-slate-400 text-sm">No issues found. Your website passed all checks.</p>
              </div>
            )}

            {/* Bottom CTA */}
            <div className="border border-slate-800 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white font-semibold">Scan another website</p>
                <p className="text-slate-500 text-sm mt-0.5">NexSight is free and requires no account</p>
              </div>
              <Link href="/" className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-[#020617] font-semibold rounded-xl text-sm transition-colors shrink-0">
                New Scan →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
