import ScanForm from '@/components/ScanForm'

const MODULES = [
  {
    id: 'seo',
    label: 'SEO',
    icon: '🔍',
    desc: 'Meta tags, Core Web Vitals, schema markup, broken links, sitemap',
  },
  {
    id: 'geo',
    label: 'GEO / AEO',
    icon: '🌐',
    desc: 'E-E-A-T signals, AI citability, content freshness, FAQ schema',
  },
  {
    id: 'ai',
    label: 'AI Visibility',
    icon: '🤖',
    desc: 'Citation probability, heading hierarchy, structured answer readiness',
  },
  {
    id: 'security',
    label: 'Security',
    icon: '🔒',
    desc: 'HTTP headers, SSL/TLS, mixed content, cookie flags, OWASP baseline',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
            <span className="text-cyan-400 text-sm font-bold">N</span>
          </div>
          <span className="font-semibold text-white text-lg">NexSight</span>
          <span className="text-slate-500 text-sm">Website Intelligence Scanner</span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-medium mb-6">
          Free · No signup required · Instant results
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Analyze Your Website&apos;s<br />
          <span className="text-cyan-400">Intelligence Score</span>
        </h1>
        <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
          Scan any website for SEO, GEO/AEO, AI search visibility, and security — all in one report.
        </p>

        <ScanForm />
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULES.map((m) => (
            <div key={m.id} className="bg-[#0f172a] border border-slate-800 rounded-xl p-5">
              <div className="text-2xl mb-3">{m.icon}</div>
              <h3 className="font-semibold text-white mb-1">{m.label}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800/60 px-6 py-6 text-center text-slate-500 text-sm">
        NexSight — Open-source website intelligence platform
      </footer>
    </main>
  )
}
