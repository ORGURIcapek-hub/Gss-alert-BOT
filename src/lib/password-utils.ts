// =============================================================================
// PASSWORD UTILITIES — shared validation & strength-meter logic
// EMAIL UTILITIES — email format validation
// Used by: ChangePasswordModal, ForgotPasswordModal, RoleContext, LoginPage
// =============================================================================

export const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/

export interface PasswordCriteria {
  hasLength: boolean   // 8–15 chars
  hasLetter: boolean   // at least one a-z / A-Z
  hasNumber: boolean   // at least one 0-9
  hasSpecial: boolean  // at least one special char
  isValid: boolean     // all four criteria met
  criteriaCount: number
}

/** Evaluate all password criteria and return a structured result. */
export function validatePassword(password: string): PasswordCriteria {
  const hasLength = password.length >= 8 && password.length <= 15
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = PASSWORD_SPECIAL_REGEX.test(password)
  const isValid = hasLength && hasLetter && hasNumber && hasSpecial
  const criteriaCount = [hasLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length
  return { hasLength, hasLetter, hasNumber, hasSpecial, isValid, criteriaCount }
}

// ─── Email Validation ─────────────────────────────────────────────────────────

export interface EmailValidation {
  isValid: boolean
  error: string | null
}

/**
 * Validate email format client-side.
 * Rules:
 *  - Must have exactly one @
 *  - Local part (before @) must be non-empty
 *  - Domain part (after @) must have at least one dot with chars on both sides
 *  - TLD (last segment) must be at least 2 chars
 *  - No spaces allowed anywhere
 */
export function validateEmail(email: string): EmailValidation {
  const trimmed = email.trim()

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

  // Full RFC-lite regex
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'รูปแบบอีเมลไม่ถูกต้อง เช่น name@domain.com หรือ somchai@science.ac.th' }
  }

  return { isValid: true, error: null }
}

// ─── Password Strength ───────────────────────────────────────────────────────

export interface PasswordStrengthMeta {
  label: string
  barColor: string
  textColor: string
  widthClass: string
  badgeBg: string
}

/** Return Tailwind CSS classes + label for a password strength progress bar. */
export function getPasswordStrengthMeta(password: string): PasswordStrengthMeta {
  if (!password) {
    return {
      label: 'ระบุรหัสผ่านใหม่',
      barColor: 'bg-slate-200',
      textColor: 'text-slate-400',
      widthClass: 'w-0',
      badgeBg: 'bg-slate-100 text-slate-500 border-slate-200'
    }
  }
  const { criteriaCount } = validatePassword(password)
  if (criteriaCount <= 1) {
    return {
      label: 'ความปลอดภัยต่ำ (Weak)',
      barColor: 'bg-rose-500',
      textColor: 'text-rose-600',
      widthClass: 'w-1/4',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
    }
  }
  if (criteriaCount === 2) {
    return {
      label: 'ปานกลาง (Medium)',
      barColor: 'bg-amber-500',
      textColor: 'text-amber-600',
      widthClass: 'w-2/4',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }
  if (criteriaCount === 3) {
    return {
      label: 'เกือบสมบูรณ์ (Good)',
      barColor: 'bg-sky-500',
      textColor: 'text-sky-600',
      widthClass: 'w-3/4',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200'
    }
  }
  return {
    label: 'แข็งแกร่ง ปลอดภัยสูง (Strong)',
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    widthClass: 'w-full',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
}
