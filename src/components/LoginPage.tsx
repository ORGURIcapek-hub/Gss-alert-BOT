'use client'

import React, { useState, useRef } from 'react'
import { useRole } from '@/components/RoleContext'
import { SDULogo } from '@/components/SDULogo'
import { UserRole } from '@/types/database.types'
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal'
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
  LogIn,
  Eye,
  EyeOff,
  Check,
  X,
  Camera,
  Upload
} from 'lucide-react'

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
]

export function LoginPage() {
  const { login, register } = useRole()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)

  // Sign In states
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Sign Up states
  const [regUsername, setRegUsername] = useState('')
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regRole, setRegRole] = useState<UserRole>('teacher')
  const [regDepartment, setRegDepartment] = useState('ภาควิชาวิทยาการคอมพิวเตอร์')
  const [regPosition, setRegPosition] = useState('อาจารย์ประจำภาควิชา')
  const [regAvatarUrl, setRegAvatarUrl] = useState(PRESET_AVATARS[0])

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const regFileInputRef = useRef<HTMLInputElement>(null)

  // Handle local image file upload & convert to base64
  const handleRegAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('ขนาดรูปภาพต้องไม่เกิน 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setRegAvatarUrl(base64)
      setErrorMsg('')
    }
    reader.readAsDataURL(file)
  }

  // Sign Up Password Strength Criteria Evaluation
  const isPasswordValidLength = regPassword.length >= 8 && regPassword.length <= 15
  const hasLetter = /[a-zA-Z]/.test(regPassword)
  const hasNumber = /[0-9]/.test(regPassword)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(regPassword)
  const isPasswordAllValid = isPasswordValidLength && hasLetter && hasNumber && hasSpecial
  const passedCriteriaCount = [isPasswordValidLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length

  const getStrengthMeta = () => {
    if (!regPassword) {
      return {
        label: 'ระบุรหัสผ่าน',
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

  // -------------------------------------------------------------
  // Sign In Handler
  // -------------------------------------------------------------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    const result = await login(identifier, password)
    if (!result.success) {
      setErrorMsg(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    }
    setLoading(false)
  }

  // -------------------------------------------------------------
  // Sign Up Handler
  // -------------------------------------------------------------
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!regUsername.trim() || !regEmail.trim() || !regFullName.trim() || !regPassword) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง')
      return
    }

    if (!isPasswordAllValid) {
      setErrorMsg('รหัสผ่านต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ')
      return
    }

    setLoading(true)
    const result = await register({
      username: regUsername.trim(),
      name: regFullName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: regRole,
      department: regDepartment,
      position: regPosition,
      avatar_url: regAvatarUrl
    })

    if (!result.success) {
      setErrorMsg(result.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    } else {
      setSuccessMsg('สมัครสมาชิกสำเร็จ! บัญชีของคุณถูกส่งให้ผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติสิทธิ์เรียบร้อยแล้ว กรุณารอการอนุมัติก่อนเข้าสู่ระบบ')
      setIdentifier('')
      setPassword('')
      setRegUsername('')
      setRegFullName('')
      setRegEmail('')
      setRegPassword('')
      setRegAvatarUrl(PRESET_AVATARS[0])
      setLoading(false)
      setTimeout(() => {
        setAuthMode('signin')
        setSuccessMsg('')
      }, 2500)
    }
  }

  const fillSampleCredential = (sampleEmail: string) => {
    setIdentifier(sampleEmail)
    setPassword('password123')
    setErrorMsg('')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-slate-900 overflow-hidden font-sans">
      {/* Background Campus Image */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920&auto=format&fit=crop')`,
        }}
      />
      {/* SDU Navy / Teal Themed Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00264D]/92 via-[#003B71]/85 to-[#00A8B5]/55 backdrop-blur-sm z-0" />

      {/* Main Authentication Card - Enlarged & Enhanced Typography */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 sm:p-12 transition-all duration-300">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <SDULogo size="lg" textColor="dark" showText={true} />
          
          <div className="pt-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ระบบติดตามและประเมินผล OKR
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-semibold mt-1">
              มหาวิทยาลัยสวนดุสิต (Suan Dusit University)
            </p>
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
              authMode === 'signin'
                ? 'bg-white text-[#003B71] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
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
              authMode === 'signup'
                ? 'bg-white text-[#003B71] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
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

        {/* ========================================================= */}
        {/* SIGN IN FORM */}
        {/* ========================================================= */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-5">
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

              {/* Forgot Password Link moved BELOW the password input */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
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
        )}

        {/* ========================================================= */}
        {/* SIGN UP / REGISTRATION FORM */}
        {/* ========================================================= */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4 max-h-[62vh] overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Profile Avatar Upload & Selector */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
              <div
                className="relative group cursor-pointer flex-shrink-0"
                onClick={() => regFileInputRef.current?.click()}
                title="คลิกเพื่ออัปโหลดรูปโปรไฟล์"
              >
                <img
                  src={regAvatarUrl || PRESET_AVATARS[0]}
                  alt="Profile Preview"
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-white shadow-md group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5" />
                </div>
                <input
                  ref={regFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleRegAvatarUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#003B71]" />
                    <span>รูปโปรไฟล์ (Profile Image)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => regFileInputRef.current?.click()}
                    className="text-xs font-bold text-[#003B71] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>อัปโหลดรูป</span>
                  </button>
                </div>

                {/* Preset Avatars Chips */}
                <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRegAvatarUrl(preset)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                        regAvatarUrl === preset ? 'border-[#003B71] ring-2 ring-[#003B71]/30 scale-110' : 'border-white opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt={`preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 1: Username & Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  ชื่อ - นามสกุล (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผศ.ดร.สมชาย ใจดี"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                />
              </div>
            </div>

            {/* Row 2: Email & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  บทบาทในระบบ (Role Type) *
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#003B71] font-bold focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  <option value="teacher">🎓 อาจารย์ลูกทีม (Teacher / Member)</option>
                  <option value="head_okr">🎯 หัวหน้าโครงการ OKR (Head OKR)</option>
                  <option value="executive">👑 ผู้บริหารระดับสูง (Executive)</option>
                  <option value="staff">📋 เจ้าหน้าที่ / บุคลากรทั่วไป (Staff)</option>
                </select>
              </div>
            </div>

            {/* Row 3: Password with Strength Meter & Checklist */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#003B71]" />
                  <span>กำหนดรหัสผ่าน (Password) *</span>
                </label>
                {regPassword && (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${strengthMeta.badgeBg}`}>
                    {strengthMeta.label}
                  </span>
                )}
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  maxLength={15}
                  placeholder="ความยาว 8-15 ตัว (เช่น Pass#2024)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71]"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showRegPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Progress Bar */}
              {regPassword && (
                <div className="space-y-2 pt-1">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthMeta.barColor} ${strengthMeta.widthClass} transition-all duration-300 rounded-full`}
                    />
                  </div>

                  {/* Requirements Checklist */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-2 ${isPasswordValidLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${isPasswordValidLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {isPasswordValidLength ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                      </span>
                      <span>ความยาว 8-15 ตัวอักษร ({regPassword.length}/15)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${hasLetter ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasLetter ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {hasLetter ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                      </span>
                      <span>มีตัวอักษรภาษาอังกฤษ (A-Z, a-z)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {hasNumber ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                      </span>
                      <span>มีตัวเลขอารบิก (0-9)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasSpecial ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {hasSpecial ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                      </span>
                      <span>มีอักขระพิเศษ (@, #, $, %, !, ฯลฯ)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Row 4: Department & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#003B71]" />
                  ภาควิชา / หน่วยงาน *
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  <option value="ภาควิชาวิทยาการคอมพิวเตอร์">ภาควิชาวิทยาการคอมพิวเตอร์</option>
                  <option value="ภาควิชาเคมี">ภาควิชาเคมี</option>
                  <option value="ภาควิชาชีววิทยา">ภาควิชาชีววิทยา</option>
                  <option value="ภาควิชาฟิสิกส์">ภาควิชาฟิสิกส์</option>
                  <option value="ภาควิชาคณิตศาสตร์">ภาควิชาคณิตศาสตร์</option>
                  <option value="สำนักงานคณบดี">สำนักงานคณบดี</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#003B71]" />
                  ตำแหน่งงาน
                </label>
                <input
                  type="text"
                  placeholder="เช่น อาจารย์ประจำภาควิชา"
                  value={regPosition}
                  onChange={(e) => setRegPosition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#00A8B5] hover:opacity-95 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังบันทึกข้อมูลเข้าสู่ระบบ...
                </span>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>ยืนยันการลงทะเบียน (Register Account)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Credentials Helper (in signin mode) */}
        {authMode === 'signin' && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#00A8B5]" />
                คลิกเพื่อทดสอบบัญชีตัวอย่าง (รหัสผ่าน: password123)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => fillSampleCredential('dean@science.ac.th')}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 text-left truncate transition-colors cursor-pointer"
                title="ผู้บริหารระดับสูง"
              >
                👑 ผู้บริหาร (Dean)
              </button>
              <button
                type="button"
                onClick={() => fillSampleCredential('head.cs@science.ac.th')}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 text-left truncate transition-colors cursor-pointer"
                title="หัวหน้า OKR"
              >
                🎯 หัวหน้า OKR (Head)
              </button>
              <button
                type="button"
                onClick={() => fillSampleCredential('teacher.cs1@science.ac.th')}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 text-left truncate transition-colors cursor-pointer"
                title="อาจารย์ลูกทีม"
              >
                🎓 อาจารย์ลูกทีม
              </button>
              <button
                type="button"
                onClick={() => fillSampleCredential('admin@science.ac.th')}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 text-left truncate transition-colors cursor-pointer"
                title="ผู้ดูแลระบบ"
              >
                🛡️ ผู้ดูแลระบบ (Admin)
              </button>
              <button
                type="button"
                onClick={() => fillSampleCredential('staff.plan@science.ac.th')}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 text-left truncate transition-colors col-span-2 sm:col-span-1 cursor-pointer"
                title="บุคลากรทั่วไป"
              >
                📋 เจ้าหน้าที่ (Staff)
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 text-center text-xs sm:text-sm text-slate-600 font-medium">
          © มหาวิทยาลัยสวนดุสิต • Suan Dusit University
        </div>
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
