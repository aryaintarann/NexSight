import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { generateShareToken } from '@/lib/auth/api-keys'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = generateShareToken()

  const { error } = await admin()
    .from('scans')
    .update({ share_token: token })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 })

  return NextResponse.json({ token, shareUrl: `/share/${token}` })
}
