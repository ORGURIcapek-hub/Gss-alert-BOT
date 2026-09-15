import test from 'node:test'
import assert from 'node:assert/strict'

const STORAGE_KEYS = {
  USER_ID: 'sdu_okr_user_id',
  CACHED_USER: 'sdu_okr_cached_user',
  ACTIVE_TAB: 'sdu_okr_active_tab',
  DELETED_IDS: 'sdu_okr_deleted_user_ids'
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function getStoredUserId() {
  if (!isBrowser()) return null
  try {
    return sessionStorage.getItem(STORAGE_KEYS.USER_ID)
  } catch {
    return null
  }
}

function getStoredCachedUser() {
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

function setStoredUser(user) {
  if (!isBrowser()) return
  try {
    sessionStorage.setItem(STORAGE_KEYS.USER_ID, user.user_id)
    sessionStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(user))
  } catch {}
}

function getStoredDeletedUserIds() {
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

function clearAuthStorage() {
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

function cleanLegacyAuthStorage() {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_ID)
    localStorage.removeItem(STORAGE_KEYS.CACHED_USER)
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TAB)
  } catch {}
}

function installBrowserStubs() {
  const makeStore = () => {
    const map = new Map()
    return {
      getItem: k => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: k => map.delete(k),
      clear: () => map.clear()
    }
  }
  const sessionStorage = makeStore()
  const localStorage = makeStore()
  globalThis.window = { fake: true }
  globalThis.sessionStorage = sessionStorage
  globalThis.localStorage = localStorage
  return { sessionStorage, localStorage }
}

function uninstallBrowserStubs() {
  delete globalThis.window
  delete globalThis.sessionStorage
  delete globalThis.localStorage
}

test('auth-storage: setStoredUser writes both session keys and reads back as a parsed object', () => {
  const { sessionStorage } = installBrowserStubs()
  try {
    const user = { user_id: 'u-123', name: 'อาจารย์ กวิน', role: 'teacher' }
    setStoredUser(user)

    assert.equal(sessionStorage.getItem(STORAGE_KEYS.USER_ID), 'u-123')
    assert.deepEqual(getStoredCachedUser(), user)
    assert.equal(getStoredUserId(), 'u-123')
  } finally {
    uninstallBrowserStubs()
  }
})

test('auth-storage: getStoredCachedUser returns null when nothing was stored', () => {
  installBrowserStubs()
  try {
    assert.equal(getStoredCachedUser(), null)
    assert.equal(getStoredUserId(), null)
  } finally {
    uninstallBrowserStubs()
  }
})

test('auth-storage: corrupted cached-user JSON degrades to null instead of throwing', () => {
  installBrowserStubs()
  try {
    sessionStorage.setItem(STORAGE_KEYS.CACHED_USER, '{not valid json!!')
    assert.equal(getStoredCachedUser(), null)
  } finally {
    uninstallBrowserStubs()
  }
})

test('auth-storage: non-object cached payload (number/string/array of scalars) is rejected', () => {
  installBrowserStubs()
  try {
    sessionStorage.setItem(STORAGE_KEYS.CACHED_USER, '42')
    assert.equal(getStoredCachedUser(), null)
    sessionStorage.setItem(STORAGE_KEYS.CACHED_USER, '"just a string"')
    assert.equal(getStoredCachedUser(), null)
  } finally {
    uninstallBrowserStubs()
  }
})

test('auth-storage: getStoredDeletedUserIds parses arrays and tolerates garbage', () => {
  installBrowserStubs()
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(['id-1', 'id-2']))
    assert.deepEqual(getStoredDeletedUserIds(), ['id-1', 'id-2'])

    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, '{bad json')
    assert.deepEqual(getStoredDeletedUserIds(), [])

    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify({ not: 'an array' }))
    assert.deepEqual(getStoredDeletedUserIds(), [])
  } finally {
    uninstallBrowserStubs()
  }
})

test('auth-storage: clearAuthStorage wipes both session and legacy local copies', () => {
  const { sessionStorage, localStorage } = installBrowserStubs()
  try {
    setStoredUser({ user_id: 'u-9', name: 'x' })
    sessionStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, 'okrs')
    localStorage.setItem(STORAGE_KEYS.USER_ID, 'legacy-id')
    localStorage.setItem(STORAGE_KEYS.CACHED_USER, '{"name":"legacy"}')
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, 'projects')

    clearAuthStorage()

    assert.equal(sessionStorage.getItem(STORAGE_KEYS.USER_ID), null)
    assert.equal(sessionStorage.getItem(STORAGE_KEYS.CACHED_USER), null)
    assert.equal(sessionStorage.getItem(STORAGE_KEYS.ACTIVE_TAB), null)
    assert.equal(localStorage.getItem(STORAGE_KEYS.USER_ID), null)
    assert.equal(localStorage.getItem(STORAGE_KEYS.CACHED_USER), null)
    assert.equal(localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB), null)
  } finally {
    uninstallBrowserStubs()
  }
})

test('auth-storage: clearAuthStorage preserves the deleted-ids tombstone list', () => {
  const { localStorage } = installBrowserStubs()
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(['gone-1']))
    clearAuthStorage()
    assert.deepEqual(getStoredDeletedUserIds(), ['gone-1'])
  } finally {
    uninstallBrowserStubs()
  }
})

test('auth-storage: cleanLegacyAuthStorage removes only the localStorage keys', () => {
  const { sessionStorage, localStorage } = installBrowserStubs()
  try {
    localStorage.setItem(STORAGE_KEYS.USER_ID, 'legacy')
    localStorage.setItem(STORAGE_KEYS.CACHED_USER, 'legacy')
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, 'legacy')
    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, '["keep-me"]')
    sessionStorage.setItem(STORAGE_KEYS.USER_ID, 'session-kept')

    cleanLegacyAuthStorage()

    assert.equal(localStorage.getItem(STORAGE_KEYS.USER_ID), null)
    assert.equal(localStorage.getItem(STORAGE_KEYS.CACHED_USER), null)
    assert.equal(localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB), null)
    assert.deepEqual(getStoredDeletedUserIds(), ['keep-me'])
    assert.equal(sessionStorage.getItem(STORAGE_KEYS.USER_ID), 'session-kept')
  } finally {
    uninstallBrowserStubs()
  }
})

test('auth-storage: all functions no-op safely on the server (no window)', () => {
  assert.equal(getStoredUserId(), null)
  assert.equal(getStoredCachedUser(), null)
  assert.deepEqual(getStoredDeletedUserIds(), [])
  assert.doesNotThrow(() => {
    setStoredUser({ user_id: 'x', name: 'y' })
    clearAuthStorage()
    cleanLegacyAuthStorage()
  })
})

test('auth-storage: throwing storage backend (quota/security errors) is swallowed', () => {
  installBrowserStubs()
  try {
    sessionStorage.setItem = () => { throw new Error('QuotaExceededError') }
    localStorage.getItem = () => { throw new Error('SecurityError') }

    assert.doesNotThrow(() => setStoredUser({ user_id: 'u-1', name: 'n' }))
    assert.deepEqual(getStoredDeletedUserIds(), [])
  } finally {
    uninstallBrowserStubs()
  }
})
