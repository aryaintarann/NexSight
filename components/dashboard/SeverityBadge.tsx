type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

const CONFIG: Record<Severity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-950 text-red-400 border-red-800/60' },
  high:     { label: 'High',     className: 'bg-orange-950 text-orange-400 border-orange-800/60' },
  medium:   { label: 'Medium',   className: 'bg-yellow-950 text-yellow-400 border-yellow-800/60' },
  low:      { label: 'Low',      className: 'bg-slate-800 text-slate-300 border-slate-700' },
  info:     { label: 'Info',     className: 'bg-blue-950 text-blue-400 border-blue-800/60' },
}

export default function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, className } = CONFIG[severity]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${className}`}>
      {label}
    </span>
  )
}
