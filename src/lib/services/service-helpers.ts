import { createClient } from '@/lib/supabase/client'
import { UserProfile } from '@/types/database.types'

const USERS_CACHE_KEY = 'sdu_okr_users_cache'

/** SSR-Safe local storage cache retrieval */
export function getCachedUsers(): UserProfile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** SSR-Safe local storage cache setter */
export function setCachedUsers(users: UserProfile[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users))
  } catch {}
}

/** Safe Supabase Client Initializer with error swallowing */
export function getSafeSupabaseClient() {
  try {
    return createClient()
  } catch {
    return null
  }
}

/** Generic safe Supabase caller with consistent logging and fallback */
export async function dbCall<T>(
  fn: () => Promise<{ data: T | null; error: { message: string } | null }>,
  label: string
): Promise<T | null> {
  try {
    const { data, error } = await fn()
    if (error) {
      console.warn(`[service] ${label} error:`, error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn(`[service] ${label} exception:`, err)
    return null
  }
}
