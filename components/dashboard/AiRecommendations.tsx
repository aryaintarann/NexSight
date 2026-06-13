'use client'

import { useEffect, useState } from 'react'
import type { Recommendation } from '@/lib/ai/recommendations'

const priorityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-900/20 border-red-800' },
  high: { color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-800' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800' },
}

export default function AiRecommendations({ scanId }: { scanId: string }) {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/scan/${scanId}/recommendations`)
      .then((r) => r.json())
      .then((d) => setRecs(d.recommendations ?? []))
      .finally(() => setLoading(false))
  }, [scanId])

  if (loading) return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 mb-6 animate-pulse">
      <div className="h-4 bg-slate-800 rounded w-48 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800 rounded" />)}
      </div>
    </div>
  )

  if (recs.length === 0) return null

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h2 className="text-white font-semibold text-sm">AI Recommendations</h2>
        <span className="text-xs text-slate-500 ml-1">powered by Claude</span>
      </div>
      <div className="space-y-3">
        {recs.map((rec, i) => {
          const cfg = priorityConfig[rec.priority] ?? priorityConfig.medium
          return (
            <div key={i} className={`border rounded-xl p-4 ${cfg.bg}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${cfg.color} mb-1`}>{rec.title}</div>
                  <div className="text-slate-300 text-sm leading-relaxed">{rec.action}</div>
                </div>
                <div className="text-xs text-emerald-400 font-mono whitespace-nowrap shrink-0 mt-0.5">
                  {rec.estimatedImpact}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
