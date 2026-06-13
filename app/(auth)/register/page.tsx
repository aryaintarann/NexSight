'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-[#0f172a] border border-slate-800 rounded-2xl p-8">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-slate-400">We&apos;ve sent a confirmation link to <strong className="text-white">{email}</strong></p>
          <Link href="/login" className="inline-block mt-6 text-cyan-400 hover:text-cyan-300 text-sm">Back to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-400 flex items-center justify-center">
              <span className="text-slate-900 font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-bold text-white">NexSight</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-slate-400 mt-1">Start scanning your websites for free</p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input id="password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="At least 8 characters" />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 rounded-lg transition-colors">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
