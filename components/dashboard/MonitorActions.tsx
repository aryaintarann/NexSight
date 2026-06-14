'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function MonitorActions({ monitorId, active }: { monitorId: string; active: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    await fetch(`/api/v1/monitors/${monitorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    router.refresh()
    setLoading(false)
  }

  async function remove() {
    if (!confirm('Delete this monitor? All run history will be removed.')) return
    setLoading(true)
    await fetch(`/api/v1/monitors/${monitorId}`, { method: 'DELETE' })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
          active
            ? 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
            : 'text-emerald-400 border-emerald-900/50 hover:border-emerald-700'
        }`}
      >
        {active ? 'Pause' : 'Resume'}
      </button>
      <button
        onClick={remove}
        disabled={loading}
        className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  )
}
