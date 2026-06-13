'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Scan } from '@/types'

interface Props {
  scanId: string
  initialScan: Scan
  onUpdate?: (scan: Scan) => void
}

export function RealtimeStatus({ scanId, initialScan, onUpdate }: Props) {
  const [scan, setScan] = useState<Scan>(initialScan)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`scan-${scanId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scans', filter: `id=eq.${scanId}` },
        (payload) => {
          const updated = payload.new as Scan
          setScan(updated)
          onUpdate?.(updated)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [scanId])

  const statusConfig = {
    queued:  { label: 'Queued', color: 'text-slate-400', dot: 'bg-slate-400' },
    running: { label: 'Scanning…', color: 'text-cyan-400', dot: 'bg-cyan-400 animate-pulse' },
    done:    { label: 'Complete', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    failed:  { label: 'Failed', color: 'text-red-400', dot: 'bg-red-400' },
  }
  const config = statusConfig[scan.status] ?? statusConfig.queued

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      {scan.status === 'done' && scan.overall_score != null && (
        <span className="text-slate-400 text-sm">· Score: <strong className="text-white">{scan.overall_score}/100</strong></span>
      )}
    </div>
  )
}
