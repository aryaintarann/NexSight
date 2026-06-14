'use client'

interface Props {
  scanId: string
}

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
)

export default function DownloadButtons({ scanId }: Props) {
  const base = `/api/report/${scanId}`

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`${base}?format=pdf`}
        download
        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-500 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
      >
        <DownloadIcon /> PDF
      </a>
      <a
        href={`${base}?format=markdown`}
        download
        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-500 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
      >
        <DownloadIcon /> Markdown
      </a>
      <a
        href={base}
        download
        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-500 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
      >
        <DownloadIcon /> HTML
      </a>
    </div>
  )
}
