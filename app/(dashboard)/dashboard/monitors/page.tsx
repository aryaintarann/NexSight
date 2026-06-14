import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import MonitorForm from '@/components/dashboard/MonitorForm'
import MonitorActions from '@/components/dashboard/MonitorActions'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const SCHEDULE_LABELS: Record<string, string> = {
  '0 */6 * * *': 'Every 6 hours',
  '0 0 * * *': 'Daily',
  '0 0 * * 1': 'Weekly',
}

export default async function MonitorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: monitors } = await admin()
    .from('monitors')
    .select('id, url, schedule, active, notify_email, alert_on_drop, alert_below, last_score, last_run_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Monitors</h1>
        <p className="text-slate-400 mt-0.5">
          Automatically scan your sites on a schedule and receive email alerts on score drops.
        </p>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-5">Add Monitor</h2>
        <MonitorForm userEmail={user.email ?? ''} />
      </div>

      {!monitors || monitors.length === 0 ? (
        <div className="text-slate-500 text-sm text-center py-12 border border-dashed border-slate-800 rounded-xl">
          No monitors yet — add one above to start tracking your sites automatically.
        </div>
      ) : (
        <div className="space-y-3">
          {monitors.map((m) => (
            <div key={m.id} className="bg-[#0f172a] border border-slate-800 rounded-xl px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${m.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className="text-white font-medium text-sm truncate">{m.url}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{SCHEDULE_LABELS[m.schedule] ?? m.schedule}</span>
                    <span>·</span>
                    <span>→ {m.notify_email}</span>
                    {m.alert_on_drop !== null && (
                      <><span>·</span><span>Alert on drop ≥{m.alert_on_drop}pts</span></>
                    )}
                    {m.alert_below !== null && (
                      <><span>·</span><span>Alert below {m.alert_below}</span></>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {m.last_score !== null && (
                    <div className="text-right hidden sm:block">
                      <div className="text-white font-bold text-xl leading-none">{m.last_score}</div>
                      <div className="text-slate-500 text-xs">last score</div>
                    </div>
                  )}
                  {m.last_run_at && (
                    <div className="text-right hidden md:block">
                      <div className="text-slate-300 text-xs">{new Date(m.last_run_at).toLocaleDateString()}</div>
                      <div className="text-slate-500 text-xs">last run</div>
                    </div>
                  )}
                  <MonitorActions monitorId={m.id} active={m.active} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
