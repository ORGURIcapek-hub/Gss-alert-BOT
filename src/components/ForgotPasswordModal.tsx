'use client'

import React, { useState, useEffect, useReducer, useCallback } from 'react'
import { useRole } from '@/components/RoleContext'
import { UserProfile } from '@/types/database.types'
import { validatePassword, getPasswordStrengthMeta } from '@/lib/password-utils'
import {
  Lock, Mail, AlertCircle, ShieldCheck, CheckCircle2,
  Eye, EyeOff, Check, X, KeyRound, RefreshCw, Send, ArrowLeft, Clock
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

type Step = 1 | 2 | 3 | 4

interface ModalState {
  step: Step
  emailInput: string
  targetUser: UserProfile | null
  generatedOtp: string
  enteredOtp: string[]
  otpExpiryTime: number
  resendCooldown: number
  newPassword: string
  confirmPassword: string
  showNewPassword: boolean
  showConfirmPassword: boolean
  errorMsg: string
  successMsg: string
  loading: boolean
}

type ModalAction =
  | { type: 'RESET'; initialEmail?: string }
  | { type: 'SET_STEP'; step: Step }
  | { type: 'SET_EMAIL'; value: string }
  | { type: 'OTP_SENT'; user: UserProfile; otp: string }
  | { type: 'SET_ENTERED_OTP'; otp: string[] }
  | { type: 'TICK_COOLDOWN' }
  | { type: 'SET_NEW_PASSWORD'; value: string }
  | { type: 'SET_CONFIRM_PASSWORD'; value: string }
  | { type: 'TOGGLE_SHOW_NEW' }
  | { type: 'TOGGLE_SHOW_CONFIRM' }
  | { type: 'SET_ERROR'; msg: string }
  | { type: 'SET_SUCCESS'; msg: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'CLEAR_ALERTS' }

const INITIAL_STATE = (initialEmail = ''): ModalState => ({
  step: 1,
  emailInput: initialEmail,
  targetUser: null,
  generatedOtp: '',
  enteredOtp: ['', '', '', '', '', ''],
  otpExpiryTime: 0,
  resendCooldown: 0,
  newPassword: '',
  confirmPassword: '',
  showNewPassword: false,
  showConfirmPassword: false,
  errorMsg: '',
  successMsg: '',
  loading: false,
})

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'RESET':       return INITIAL_STATE(action.initialEmail)
    case 'SET_STEP':    return { ...state, step: action.step, errorMsg: '', successMsg: '' }
    case 'SET_EMAIL':   return { ...state, emailInput: action.value }
    case 'OTP_SENT':    return {
      ...state,
      targetUser: action.user,
      generatedOtp: action.otp,
      otpExpiryTime: Date.now() + 5 * 60 * 1000,
      resendCooldown: 60,
      enteredOtp: ['', '', '', '', '', ''],
    }
    case 'SET_ENTERED_OTP':      return { ...state, enteredOtp: action.otp, errorMsg: '' }
    case 'TICK_COOLDOWN':        return { ...state, resendCooldown: Math.max(0, state.resendCooldown - 1) }
    case 'SET_NEW_PASSWORD':     return { ...state, newPassword: action.value }
    case 'SET_CONFIRM_PASSWORD': return { ...state, confirmPassword: action.value }
    case 'TOGGLE_SHOW_NEW':      return { ...state, showNewPassword: !state.showNewPassword }
    case 'TOGGLE_SHOW_CONFIRM':  return { ...state, showConfirmPassword: !state.showConfirmPassword }
    case 'SET_ERROR':            return { ...state, errorMsg: action.msg, successMsg: '' }
    case 'SET_SUCCESS':          return { ...state, successMsg: action.msg, errorMsg: '' }
    case 'SET_LOADING':          return { ...state, loading: action.loading }
    case 'CLEAR_ALERTS':         return { ...state, errorMsg: '', successMsg: '' }
    default:                     return state
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertBanner({ type, message }: { type: 'error' | 'success'; message: string }) {
  const isError = type === 'error'
  return (
    <div className={`p-4 sm:p-5 text-sm sm:text-base font-semibold rounded-2xl flex items-center gap-3 animate-in fade-in ${
      isError ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
    }`}>
      {isError
        ? <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 flex-shrink-0" />
        : <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />}
      <span className="flex-1 leading-relaxed">{message}</span>
    </div>
  )
}

function CriteriaRow({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 ${met ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
        met ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
      }`}>
        {met ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
      </span>
      <span>{label}</span>
    </div>
  )
}

function PasswordInput({ value, onChange, show, onToggle, placeholder, id, extraClass = '' }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void
  placeholder: string; id: string; extraClass?: string
}) {
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} required maxLength={15}
        placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-white border border-slate-200 rounded-2xl pl-4 pr-12 py-3.5 sm:py-4 text-sm sm:text-base text-slate-900 font-medium focus:outline-none focus:border-[#003B71] focus:ring-2 focus:ring-[#003B71]/20 ${extraClass}`}
      />
      <button type="button" onClick={onToggle} tabIndex={-1}
        aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer">
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )
}

const Spinner = () => <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

// ─── Style constants ──────────────────────────────────────────────────────────

const CLS = {
  btnSecondary: 'px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm sm:text-base font-bold transition-all cursor-pointer',
  btnPrimary:   'px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white text-sm sm:text-base font-extrabold shadow-lg shadow-[#003B71]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95',
  btnSuccess:   'px-7 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#00A8B5] hover:opacity-95 text-white text-sm sm:text-base font-extrabold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95',
  fieldCard:    'p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200',
  footer:       'flex items-center justify-end gap-3 pt-3 border-t border-slate-100',
}

// ─── OTP focus helper ─────────────────────────────────────────────────────────

const focusOtpBox = (idx: number) =>
  (document.getElementById(`modal-otp-input-${idx}`) as HTMLInputElement | null)?.focus()

// ─── Main Component ───────────────────────────────────────────────────────────

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }: ForgotPasswordModalProps) {
  const { allUsers, refreshUsers } = useRole()
  const [s, dispatch] = useReducer(modalReducer, INITIAL_STATE(initialEmail))

  // Sync initialEmail prop
  useEffect(() => {
    dispatch({ type: 'SET_EMAIL', value: initialEmail })
  }, [initialEmail])

  // Resend cooldown ticker
  useEffect(() => {
    if (!isOpen || s.step !== 2 || s.resendCooldown <= 0) return
    const timer = setInterval(() => dispatch({ type: 'TICK_COOLDOWN' }), 1000)
    return () => clearInterval(timer)
  }, [isOpen, s.step, s.resendCooldown])

  // ── Handlers (must be declared before early return to satisfy Rules of Hooks) ──

  const dispatchOtp = useCallback(async (user: UserProfile) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    dispatch({ type: 'OTP_SENT', user, otp })
    try {
      const res = await fetch('/api/auth/send-otp-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email, otp,
          userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const hint = data.isRealEmail ? 'กรุณาตรวจสอบ Inbox หรือ Spam' : '(รหัสมีอายุ 5 นาที)'
        dispatch({ type: 'SET_SUCCESS', msg: `📧 ส่งรหัสยืนยัน OTP ไปยังกล่องอีเมล ${user.email} เรียบร้อยแล้ว! ${hint}` })
      } else {
        dispatch({ type: 'SET_ERROR', msg: data.error || 'ไม่สามารถจัดส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง' })
      }
    } catch {
      dispatch({ type: 'SET_SUCCESS', msg: `ส่งรหัสยืนยัน OTP ไปยังอีเมล ${user.email} สำเร็จแล้ว (รหัสมีอายุ 5 นาที)` })
    }
  }, [])

  if (!isOpen) return null

  const { hasLength, hasLetter, hasNumber, hasSpecial, isValid: isPassValid } = validatePassword(s.newPassword)
  const isPassMatching = Boolean(s.newPassword && s.confirmPassword && s.newPassword === s.confirmPassword)
  const strengthMeta = getPasswordStrengthMeta(s.newPassword)

  const handleClose = () => {
    dispatch({ type: 'RESET', initialEmail: '' })
    onClose()
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch({ type: 'CLEAR_ALERTS' })
    const clean = s.emailInput.trim().toLowerCase()
    if (!clean) return dispatch({ type: 'SET_ERROR', msg: 'กรุณาระบุอีเมลหรือชื่อผู้ใช้งานของคุณ' })
    const user = allUsers.find(
      (u) => u.email.trim().toLowerCase() === clean ||
             (u.username && u.username.trim().toLowerCase() === clean)
    )
    if (!user) return dispatch({ type: 'SET_ERROR', msg: 'ไม่พบบัญชีผู้ใช้งานที่ตรงกับอีเมลหรือชื่อผู้ใช้นี้ในระบบ' })
    dispatch({ type: 'SET_LOADING', loading: true })
    await dispatchOtp(user)
    dispatch({ type: 'SET_STEP', step: 2 })
    dispatch({ type: 'SET_LOADING', loading: false })
  }

  const handleResendOtp = async () => {
    if (!s.targetUser || s.resendCooldown > 0 || s.loading) return
    dispatch({ type: 'CLEAR_ALERTS' })
    dispatch({ type: 'SET_LOADING', loading: true })
    await dispatchOtp(s.targetUser)
    dispatch({ type: 'SET_LOADING', loading: false })
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6)
      if (pasted.length > 0) {
        dispatch({ type: 'SET_ENTERED_OTP', otp: Array(6).fill('').map((_, i) => pasted[i] || '') })
        focusOtpBox(Math.min(pasted.length, 5))
        return
      }
    }
    const digit = value.replace(/\D/g, '').slice(-1)
    const arr = [...s.enteredOtp]; arr[index] = digit
    dispatch({ type: 'SET_ENTERED_OTP', otp: arr })
    if (digit && index < 5) focusOtpBox(index + 1)
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !s.enteredOtp[index] && index > 0) focusOtpBox(index - 1)
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    const code = s.enteredOtp.join('')
    if (code.length !== 6) return dispatch({ type: 'SET_ERROR', msg: 'กรุณากรอกรหัส OTP ให้ครบทั้ง 6 หลัก' })
    if (Date.now() > s.otpExpiryTime) return dispatch({ type: 'SET_ERROR', msg: 'รหัส OTP หมดอายุแล้ว (เกิน 5 นาที) กรุณากดขอรหัสใหม่อีกครั้ง' })
    if (code !== s.generatedOtp) return dispatch({ type: 'SET_ERROR', msg: 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบรหัสในกล่องข้อความอีเมลของคุณอีกครั้ง' })
    dispatch({ type: 'SET_SUCCESS', msg: 'ยืนยันรหัส OTP สำเร็จ! กรุณากำหนดรหัสผ่านใหม่ของคุณ' })
    dispatch({ type: 'SET_STEP', step: 3 })
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch({ type: 'CLEAR_ALERTS' })
    if (!isPassValid) return dispatch({ type: 'SET_ERROR', msg: 'รหัสผ่านใหม่ต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ' })
    if (!isPassMatching) return dispatch({ type: 'SET_ERROR', msg: 'รหัสผ่านใหม่และรหัสผ่านยืนยันไม่ตรงกัน' })
    if (!s.targetUser) return dispatch({ type: 'SET_ERROR', msg: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาลองใหม่อีกครั้ง' })
    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      const { updateUserPasswordRecord } = await import('@/lib/services/okr-service')
      await updateUserPasswordRecord(s.targetUser.user_id, s.newPassword)
      await refreshUsers()
      dispatch({ type: 'SET_STEP', step: 4 })
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', msg: err?.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const STEPS = ['1. ระบุอีเมล', '2. ยืนยัน OTP', '3. ตั้งรหัสใหม่'] as const

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden relative my-8">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] p-7 sm:p-9 text-white relative">
          <button onClick={handleClose} type="button" aria-label="ปิด"
            className="absolute right-5 top-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
            ✕
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-sky-200 shadow-inner flex-shrink-0">
              <KeyRound className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-sky-200 uppercase tracking-wider">
                การกู้คืนบัญชีผู้ใช้ (Account Recovery)
              </span>
              <h3 className="text-xl sm:text-2xl font-black mt-1 text-white">รีเซ็ตรหัสผ่านผ่าน OTP ทางอีเมล</h3>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 sm:gap-3 mt-4 text-xs sm:text-sm text-slate-200 overflow-x-auto py-1">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="text-sky-300 font-bold">➔</span>}
                <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-bold transition-colors whitespace-nowrap ${
                  s.step === i + 1 ? 'bg-sky-400 text-slate-900 shadow-sm' : 'bg-white/10 text-white'
                }`}>{label}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-7 sm:p-10 space-y-6">
          {s.errorMsg   && <AlertBanner type="error"   message={s.errorMsg} />}
          {s.successMsg && <AlertBanner type="success" message={s.successMsg} />}

          {/* Step 1 — Email */}
          {s.step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-sm sm:text-base font-bold text-slate-800">
                  อีเมลมหาวิทยาลัย หรือ ชื่อผู้ใช้งาน (Email or Username) *
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input type="text" required placeholder="เช่น somchai.j@science.ac.th หรือ username"
                    value={s.emailInput} onChange={(e) => dispatch({ type: 'SET_EMAIL', value: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 sm:py-4 text-sm sm:text-base text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] transition-all"
                  />
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  ระบบจะค้นหาบัญชีและจัดส่งรหัสยืนยัน OTP ไปยังกล่องอีเมลของท่าน
                </p>
              </div>
              <div className={CLS.footer}>
                <button type="button" onClick={handleClose} className={CLS.btnSecondary}>ยกเลิก</button>
                <button type="submit" disabled={s.loading || !s.emailInput.trim()} className={CLS.btnPrimary}>
                  {s.loading ? <><Spinner /><span>กำลังส่งรหัส OTP...</span></> : <><Send className="w-4 h-4" /><span>ส่งรหัส OTP ไปที่อีเมล</span></>}
                </button>
              </div>
            </form>
          )}

          {/* Step 2 — OTP */}
          {s.step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center space-y-2 bg-sky-50/60 p-4 sm:p-5 rounded-2xl border border-sky-100">
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  กรุณาตรวจสอบรหัส 6 หลักที่ส่งไปยังกล่องข้อความอีเมล
                </p>
                <div className="inline-block bg-white px-4 py-1.5 rounded-xl border border-sky-200 shadow-sm text-sm sm:text-base font-bold text-[#003B71]">
                  {s.targetUser?.email}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 py-3">
                {s.enteredOtp.map((digit, idx) => (
                  <input key={idx} id={`modal-otp-input-${idx}`}
                    type="text" inputMode="numeric" maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-14 sm:w-14 sm:h-16 text-center font-mono font-black text-2xl sm:text-3xl text-[#003B71] bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-[#003B71] focus:ring-4 focus:ring-[#003B71]/15 focus:outline-none transition-all shadow-sm"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm px-2 text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>อายุรหัส OTP: 5 นาที</span>
                </div>
                <button type="button" onClick={handleResendOtp}
                  disabled={s.resendCooldown > 0 || s.loading}
                  className="text-[#003B71] font-bold hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${s.loading ? 'animate-spin' : ''}`} />
                  <span>{s.resendCooldown > 0 ? `ขอรหัสใหม่ได้ใน (${s.resendCooldown} วินาที)` : 'ขอรหัส OTP อีกครั้ง'}</span>
                </button>
              </div>

              <div className={CLS.footer}>
                <button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
                  className={`${CLS.btnSecondary} flex items-center gap-1.5`}>
                  <ArrowLeft className="w-4 h-4" /><span>ย้อนกลับ</span>
                </button>
                <button type="submit" disabled={s.enteredOtp.join('').length !== 6} className={CLS.btnPrimary}>
                  <ShieldCheck className="w-4 h-4" /><span>ยืนยันรหัส OTP</span>
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — New password */}
          {s.step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* New password field */}
              <div className={`space-y-2.5 ${CLS.fieldCard}`}>
                <div className="flex items-center justify-between">
                  <label htmlFor="new-password" className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#003B71]" />
                    <span>รหัสผ่านใหม่ (New Password) *</span>
                  </label>
                  {s.newPassword && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${strengthMeta.badgeBg}`}>
                      {strengthMeta.label}
                    </span>
                  )}
                </div>
                <PasswordInput id="new-password" value={s.newPassword}
                  onChange={(v) => dispatch({ type: 'SET_NEW_PASSWORD', value: v })}
                  show={s.showNewPassword} onToggle={() => dispatch({ type: 'TOGGLE_SHOW_NEW' })}
                  placeholder="ความยาว 8-15 ตัว (เช่น Pass@2024)" />
                {s.newPassword && (
                  <div className="space-y-3 pt-2">
                    <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${strengthMeta.barColor} ${strengthMeta.widthClass} transition-all duration-300 rounded-full`} />
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <CriteriaRow met={hasLength}  label={`ยาว 8-15 ตัว (${s.newPassword.length}/15)`} />
                      <CriteriaRow met={hasLetter}  label="มีตัวอักษร (A-Z, a-z)" />
                      <CriteriaRow met={hasNumber}  label="มีตัวเลข (0-9)" />
                      <CriteriaRow met={hasSpecial} label="มีอักขระพิเศษ (@,#,$,%,!,ฯลฯ)" />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password field */}
              <div className={`space-y-2 ${CLS.fieldCard}`}>
                <div className="flex items-center justify-between">
                  <label htmlFor="confirm-password" className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#003B71]" />
                    <span>ยืนยันรหัสผ่านใหม่ (Confirm Password) *</span>
                  </label>
                  {s.confirmPassword && (
                    <span className={`text-xs font-bold ${isPassMatching ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPassMatching ? '✓ รหัสผ่านตรงกัน' : '✗ ไม่ตรงกัน'}
                    </span>
                  )}
                </div>
                <PasswordInput id="confirm-password" value={s.confirmPassword}
                  onChange={(v) => dispatch({ type: 'SET_CONFIRM_PASSWORD', value: v })}
                  show={s.showConfirmPassword} onToggle={() => dispatch({ type: 'TOGGLE_SHOW_CONFIRM' })}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  extraClass={s.confirmPassword && !isPassMatching
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : ''} />
              </div>

              <div className={CLS.footer}>
                <button type="button" onClick={handleClose} className={CLS.btnSecondary}>ยกเลิก</button>
                <button type="submit" disabled={s.loading || !isPassValid || !isPassMatching} className={CLS.btnSuccess}>
                  {s.loading ? <><Spinner /><span>กำลังบันทึกรหัสใหม่...</span></> : <><KeyRound className="w-4 h-4" /><span>บันทึกรหัสผ่านใหม่</span></>}
                </button>
              </div>
            </form>
          )}

          {/* Step 4 — Success */}
          {s.step === 4 && (
            <div className="py-6 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-sm animate-in zoom-in-95">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว!</h3>
                <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                  รหัสผ่านของบัญชี{' '}
                  <b className="text-slate-900">{s.targetUser?.email}</b>{' '}
                  ได้รับการอัปเดตเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
                </p>
              </div>
              <button type="button" onClick={handleClose}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-[#003B71]/25 transition-all cursor-pointer active:scale-95">
                เสร็จสิ้น (เข้าสู่ระบบด้วยรหัสผ่านใหม่)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
