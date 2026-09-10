'use client'

import React, { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'

interface SignInFormProps {
  identifier: string
  setIdentifier: (val: string) => void
  onSignIn: (password: string) => Promise<void>
  onForgotPassword: () => void
  loading: boolean
}

export function SignInForm({
  identifier,
  setIdentifier,
  onSignIn,
  onForgotPassword,
  loading
}: SignInFormProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSignIn(password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm sm:text-base font-bold text-slate-800">
          อีเมลมหาวิทยาลัย หรือ ชื่อผู้ใช้งาน (Email or Username)
        </label>
        <div className="relative">
          <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            placeholder="เช่น dean@science.ac.th หรือ username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm sm:text-base font-bold text-slate-800">
          รหัสผ่าน (Password)
        </label>

        <div className="relative">
          <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="ระบุรหัสผ่านของคุณ"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs sm:text-sm font-bold text-[#003B71] hover:text-[#00A8B5] hover:underline cursor-pointer transition-colors"
          >
            ลืมรหัสผ่าน? (Forgot Password?)
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-[#003B71]/25 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2.5 mt-4 cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            กำลังเข้าสู่ระบบ...
          </span>
        ) : (
          <>
            <span>เข้าสู่ระบบ (Sign In)</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  )
}
