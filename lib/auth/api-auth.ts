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
    const { data: keyRow, error: keyError } = await getAdmin()
      .from('api_keys')
      .select('user_id, expires_at')
      .eq('key_hash', keyHash)
      .single()

    if (keyError && keyError.code !== 'PGRST116') {
      console.error('[api-auth] api_keys lookup error:', keyError.message)
    }
    if (!keyRow) return null
    const now = new Date()
    if (keyRow.expires_at && new Date(keyRow.expires_at) < now) return null

    // Fire-and-forget last_used update
    Promise.resolve(
      getAdmin()
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('key_hash', keyHash)
    ).catch((e: unknown) => console.error('[api-auth] last_used update failed:', e))

    return { userId: keyRow.user_id, source: 'api_key' }
  }

  // Try Supabase JWT (cookie or Authorization: Bearer header)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return { userId: user.id, source: 'jwt' }

  return null
}
