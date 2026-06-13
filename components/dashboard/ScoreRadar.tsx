'use client'

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  seo: number
  geo: number
  ai: number
  security: number
}

export default function ScoreRadar({ seo, geo, ai, security }: Props) {
  const data = [
    { subject: 'SEO', score: seo, fullMark: 100 },
    { subject: 'GEO', score: geo, fullMark: 100 },
    { subject: 'AI Visibility', score: ai, fullMark: 100 },
    { subject: 'Security', score: security, fullMark: 100 },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#22d3ee"
          fill="#22d3ee"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(v) => [v ? `${v}/100` : '0/100', 'Score']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
