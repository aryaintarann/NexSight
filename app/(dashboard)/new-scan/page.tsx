'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MODULES = [
  { id: 'seo', label: 'SEO Analyzer', description: 'Meta tags, Core Web Vitals, broken links, schema markup, sitemap', color: 'cyan' },
  { id: 'geo', label: 'GEO + AEO', description: 'E-E-A-T signals, AI citability, FAQ schema, content freshness', color: 'violet' },
  { id: 'ai', label: 'AI Search Visibility', description: 'AI citation probability, heading hierarchy, conversational match', color: 'emerald' },
  { id: 'security', label: 'Security Scanner', description: 'HTTP headers, SSL/TLS, mixed content, cookie flags, OWASP', color: 'rose' },
]

export default function NewScanPage() {
  const [url, setUrl] = useState('')
  const [selectedModules, setSelectedModules] = useState(['seo', 'geo', 'ai', 'security'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function toggleModule(id: string) {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedModules.length === 0) { setError('Select at least one module'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, modules: selectedModules }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Scan failed')
      router.push(`/dashboard/scan/${data.scan_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const colorMap: Record<string, string> = {
    cyan:   'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
    violet: 'border-violet-500/50 bg-violet-500/10 text-violet-400',
    emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    rose:   'border-rose-500/50 bg-rose-500/10 text-rose-400',
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Scan</h1>
        <p className="text-slate-400 mt-0.5">Analyze your website across 4 dimensions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Website URL</label>
          <input
            type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
          />
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-slate-300">Scan Modules</label>
            <span className="text-xs text-slate-500">{selectedModules.length}/4 selected</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MODULES.map(({ id, label, description, color }) => {
              const active = selectedModules.includes(id)
              return (
                <button
                  key={id} type="button" onClick={() => toggleModule(id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    active ? colorMap[color] : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">{label}</div>
                  <div className="text-xs opacity-70 leading-relaxed">{description}</div>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <button
          type="submit" disabled={loading || !url}
          className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting scan…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Start Scan
            </>
          )}
        </button>
      </form>
    </div>
  )
}
