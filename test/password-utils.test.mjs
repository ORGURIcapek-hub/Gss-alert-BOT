import test from 'node:test'
import assert from 'node:assert/strict'

const { validatePassword, validateEmail, getPasswordStrengthMeta, PASSWORD_SPECIAL_REGEX } = await import('../src/lib/password-utils.ts')

test('password-utils [real source]: validatePassword accepts a strong password meeting all 4 criteria', () => {
  const res = validatePassword('Theme#1711')
  assert.deepEqual(res, { hasLength: true, hasLetter: true, hasNumber: true, hasSpecial: true, isValid: true, criteriaCount: 4 })
})

test('password-utils [real source]: rejects passwords shorter than 8 chars', () => {
  const res = validatePassword('Ab1!x')
  assert.equal(res.hasLength, false)
  assert.equal(res.isValid, false)
  assert.equal(res.criteriaCount, 3)
})

test('password-utils [real source]: rejects passwords longer than 15 chars', () => {
  const res = validatePassword('Abcdefgh1!VeryLong')
  assert.equal(res.hasLength, false)
  assert.equal(res.isValid, false)
})

test('password-utils [real source]: 8 and 15 chars are the inclusive boundaries', () => {
  assert.equal(validatePassword('Abcd1!23').hasLength, true)
  assert.equal(validatePassword('Abcd1!23Abcd1!2').hasLength, true)
  assert.equal(validatePassword('Abcd1!23Abcd1!23').hasLength, false)
})

test('password-utils [real source]: each missing criterion is flagged and lowers criteriaCount', () => {
  const noSpecial = validatePassword('Abcdefg1')
  assert.equal(noSpecial.hasSpecial, false)
  assert.equal(noSpecial.criteriaCount, 3)

  const noNumber = validatePassword('Abcdefg!')
  assert.equal(noNumber.hasNumber, false)
  assert.equal(noNumber.criteriaCount, 3)

  const noLetter = validatePassword('1234567!')
  assert.equal(noLetter.hasLetter, false)
  assert.equal(noLetter.criteriaCount, 3)
})

test('password-utils [real source]: PASSWORD_SPECIAL_REGEX covers the documented special characters', () => {
  for (const ch of ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', ':', '"', '\\', '|', ',', '.', '<', '>', '/', '?', '`', '~']) {
    assert.equal(PASSWORD_SPECIAL_REGEX.test(`Abcd1!23`.replace('!', ch) + (ch === '\\' ? '' : '')) || PASSWORD_SPECIAL_REGEX.test(`x${ch}x`), true, `expected special char ${ch} to match`)
  }
  assert.equal(PASSWORD_SPECIAL_REGEX.test('Abcd1234'), false)
})

test('password-utils [real source]: 16 special chars (too long, no alnum) is the single-criterion Weak case', () => {
  const res = validatePassword('!!!!!!!!!!!!!!!!')
  assert.equal(res.hasLength, false)
  assert.equal(res.hasSpecial, true)
  assert.equal(res.criteriaCount, 1)
})

test('password-utils [real source]: empty and whitespace passwords fail safely', () => {
  assert.equal(validatePassword('').isValid, false)
  const spaces = validatePassword('        ')
  assert.equal(spaces.hasLength, true)
  assert.equal(spaces.hasLetter, false)
  assert.equal(spaces.hasNumber, false)
  assert.equal(spaces.hasSpecial, false)
  assert.equal(spaces.criteriaCount, 1)
})

test('password-utils [real source]: validateEmail accepts university and standard domains', () => {
  for (const email of ['user@dusit.ac.th', 'somchai.j@science.sdu.ac.th', 'admin@gmail.com', 'a.b+c-d@d-e.co']) {
    const res = validateEmail(email)
    assert.equal(res.isValid, true, `expected ${email} valid, got ${res.error}`)
    assert.equal(res.error, null)
  }
})

test('password-utils [real source]: validateEmail rejects empty and whitespace-only input', () => {
  assert.equal(validateEmail('').isValid, false)
  assert.equal(validateEmail('   ').isValid, false)
})

test('password-utils [real source]: validateEmail rejects emails containing spaces', () => {
  const res = validateEmail('user with space@domain.com')
  assert.equal(res.isValid, false)
  assert.match(res.error, /ช่องว่าง/)
})

test('password-utils [real source]: validateEmail enforces exactly one @', () => {
  assert.equal(validateEmail('user@@domain.com').isValid, false)
  assert.equal(validateEmail('userdomain.com').isValid, false)
})

test('password-utils [real source]: validateEmail requires a dot in the domain', () => {
  const res = validateEmail('user@localhost')
  assert.equal(res.isValid, false)
  assert.match(res.error, /จุด/)
})

test('password-utils [real source]: regex-level quirk — consecutive dots in domain pass the final regex', () => {
  assert.equal(validateEmail('user@domain..com').isValid, true)
})

test('password-utils [real source]: single-letter TLDs and dotless domains are rejected', () => {
  assert.equal(validateEmail('user@domain.c').isValid, false)
  assert.equal(validateEmail('user@localhost').isValid, false)
})

test('password-utils [real source]: TLD check reads only the last dot segment (known quirk)', () => {
  const res = validateEmail('a.b+c-d@d-e.f')
  assert.equal(res.isValid, false)
  assert.match(res.error, /TLD/)
})

test('password-utils [real source]: getPasswordStrengthMeta maps empty password to zero state', () => {
  const meta = getPasswordStrengthMeta('')
  assert.equal(meta.label, 'ระบุรหัสผ่านใหม่')
  assert.equal(meta.widthClass, 'w-0')
})

test('password-utils [real source]: getPasswordStrengthMeta ladder follows criteriaCount', () => {
  assert.equal(getPasswordStrengthMeta('!!!!!!!!!!!!!!!!').label.includes('Weak'), true)
  assert.equal(getPasswordStrengthMeta('aaaaaaaa').label.includes('Medium'), true)
  assert.equal(getPasswordStrengthMeta('Abcdefg1').label.includes('Good'), true)
  assert.equal(getPasswordStrengthMeta('Abcdefg1!').label.includes('Strong'), true)
})

test('password-utils [real source]: strength ladder widths are quarter steps', () => {
  assert.equal(getPasswordStrengthMeta('!!!!!!!!!!!!!!!!').widthClass, 'w-1/4')
  assert.equal(getPasswordStrengthMeta('aaaaaaaa').widthClass, 'w-2/4')
  assert.equal(getPasswordStrengthMeta('Abcdefg1').widthClass, 'w-3/4')
  assert.equal(getPasswordStrengthMeta('Abcdefg1!').widthClass, 'w-full')
})
