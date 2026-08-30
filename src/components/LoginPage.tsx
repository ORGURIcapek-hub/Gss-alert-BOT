'use client'

import React, { useState } from 'react'
import { useRole } from '@/components/RoleContext'
import { SDULogo } from '@/components/SDULogo'
import { UserRole } from '@/types/database.types'
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Building2,
  Briefcase,
  UserPlus,
  LogIn
} from 'lucide-react'

export function LoginPage() {
  const { login, register } = useRole()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  // Sign In states
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // Sign Up states
  const [regUsername, setRegUsername] = useState('')
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState<UserRole>('teacher')
  const [regDepartment, setRegDepartment] = useState('ภาควิชาวิทยาการคอมพิวเตอร์')
  const [regPosition, setRegPosition] = useState('อาจารย์ประจำภาควิชา')

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    const result = await login(identifier, password)
    if (!result.success) {
      setErrorMsg(result.error || 'Incorrect password or username')
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!regUsername.trim() || !regEmail.trim() || !regFullName.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง')
      return
    }

    setLoading(true)
    const result = await register({
      username: regUsername.trim(),
      name: regFullName.trim(),
      email: regEmail.trim(),
      password: regPassword || '123456',
      role: regRole,
      department: regDepartment,
      position: regPosition
    })

    if (!result.success) {
      setErrorMsg(result.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    } else {
      setSuccessMsg('ลงทะเบียนสำเร็จ! กำลังนำท่านเข้าสู่ระบบ...')
    }
  }

  const fillSampleCredential = (sampleEmail: string) => {
    setIdentifier(sampleEmail)
    setPassword('password123')
    setErrorMsg('')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900 overflow-hidden font-sans">
      {/* Background Campus Image */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920&auto=format&fit=crop')`,
        }}
      />
      {/* SDU Navy / Teal Themed Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00264D]/90 via-[#003B71]/80 to-[#00A8B5]/50 backdrop-blur-sm z-0" />

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-10 transition-all duration-300">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <SDULogo size="lg" textColor="dark" showText={true} />
          
          <div className="pt-1">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              ระบบติดตามและประเมินผล OKR
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              มหาวิทยาลัยสวนดุสิต (Suan Dusit University)
            </p>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin')
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-white text-[#003B71] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4 text-[#003B71]" />
            <span>เข้าสู่ระบบ (Sign In)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('signup')
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              authMode === 'signup'
                ? 'bg-white text-[#003B71] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#00A8B5]" />
            <span>สมัครสมาชิก (Sign Up)</span>
          </button>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                อีเมลมหาวิทยาลัย หรือ ชื่อผู้ใช้งาน (Email or Username)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="เช่น dean@science.ac.th หรือ username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  รหัสผ่าน (Password)
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="ระบุรหัสผ่านของคุณ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#003B71]/25 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                <>
                  <span>เข้าสู่ระบบ (Sign In)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* SIGN UP / REGISTRATION FORM */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  ชื่อผู้ใช้งาน (Username) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น somchai.j"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  ชื่อ - นามสกุล (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผศ.ดร.สมชาย ใจดี"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  อีเมลมหาวิทยาลัย (Email) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@science.ac.th"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  รหัสผ่าน (Password) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="กำหนดรหัสผ่าน"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                บทบาทในระบบ (Role Type) *
              </label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#003B71] font-bold focus:bg-white focus:outline-none focus:border-[#003B71]"
              >
                <option value="teacher">🎓 อาจารย์ลูกทีมโครงการ OKR (Teacher / Team Member)</option>
                <option value="head_okr">🎯 หัวหน้าโครงการ OKR (Head OKR)</option>
                <option value="executive">👑 ผู้บริหารระดับสูง (Executive)</option>
                <option value="staff">📋 เจ้าหน้าที่ / บุคลากรทั่วไป (Staff)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#003B71]" />
                  ภาควิชา / หน่วยงาน *
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  <option value="ภาควิชาวิทยาการคอมพิวเตอร์">ภาควิชาวิทยาการคอมพิวเตอร์</option>
                  <option value="ภาควิชาเคมี">ภาควิชาเคมี</option>
                  <option value="ภาควิชาชีววิทยา">ภาควิชาชีววิทยา</option>
                  <option value="ภาควิชาฟิสิกส์">ภาควิชาฟิสิกส์</option>
                  <option value="ภาควิชาคณิตศาสตร์">ภาควิชาคณิตศาสตร์</option>
                  <option value="สำนักงานคณบดี">สำนักงานคณบดี</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-[#003B71]" />
                  ตำแหน่งงาน
                </label>
                <input
                  type="text"
                  placeholder="เช่น อาจารย์ประจำภาควิชา"
                  value={regPosition}
                  onChange={(e) => setRegPosition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#00A8B5] hover:opacity-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังบันทึกข้อมูลเข้าสู่ระบบ...
                </span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>ยืนยันการลงทะเบียน (Register Account)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Credentials Helper (in signin mode) */}
        {authMode === 'signin' && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#00A8B5]" />
                คลิกเพื่อทดสอบบัญชีตัวอย่าง (รหัสผ่าน: password123)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillSampleCredential('dean@science.ac.th')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 text-left truncate transition-colors cursor-pointer"
                title="ผู้บริหารระดับสูง"
              >
                👑 ผู้บริหาร (Dean)
              </button>
              <button
                type="button"
                onClick={() => fillSampleCredential('head.cs@science.ac.th')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 text-left truncate transition-colors cursor-pointer"
                title="หัวหน้า OKR"
              >
                🎯 หัวหน้า OKR (Head)
              </button>
              <button
                type="button"
                onClick={() => fillSampleCredential('teacher.cs1@science.ac.th')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 text-left truncate transition-colors cursor-pointer"
                title="อาจารย์ลูกทีม"
              >
                🎓 อาจารย์ลูกทีม
              </button>
              <button
                type="button"
                onClick={() => fillSampleCredential('admin@science.ac.th')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 text-left truncate transition-colors cursor-pointer"
                title="ผู้ดูแลระบบ"
              >
                🛡️ ผู้ดูแลระบบ (Admin)
              </button>
              <button
                type="button"
                onClick={() => fillSampleCredential('staff.plan@science.ac.th')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 text-left truncate transition-colors col-span-2 sm:col-span-1 cursor-pointer"
                title="บุคลากรทั่วไป"
              >
                📋 เจ้าหน้าที่ (Staff)
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 text-center text-xs text-slate-600 font-medium">
          © มหาวิทยาลัยสวนดุสิต • Suan Dusit University
        </div>
      </div>
    </div>
  )
}
