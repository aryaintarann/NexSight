'use client'

interface Props {
  scanId: string
}

const formats = [
  {
    key: 'pdf',
    label: 'PDF Report',
    desc: 'Print-ready document',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'text-red-400',
    bg: 'hover:bg-red-500/5 hover:border-red-500/30',
  },
  {
    key: 'markdown',
    label: 'Markdown',
    desc: 'For documentation',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    color: 'text-purple-400',
    bg: 'hover:bg-purple-500/5 hover:border-purple-500/30',
  },
  {
    key: 'html',
    label: 'HTML',
    desc: 'Web page format',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'text-cyan-400',
    bg: 'hover:bg-cyan-500/5 hover:border-cyan-500/30',
  },
]

export default function DownloadButtons({ scanId }: Props) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {formats.map((f) => (
        <a
          key={f.key}
          href={`/api/report/${scanId}${f.key !== 'html' ? `?format=${f.key}` : ''}`}
          download
          className={`flex items-center gap-3 px-4 py-3 border border-slate-700 rounded-xl transition-all ${f.bg} group`}
        >
          <span className={`${f.color} transition-colors`}>{f.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium group-hover:text-white">{f.label}</p>
            <p className="text-slate-500 text-xs">{f.desc}</p>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      ))}
    </div>
  )
}
