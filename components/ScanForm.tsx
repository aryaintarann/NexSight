'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ALL_MODULES = ['seo', 'geo', 'ai', 'security'] as const
type Module = typeof ALL_MODULES[number]

const MODULE_LABELS: Record<Module, string> = {
  seo: 'SEO',
  geo: 'GEO / AEO',
  ai: 'AI Visibility',
  security: 'Security',
}

export default function ScanForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [modules, setModules] = useState<Module[]>([...ALL_MODULES])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleModule(mod: Module) {
    setModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    if (modules.length === 0) {
      setError('Select at least one module to scan.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), modules }),
      })

      const data = await res.json()

      if (res.status === 429) {
        const mins = data.resetIn ? Math.ceil(data.resetIn / 60) : 60
        setError(`Rate limit reached. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`)
        return
      }

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      router.push(`/result/${data.scan_id}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="flex-1 bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-colors text-sm"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-6 py-3 bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-400/40 disabled:cursor-not-allowed text-[#020617] font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
        >
          {loading ? 'Starting…' : 'Scan Now'}
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {ALL_MODULES.map((mod) => (
          <label key={mod} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={modules.includes(mod)}
              onChange={() => toggleModule(mod)}
              className="accent-cyan-400 w-4 h-4 rounded"
            />
            <span className="text-slate-300 text-sm">{MODULE_LABELS[mod]}</span>
          </label>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center mt-2">{error}</p>
      )}
    </form>
  )
}
