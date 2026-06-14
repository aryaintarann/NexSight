'use client'

import { useState, useEffect, useCallback } from 'react'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used: string | null
  expires_at: string | null
  created_at: string
}

interface CreatedKey extends ApiKey {
  key: string
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealedKey, setRevealedKey] = useState<CreatedKey | null>(null)
  const [error, setError] = useState('')

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/v1/keys')
    const data = await res.json()
    setKeys(data.keys ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create key')
      setRevealedKey(data as CreatedKey)
      setNewKeyName('')
      fetchKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? Any apps using it will stop working immediately.')) return
    await fetch(`/api/v1/keys/${id}`, { method: 'DELETE' })
    fetchKeys()
  }

  return (
    <div className="space-y-5">
      {/* Create form */}
      <form onSubmit={createKey} className="flex gap-3">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g. CI/CD Pipeline, Zapier)"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition-all"
        />
        <button
          type="submit"
          disabled={creating || !newKeyName.trim()}
          className="bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          {creating ? 'Generating…' : 'Generate Key'}
        </button>
      </form>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Newly created key reveal */}
      {revealedKey && (
        <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-4">
          <div className="text-emerald-400 text-sm font-semibold mb-2">
            Key created — copy it now, it will not be shown again
          </div>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-xs text-emerald-300 bg-slate-900 px-3 py-2.5 rounded-lg break-all font-mono leading-relaxed">
              {revealedKey.key}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(revealedKey.key)}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-3 py-2 rounded-lg transition-colors shrink-0"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-slate-500 hover:text-slate-400 mt-3 transition-colors"
          >
            I&apos;ve saved the key ✓
          </button>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-slate-800 rounded-xl" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-slate-500 text-sm text-center py-8 border border-dashed border-slate-800 rounded-xl">
          No API keys yet — generate one above to use the REST API.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
              <div>
                <div className="text-white text-sm font-medium">{key.name}</div>
                <div className="text-slate-500 text-xs mt-0.5 font-mono">
                  {key.key_prefix}••••••••••••••••••••
                  {key.last_used
                    ? ` · Last used ${new Date(key.last_used).toLocaleDateString()}`
                    : ' · Never used'}
                </div>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
