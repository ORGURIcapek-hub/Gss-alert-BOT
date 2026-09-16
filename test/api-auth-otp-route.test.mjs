import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiTestEnv } from './helpers/api-env.mjs'

const { NextRequest } = await import('next/server')

function jsonRequest(url, method, body) {
  return new NextRequest('http://localhost' + url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    duplex: 'half'
  })
}

test('send-otp-email route: rejects missing email or OTP with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'otp-missing' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/auth/send-otp-email/route.ts')

  const resEmpty = await route.POST(jsonRequest('/api/auth/send-otp-email', 'POST', {}))
  assert.equal(resEmpty.status, 400)
  const bodyEmpty = await resEmpty.json()
  assert.equal(bodyEmpty.success, false)
  assert.equal(bodyEmpty.error, 'Email and OTP are required')

  const resNoOtp = await route.POST(jsonRequest('/api/auth/send-otp-email', 'POST', { email: 'user@dusit.ac.th' }))
  assert.equal(resNoOtp.status, 400)

  const resNoEmail = await route.POST(jsonRequest('/api/auth/send-otp-email', 'POST', { otp: '123456' }))
  assert.equal(resNoEmail.status, 400)
})

test('send-otp-email route: rejects malformed email formats with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'otp-invalid-email' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/auth/send-otp-email/route.ts')

  const invalidEmails = ['plainaddress', '@missingusername.com', 'username@.com', 'user@domain']
  for (const email of invalidEmails) {
    const res = await route.POST(jsonRequest('/api/auth/send-otp-email', 'POST', { email, otp: '123456' }))
    assert.equal(res.status, 400)
    const body = await res.json()
    assert.equal(body.success, false)
    assert.equal(body.error, 'รูปแบบอีเมลไม่ถูกต้อง')
  }
})

test('send-otp-email route: rejects non-numeric or out-of-length OTPs with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'otp-invalid-code' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/auth/send-otp-email/route.ts')

  const invalidOtps = ['abc', '12', '123', '123456789', 'otp123', '12 34']
  for (const otp of invalidOtps) {
    const res = await route.POST(jsonRequest('/api/auth/send-otp-email', 'POST', { email: 'somchai@dusit.ac.th', otp }))
    assert.equal(res.status, 400)
    const body = await res.json()
    assert.equal(body.success, false)
    assert.equal(body.error, 'รูปแบบ OTP ไม่ถูกต้อง')
  }
})

test('send-otp-email route: accepts valid request in simulated delivery mode when SMTP not configured', async t => {
  const env = createApiTestEnv({ fixtureName: 'otp-simulation' })
  t.after(() => env.restore())

  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS

  const route = await env.importRoute('app/api/auth/send-otp-email/route.ts')
  const res = await route.POST(
    jsonRequest('/api/auth/send-otp-email', 'POST', {
      email: 'somchai@dusit.ac.th',
      otp: '654321',
      userName: 'ดร.สมชาย ใจดี'
    })
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.success, true)
  assert.equal(body.isRealEmail, false)
  assert.ok(body.message.includes('จำลองการส่งรหัส OTP'))
})

test('send-otp-email route: escapes HTML characters in userName safely', async t => {
  const env = createApiTestEnv({ fixtureName: 'otp-xss' })
  t.after(() => env.restore())

  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS

  const route = await env.importRoute('app/api/auth/send-otp-email/route.ts')
  const res = await route.POST(
    jsonRequest('/api/auth/send-otp-email', 'POST', {
      email: 'teacher@dusit.ac.th',
      otp: '987654',
      userName: '<script>alert("xss")</script> & "Admin"'
    })
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.success, true)
})
