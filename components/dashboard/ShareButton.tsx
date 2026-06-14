'use client'

import { useState } from 'react'

export default function ShareButton({ scanId }: { scanId: string }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateLink() {
    setLoading(true)
    try {
      const res = await fetch(`/api/scan/${scanId}/share`, { method: 'POST' })
      const data = await res.json()
      if (data.shareUrl) {
        const full = `${window.location.origin}${data.shareUrl}`
        setShareUrl(full)
        await navigator.clipboard.writeText(full)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  if (shareUrl) {
    return (
      <div className="flex items-center gap-2">
        <code className="text-xs text-slate-400 bg-slate-800 px-2 py-1.5 rounded max-w-52 truncate">{shareUrl}</code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="text-xs text-slate-400 hover:text-white border border-slate-700 px-2 py-1.5 rounded-lg transition-colors shrink-0"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={generateLink}
      disabled={loading}
      className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      {loading ? 'Generating…' : 'Share'}
    </button>
  )
}
