import { UserProfile } from '@/types/database.types'

const STORAGE_KEYS = {
  USER_ID: 'sdu_okr_user_id',
  CACHED_USER: 'sdu_okr_cached_user',
  ACTIVE_TAB: 'sdu_okr_active_tab',
  DELETED_IDS: 'sdu_okr_deleted_user_ids'
} as const

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function getStoredUserId(): string | null {
  if (!isBrowser()) return null
  try {
    return sessionStorage.getItem(STORAGE_KEYS.USER_ID)
  } catch {
    return null
  }
}

export function getStoredCachedUser(): UserProfile | null {
  if (!isBrowser()) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.CACHED_USER)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function setStoredUser(user: UserProfile): void {
  if (!isBrowser()) return
  try {
    sessionStorage.setItem(STORAGE_KEYS.USER_ID, user.user_id)
    sessionStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(user))
  } catch {}
}

export function getStoredDeletedUserIds(): string[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function clearAuthStorage(): void {
  if (!isBrowser()) return
  try {
    sessionStorage.removeItem(STORAGE_KEYS.USER_ID)
    sessionStorage.removeItem(STORAGE_KEYS.CACHED_USER)
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_TAB)
    localStorage.removeItem(STORAGE_KEYS.USER_ID)
    localStorage.removeItem(STORAGE_KEYS.CACHED_USER)
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TAB)
  } catch {}
}

export function cleanLegacyAuthStorage(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_ID)
    localStorage.removeItem(STORAGE_KEYS.CACHED_USER)
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TAB)
  } catch {}
}
