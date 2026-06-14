import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Link from 'next/link'
import ScoreGauge from '@/components/dashboard/ScoreGauge'
import SeverityBadge from '@/components/dashboard/SeverityBadge'
import ScoreRadar from '@/components/dashboard/ScoreRadar'
import type { Scan, ScanIssueRow } from '@/types'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type ScanWithIssues = Scan & { scan_issues: ScanIssueRow[] }

const MODULE_SCORE_KEYS: Record<string, keyof Scan> = {
  seo: 'seo_score',
  geo: 'geo_score',
  ai: 'ai_score',
  security: 'sec_score',
}

const MODULE_LABELS: Record<string, string> = {
  seo: 'SEO',
  geo: 'GEO',
  ai: 'AI Visibility',
  security: 'Security',
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const { a, b } = await searchParams
  if (!a || !b || a === b) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [resA, resB] = await Promise.all([
    admin().from('scans').select('*, scan_issues(*)').eq('id', a).eq('user_id', user.id).single(),
    admin().from('scans').select('*, scan_issues(*)').eq('id', b).eq('user_id', user.id).single(),
  ])

  if (!resA.data || !resB.data) notFound()

  const scanA = resA.data as ScanWithIssues
  const scanB = resB.data as ScanWithIssues
  const issuesA = scanA.scan_issues ?? []
  const issuesB = scanB.scan_issues ?? []

  const codesA = new Set(issuesA.map((i) => i.code))
  const codesB = new Set(issuesB.map((i) => i.code))
  const newIssues = issuesB.filter((i) => !codesA.has(i.code))
  const fixedIssues = issuesA.filter((i) => !codesB.has(i.code))
  const persistedIssues = issuesB.filter((i) => codesA.has(i.code))

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Scan Comparison</h1>
          <p className="text-slate-400 mt-0.5">Side-by-side diff of two scan results</p>
        </div>
      </div>

      {/* Headers */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[scanA, scanB].map((scan, i) => (
          <Link key={i} href={`/dashboard/scan/${scan.id}`}
            className="bg-[#0f172a] border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-colors">
            <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">
              {i === 0 ? 'Scan A — Baseline' : 'Scan B — Comparison'}
            </div>
            <div className="text-white text-sm font-medium truncate">{scan.url}</div>
            <div className="text-slate-500 text-xs mt-0.5">
              {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : 'Pending'} ↗
            </div>
          </Link>
        ))}
      </div>

      {/* Overall scores */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-5">Overall Score</h2>
        <div className="grid grid-cols-2 gap-8 mb-6">
          {[scanA, scanB].map((scan, i) => (
            <div key={i} className="flex items-center gap-5">
              <ScoreGauge score={scan.overall_score ?? 0} size="lg" showGrade />
              <div>
                <div className="text-slate-500 text-xs">{i === 0 ? 'A' : 'B'}</div>
                <div className="text-3xl font-bold text-white">{scan.overall_score ?? '—'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Module score bars */}
        <div className="space-y-3">
          {Object.entries(MODULE_LABELS).map(([mod, label]) => {
            const key = MODULE_SCORE_KEYS[mod]
            const sA = (scanA[key] as number | null) ?? 0
            const sB = (scanB[key] as number | null) ?? 0
            const diff = sB - sA
            return (
              <div key={mod} className="flex items-center gap-3">
                <div className="w-24 text-right text-slate-400 text-xs shrink-0">{label}</div>
                <div className="w-9 text-right text-white text-sm font-medium shrink-0">{sA}</div>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div className="absolute left-0 h-2 bg-slate-600 rounded-full" style={{ width: `${sA}%` }} />
                  <div className="absolute left-0 h-2 bg-cyan-400/70 rounded-full" style={{ width: `${sB}%` }} />
                </div>
                <div className="w-9 text-left text-white text-sm font-medium shrink-0">{sB}</div>
                <div className={`w-14 text-right text-xs font-semibold shrink-0 ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-600'}`}>
                  {diff > 0 ? `+${diff}` : diff === 0 ? '—' : `${diff}`}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Radar overlay */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-1">Score Breakdown</h2>
        <p className="text-slate-500 text-xs mb-4">
          <span className="inline-block w-3 h-1 bg-slate-500 rounded mr-1 align-middle" />A baseline
          <span className="inline-block w-3 h-1 bg-cyan-400/70 rounded mr-1 ml-3 align-middle" />B comparison
        </p>
        <ScoreRadar
          seo={scanB.seo_score ?? 0}
          geo={scanB.geo_score ?? 0}
          ai={scanB.ai_score ?? 0}
          security={scanB.sec_score ?? 0}
        />
      </div>

      {/* Issues diff */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-red-900/40 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-red-900/40">
            <h3 className="text-red-400 text-sm font-semibold">New in B ({newIssues.length})</h3>
          </div>
          <div className="divide-y divide-slate-800/60">
            {newIssues.length === 0 ? (
              <p className="text-slate-500 text-xs px-5 py-5">No new issues — great!</p>
            ) : newIssues.map((issue) => (
              <div key={issue.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={issue.severity} />
                  <code className="text-xs text-slate-500 font-mono">{issue.code}</code>
                </div>
                <div className="text-white text-xs leading-snug">{issue.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-emerald-900/40 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-900/40">
            <h3 className="text-emerald-400 text-sm font-semibold">Fixed in B ({fixedIssues.length})</h3>
          </div>
          <div className="divide-y divide-slate-800/60">
            {fixedIssues.length === 0 ? (
              <p className="text-slate-500 text-xs px-5 py-5">Nothing fixed yet.</p>
            ) : fixedIssues.map((issue) => (
              <div key={issue.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={issue.severity} />
                  <code className="text-xs text-slate-500 font-mono">{issue.code}</code>
                </div>
                <div className="text-slate-500 text-xs leading-snug line-through">{issue.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-slate-400 text-sm font-semibold">Persisting ({persistedIssues.length})</h3>
          </div>
          <div className="divide-y divide-slate-800/60">
            {persistedIssues.length === 0 ? (
              <p className="text-slate-500 text-xs px-5 py-5">All issues resolved!</p>
            ) : persistedIssues.slice(0, 6).map((issue) => (
              <div key={issue.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={issue.severity} />
                  <code className="text-xs text-slate-500 font-mono">{issue.code}</code>
                </div>
                <div className="text-white text-xs leading-snug">{issue.title}</div>
              </div>
            ))}
            {persistedIssues.length > 6 && (
              <p className="text-slate-500 text-xs px-5 py-3">+{persistedIssues.length - 6} more</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
