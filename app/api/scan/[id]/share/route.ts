import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShareToken } from '@/lib/auth/api-keys'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = generateShareToken()

  const { data: updated, error } = await supabase
    .from('scans')
    .update({ share_token: token })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 })
  if (!updated || updated.length === 0) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

  return NextResponse.json({ token, shareUrl: `/share/${token}` })
}
