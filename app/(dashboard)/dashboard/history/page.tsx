import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getGrade, getScoreColor } from '@/lib/scoring'
import type { Scan } from '@/types'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: scans } = await supabase
    .from('scans')
    .select('id, url, status, overall_score, seo_score, geo_score, ai_score, sec_score, created_at, completed_at, scan_duration')
    .order('created_at', { ascending: false })
    .limit(50)

  const allScans = (scans ?? []) as Scan[]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Scan History</h1>
          <p className="text-slate-400 mt-0.5">{allScans.length} scans</p>
        </div>
        <Link href="/dashboard/new-scan"
          className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
          New Scan
        </Link>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
        {allScans.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-slate-400">No scans yet. <Link href="/dashboard/new-scan" className="text-cyan-400 hover:text-cyan-300">Start scanning</Link></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['URL', 'Status', 'Score', 'SEO', 'GEO', 'AI', 'Security', 'Duration', 'Date'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/scan/${scan.id}`} className="block">
                        <div className="text-cyan-400 group-hover:text-cyan-300 text-sm font-medium truncate max-w-[180px]">{new URL(scan.url).hostname}</div>
                        <div className="text-slate-500 text-xs truncate max-w-[180px]">{scan.url}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm capitalize ${
                        scan.status === 'done' ? 'text-emerald-400' :
                        scan.status === 'running' ? 'text-cyan-400' :
                        scan.status === 'failed' ? 'text-red-400' : 'text-slate-400'
                      }`}>{scan.status}</span>
                    </td>
                    {[scan.overall_score, scan.seo_score, scan.geo_score, scan.ai_score, scan.sec_score].map((score, i) => (
                      <td key={i} className="px-6 py-4">
                        {score != null ? (
                          <span className="font-semibold text-sm text-white" style={{ color: getScoreColor(score) }}>
                            {score}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {scan.scan_duration ? `${(scan.scan_duration / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(scan.created_at).toLocaleString()}
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
