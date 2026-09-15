import test from 'node:test'
import assert from 'node:assert/strict'

function normalizeUrlKey(url) {
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

class CacheEngine {
  constructor({ defaultTtl = 2500 } = {}) {
    this.defaultTtl = defaultTtl
    this.inFlightRequests = new Map()
    this.responseCache = new Map()
    this.cacheGeneration = 0
    this.fetchLog = []
  }

  async get(url, { ttl, forceRefresh = false, fetchImpl } = {}) {
    const effectiveTtl = ttl ?? this.defaultTtl
    const normalizedKey = normalizeUrlKey(url)

    if (!forceRefresh && this.inFlightRequests.has(normalizedKey)) {
      return this.inFlightRequests.get(normalizedKey)
    }

    if (!forceRefresh && this.responseCache.has(normalizedKey)) {
      const entry = this.responseCache.get(normalizedKey)
      if (Date.now() - entry.timestamp < effectiveTtl) {
        return entry.data
      }
    }

    this.responseCache.delete(normalizedKey)

    const epochAtStart = this.cacheGeneration

    let promise
    promise = (async () => {
      try {
        this.fetchLog.push(url)
        const data = await fetchImpl(url)
        if (epochAtStart === this.cacheGeneration) {
          this.responseCache.set(normalizedKey, { data, timestamp: Date.now() })
        }
        return data
      } finally {
        if (this.inFlightRequests.get(normalizedKey) === promise) {
          this.inFlightRequests.delete(normalizedKey)
        }
      }
    })()

    this.inFlightRequests.set(normalizedKey, promise)
    return promise
  }

  invalidate(urlPrefix) {
    this.cacheGeneration++
    if (!urlPrefix) {
      this.responseCache.clear()
      this.inFlightRequests.clear()
      return
    }
    const cleanPrefix = urlPrefix.split('?')[0]
    for (const key of [...this.responseCache.keys()]) {
      if (key.startsWith(cleanPrefix)) this.responseCache.delete(key)
    }
    for (const key of [...this.inFlightRequests.keys()]) {
      if (key.startsWith(cleanPrefix)) this.inFlightRequests.delete(key)
    }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

test('cache-invalidation: identical GETs within TTL hit the network exactly once', async () => {
  const engine = new CacheEngine({ defaultTtl: 10_000 })
  let calls = 0
  const fetchImpl = async () => { calls++; return { n: calls } }

  const a = await engine.get('/api/projects?year=2567', { fetchImpl })
  const b = await engine.get('/api/projects?year=2567', { fetchImpl })

  assert.equal(calls, 1)
  assert.equal(a, b)
})

test('cache-invalidation: cache key ignores cache-buster t and parameter order', async () => {
  const engine = new CacheEngine({ defaultTtl: 10_000 })
  let calls = 0
  const fetchImpl = async () => { calls++; return { ok: true } }

  await engine.get('/api/users', { fetchImpl })
  await engine.get('/api/users?t=1789463647277', { fetchImpl })
  await engine.get('/api/users?x=1&y=2', { fetchImpl })
  await engine.get('/api/users?y=2&x=1&t=42', { fetchImpl })

  assert.equal(calls, 2, 'expected one fetch for /api/users and one for /api/users?x=1&y=2')
})

test('cache-invalidation: expired TTL entry triggers a fresh network fetch', async () => {
  const engine = new CacheEngine({ defaultTtl: 30 })
  let calls = 0
  const fetchImpl = async () => { calls++; return { at: calls } }

  const first = await engine.get('/api/okrs', { fetchImpl })
  await sleep(60)
  const second = await engine.get('/api/okrs', { fetchImpl })

  assert.equal(calls, 2)
  assert.notDeepEqual(first, second)
})

test('cache-invalidation: concurrent identical GETs share one in-flight promise', async () => {
  const engine = new CacheEngine({ defaultTtl: 10_000 })
  let calls = 0
  const fetchImpl = async () => {
    calls++
    await sleep(40)
    return { seq: calls }
  }

  const [a, b, c] = await Promise.all([
    engine.get('/api/projects?include=assignments', { fetchImpl }),
    engine.get('/api/projects?include=assignments&t=1', { fetchImpl }),
    engine.get('/api/projects?include=assignments&t=2', { fetchImpl })
  ])

  assert.equal(calls, 1)
  assert.strictEqual(a, b)
  assert.strictEqual(b, c)
})

test('cache-invalidation: in-flight entry is removed after settle, so later GET refetches after TTL', async () => {
  const engine = new CacheEngine({ defaultTtl: 10_000 })
  let calls = 0
  const fetchImpl = async () => { calls++; await sleep(20); return { ok: true } }

  await engine.get('/api/users', { fetchImpl })
  assert.equal(engine.inFlightRequests.size, 0)
  assert.equal(calls, 1)
})

test('cache-invalidation: invalidate(prefix) drops matching cache and in-flight, spares others', async () => {
  const engine = new CacheEngine({ defaultTtl: 60_000 })
  let calls = 0
  const fetchImpl = async () => { calls++; return { id: calls } }

  await engine.get('/api/projects', { fetchImpl })
  await engine.get('/api/users', { fetchImpl })
  assert.equal(calls, 2)

  engine.invalidate('/api/projects')

  await engine.get('/api/projects', { fetchImpl })
  await engine.get('/api/users', { fetchImpl })
  assert.equal(calls, 3, 'projects refetched, users served from cache')
})

test('cache-invalidation: prefix matches with query strings and nested paths', async () => {
  const engine = new CacheEngine({ defaultTtl: 60_000 })
  let calls = 0
  const fetchImpl = async () => { calls++; return {} }

  await engine.get('/api/projects?year=2567&include=all', { fetchImpl })
  await engine.get('/api/projects?year=2568', { fetchImpl })
  await engine.get('/api/users', { fetchImpl })
  assert.equal(calls, 3)

  engine.invalidate('/api/projects')

  await engine.get('/api/projects?year=2567&include=all', { fetchImpl })
  await engine.get('/api/projects?year=2568', { fetchImpl })
  assert.equal(calls, 5, 'both project variants refetch, users untouched')
})

test('cache-invalidation: invalidation during in-flight GET keeps caller result but discards cache write', async () => {
  const engine = new CacheEngine({ defaultTtl: 60_000 })
  let calls = 0
  const fetchImpl = async () => { calls++; await sleep(50); return { gen: calls } }

  const pending = engine.get('/api/users', { fetchImpl })
  await sleep(10)
  engine.invalidate('/api/users')

  const result = await pending
  assert.deepEqual(result, { gen: 1 }, 'the in-flight caller still resolves')
  assert.equal(engine.responseCache.has('/api/users'), false, 'but nothing was cached')

  await engine.get('/api/users', { fetchImpl })
  assert.equal(calls, 2, 'next reader triggers a fresh fetch')
})

test('cache-invalidation: forceRefresh skips in-flight join and cache, then repopulates', async () => {
  const engine = new CacheEngine({ defaultTtl: 60_000 })
  let calls = 0
  const fetchImpl = async () => { calls++; await sleep(30); return { v: calls } }

  await engine.get('/api/projects', { fetchImpl })
  assert.equal(calls, 1)

  const refreshed = await engine.get('/api/projects', { fetchImpl, forceRefresh: true })
  assert.equal(calls, 2)
  assert.deepEqual(refreshed, { v: 2 })

  const cached = await engine.get('/api/projects', { fetchImpl })
  assert.equal(calls, 2, 'fresh value was cached and served')
  assert.deepEqual(cached, { v: 2 })
})

test('cache-invalidation: full invalidate without prefix clears everything including in-flight', async () => {
  const engine = new CacheEngine({ defaultTtl: 60_000 })
  let calls = 0
  const fetchImpl = async () => { calls++; await sleep(30); return {} }

  await engine.get('/api/users', { fetchImpl })
  const pending = engine.get('/api/projects', { fetchImpl })

  engine.invalidate()

  await pending
  assert.equal(engine.responseCache.size, 0)
  assert.equal(engine.inFlightRequests.size, 0)

  await engine.get('/api/users', { fetchImpl })
  assert.equal(calls, 3)
})

test('cache-invalidation: normalized key shape is stable and sorted', () => {
  assert.equal(normalizeUrlKey('/api/users'), '/api/users')
  assert.equal(normalizeUrlKey('/api/users?t=1'), '/api/users')
  assert.equal(normalizeUrlKey('/api/projects?b=2&a=1&t=9'), '/api/projects?a=1&b=2')
})
