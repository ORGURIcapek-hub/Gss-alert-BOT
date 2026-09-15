import { createClient } from '@/lib/supabase/client'
import { UserProfile } from '@/types/database.types'

const USERS_CACHE_KEY = 'sdu_okr_users_cache'

export function getCachedUsers(): UserProfile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setCachedUsers(users: UserProfile[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users))
  } catch {}
}

export function getSafeSupabaseClient() {
  try {
    return createClient()
  } catch {
    return null
  }
}

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

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const inFlightRequests = new Map<string, Promise<any>>()
const responseCache = new Map<string, CacheEntry<any>>()
let cacheGeneration = 0

export function normalizeUrlKey(url: string): string {
  try {
    const [pathPart, queryPart] = url.split('?')
    if (!queryPart) return pathPart
    const params = new URLSearchParams(queryPart)
    params.delete('t')
    params.sort()
    const sorted = params.toString()
    return sorted ? `${pathPart}?${sorted}` : pathPart
  } catch {
    return url.replace(/([?&])t=\d+(&?)/, '$1').replace(/[?&]$/, '')
  }
}

export interface DeduplicateOptions extends RequestInit {
  ttl?: number
  forceRefresh?: boolean
}

export async function fetchWithDeduplication<T = any>(
  url: string,
  options: DeduplicateOptions = {}
): Promise<T> {
  const { ttl = 2500, forceRefresh = false, ...fetchInit } = options
  const method = (fetchInit.method || 'GET').toUpperCase()
  const isGet = method === 'GET'

  if (typeof window === 'undefined') {
    try {
      let target = url
      if (url.startsWith('/')) {
        const base =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        if (!base) {
          throw new Error(
            `[fetchWithDeduplication] Cannot fetch relative URL "${url}" on the server. Pass an absolute URL (set NEXT_PUBLIC_APP_URL) or call the data layer directly.`
          )
        }
        target = new URL(url, base).toString()
      }
      const res = await fetch(target, fetchInit)
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({} as any))
        throw new Error((errBody as any)?.error || `Request failed with status ${res.status} for ${url}`)
      }
      return (await res.json()) as T
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('[fetchWithDeduplication]')) throw err
      throw new Error(`[fetchWithDeduplication] Server fetch failed for "${url}": ${(err as Error).message}`)
    }
  }

  if (!isGet) {
    invalidateApiCache(url.split('?')[0])
    const res = await fetch(url, fetchInit)
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.error || `Request failed with status ${res.status}`)
    }
    const data = await res.json()
    return data as T
  }

  const normalizedKey = normalizeUrlKey(url)

  if (!forceRefresh && inFlightRequests.has(normalizedKey)) {
    return inFlightRequests.get(normalizedKey)! as Promise<T>
  }

  // 2. If not forcing refresh, return memory cached data if still fresh
  if (!forceRefresh && responseCache.has(normalizedKey)) {
    const entry = responseCache.get(normalizedKey)!
    if (Date.now() - entry.timestamp < ttl) {
      return entry.data as T
    }
  }

  // 3. Clear cache entry for this key before new fetch
  responseCache.delete(normalizedKey)

  const epochAtStart = cacheGeneration

  let promise!: Promise<T>
  promise = (async () => {
    try {
      const res = await fetch(url, {
        ...fetchInit,
        headers: {
          'Accept': 'application/json',
          ...(fetchInit.headers || {})
        }
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (epochAtStart === cacheGeneration) {
        responseCache.set(normalizedKey, { data, timestamp: Date.now() })
      }
      return data as T
    } finally {
      if (inFlightRequests.get(normalizedKey) === promise) {
        inFlightRequests.delete(normalizedKey)
      }
    }
  })()

  inFlightRequests.set(normalizedKey, promise)
  return promise
}

export function invalidateApiCache(urlPrefix?: string): void {
  cacheGeneration++
  if (!urlPrefix) {
    responseCache.clear()
    inFlightRequests.clear()
    return
  }
  const cleanPrefix = urlPrefix.split('?')[0]
  responseCache.forEach((_, key) => {
    if (key.startsWith(cleanPrefix)) {
      responseCache.delete(key)
    }
  })
  inFlightRequests.forEach((_, key) => {
    if (key.startsWith(cleanPrefix)) {
      inFlightRequests.delete(key)
    }
  })
}
