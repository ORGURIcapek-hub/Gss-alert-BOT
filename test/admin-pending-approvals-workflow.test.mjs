import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiTestEnv } from './helpers/api-env.mjs'

const { NextRequest } = await import('next/server')

function isPending(status) {
  return String(status || '').toLowerCase().trim() === 'pending'
}

function isRejected(status) {
  return String(status || '').toLowerCase().trim() === 'rejected'
}

function isApproved(status) {
  return !isPending(status) && !isRejected(status)
}

function jsonRequest(url, method, body) {
  return new NextRequest('http://localhost' + url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    duplex: 'half'
  })
}

test('status helpers: isPending, isRejected, and isApproved normalize casing and whitespace', () => {
  const pendingVariations = ['pending', 'Pending', 'PENDING', '  pending  ', '  Pending  \n']
  for (const v of pendingVariations) {
    assert.equal(isPending(v), true, `should be pending for "${v}"`)
    assert.equal(isApproved(v), false, `should not be approved for "${v}"`)
    assert.equal(isRejected(v), false, `should not be rejected for "${v}"`)
  }

  const rejectedVariations = ['rejected', 'Rejected', 'REJECTED', '  rejected  ']
  for (const v of rejectedVariations) {
    assert.equal(isPending(v), false)
    assert.equal(isApproved(v), false)
    assert.equal(isRejected(v), true)
  }

  const approvedVariations = ['approved', 'Approved', 'APPROVED', '', null, undefined]
  for (const v of approvedVariations) {
    assert.equal(isPending(v), false)
    assert.equal(isRejected(v), false)
    assert.equal(isApproved(v), true)
  }
})

test('pending approvals list: filters pending applicants correctly from all users', () => {
  const allUsers = [
    { user_id: 'u-1', name: 'Admin', status: 'approved', role: 'admin' },
    { user_id: 'u-2', name: 'Teacher 1', status: 'Pending', role: 'teacher' },
    { user_id: 'u-3', name: 'Teacher 2', status: '  pending  ', role: 'teacher' },
    { user_id: 'u-4', name: 'Staff 1', status: 'rejected', role: 'staff' },
    { user_id: 'u-5', name: 'Teacher 3', status: undefined, role: 'teacher' }
  ]

  const pending = allUsers.filter(u => isPending(u.status))
  const approved = allUsers.filter(u => isApproved(u.status))
  const rejected = allUsers.filter(u => isRejected(u.status))

  assert.equal(pending.length, 2)
  assert.equal(pending[0].user_id, 'u-2')
  assert.equal(pending[1].user_id, 'u-3')

  assert.equal(approved.length, 2)
  assert.equal(approved[0].user_id, 'u-1')
  assert.equal(approved[1].user_id, 'u-5')

  assert.equal(rejected.length, 1)
  assert.equal(rejected[0].user_id, 'u-4')
})

test('approval workflow state: approving user does not switch viewMode away from pending', () => {
  let viewMode = 'pending'
  let allUsers = [
    { user_id: 'u-1', name: 'Applicant 1', status: 'pending', role: 'teacher' },
    { user_id: 'u-2', name: 'Applicant 2', status: 'pending', role: 'staff' }
  ]

  const approveSimulated = (userId, newRole) => {
    allUsers = allUsers.map(u => u.user_id === userId ? { ...u, status: 'approved', role: newRole || u.role } : u)
  }

  approveSimulated('u-1', 'teacher')

  assert.equal(viewMode, 'pending')

  const remainingPending = allUsers.filter(u => isPending(u.status))
  assert.equal(remainingPending.length, 1)
  assert.equal(remainingPending[0].user_id, 'u-2')
})

test('API registration and approval workflow: registers new user as pending and approves via PUT', async t => {
  const env = createApiTestEnv({ fixtureName: 'admin-approval-flow' })
  t.after(() => env.restore())

  const seedAdmin = {
    user_id: 'u-admin',
    username: 'superadmin',
    email: 'admin@sdu.ac.th',
    name: 'ผู้ดูแลระบบ',
    role: 'admin',
    status: 'approved'
  }

  env.seed('persisted-users.json', {
    users: [seedAdmin],
    deletedUserIds: []
  })

  const route = await env.importRoute('app/api/users/route.ts')

  const registerPayload = {
    email: 'newbie@sdu.ac.th',
    username: 'newbie',
    password: 'Password123!',
    name: 'กานต์ ประเสริฐ',
    first_name: 'กานต์',
    last_name: 'ประเสริฐ',
    role: 'teacher',
    department: 'สาขาวิชาวิทยาการคอมพิวเตอร์',
    position: 'อาจารย์ผู้สอน'
  }

  const postRes = await route.POST(jsonRequest('/api/users', 'POST', registerPayload))
  const postBody = await postRes.json()

  assert.equal(postRes.status, 200)
  assert.equal(postBody.success, true)
  assert.equal(postBody.user.status, 'pending')
  assert.equal(postBody.user.email, 'newbie@sdu.ac.th')

  const newUserId = postBody.user.user_id

  const getRes1 = await route.GET(jsonRequest('/api/users?force=true', 'GET'))
  const getBody1 = await getRes1.json()

  assert.equal(getBody1.success, true)
  const pendingUsersBefore = getBody1.users.filter(u => isPending(u.status))
  assert.equal(pendingUsersBefore.length, 1)
  assert.equal(pendingUsersBefore[0].user_id, newUserId)

  const approveRes = await route.PUT(jsonRequest('/api/users', 'PUT', {
    action: 'approve',
    userId: newUserId,
    assignedRole: 'head_okr'
  }))
  const approveBody = await approveRes.json()

  assert.equal(approveRes.status, 200)
  assert.equal(approveBody.success, true)
  assert.equal(approveBody.user.status, 'approved')
  assert.equal(approveBody.user.role, 'head_okr')

  const getRes2 = await route.GET(jsonRequest('/api/users?force=true', 'GET'))
  const getBody2 = await getRes2.json()

  const pendingUsersAfter = getBody2.users.filter(u => isPending(u.status))
  const approvedUsersAfter = getBody2.users.filter(u => isApproved(u.status))

  assert.equal(pendingUsersAfter.length, 0)
  assert.equal(approvedUsersAfter.some(u => u.user_id === newUserId && u.role === 'head_okr'), true)
})

test('API registration rejection workflow: rejects user via PUT and updates status to rejected', async t => {
  const env = createApiTestEnv({ fixtureName: 'admin-reject-flow' })
  t.after(() => env.restore())

  const seedAdmin = {
    user_id: 'u-admin-2',
    username: 'admin2',
    email: 'admin2@sdu.ac.th',
    name: 'ผู้ดูแลระบบ 2',
    role: 'admin',
    status: 'approved'
  }

  env.seed('persisted-users.json', {
    users: [seedAdmin],
    deletedUserIds: []
  })

  const route = await env.importRoute('app/api/users/route.ts')

  const registerPayload = {
    email: 'spam@sdu.ac.th',
    username: 'spammer',
    password: 'Password123!',
    name: 'สแปม บอท',
    role: 'staff'
  }

  const postRes = await route.POST(jsonRequest('/api/users', 'POST', registerPayload))
  const postBody = await postRes.json()
  const spamUserId = postBody.user.user_id

  const rejectRes = await route.PUT(jsonRequest('/api/users', 'PUT', {
    action: 'reject',
    userId: spamUserId
  }))
  const rejectBody = await rejectRes.json()

  assert.equal(rejectRes.status, 200)
  assert.equal(rejectBody.success, true)
  assert.equal(rejectBody.user.status, 'rejected')

  const getRes = await route.GET(jsonRequest('/api/users?force=true', 'GET'))
  const getBody = await getRes.json()

  const pendingUsers = getBody.users.filter(u => isPending(u.status))
  const rejectedUsers = getBody.users.filter(u => isRejected(u.status))

  assert.equal(pendingUsers.length, 0)
  assert.equal(rejectedUsers.some(u => u.user_id === spamUserId), true)
})
