'use client'

const formats = [
  { key: 'pdf',      label: 'PDF',      ext: '.pdf', query: '?format=pdf' },
  { key: 'markdown', label: 'Markdown', ext: '.md',  query: '?format=markdown' },
  { key: 'html',     label: 'HTML',     ext: '.html', query: '' },
]

export default function DownloadButtons({ scanId }: { scanId: string }) {
  return (
    <div className="space-y-2">
      {formats.map((f) => (
        <a
          key={f.key}
          href={`/api/report/${scanId}${f.query}`}
          download
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">{f.label}</span>
            <span className="text-xs text-slate-600">{f.ext}</span>
          </div>
          <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      ))}
    </div>
  )
}
