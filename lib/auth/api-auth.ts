import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashApiKey } from './api-keys'
import { createClient as createAdmin } from '@supabase/supabase-js'

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type AuthResult = { userId: string; source: 'jwt' | 'api_key' } | null

export async function resolveAuth(request: NextRequest): Promise<AuthResult> {
  // Try X-API-Key first (fast path for programmatic access)
  const apiKey = request.headers.get('X-API-Key')
  if (apiKey?.startsWith('nxs_')) {
    const keyHash = hashApiKey(apiKey)
    const { data: keyRow } = await getAdmin()
      .from('api_keys')
      .select('user_id, expires_at')
      .eq('key_hash', keyHash)
      .single()

    if (!keyRow) return null
    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) return null

    // Fire-and-forget last_used update
    getAdmin()
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('key_hash', keyHash)
      .then(() => {})

    return { userId: keyRow.user_id, source: 'api_key' }
  }

  // Try Supabase JWT (cookie or Authorization: Bearer header)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return { userId: user.id, source: 'jwt' }

  return null
}
