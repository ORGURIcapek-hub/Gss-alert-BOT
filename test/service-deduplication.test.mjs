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

test('service-deduplication: normalizes plain URLs without query params', () => {
  assert.equal(normalizeUrlKey('/api/users'), '/api/users')
  assert.equal(normalizeUrlKey('/api/projects'), '/api/projects')
})

test('service-deduplication: strips cache-buster timestamp parameter', () => {
  assert.equal(normalizeUrlKey('/api/users?t=1789395482866'), '/api/users')
  assert.equal(normalizeUrlKey('/api/projects?year=2567&t=1789395482866'), '/api/projects?year=2567')
})

test('service-deduplication: produces identical keys regardless of query param order', () => {
  const urlA = '/api/projects?year=2567&quarter=1&status=Delayed'
  const urlB = '/api/projects?status=Delayed&quarter=1&year=2567'
  const urlC = '/api/projects?quarter=1&status=Delayed&year=2567&t=999999'

  const keyA = normalizeUrlKey(urlA)
  const keyB = normalizeUrlKey(urlB)
  const keyC = normalizeUrlKey(urlC)

  assert.equal(keyA, keyB)
  assert.equal(keyB, keyC)
  assert.equal(keyA, '/api/projects?quarter=1&status=Delayed&year=2567')
})

test('service-deduplication: in-flight promise deduplicator returns same promise for simultaneous calls', async () => {
  const inFlightRequests = new Map()

  function simulatedFetch(url) {
    const key = normalizeUrlKey(url)
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key)
    }

    const promise = new Promise((resolve) => {
      setTimeout(() => {
        inFlightRequests.delete(key)
        resolve({ data: 'response_for_' + key })
      }, 50)
    })

    inFlightRequests.set(key, promise)
    return promise
  }

  const p1 = simulatedFetch('/api/users?t=1111')
  const p2 = simulatedFetch('/api/users?t=2222')
  const p3 = simulatedFetch('/api/users')

  assert.equal(p1, p2)
  assert.equal(p2, p3)

  const [r1, r2, r3] = await Promise.all([p1, p2, p3])
  assert.deepEqual(r1, { data: 'response_for_/api/users' })
  assert.deepEqual(r2, { data: 'response_for_/api/users' })
  assert.deepEqual(r3, { data: 'response_for_/api/users' })

  assert.equal(inFlightRequests.has('/api/users'), false)
})
