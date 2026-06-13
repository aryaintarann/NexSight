import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getGrade, getScoreColor } from '@/lib/scoring'
import type { Scan } from '@/types'

function StatusDot({ status }: { status: Scan['status'] }) {
  const config = {
    queued:  'bg-slate-400',
    running: 'bg-cyan-400 animate-pulse',
    done:    'bg-emerald-400',
    failed:  'bg-red-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${config[status]}`} />
}

function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <span className="text-slate-500">—</span>
  const color = getScoreColor(score)
  const grade = getGrade(score)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-semibold text-white">{score}</span>
      <span className="text-xs font-bold" style={{ color }}>{grade}</span>
    </span>
  )
}

export default async function DashboardPage() {
  await connection()
  const supabase = await createClient()
  const { data: scans } = await supabase
    .from('scans')
    .select('id, url, status, overall_score, seo_score, geo_score, ai_score, sec_score, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const recentScans = (scans ?? []) as Scan[]
  const totalScans = recentScans.length
  const doneScans = recentScans.filter((s) => s.status === 'done')
  const avgScore = doneScans.length > 0
    ? Math.round(doneScans.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / doneScans.length)
    : null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-0.5">Monitor your website intelligence scores</p>
        </div>
        <Link href="/dashboard/new-scan"
          className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Scan
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Scans', value: totalScans },
          { label: 'Completed', value: doneScans.length },
          { label: 'Avg Score', value: avgScore != null ? `${avgScore}/100` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#0f172a] border border-slate-800 rounded-xl p-5">
            <div className="text-slate-400 text-sm mb-1">{label}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Recent scans table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-white font-semibold">Recent Scans</h2>
        </div>

        {recentScans.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-400 mb-4">No scans yet</p>
            <Link href="/dashboard/new-scan" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
              Run your first scan →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['URL', 'Status', 'Score', 'SEO', 'GEO', 'AI', 'Security', 'Date'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/scan/${scan.id}`} className="text-cyan-400 hover:text-cyan-300 text-sm font-medium truncate max-w-[200px] block">
                        {new URL(scan.url).hostname}
                      </Link>
                      <span className="text-slate-500 text-xs truncate max-w-[200px] block">{scan.url}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusDot status={scan.status} />
                        <span className="text-slate-300 text-sm capitalize">{scan.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><ScorePill score={scan.overall_score} /></td>
                    <td className="px-6 py-4"><ScorePill score={scan.seo_score} /></td>
                    <td className="px-6 py-4"><ScorePill score={scan.geo_score} /></td>
                    <td className="px-6 py-4"><ScorePill score={scan.ai_score} /></td>
                    <td className="px-6 py-4"><ScorePill score={scan.sec_score} /></td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
