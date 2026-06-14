import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/auth/api-auth'
import { generateApiKey } from '@/lib/auth/api-keys'
import { createClient as createAdmin } from '@supabase/supabase-js'

function admin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { name, expires_at } = body as { name?: string; expires_at?: string }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { fullKey, keyHash, keyPrefix } = generateApiKey()

  const { data: key, error } = await admin()
    .from('api_keys')
    .insert({
      user_id: auth.userId,
      name: name.trim(),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      expires_at: expires_at ?? null,
    })
    .select('id, name, key_prefix, expires_at, created_at')
    .single()

  if (error || !key) return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })

  return NextResponse.json(
    {
      ...key,
      key: fullKey,
      warning: 'Store this key securely — it will not be shown again.',
    },
    { status: 201 }
  )
}

export async function GET(request: NextRequest) {
  const auth = await resolveAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: keys } = await admin()
    .from('api_keys')
    .select('id, name, key_prefix, last_used, expires_at, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ keys: keys ?? [] })
}
