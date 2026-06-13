import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-0.5">Manage your account and API configuration</p>
      </div>

      <div className="space-y-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Account</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Email</label>
              <p className="text-slate-300 text-sm mt-0.5">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">User ID</label>
              <p className="text-slate-500 text-xs font-mono mt-0.5">{user?.id}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-2">Environment</h2>
          <p className="text-slate-400 text-sm mb-4">Configure API keys in your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">.env.local</code> file:</p>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1.5">
            <div><span className="text-slate-500"># Supabase</span></div>
            <div>NEXT_PUBLIC_SUPABASE_URL=<span className="text-emerald-400">your-project-url</span></div>
            <div>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<span className="text-emerald-400">your-key</span></div>
            <div className="mt-2"><span className="text-slate-500"># OpenRouter (for AI scanner)</span></div>
            <div>OPENROUTER_API_KEY=<span className="text-emerald-400">sk-or-xxx</span></div>
            <div className="mt-2"><span className="text-slate-500"># Redis (for BullMQ job queue)</span></div>
            <div>REDIS_URL=<span className="text-emerald-400">redis://localhost:6379</span></div>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-2">NexSight Score Formula</h2>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300">
            Score = (SEO × 0.30) + (GEO × 0.25) + (AI × 0.20) + (Security × 0.25)
          </div>
        </div>
      </div>
    </div>
  )
}
