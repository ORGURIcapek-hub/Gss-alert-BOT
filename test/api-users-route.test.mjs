import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiTestEnv } from './helpers/api-env.mjs'

const { NextRequest } = await import('next/server')

const USER = (over = {}) => ({
  user_id: 'u-' + Math.random().toString(36).slice(2, 8),
  username: 'somchai',
  email: 'somchai@sdu.ac.th',
  name: 'สมชาย ใจดี',
  role: 'teacher',
  status: 'approved',
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

test('users route GET: returns active users from the seeded local store', async t => {
  const env = createApiTestEnv({ fixtureName: 'users' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER(), USER({ user_id: 'u-2', status: 'pending' })], deletedUserIds: ['u-gone'] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.GET(jsonRequest('/api/users', 'GET'))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.source, 'local')
  assert.equal(body.users.length, 2)
  assert.ok(body.users.every(u => u.user_id !== 'u-gone'))
  assert.equal(res.headers.get('cache-control').includes('no-store'), true)
})

test('users route GET: falls back to mockUsers when store is empty/missing', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-fallback' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.GET(jsonRequest('/api/users', 'GET'))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.ok(body.users.length > 0, 'mock users served')
  assert.equal(env.read('persisted-users.json').users.length, body.users.length, 'fallback persisted to disk')
})

test('users route GET: tombstoned (deleted) users never leak into responses', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-tombstone' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ user_id: 'u-1' })], deletedUserIds: ['u-1'] })

  const route = await env.importRoute('app/api/users/route.ts')
  const body = await (await route.GET(jsonRequest('/api/users', 'GET'))).json()
  assert.equal(body.users.length, 0)
})

test('users route POST: creates a pending user with computed defaults', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-post' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.POST(jsonRequest('/api/users', 'POST', {
    email: 'New.Teacher@SDU.ac.th',
    name: 'กานดา สุขสมบัติ',
    role: 'teacher'
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.user.email, 'new.teacher@sdu.ac.th')
  assert.equal(body.user.status, 'pending')
  assert.equal(body.user.role, 'teacher')
  assert.equal(body.user.management_order, 4)
  assert.equal(body.user.username, 'new.teacher')
  assert.equal(body.user.password, 'password123')
  const stored = env.read('persisted-users.json')
  const created = stored.users.find(u => u.email === 'new.teacher@sdu.ac.th')
  assert.ok(created, 'created user persisted to disk')
  assert.equal(created.status, 'pending')
})

test('users route POST: rejects duplicate email even with different case', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-dup' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ email: 'taken@sdu.ac.th', status: 'approved' })], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.POST(jsonRequest('/api/users', 'POST', { email: 'TAKEN@sdu.ac.th' }))
  const body = await res.json()

  assert.equal(res.status, 400)
  assert.equal(body.success, false)
  assert.match(body.error, /มีอยู่ในระบบแล้ว/)
})

test('users route POST: rejects password outside 8-15 chars', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-pw' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  for (const bad of ['short1!', 'this-password-is-way-too-long!']) {
    const res = await route.POST(jsonRequest('/api/users', 'POST', { email: 'x@sdu.ac.th', password: bad }))
    const body = await res.json()
    assert.equal(res.status, 400)
    assert.match(body.error, /8-15/)
  }
})

test('users route POST: re-registers over a pending account by updating it in place', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-repost' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ email: 'p@sdu.ac.th', status: 'pending', name: 'old' })], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.POST(jsonRequest('/api/users', 'POST', { email: 'p@sdu.ac.th', name: 'ใหม่ แก้แล้ว', role: 'staff' }))
  const body = await res.json()

  assert.equal(body.success, true)
  assert.equal(body.isPendingUpdated, true)
  assert.equal(body.user.name, 'ใหม่ แก้แล้ว')
  assert.equal(body.user.role, 'staff')
  assert.equal(env.read('persisted-users.json').users.length, 1, 'no duplicate row')
})

test('users route PUT approve: flips status, applies assignedRole, clears tombstone', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-approve' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ user_id: 'u-9', status: 'pending', role: 'staff' })], deletedUserIds: ['u-9'] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.PUT(jsonRequest('/api/users', 'PUT', { userId: 'u-9', action: 'approve', assignedRole: 'head_okr' }))
  const body = await res.json()

  assert.equal(body.success, true)
  assert.equal(body.user.status, 'approved')
  assert.equal(body.user.role, 'head_okr')
  assert.equal(body.user.management_order, 3)
  assert.deepEqual(env.read('persisted-users.json').deletedUserIds, [])
})

test('users route PUT update_role: yearly_roles map merges per-year without touching base role', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-role' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ user_id: 'u-1', role: 'teacher', yearly_roles: { 2567: 'head_okr' } })], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.PUT(jsonRequest('/api/users', 'PUT', { userId: 'u-1', action: 'update_role', year: 2568, role: 'executive' }))
  const body = await res.json()

  assert.equal(body.success, true)
  const stored = env.read('persisted-users.json').users.find(u => u.user_id === 'u-1')
  assert.equal(stored.role, 'teacher')
  assert.equal(stored.yearly_roles['2567'], 'head_okr')
  assert.equal(stored.yearly_roles['2568'], 'executive')
})

test('users route PUT update_password: enforces 8-15 length', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-pwput' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ user_id: 'u-1' })], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const bad = await route.PUT(jsonRequest('/api/users', 'PUT', { userId: 'u-1', action: 'update_password', password: 'short' }))
  assert.equal(bad.status, 400)

  const good = await route.PUT(jsonRequest('/api/users', 'PUT', { userId: 'u-1', action: 'update_password', password: 'NewPass1!' }))
  assert.equal((await good.json()).success, true)
  assert.equal(env.read('persisted-users.json').users[0].password, 'NewPass1!')
})

test('users route PUT: unknown action and missing user rejected', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-putbad' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ user_id: 'u-1' })], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const unknown = await route.PUT(jsonRequest('/api/users', 'PUT', { userId: 'u-1', action: 'explode' }))
  assert.equal(unknown.status, 400)

  const missing = await route.PUT(jsonRequest('/api/users', 'PUT', { userId: 'ghost', action: 'approve' }))
  assert.equal(missing.status, 404)

  const noId = await route.PUT(jsonRequest('/api/users', 'PUT', { action: 'approve' }))
  assert.equal(noId.status, 400)
})

test('users route DELETE: removes the user from the array and tombstones the id', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-del' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ user_id: 'u-1' }), USER({ user_id: 'u-2' })], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.DELETE(jsonRequest('/api/users?userId=u-1', 'DELETE'))
  const body = await res.json()

  assert.equal(body.success, true)
  const stored = env.read('persisted-users.json')
  assert.deepEqual(stored.deletedUserIds, ['u-1'])
  assert.deepEqual(stored.users.map(u => u.user_id), ['u-2'], 'hard-removed from users array')
})

test('users route POST: persists title and gender fields when registering', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-post-title-gender' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.POST(jsonRequest('/api/users', 'POST', {
    email: 'dr.somying@sdu.ac.th',
    title: 'ดร.',
    gender: 'female',
    first_name: 'สมหญิง',
    last_name: 'รักเรียน',
    role: 'teacher'
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.user.title, 'ดร.')
  assert.equal(body.user.gender, 'female')
  assert.equal(body.user.first_name, 'สมหญิง')
  assert.equal(body.user.last_name, 'รักเรียน')
  assert.equal(body.user.name, 'ดร. สมหญิง รักเรียน')
  const stored = env.read('persisted-users.json')
  const created = stored.users.find(u => u.email === 'dr.somying@sdu.ac.th')
  assert.ok(created)
  assert.equal(created.title, 'ดร.')
  assert.equal(created.gender, 'female')
})

test('users route PUT update_profile: updates title and gender alongside personal details', async t => {
  const env = createApiTestEnv({ fixtureName: 'users-put-title-gender' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [USER({ user_id: 'u-1', title: 'นาย', gender: 'male' })], deletedUserIds: [] })

  const route = await env.importRoute('app/api/users/route.ts')
  const res = await route.PUT(jsonRequest('/api/users', 'PUT', {
    userId: 'u-1',
    action: 'update_profile',
    title: 'ผศ.ดร.',
    gender: 'female',
    first_name: 'สมหญิง',
    last_name: 'วิชาการ',
    department: 'วิทยาศาสตร์'
  }))
  const body = await res.json()

  assert.equal(body.success, true)
  assert.equal(body.user.title, 'ผศ.ดร.')
  assert.equal(body.user.gender, 'female')
  const stored = env.read('persisted-users.json').users.find(u => u.user_id === 'u-1')
  assert.equal(stored.title, 'ผศ.ดร.')
  assert.equal(stored.gender, 'female')
  assert.equal(stored.name, 'ผศ.ดร. สมหญิง วิชาการ')
})
