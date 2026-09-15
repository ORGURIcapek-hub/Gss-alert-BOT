import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiTestEnv } from './helpers/api-env.mjs'

const { NextRequest } = await import('next/server')

const OKR = (over = {}) => ({
  okr_id: 'okr-' + Math.random().toString(36).slice(2, 8),
  okr_title: 'ยุทธศาสตร์ที่ ' + Math.ceil(Math.random() * 5),
  okr_type: 'ยุทธศาสตร์คณะ',
  year: 2567,
  quarter: null,
  status: 'In Progress',
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...over
})

function jsonRequest(url, method, body) {
  return new NextRequest('http://localhost' + url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    duplex: 'half'
  })
}

test('okrs route GET: returns all OKRs when no year filter is given', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-get' })
  t.after(() => env.restore())
  env.seed('persisted-okrs.json', { okrs: [OKR({ year: 2567 }), OKR({ year: 2566 })] })

  const route = await env.importRoute('app/api/okrs/route.ts')
  const res = await route.GET(jsonRequest('/api/okrs', 'GET'))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.okrs.length, 2)
})

test('okrs route GET: filters by year query param', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-year' })
  t.after(() => env.restore())
  env.seed('persisted-okrs.json', { okrs: [OKR({ year: 2567 }), OKR({ year: 2567 }), OKR({ year: 2566 })] })

  const route = await env.importRoute('app/api/okrs/route.ts')
  const body = await (await route.GET(jsonRequest('/api/okrs?year=2567', 'GET'))).json()
  assert.equal(body.okrs.length, 2)
  assert.ok(body.okrs.every(o => o.year === 2567))
})

test('okrs route GET: falls back to mockOKRs and seeds the store when file is missing', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-fallback' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/okrs/route.ts')
  const body = await (await route.GET(jsonRequest('/api/okrs', 'GET'))).json()

  assert.equal(body.success, true)
  assert.ok(body.okrs.length > 0)
  assert.equal(env.read('persisted-okrs.json').okrs.length, body.okrs.length)
})

test('okrs route POST create: prepends a new OKR with normalized defaults', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-post' })
  t.after(() => env.restore())
  env.seed('persisted-okrs.json', { okrs: [OKR({ okr_id: 'existing' })] })

  const route = await env.importRoute('app/api/okrs/route.ts')
  const res = await route.POST(jsonRequest('/api/okrs', 'POST', {
    okr: { okr_title: 'ยุทธศาสตร์ดิจิทัล', year: '2568', quarter: 'Q2' }
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.okr.okr_title, 'ยุทธศาสตร์ดิจิทัล')
  assert.equal(body.okr.year, 2568, 'string year coerced to number')
  assert.equal(body.okr.quarter, 'Q2')

  const stored = env.read('persisted-okrs.json').okrs
  assert.equal(stored[0].okr_id, body.okr.okr_id, 'new OKR is first (prepended)')
  assert.equal(stored.length, 2)
  assert.ok(stored.some(o => o.okr_id === 'existing'))
})

test('okrs route POST create: invalid quarter normalizes to null', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-quarter' })
  t.after(() => env.restore())
  env.seed('persisted-okrs.json', { okrs: [] })

  const route = await env.importRoute('app/api/okrs/route.ts')
  const body = await (await route.POST(jsonRequest('/api/okrs', 'POST', {
    okr: { okr_title: 'x', quarter: 'Q5' }
  }))).json()

  assert.equal(body.success, true)
  assert.equal(body.okr.quarter, null)
})

test('okrs route POST create: missing okr_title is a 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-400' })
  t.after(() => env.restore())
  env.seed('persisted-okrs.json', { okrs: [] })

  const route = await env.importRoute('app/api/okrs/route.ts')
  const res = await route.POST(jsonRequest('/api/okrs', 'POST', { okr: { year: 2568 } }))
  const body = await res.json()

  assert.equal(res.status, 400)
  assert.equal(body.success, false)
  assert.match(body.error, /okr_title/)
})

test('okrs route POST create: same okr_id replaces instead of duplicating (upsert semantics)', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-upsert' })
  t.after(() => env.restore())
  env.seed('persisted-okrs.json', { okrs: [OKR({ okr_id: 'dup-1', okr_title: 'เดิม' })] })

  const route = await env.importRoute('app/api/okrs/route.ts')
  await route.POST(jsonRequest('/api/okrs', 'POST', {
    okr: { okr_id: 'dup-1', okr_title: 'ใหม่แก้แล้ว' }
  }))

  const stored = env.read('persisted-okrs.json').okrs
  assert.equal(stored.length, 1)
  assert.equal(stored[0].okr_title, 'ใหม่แก้แล้ว')
})

test('okrs route POST: unknown action returns 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-unknown' })
  t.after(() => env.restore())
  env.seed('persisted-okrs.json', { okrs: [] })

  const route = await env.importRoute('app/api/okrs/route.ts')
  const res = await route.POST(jsonRequest('/api/okrs', 'POST', { action: 'teleport' }))
  assert.equal(res.status, 400)
})

test('okrs route POST create: persists object and key_result fields', async t => {
  const env = createApiTestEnv({ fixtureName: 'okrs-kr' })
  t.after(() => env.restore())
  env.seed('persisted-okrs.json', { okrs: [] })

  const route = await env.importRoute('app/api/okrs/route.ts')
  const res = await route.POST(jsonRequest('/api/okrs', 'POST', {
    okr: {
      object: 'พัฒนาผู้เรียนให้มีทักษะที่จำเป็นแห่งโลกอนาคต',
      key_result: 'ร้อยละของนักศึกษาที่ผ่านการทดสอบสมรรถนะ',
      okr_type: 'R - Recognition: พลังแห่งผู้เรียนและศิษย์เก่า',
      year: 2568
    }
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.okr.object, 'พัฒนาผู้เรียนให้มีทักษะที่จำเป็นแห่งโลกอนาคต')
  assert.equal(body.okr.key_result, 'ร้อยละของนักศึกษาที่ผ่านการทดสอบสมรรถนะ')
  assert.ok(body.okr.okr_title.includes('ร้อยละของนักศึกษาที่ผ่านการทดสอบสมรรถนะ'))

  const stored = env.read('persisted-okrs.json').okrs
  assert.equal(stored.length, 1)
  assert.equal(stored[0].object, 'พัฒนาผู้เรียนให้มีทักษะที่จำเป็นแห่งโลกอนาคต')
  assert.equal(stored[0].key_result, 'ร้อยละของนักศึกษาที่ผ่านการทดสอบสมรรถนะ')
})

