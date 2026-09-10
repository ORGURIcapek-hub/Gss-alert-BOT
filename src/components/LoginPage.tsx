'use client'

import React, { useState } from 'react'
import { useRole } from '@/components/RoleContext'
import { SDULogo } from '@/components/SDULogo'
import { UserRole } from '@/types/database.types'
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal'
import { SignInForm } from '@/components/auth/SignInForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { DEFAULT_ROLE_POSITIONS } from '@/lib/user-constants'
import { AlertCircle, CheckCircle2, UserPlus, LogIn } from 'lucide-react'

export function LoginPage() {
  const { login, register } = useRole()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [identifier, setIdentifier] = useState('')

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (password: string) => {
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    const result = await login(identifier, password)
    if (!result.success) {
      setErrorMsg(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    }
    setLoading(false)
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
    setLoading(true)

    const result = await register({
      ...data,
      position: DEFAULT_ROLE_POSITIONS[data.role] || 'อาจารย์ประจำภาควิชา'
    })

    if (!result.success) {
      setErrorMsg(result.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    } else {
      setSuccessMsg(
        'สมัครสมาชิกสำเร็จ! บัญชีของคุณถูกส่งให้ผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติสิทธิ์เรียบร้อยแล้ว กรุณารอการอนุมัติก่อนเข้าสู่ระบบ'
      )
      setIdentifier('')
      setLoading(false)
      setTimeout(() => {
        setAuthMode('signin')
        setSuccessMsg('')
      }, 2500)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-slate-900 overflow-hidden font-sans">
      {/* Background Campus Image */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920&auto=format&fit=crop')`
        }}
      />
      {/* SDU Navy / Teal Themed Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00264D]/92 via-[#003B71]/85 to-[#00A8B5]/55 backdrop-blur-sm z-0" />

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 sm:p-12 transition-all duration-300">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <SDULogo size="lg" textColor="dark" showText={true} />
          <div className="pt-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ระบบติดตามและประเมินผล OKR
            </h1>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
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

        {/* Alert Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="flex-1 leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Form rendering */}
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
          />
        )}
      </div>

      {/* Pop-up Modal for Forgot Password OTP Reset */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={identifier}
      />
    </div>
  )
}
