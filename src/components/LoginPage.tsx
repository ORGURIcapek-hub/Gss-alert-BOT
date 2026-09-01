'use client'

import React, { useState, useEffect } from 'react'
import { useRole } from '@/components/RoleContext'
import { SDULogo } from '@/components/SDULogo'
import { UserRole, UserProfile } from '@/types/database.types'
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
  KeyRound,
  Copy,
  RefreshCw,
  Send,
  ArrowLeft,
  Clock
} from 'lucide-react'

export function LoginPage() {
  const { login, register, allUsers, refreshUsers } = useRole()
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin')

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

  // Forgot Password / OTP states
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3 | 4>(1)
  const [forgotEmail, setForgotEmail] = useState('')
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null)
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [enteredOtp, setEnteredOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [otpExpiryTime, setOtpExpiryTime] = useState<number>(0)
  const [resendCooldown, setResendCooldown] = useState<number>(0)
  const [simulatedEmailBanner, setSimulatedEmailBanner] = useState<{ show: boolean; email: string; otp: string } | null>(null)
  const [copiedOtp, setCopiedOtp] = useState(false)

  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false)
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // OTP Resend Cooldown Timer
  useEffect(() => {
    let timer: any
    if (authMode === 'forgot' && forgotStep === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [authMode, forgotStep, resendCooldown])

  // Sign Up Password Strength Criteria Evaluation
  const isPasswordValidLength = regPassword.length >= 8 && regPassword.length <= 15
  const hasLetter = /[a-zA-Z]/.test(regPassword)
  const hasNumber = /[0-9]/.test(regPassword)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(regPassword)
  const isPasswordAllValid = isPasswordValidLength && hasLetter && hasNumber && hasSpecial
  const passedCriteriaCount = [isPasswordValidLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length

  // Forgot Password Strength Criteria Evaluation
  const isForgotPassValidLength = forgotNewPassword.length >= 8 && forgotNewPassword.length <= 15
  const hasForgotLetter = /[a-zA-Z]/.test(forgotNewPassword)
  const hasForgotNumber = /[0-9]/.test(forgotNewPassword)
  const hasForgotSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(forgotNewPassword)
  const isForgotPassAllValid = isForgotPassValidLength && hasForgotLetter && hasForgotNumber && hasForgotSpecial
  const isForgotPassMatching = forgotNewPassword && forgotConfirmPassword && forgotNewPassword === forgotConfirmPassword
  const passedForgotCriteriaCount = [isForgotPassValidLength, hasForgotLetter, hasForgotNumber, hasForgotSpecial].filter(Boolean).length

  const getStrengthMeta = (count: number, val: string) => {
    if (!val) {
      return {
        label: 'ระบุรหัสผ่าน',
        barColor: 'bg-slate-200',
        textColor: 'text-slate-400',
        widthClass: 'w-0',
        badgeBg: 'bg-slate-100 text-slate-500 border-slate-200'
      }
    }
    if (count <= 1) {
      return {
        label: 'ความปลอดภัยต่ำ (Weak)',
        barColor: 'bg-rose-500',
        textColor: 'text-rose-600',
        widthClass: 'w-1/4',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
      }
    }
    if (count === 2) {
      return {
        label: 'ปานกลาง (Medium)',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-600',
        widthClass: 'w-2/4',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
      }
    }
    if (count === 3) {
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

  const strengthMeta = getStrengthMeta(passedCriteriaCount, regPassword)
  const forgotStrengthMeta = getStrengthMeta(passedForgotCriteriaCount, forgotNewPassword)

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
      position: regPosition
    })

    if (!result.success) {
      setErrorMsg(result.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    } else {
      setSuccessMsg('สมัครสมาชิกสำเร็จ! บัญชีของคุณถูกส่งให้ผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติสิทธิ์เรียบร้อยแล้ว กรุณารอการอนุมัติก่อนเข้าสู่ระบบ')
      // Reset form fields and do NOT auto-fill sign-in fields
      setIdentifier('')
      setPassword('')
      setRegUsername('')
      setRegFullName('')
      setRegEmail('')
      setRegPassword('')
      setLoading(false)
      setTimeout(() => {
        setAuthMode('signin')
        setSuccessMsg('')
      }, 2500)
    }
  }

  // -------------------------------------------------------------
  // Forgot Password: Step 1 -> Send OTP via Email
  // -------------------------------------------------------------
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const cleanInput = forgotEmail.trim().toLowerCase()
    if (!cleanInput) {
      setErrorMsg('กรุณาระบุอีเมลหรือชื่อผู้ใช้งานของคุณ')
      return
    }

    setLoading(true)

    // Lookup user in state or refresh
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

    // Generate 6-digit random numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    setGeneratedOtp(otp)
    setTargetUser(user)
    setOtpExpiryTime(Date.now() + 5 * 60 * 1000) // 5 minutes
    setResendCooldown(60) // 60 seconds
    setEnteredOtp(['', '', '', '', '', ''])

    // Show simulated Email Notification banner for instant testing
    setSimulatedEmailBanner({
      show: true,
      email: user.email,
      otp: otp
    })

    setSuccessMsg(`ส่งรหัสยืนยัน OTP ไปยังอีเมล ${user.email} สำเร็จแล้ว (รหัสมีอายุ 5 นาที)`)
    setForgotStep(2)
    setLoading(false)
  }

  // -------------------------------------------------------------
  // Forgot Password: Step 2 -> Verify OTP
  // -------------------------------------------------------------
  const handleOtpBoxChange = (index: number, value: string) => {
    // Handle paste of whole 6 digits
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6)
      if (pasted.length > 0) {
        const newArr = [...enteredOtp]
        for (let i = 0; i < 6; i++) {
          newArr[i] = pasted[i] || ''
        }
        setEnteredOtp(newArr)
        const nextIdx = Math.min(pasted.length, 5)
        const nextElem = document.getElementById(`otp-input-${nextIdx}`)
        if (nextElem) (nextElem as HTMLInputElement).focus()
        return
      }
    }

    const digit = value.replace(/\D/g, '').slice(-1)
    const newArr = [...enteredOtp]
    newArr[index] = digit
    setEnteredOtp(newArr)

    if (digit && index < 5) {
      const nextElem = document.getElementById(`otp-input-${index + 1}`)
      if (nextElem) (nextElem as HTMLInputElement).focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !enteredOtp[index] && index > 0) {
      const prevElem = document.getElementById(`otp-input-${index - 1}`)
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
      setErrorMsg('รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบรหัสในอีเมลของคุณอีกครั้ง')
      return
    }

    setSuccessMsg('ยืนยันรหัส OTP สำเร็จ! กรุณากำหนดรหัสผ่านใหม่ของคุณ')
    setErrorMsg('')
    setForgotStep(3)
  }

  // -------------------------------------------------------------
  // Forgot Password: Step 3 -> Reset New Password
  // -------------------------------------------------------------
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!isForgotPassAllValid) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ')
      return
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
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
      await updateUserPasswordRecord(targetUser.user_id, forgotNewPassword)
      await refreshUsers()

      setSuccessMsg('รีเซ็ตรหัสผ่านใหม่สำเร็จเรียบร้อยแล้ว!')
      setIdentifier(targetUser.email)
      setPassword(forgotNewPassword)
      setForgotStep(4)
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน')
    } finally {
      setLoading(false)
    }
  }

  const fillSampleCredential = (sampleEmail: string) => {
    setIdentifier(sampleEmail)
    setPassword('password123')
    setErrorMsg('')
  }

  const copySimulatedOtp = () => {
    if (simulatedEmailBanner?.otp && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(simulatedEmailBanner.otp)
      setCopiedOtp(true)
      // Auto-fill into 6 boxes
      const chars = simulatedEmailBanner.otp.split('')
      setEnteredOtp(chars)
      setTimeout(() => setCopiedOtp(false), 2500)
    }
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

        {/* Tab Switcher: Sign In vs Sign Up (Hidden when in Forgot Mode) */}
        {authMode !== 'forgot' ? (
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
        ) : (
          /* Forgot Password Header Nav */
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin')
                setForgotStep(1)
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className="text-xs font-bold text-slate-600 hover:text-[#003B71] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปหน้าเข้าสู่ระบบ</span>
            </button>

            <div className="flex items-center gap-1 text-[11px] font-bold text-[#003B71] bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              <KeyRound className="w-3.5 h-3.5" />
              <span>รีเซ็ตรหัสผ่านผ่าน OTP ({forgotStep}/4)</span>
            </div>
          </div>
        )}

        {/* Simulated Email OTP Delivery Notification Banner (For Instant Testing & Realism) */}
        {simulatedEmailBanner?.show && authMode === 'forgot' && forgotStep === 2 && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 text-slate-800 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#003B71] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#003B71] block">
                    SDU Mail Notification (จำลองกล่องจดหมาย)
                  </span>
                  <p className="text-xs text-slate-600 font-medium">
                    ส่งไปยัง: <b className="text-slate-900">{simulatedEmailBanner.email}</b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={copySimulatedOtp}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-[#003B71] border border-sky-300 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
              >
                {copiedOtp ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedOtp ? 'คัดลอก & เติมอัตโนมัติแล้ว' : 'คัดลอก OTP'}</span>
              </button>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-sky-200/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">รหัสยืนยัน OTP:</span>
              <span className="font-mono text-base font-black text-[#003B71] tracking-widest bg-white px-3 py-1 rounded-lg border border-sky-300 shadow-inner">
                {simulatedEmailBanner.otp}
              </span>
            </div>
          </div>
        )}

        {/* Alert Messages */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* SIGN IN FORM */}
        {/* ========================================================= */}
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
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot')
                    setForgotStep(1)
                    setErrorMsg('')
                    setSuccessMsg('')
                    setForgotEmail(identifier)
                  }}
                  className="text-xs font-bold text-[#003B71] hover:text-[#00A8B5] hover:underline cursor-pointer transition-colors"
                >
                  ลืมรหัสผ่าน? (Forgot Password?)
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="ระบุรหัสผ่านของคุณ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-11 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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

        {/* ========================================================= */}
        {/* SIGN UP / REGISTRATION FORM */}
        {/* ========================================================= */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {/* Row 1: Username & Full Name */}
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

            {/* Row 2: Email & Role */}
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
                  บทบาทในระบบ (Role Type) *
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#003B71] font-bold focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  <option value="teacher">🎓 อาจารย์ลูกทีม (Teacher / Member)</option>
                  <option value="head_okr">🎯 หัวหน้าโครงการ OKR (Head OKR)</option>
                  <option value="executive">👑 ผู้บริหารระดับสูง (Executive)</option>
                  <option value="staff">📋 เจ้าหน้าที่ / บุคลากรทั่วไป (Staff)</option>
                </select>
              </div>
            </div>

            {/* Row 3: Password with Strength Meter & Checklist */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#003B71]" />
                  <span>กำหนดรหัสผ่าน (Password) *</span>
                </label>
                {regPassword && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${strengthMeta.badgeBg}`}>
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
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71]"
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
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthMeta.barColor} ${strengthMeta.widthClass} transition-all duration-300 rounded-full`}
                    />
                  </div>

                  {/* Requirements Checklist */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${isPasswordValidLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${isPasswordValidLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {isPasswordValidLength ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                      </span>
                      <span>ความยาว 8-15 ตัวอักษร ({regPassword.length}/15)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasLetter ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {hasLetter ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                      </span>
                      <span>มีตัวอักษรภาษาอังกฤษ (A-Z, a-z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {hasNumber ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                      </span>
                      <span>มีตัวเลขอารบิก (0-9)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
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

        {/* ========================================================= */}
        {/* FORGOT PASSWORD WIZARD (4 STEPS) */}
        {/* ========================================================= */}
        {authMode === 'forgot' && (
          <div className="space-y-4">
            {/* STEP 1: Enter Email / Username */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="text-base font-bold text-slate-900">
                    ค้นหาบัญชีเพื่อรับรหัส OTP
                  </h3>
                  <p className="text-xs text-slate-500">
                    กรอกอีเมลมหาวิทยาลัยหรือชื่อผู้ใช้ของคุณ ระบบจะจัดส่งรหัส OTP 6 หลักไปให้ทางอีเมล
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    อีเมลมหาวิทยาลัย หรือ ชื่อผู้ใช้งาน *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="เช่น somchai.j@science.ac.th หรือ username"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !forgotEmail.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#005B94] hover:opacity-95 text-white font-bold text-sm shadow-md shadow-[#003B71]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังส่งรหัส OTP...
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ส่งรหัส OTP ไปยังอีเมล (Send OTP)</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Enter & Verify 6-digit OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="text-base font-bold text-slate-900">
                    กรอกรหัสยืนยัน OTP (6 หลัก)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ระบุรหัส 6 หลักที่ได้รับทางอีเมล <span className="font-bold text-slate-800">{targetUser?.email}</span>
                  </p>
                </div>

                {/* 6 OTP Input Boxes */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                  {enteredOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-bold text-xl sm:text-2xl text-[#003B71] bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-[#003B71] focus:ring-2 focus:ring-[#003B71]/20 focus:outline-none transition-all shadow-sm"
                    />
                  ))}
                </div>

                {/* Cooldown & Resend Button */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <div className="flex items-center gap-1 text-slate-500">
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
                      {resendCooldown > 0 ? `ขอรหัสใหม่ได้ใน (${resendCooldown}s)` : 'ขอรับรหัส OTP อีกครั้ง'}
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={enteredOtp.join('').length !== 6}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white font-bold text-sm shadow-md shadow-[#003B71]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ยืนยันรหัส OTP (Verify OTP)</span>
                </button>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="text-base font-bold text-slate-900">
                    กำหนดรหัสผ่านใหม่
                  </h3>
                  <p className="text-xs text-slate-500">
                    สร้างรหัสผ่านใหม่ความยาว 8-15 ตัว ประกอบด้วยตัวอักษร, ตัวเลข และอักขระพิเศษ
                  </p>
                </div>

                {/* New Password with Strength Meter */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#003B71]" />
                      <span>รหัสผ่านใหม่ (New Password) *</span>
                    </label>
                    {forgotNewPassword && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${forgotStrengthMeta.badgeBg}`}>
                        {forgotStrengthMeta.label}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      maxLength={15}
                      placeholder="ความยาว 8-15 ตัว (เช่น Pass@2024)"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showForgotNewPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength Bar */}
                  {forgotNewPassword && (
                    <div className="space-y-2 pt-1">
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${forgotStrengthMeta.barColor} ${forgotStrengthMeta.widthClass} transition-all duration-300 rounded-full`}
                        />
                      </div>

                      {/* 4 Checklist Criteria */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        <div className={`flex items-center gap-1.5 ${isForgotPassValidLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${isForgotPassValidLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {isForgotPassValidLength ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                          </span>
                          <span>ยาว 8-15 ตัว ({forgotNewPassword.length}/15)</span>
                        </div>

                        <div className={`flex items-center gap-1.5 ${hasForgotLetter ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasForgotLetter ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {hasForgotLetter ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                          </span>
                          <span>มีตัวอักษร (A-Z, a-z)</span>
                        </div>

                        <div className={`flex items-center gap-1.5 ${hasForgotNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasForgotNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {hasForgotNumber ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                          </span>
                          <span>มีตัวเลข (0-9)</span>
                        </div>

                        <div className={`flex items-center gap-1.5 ${hasForgotSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${hasForgotSpecial ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {hasForgotSpecial ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                          </span>
                          <span>มีอักขระพิเศษ (@,#,$,%,!,ฯลฯ)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>ยืนยันรหัสผ่านใหม่ (Confirm Password) *</span>
                    </label>
                    {forgotConfirmPassword && (
                      <span className={`text-[10px] font-bold ${isForgotPassMatching ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isForgotPassMatching ? '✓ รหัสผ่านตรงกัน' : '✗ ไม่ตรงกัน'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showForgotConfirmPassword ? 'text' : 'password'}
                      required
                      maxLength={15}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className={`w-full bg-slate-50 border rounded-xl px-3.5 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none transition-all ${
                        forgotConfirmPassword && !isForgotPassMatching ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#003B71]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showForgotConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isForgotPassAllValid || !isForgotPassMatching}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังบันทึกรหัสผ่านใหม่...
                    </span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>บันทึกรหัสผ่านใหม่ (Reset Password)</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 4: Success View */}
            {forgotStep === 4 && (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-sm animate-in zoom-in-95">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    รหัสผ่านของคุณได้รับการอัปเดตเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin')
                    setForgotStep(1)
                    setErrorMsg('')
                    setSuccessMsg('')
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#005B94] hover:opacity-95 text-white font-bold text-sm shadow-md shadow-[#003B71]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบทันที (Sign In Now)</span>
                </button>
              </div>
            )}
          </div>
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
