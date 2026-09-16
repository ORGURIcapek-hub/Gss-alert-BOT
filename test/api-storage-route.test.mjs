import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiTestEnv } from './helpers/api-env.mjs'

const { NextRequest } = await import('next/server')

function formRequest(url, method, formData) {
  return new NextRequest('http://localhost' + url, {
    method,
    body: formData,
    duplex: 'half'
  })
}

function jsonRequest(url, method, body) {
  return new NextRequest('http://localhost' + url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    duplex: 'half'
  })
}

test('storage route POST: rejects invalid bucket name with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-bucket' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const fd = new FormData()
  fd.append('bucket', 'unauthorized-bucket')
  fd.append('file', new File(['content'], 'test.txt', { type: 'text/plain' }))

  const res = await route.POST(formRequest('/api/storage', 'POST', fd))
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error, 'bucket ไม่ถูกต้อง')
})

test('storage route POST: rejects missing file in FormData with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-no-file' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const fd = new FormData()
  fd.append('bucket', 'OKR-files')

  const res = await route.POST(formRequest('/api/storage', 'POST', fd))
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error, 'ไม่พบไฟล์สำหรับการอัปโหลด')
})

test('storage route POST: rejects disallowed executable MIME type with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-mime' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const fd = new FormData()
  fd.append('bucket', 'OKR-files')
  fd.append('file', new File(['bad code'], 'malicious.exe', { type: 'application/x-msdownload' }))

  const res = await route.POST(formRequest('/api/storage', 'POST', fd))
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error, 'ประเภทไฟล์นี้ไม่ได้รับอนุญาต')
})

test('storage route POST: rejects path traversal attempt in storage path with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-traversal' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const fd = new FormData()
  fd.append('bucket', 'OKR-files')
  fd.append('path', '../../system/root.txt')
  fd.append('file', new File(['payload'], 'doc.pdf', { type: 'application/pdf' }))

  const res = await route.POST(formRequest('/api/storage', 'POST', fd))
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error, 'ชื่อไฟล์ไม่ถูกต้อง')
})

test('storage route POST: returns 503 service unavailable when Supabase is unconfigured', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-no-supabase' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const fd = new FormData()
  fd.append('bucket', 'OKR-files')
  fd.append('path', 'reports/valid_report.pdf')
  fd.append('file', new File(['sample pdf'], 'valid_report.pdf', { type: 'application/pdf' }))

  const res = await route.POST(formRequest('/api/storage', 'POST', fd))
  assert.equal(res.status, 503)
  const body = await res.json()
  assert.ok(body.error.includes('ไม่สามารถเชื่อมต่อ Supabase ได้'))
})

test('storage route DELETE: rejects invalid bucket name with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-del-bucket' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const res = await route.DELETE(
    jsonRequest('/api/storage', 'DELETE', {
      bucket: 'illegal-bucket',
      path: 'some/path.pdf'
    })
  )

  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error, 'bucket ไม่ถูกต้อง')
})

test('storage route DELETE: rejects empty or missing path with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-del-empty' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const res = await route.DELETE(
    jsonRequest('/api/storage', 'DELETE', {
      bucket: 'OKR-files',
      path: '   '
    })
  )

  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.success, false)
  assert.equal(body.error, 'กรุณาระบุไฟล์ที่ต้องการลบ')
})

test('storage route DELETE: rejects path traversal attempts with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-del-traversal' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const res = await route.DELETE(
    jsonRequest('/api/storage', 'DELETE', {
      bucket: 'OKR-files',
      path: '../evil/path.pdf'
    })
  )

  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.success, false)
  assert.equal(body.error, 'เส้นทางไฟล์ไม่ถูกต้อง')
})

test('storage route DELETE: returns 503 service unavailable when Supabase is unconfigured', async t => {
  const env = createApiTestEnv({ fixtureName: 'storage-del-no-supabase' })
  t.after(() => env.restore())

  const route = await env.importRoute('app/api/storage/route.ts')

  const res = await route.DELETE(
    jsonRequest('/api/storage', 'DELETE', {
      bucket: 'OKR-files',
      path: 'evidence/clean_doc.pdf'
    })
  )

  assert.equal(res.status, 503)
  const body = await res.json()
  assert.equal(body.error, 'ไม่สามารถเชื่อมต่อ Supabase ได้')
})
