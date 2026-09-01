'use client'

import React, { useState } from 'react'
import { useRole } from '@/components/RoleContext'
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react'

export function ChangePasswordModal() {
  const { isChangePasswordOpen, closeChangePasswordModal, updatePassword, currentUser } = useRole()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isChangePasswordOpen || !currentUser) return null

  // Password criteria evaluation
  const isPasswordValidLength = newPassword.length >= 8 && newPassword.length <= 15
  const hasLetter = /[a-zA-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)
  const isPasswordAllValid = isPasswordValidLength && hasLetter && hasNumber && hasSpecial
  const isMatching = newPassword && confirmPassword && newPassword === confirmPassword

  const passedCriteriaCount = [isPasswordValidLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length

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
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setErrorMsg('')
    setSuccessMsg('')
    closeChangePasswordModal()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!currentPassword) {
      setErrorMsg('กรุณาระบุรหัสผ่านปัจจุบันของคุณ')
      return
    }

    if (!isPasswordAllValid) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และรหัสผ่านยืนยันไม่ตรงกัน')
      return
    }

    if (newPassword === currentPassword) {
      setErrorMsg('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน')
      return
    }

    setIsSubmitting(true)

    const res = await updatePassword(currentPassword, newPassword)

    setIsSubmitting(false)

    if (res.success) {
      setSuccessMsg('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว! ข้อมูลของคุณได้รับการอัปเดตแล้ว')
      setTimeout(() => {
        handleClose()
      }, 1800)
    } else {
      setErrorMsg(res.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden relative my-8">
        {/* Modal Header Banner */}
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
              <span className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">
                ความปลอดภัยบัญชีผู้ใช้ (Security)
              </span>
              <h3 className="text-lg sm:text-xl font-black mt-0.5">
                เปลี่ยนรหัสผ่านของตนเอง
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-200 mt-2 leading-relaxed">
            บัญชี: <span className="font-bold text-white">{currentUser.first_name} {currentUser.last_name}</span> ({currentUser.email})
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Current Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>รหัสผ่านปัจจุบัน (Current Password) *</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                placeholder="กรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                tabIndex={-1}
                aria-label={showCurrentPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 2. New Password with Strength Meter */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#003B71]" />
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71] transition-all"
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

            {/* Strength Progress Bar */}
            {newPassword && (
              <div className="space-y-2 pt-1">
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strengthMeta.barColor} ${strengthMeta.widthClass} transition-all duration-300 rounded-full`}
                  />
                </div>

                {/* 4-point Requirements Checklist */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${isPasswordValidLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${isPasswordValidLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {isPasswordValidLength ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
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

          {/* 3. Confirm New Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>ยืนยันรหัสผ่านใหม่ (Confirm Password) *</span>
              </label>
              {confirmPassword && (
                <span className={`text-[10px] font-bold ${isMatching ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isMatching ? '✓ รหัสผ่านตรงกัน' : '✗ ไม่ตรงกัน'}
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
                  confirmPassword && !isMatching ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#003B71]'
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

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !currentPassword || !isPasswordAllValid || !isMatching}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#003B71] to-[#005B94] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#003B71]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>บันทึกรหัสผ่านใหม่</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
