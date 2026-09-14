'use client'

import React, { useState } from 'react'
import { useRole } from '@/components/RoleContext'
import { SDULogo } from '@/components/SDULogo'
import { UserRole } from '@/types/database.types'
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal'
import { SignInForm } from '@/components/auth/SignInForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import {
  DEFAULT_ROLE_POSITIONS,
  ROLE_CONFIG,
  ROLE_OPTIONS,
  DEFAULT_DEPARTMENT,
  DEFAULT_AVATAR
} from '@/lib/user-constants'
import {
  AlertCircle,
  CheckCircle2,
  UserPlus,
  LogIn,
  Send,
  Clock,
  RefreshCw
} from 'lucide-react'

export function LoginPage() {
  const { login, register, refreshUsers } = useRole()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [identifier, setIdentifier] = useState('')

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  const [unregisteredCreds, setUnregisteredCreds] = useState<{ identifier: string; password?: string } | null>(null)
  const [selectedRequestRole, setSelectedRequestRole] = useState<UserRole>('teacher')
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  const handleSignIn = async (password: string) => {
    setErrorMsg('')
    setSuccessMsg('')
    setUnregisteredCreds(null)
    setLoading(true)

    const result = await login(identifier, password)
    if (!result.success) {
      setErrorMsg(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      if (result.error?.includes('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ')) {
        setUnregisteredCreds({ identifier, password })
      }
    }
    setLoading(false)
  }

  const handleSendAccessRequestFromLogin = async () => {
    if (!unregisteredCreds) return
    setIsSubmittingRequest(true)
    setErrorMsg('')
    setSuccessMsg('')

    const id = unregisteredCreds.identifier.trim().toLowerCase()
    const isEmail = id.includes('@')
    const cleanUsername = isEmail ? id.split('@')[0] : id
    const cleanEmail = isEmail ? id : `${cleanUsername}@sdu.ac.th`
    const cleanName = cleanUsername.replace(/[._-]/g, ' ')
    const pw = unregisteredCreds.password && unregisteredCreds.password.length >= 6 ? unregisteredCreds.password : 'Password123'

    const result = await register({
      username: cleanUsername,
      name: cleanName,
      email: cleanEmail,
      password: pw,
      role: selectedRequestRole,
      department: DEFAULT_DEPARTMENT,
      position: DEFAULT_ROLE_POSITIONS[selectedRequestRole] || 'อาจารย์ประจำภาควิชา',
      avatar_url: DEFAULT_AVATAR
    })

    if (result.success) {
      setUnregisteredCreds(null)
      setErrorMsg('')
      const roleName = ROLE_CONFIG[selectedRequestRole]?.label || selectedRequestRole
      setSuccessMsg(
        `ส่งคำขออนุมัติสิทธิ์สำเร็จ! ข้อมูลของ "${cleanEmail}" ถูกส่งไปยังแถบ "อนุมัติผู้สมัครใหม่" (ส่วน "รอการตรวจสอบสิทธิ์") ของ Admin เรียบร้อยแล้ว (บทบาท: ${roleName}) กรุณารอการตรวจสอบและอนุมัติสิทธิ์ก่อนเข้าสู่ระบบ`
      )
    } else {
      setErrorMsg(result.error || 'เกิดข้อผิดพลาดในการส่งคำขอสิทธิ์')
    }
    setIsSubmittingRequest(false)
  }

  const handleCheckPendingStatus = async () => {
    setIsCheckingStatus(true)
    setErrorMsg('')
    try {
      await refreshUsers(true)
      setSuccessMsg('ดึงข้อมูลสถานะล่าสุดจากเซิร์ฟเวอร์เรียบร้อยแล้ว หาก Admin อนุมัติสิทธิ์แล้ว คุณสามารถคลิกเข้าสู่ระบบได้ทันที')
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch {
      setErrorMsg('ไม่สามารถตรวจสอบสถานะได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleSignUp = async (data: {
    username: string
    name: string
    email: string
    password: string
    role: UserRole
    department: string
    avatar_url: string
  }) => {
    setErrorMsg('')
    setSuccessMsg('')
    setUnregisteredCreds(null)
    setLoading(true)

    const result = await register({
      ...data,
      position: DEFAULT_ROLE_POSITIONS[data.role] || 'อาจารย์ประจำภาควิชา'
    })

    if (!result.success) {
      setErrorMsg(result.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    } else {
      const roleLabel = ROLE_CONFIG[data.role]?.label || data.role
      setSuccessMsg(
        `ส่งคำขอสมัครสมาชิกสำเร็จ! ข้อมูลถูกส่งไปยังแถบ "อนุมัติผู้สมัครใหม่" (ส่วน "รอการตรวจสอบสิทธิ์") ของผู้ดูแลระบบ (Admin) ในบทบาท "${roleLabel}" เรียบร้อยแล้ว กรุณารอการอนุมัติสิทธิ์ก่อนเข้าสู่ระบบ`
      )
      setIdentifier(data.username || data.email)
      setLoading(false)
      setTimeout(() => {
        setAuthMode('signin')
        setSuccessMsg('')
      }, 4000)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-slate-900 overflow-hidden font-sans">

      <div
        className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920&auto=format&fit=crop')`
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-tr from-[#00264D]/92 via-[#003B71]/85 to-[#00A8B5]/55 backdrop-blur-sm z-0" />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 sm:p-12 transition-all duration-300">

        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <SDULogo size="lg" textColor="dark" showText={true} />
          <div className="pt-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ระบบติดตามและประเมินผล OKR
            </h1>
          </div>
        </div>

        <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl mb-7 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin')
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`flex-1 py-3 rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              authMode === 'signin' ? 'bg-white text-[#003B71] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-5 h-5 text-[#003B71]" />
            <span>เข้าสู่ระบบ (Sign In)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('signup')
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`flex-1 py-3 rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              authMode === 'signup' ? 'bg-white text-[#003B71] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-5 h-5 text-[#00A8B5]" />
            <span>สมัครสมาชิก (Sign Up)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div className="flex-1 leading-relaxed">
              <span>{errorMsg}</span>

              {errorMsg.includes('รอผู้ดูแลระบบ') && (
                <div className="mt-2.5 pt-2 border-t border-rose-200/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCheckPendingStatus}
                    disabled={isCheckingStatus}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                    <span>{isCheckingStatus ? 'กำลังตรวจสอบ...' : '🔄 ตรวจสอบสถานะการอนุมัติล่าสุด'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {unregisteredCreds && authMode === 'signin' && (
          <div className="mb-6 p-4.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-300 text-slate-800 space-y-3 animate-in fade-in shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900">
                  ต้องการส่งคำขอสิทธิ์เข้าใช้งานสำหรับ &quot;{unregisteredCreds.identifier}&quot; ทันทีหรือไม่?
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  เนื่องจากยังไม่มีบัญชีนี้ในระบบ คุณสามารถส่งคำขอสิทธิ์ไปยังผู้ดูแลระบบ (Admin) เพื่อให้ปรากฏในแถบ <strong>&quot;อนุมัติผู้สมัครใหม่&quot;</strong> ส่วน <strong>&quot;รอการตรวจสอบสิทธิ์&quot;</strong> ได้ทันที
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <div className="flex-1 flex items-center gap-2 bg-white/80 p-1.5 px-2.5 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-slate-700 flex-shrink-0">บทบาทที่ขอ:</span>
                <select
                  value={selectedRequestRole}
                  onChange={(e) => setSelectedRequestRole(e.target.value as UserRole)}
                  className="w-full bg-transparent text-xs text-[#003B71] font-bold focus:outline-none cursor-pointer"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendAccessRequestFromLogin}
                  disabled={isSubmittingRequest || loading}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#003B71] to-[#00A8B5] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#003B71]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRequest ? (
                    <span className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังส่งคำขอ...
                    </span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>ส่งคำขอสิทธิ์ไปยัง Admin ทันที</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup')
                    setErrorMsg('')
                    setUnregisteredCreds(null)
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  กรอกฟอร์ม Sign Up
                </button>
              </div>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="flex-1 leading-relaxed">{successMsg}</span>
          </div>
        )}

        {authMode === 'signin' ? (
          <SignInForm
            identifier={identifier}
            setIdentifier={setIdentifier}
            onSignIn={handleSignIn}
            onForgotPassword={() => setIsForgotModalOpen(true)}
            loading={loading}
          />
        ) : (
          <SignUpForm
            onSignUp={handleSignUp}
            loading={loading}
            onError={(msg) => setErrorMsg(msg)}
            errorMsg={errorMsg}
          />
        )}
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={identifier}
      />
    </div>
  )
}
