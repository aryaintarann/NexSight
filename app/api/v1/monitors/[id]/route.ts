import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/auth/api-auth'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { monitorQueue } from '@/jobs/monitor-queue'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { active } = body as { active?: boolean }

  if (typeof active !== 'boolean') {
    return NextResponse.json({ error: 'active (boolean) is required' }, { status: 400 })
  }

  const { data: monitor, error } = await admin()
    .from('monitors')
    .update({ active })
    .eq('id', id)
    .eq('user_id', auth.userId)
    .select('id, url, schedule, active')
    .single()

  if (error || !monitor) {
    return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
  }

  try {
    const jobName = `monitor-${id}`
    if (!active) {
      await monitorQueue.removeRepeatable(jobName, { pattern: monitor.schedule })
    } else {
      await monitorQueue.removeRepeatable(jobName, { pattern: monitor.schedule }).catch(() => {})
      await monitorQueue.add(
        jobName,
        { monitorId: id, userId: auth.userId, url: monitor.url, modules: ['seo', 'geo', 'ai', 'security'] },
        { repeat: { pattern: monitor.schedule } }
      )
    }
  } catch (e) {
    console.error('[monitors/patch] BullMQ toggle failed:', e)
  }

  return NextResponse.json(monitor)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: monitor, error: fetchError } = await admin()
    .from('monitors')
    .select('schedule')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('[monitors/delete] DB fetch error:', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch monitor' }, { status: 500 })
  }
  if (!monitor) return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })

  const { error } = await admin()
    .from('monitors')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 })

  try {
    await monitorQueue.removeRepeatable(`monitor-${id}`, { pattern: monitor.schedule })
  } catch (e) {
    console.error('[monitors/delete] BullMQ remove failed:', e)
  }

  return new NextResponse(null, { status: 204 })
}
