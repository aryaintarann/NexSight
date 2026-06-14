'use client'

import dynamic from 'next/dynamic'

const ScoreRadar = dynamic(() => import('@/components/dashboard/ScoreRadar'), { ssr: false })

export default function RadarWrapper({ seo, geo, ai, security }: {
  seo: number; geo: number; ai: number; security: number
}) {
  return <ScoreRadar seo={seo} geo={geo} ai={ai} security={security} />
}
