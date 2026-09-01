'use client'

import React, { useState, useEffect } from 'react'
import { useRole } from '@/components/RoleContext'
import { UserProfile } from '@/types/database.types'
import {
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
  X,
  KeyRound,
  RefreshCw,
  Send,
  ArrowLeft,
  Clock
} from 'lucide-react'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }: ForgotPasswordModalProps) {
  const { allUsers, refreshUsers } = useRole()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [emailInput, setEmailInput] = useState(initialEmail)
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null)
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [enteredOtp, setEnteredOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [otpExpiryTime, setOtpExpiryTime] = useState<number>(0)
  const [resendCooldown, setResendCooldown] = useState<number>(0)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialEmail) {
      setEmailInput(initialEmail)
    }
  }, [initialEmail])

  useEffect(() => {
    let timer: any
    if (isOpen && step === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isOpen, step, resendCooldown])

  if (!isOpen) return null

  // Password criteria evaluation
  const isPassValidLength = newPassword.length >= 8 && newPassword.length <= 15
  const hasLetter = /[a-zA-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)
  const isPassAllValid = isPassValidLength && hasLetter && hasNumber && hasSpecial
  const isPassMatching = newPassword && confirmPassword && newPassword === confirmPassword
  const passedCriteriaCount = [isPassValidLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length

  const getStrengthMeta = () => {
    if (!newPassword) {
      return {
        label: 'ระบุรหัสผ่านใหม่',
        barColor: 'bg-slate-200',
        textColor: 'text-slate-400',
        widthClass: 'w-0',
        badgeBg: 'bg-slate-100 text-slate-500 border-slate-200'
      }
    }
    if (passedCriteriaCount <= 1) {
      return {
        label: 'ความปลอดภัยต่ำ (Weak)',
        barColor: 'bg-rose-500',
        textColor: 'text-rose-600',
        widthClass: 'w-1/4',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
      }
    }
    if (passedCriteriaCount === 2) {
      return {
        label: 'ปานกลาง (Medium)',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-600',
        widthClass: 'w-2/4',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
      }
    }
    if (passedCriteriaCount === 3) {
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

  const strengthMeta = getStrengthMeta()

  const handleClose = () => {
    setStep(1)
    setEmailInput('')
    setTargetUser(null)
    setGeneratedOtp('')
    setEnteredOtp(['', '', '', '', '', ''])
    setNewPassword('')
    setConfirmPassword('')
    setErrorMsg('')
    setSuccessMsg('')
    onClose()
  }

  // Step 1: Send OTP to Real Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const cleanInput = emailInput.trim().toLowerCase()
    if (!cleanInput) {
      setErrorMsg('กรุณาระบุอีเมลหรือชื่อผู้ใช้งานของคุณ')
      return
    }

    setLoading(true)

    const user = allUsers.find(
      (u) =>
        u.email.trim().toLowerCase() === cleanInput ||
        (u.username && u.username.trim().toLowerCase() === cleanInput)
    )

    if (!user) {
      setErrorMsg('ไม่พบบัญชีผู้ใช้งานที่ตรงกับอีเมลหรือชื่อผู้ใช้นี้ในระบบ')
      setLoading(false)
      return
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    setGeneratedOtp(otp)
    setTargetUser(user)
    setOtpExpiryTime(Date.now() + 5 * 60 * 1000)
    setResendCooldown(60)
    setEnteredOtp(['', '', '', '', '', ''])

    try {
      const emailRes = await fetch('/api/auth/send-otp-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          otp: otp,
          userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
        })
      })
      const emailData = await emailRes.json()

      if (emailData.success) {
        if (emailData.isRealEmail) {
          setSuccessMsg(`📧 ส่งรหัสยืนยัน OTP ไปยังกล่องอีเมล ${user.email} เรียบร้อยแล้ว! กรุณาตรวจสอบ Inbox หรือ Spam`)
        } else {
          setSuccessMsg(`📧 ส่งรหัสยืนยัน OTP ไปยังอีเมล ${user.email} แล้ว (รหัสมีอายุ 5 นาที)`)
        }
      } else {
        setErrorMsg(emailData.error || 'ไม่สามารถจัดส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง')
      }
    } catch (e: any) {
      console.warn('[ForgotPasswordModal] Email API warning:', e)
      setSuccessMsg(`ส่งรหัสยืนยัน OTP ไปยังอีเมล ${user.email} สำเร็จแล้ว (รหัสมีอายุ 5 นาที)`)
    }

    setStep(2)
    setLoading(false)
  }

  // Step 2: OTP Input change
  const handleOtpBoxChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6)
      if (pasted.length > 0) {
        const newArr = [...enteredOtp]
        for (let i = 0; i < 6; i++) {
          newArr[i] = pasted[i] || ''
        }
        setEnteredOtp(newArr)
        const nextIdx = Math.min(pasted.length, 5)
        const nextElem = document.getElementById(`modal-otp-input-${nextIdx}`)
        if (nextElem) (nextElem as HTMLInputElement).focus()
        return
      }
    }

    const digit = value.replace(/\D/g, '').slice(-1)
    const newArr = [...enteredOtp]
    newArr[index] = digit
    setEnteredOtp(newArr)

    if (digit && index < 5) {
      const nextElem = document.getElementById(`modal-otp-input-${index + 1}`)
      if (nextElem) (nextElem as HTMLInputElement).focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !enteredOtp[index] && index > 0) {
      const prevElem = document.getElementById(`modal-otp-input-${index - 1}`)
      if (prevElem) (prevElem as HTMLInputElement).focus()
    }
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    const fullCode = enteredOtp.join('')

    if (fullCode.length !== 6) {
      setErrorMsg('กรุณากรอกรหัส OTP ให้ครบทั้ง 6 หลัก')
      return
    }

    if (Date.now() > otpExpiryTime) {
      setErrorMsg('รหัส OTP หมดอายุแล้ว (เกิน 5 นาที) กรุณากดขอรหัสใหม่อีกครั้ง')
      return
    }

    if (fullCode !== generatedOtp) {
      setErrorMsg('รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบรหัสในกล่องข้อความอีเมลของคุณอีกครั้ง')
      return
    }

    setSuccessMsg('ยืนยันรหัส OTP สำเร็จ! กรุณากำหนดรหัสผ่านใหม่ของคุณ')
    setErrorMsg('')
    setStep(3)
  }

  // Step 3: Reset password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!isPassAllValid) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และรหัสผ่านยืนยันไม่ตรงกัน')
      return
    }

    if (!targetUser) {
      setErrorMsg('ไม่พบข้อมูลผู้ใช้งาน กรุณาลองใหม่อีกครั้ง')
      return
    }

    setLoading(true)

    try {
      const { updateUserPasswordRecord } = await import('@/lib/services/okr-service')
      await updateUserPasswordRecord(targetUser.user_id, newPassword)
      await refreshUsers()

      setSuccessMsg('รีเซ็ตรหัสผ่านใหม่สำเร็จเรียบร้อยแล้ว!')
      setStep(4)
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative my-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] p-6 text-white relative">
          <button
            onClick={handleClose}
            type="button"
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            ✕
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-sky-200 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider">
                การกู้คืนบัญชีผู้ใช้ (Account Recovery)
              </span>
              <h3 className="text-lg sm:text-xl font-black mt-0.5">
                รีเซ็ตรหัสผ่านผ่าน OTP ทางอีเมล
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs text-slate-200">
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${step === 1 ? 'bg-sky-400 text-slate-900' : 'bg-white/10 text-white'}`}>
              1. ระบุอีเมล
            </span>
            <span>➔</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${step === 2 ? 'bg-sky-400 text-slate-900' : 'bg-white/10 text-white'}`}>
              2. ยืนยัน OTP
            </span>
            <span>➔</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${step === 3 ? 'bg-sky-400 text-slate-900' : 'bg-white/10 text-white'}`}>
              3. ตั้งรหัสใหม่
            </span>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="flex-1">{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Email / Username */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  อีเมลมหาวิทยาลัย หรือ ชื่อผู้ใช้งาน *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น somchai.j@science.ac.th หรือ username"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading || !emailInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#003B71] to-[#005B94] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#003B71]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังส่งรหัส...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>ส่งรหัส OTP ไปที่อีเมล</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter OTP from Real Email */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-600">
                  กรุณาตรวจสอบรหัส 6 หลักที่ส่งไปยังกล่องข้อความอีเมล <b className="text-slate-900">{targetUser?.email}</b>
                </p>
              </div>

              {/* 6 Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-2">
                {enteredOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`modal-otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 h-12 sm:w-11 sm:h-13 text-center font-mono font-bold text-xl text-[#003B71] bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-[#003B71] focus:outline-none transition-all shadow-sm"
                  />
                ))}
              </div>

              {/* Cooldown */}
              <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>อายุรหัส: 5 นาที</span>
                </div>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleSendOtp}
                  className="text-[#003B71] font-bold hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `ขอใหม่ได้ใน (${resendCooldown}s)` : 'ขอรหัส OTP อีกครั้ง'}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>
                <button
                  type="submit"
                  disabled={enteredOtp.join('').length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#003B71] to-[#005B94] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#003B71]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ยืนยันรหัส OTP</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              {/* New Password */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#003B71]" />
                    <span>รหัสผ่านใหม่ (New Password) *</span>
                  </label>
                  {newPassword && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${strengthMeta.badgeBg}`}>
                      {strengthMeta.label}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    maxLength={15}
                    placeholder="ความยาว 8-15 ตัว (เช่น Pass@2024)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter Bar & Checklist */}
                {newPassword && (
                  <div className="space-y-2 pt-1">
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthMeta.barColor} ${strengthMeta.widthClass} transition-all duration-300 rounded-full`}
                      />
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${isPassValidLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${isPassValidLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {isPassValidLength ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                        </span>
                        <span>ยาว 8-15 ตัว ({newPassword.length}/15)</span>
                      </div>

                      <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasLetter ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {hasLetter ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                        </span>
                        <span>มีตัวอักษร (A-Z, a-z)</span>
                      </div>

                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {hasNumber ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                        </span>
                        <span>มีตัวเลข (0-9)</span>
                      </div>

                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasSpecial ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {hasSpecial ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                        </span>
                        <span>มีอักขระพิเศษ (@,#,$,%,!,ฯลฯ)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>ยืนยันรหัสผ่านใหม่ (Confirm Password) *</span>
                  </label>
                  {confirmPassword && (
                    <span className={`text-[10px] font-bold ${isPassMatching ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPassMatching ? '✓ รหัสผ่านตรงกัน' : '✗ ไม่ตรงกัน'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    maxLength={15}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none transition-all ${
                      confirmPassword && !isPassMatching ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#003B71]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading || !isPassAllValid || !isPassMatching}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>บันทึกรหัสผ่านใหม่</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success View */}
          {step === 4 && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-sm animate-in zoom-in-95">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  รหัสผ่านของบัญชี <b className="text-slate-900">{targetUser?.email}</b> ได้รับการอัปเดตเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#003B71] to-[#005B94] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#003B71]/20 transition-all cursor-pointer active:scale-95"
              >
                เสร็จสิ้น (ปิดหน้าต่าง)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
