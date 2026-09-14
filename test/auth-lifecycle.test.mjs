import test from 'node:test'
import assert from 'node:assert/strict'

const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/

function validatePassword(password) {
  const hasLength = password.length >= 8 && password.length <= 15
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = PASSWORD_SPECIAL_REGEX.test(password)
  const isValid = hasLength && hasLetter && hasNumber && hasSpecial
  const criteriaCount = [hasLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length
  return { hasLength, hasLetter, hasNumber, hasSpecial, isValid, criteriaCount }
}

function validateEmail(email) {
  const trimmed = (email || '').trim()

  if (!trimmed) {
    return { isValid: false, error: 'กรุณาระบุอีเมล' }
  }
  if (trimmed.includes(' ')) {
    return { isValid: false, error: 'อีเมลต้องไม่มีช่องว่าง' }
  }
  if ((trimmed.match(/@/g) || []).length !== 1) {
    return { isValid: false, error: 'อีเมลต้องมีเครื่องหมาย @ เพียงอันเดียว' }
  }

  const [local, domain] = trimmed.split('@')

  if (!local || local.length === 0) {
    return { isValid: false, error: 'กรุณาระบุชื่อก่อนเครื่องหมาย @' }
  }
  if (!domain || !domain.includes('.')) {
    return { isValid: false, error: 'โดเมนอีเมลต้องมีจุด (.) เช่น example.com' }
  }

  const domainParts = domain.split('.')
  const tld = domainParts[domainParts.length - 1]
  if (tld.length < 2) {
    return { isValid: false, error: 'ส่วนต่อท้ายอีเมล (TLD) ต้องมีอย่างน้อย 2 ตัวอักษร เช่น .th, .com' }
  }

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'รูปแบบอีเมลไม่ถูกต้อง เช่น name@domain.com หรือ somchai@science.ac.th' }
  }

  return { isValid: true, error: null }
}

function canUserAuthenticate(user) {
  if (!user) return false
  const status = user.status || 'approved'
  return status === 'approved'
}

test('auth-lifecycle: rejects passwords shorter than 8 chars', () => {
  const res = validatePassword('Pass1!')
  assert.equal(res.isValid, false)
  assert.equal(res.hasLength, false)
})

test('auth-lifecycle: rejects passwords longer than 15 chars', () => {
  const res = validatePassword('Password12345678!@#')
  assert.equal(res.isValid, false)
  assert.equal(res.hasLength, false)
})

test('auth-lifecycle: rejects passwords missing special character or number', () => {
  const noSpecial = validatePassword('Password123')
  assert.equal(noSpecial.isValid, false)
  assert.equal(noSpecial.hasSpecial, false)

  const noNumber = validatePassword('Password!@#')
  assert.equal(noNumber.isValid, false)
  assert.equal(noNumber.hasNumber, false)
})

test('auth-lifecycle: accepts strong passwords meeting all criteria', () => {
  const valid1 = validatePassword('Theme#1711')
  assert.equal(valid1.isValid, true)
  assert.equal(valid1.criteriaCount, 4)

  const valid2 = validatePassword('Admin!2024')
  assert.equal(valid2.isValid, true)
})

test('auth-lifecycle: email validation accepts valid educational and standard emails', () => {
  assert.equal(validateEmail('user@dusit.ac.th').isValid, true)
  assert.equal(validateEmail('somchai.j@science.sdu.ac.th').isValid, true)
  assert.equal(validateEmail('admin@gmail.com').isValid, true)
})

test('auth-lifecycle: email validation rejects malformed and blank emails', () => {
  assert.equal(validateEmail('').isValid, false)
  assert.equal(validateEmail('invalid-email').isValid, false)
  assert.equal(validateEmail('user@domain').isValid, false)
  assert.equal(validateEmail('user with space@domain.com').isValid, false)
  assert.equal(validateEmail('user@@domain.com').isValid, false)
})

test('auth-lifecycle: canUserAuthenticate only allows approved users and revokes pending/rejected', () => {
  const approvedUser = { user_id: 'u1', status: 'approved' }
  const legacyApproved = { user_id: 'u2' }
  const pendingUser = { user_id: 'u3', status: 'pending' }
  const rejectedUser = { user_id: 'u4', status: 'rejected' }

  assert.equal(canUserAuthenticate(approvedUser), true)
  assert.equal(canUserAuthenticate(legacyApproved), true)
  assert.equal(canUserAuthenticate(pendingUser), false)
  assert.equal(canUserAuthenticate(rejectedUser), false)
  assert.equal(canUserAuthenticate(null), false)
})
