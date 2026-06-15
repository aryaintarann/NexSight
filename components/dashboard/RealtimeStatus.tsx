'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Scan } from '@/types'

interface Props {
  scanId: string
  initialScan: Scan
  onUpdate?: (scan: Scan) => void
}

const TERMINAL_STATUSES = new Set(['done', 'failed'])
const POLL_INTERVAL = 2000

export function RealtimeStatus({ scanId, initialScan, onUpdate }: Props) {
  const [scan, setScan] = useState<Scan>(initialScan)
  const router = useRouter()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (TERMINAL_STATUSES.has(initialScan.status)) return

    const supabase = createClient()

    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single()
      if (!data) return
      const updated = data as Scan
      setScan(updated)
      onUpdate?.(updated)
      if (TERMINAL_STATUSES.has(updated.status)) {
        if (pollRef.current) clearInterval(pollRef.current)
        router.refresh()
      }
    }, POLL_INTERVAL)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [scanId]) // eslint-disable-line react-hooks/exhaustive-deps

  const statusConfig = {
    queued:  { label: 'Queued',    color: 'text-slate-400',   dot: 'bg-slate-400' },
    running: { label: 'Scanning…', color: 'text-cyan-400',    dot: 'bg-cyan-400 animate-pulse' },
    done:    { label: 'Complete',  color: 'text-emerald-400', dot: 'bg-emerald-400' },
    failed:  { label: 'Failed',    color: 'text-red-400',     dot: 'bg-red-400' },
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
