import { getGrade, getGradeLabel, getScoreColor } from '@/lib/scoring'

interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showGrade?: boolean
}

export default function ScoreGauge({ score, size = 'md', label, showGrade = false }: Props) {
  const radius = size === 'lg' ? 52 : size === 'md' ? 38 : 26
  const strokeWidth = size === 'lg' ? 7 : size === 'md' ? 6 : 5
  const cx = radius + strokeWidth
  const cy = radius + strokeWidth
  const svgSize = (radius + strokeWidth) * 2

  const circumference = 2 * Math.PI * radius
  const arcLength = circumference * 0.75
  const dashoffset = arcLength - (arcLength * Math.min(100, Math.max(0, score)) / 100)

  const color = getScoreColor(score)
  const grade = getGrade(score)
  const fontSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-sm'
  const gradeFontSize = size === 'lg' ? 'text-base' : 'text-xs'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} style={{ transform: 'rotate(135deg)' }}>
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none" stroke="#1e293b" strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'none' }}>
          <span className={`font-bold text-white ${fontSize}`}>{score}</span>
          {showGrade && <span className={`font-semibold ${gradeFontSize}`} style={{ color }}>{grade}</span>}
        </div>
      </div>
      {label && <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>}
    </div>
  )
}
