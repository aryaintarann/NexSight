'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SCHEDULE_OPTIONS = [
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 0 * * *', label: 'Daily (midnight UTC)' },
  { value: '0 0 * * 1', label: 'Weekly (Monday midnight UTC)' },
]

export default function MonitorForm({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [schedule, setSchedule] = useState('0 0 * * *')
  const [email, setEmail] = useState(userEmail)
  const [alertOnDrop, setAlertOnDrop] = useState('')
  const [alertBelow, setAlertBelow] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          schedule,
          notify_email: email,
          alert_on_drop: alertOnDrop ? Number(alertOnDrop) : undefined,
          alert_below: alertBelow ? Number(alertBelow) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create monitor')
      setUrl('')
      setAlertOnDrop('')
      setAlertBelow('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1.5">URL to monitor</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition-all"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1.5">Check frequency</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition-all"
          >
            {SCHEDULE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1.5">Alert email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition-all"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1.5">
            Alert if drops by (pts) <span className="text-slate-600 normal-case">optional</span>
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={alertOnDrop}
            onChange={(e) => setAlertOnDrop(e.target.value)}
            placeholder="e.g. 10"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition-all"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1.5">
            Alert if score below <span className="text-slate-600 normal-case">optional</span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={alertBelow}
            onChange={(e) => setAlertBelow(e.target.value)}
            placeholder="e.g. 60"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Creating…' : 'Create Monitor'}
      </button>
    </form>
  )
}
