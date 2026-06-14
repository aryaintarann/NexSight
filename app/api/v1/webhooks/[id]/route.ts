import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/auth/api-auth'
import { createClient as createAdmin } from '@supabase/supabase-js'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error, count } = await admin()
    .from('webhooks')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  if (count === 0) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
