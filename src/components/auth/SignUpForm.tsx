'use client'

import React, { useState, useRef } from 'react'
import { UserRole } from '@/types/database.types'
import { validateEmail, validatePassword, getPasswordStrengthMeta } from '@/lib/password-utils'
import { uploadFileToStorage } from '@/lib/services/okr-service'
import { PasswordChecklist } from '@/components/ui/PasswordChecklist'
import {
  PRESET_AVATARS,
  DEFAULT_AVATAR,
  DEFAULT_DEPARTMENT,
  ROLE_OPTIONS,
  ROLE_CONFIG,
  DEPARTMENT_OPTIONS,
  TITLE_OPTIONS,
  GENDER_OPTIONS
} from '@/lib/user-constants'
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Building2,
  UserPlus,
  Eye,
  EyeOff,
  Camera,
  Upload
} from 'lucide-react'

interface SignUpFormProps {
  onSignUp: (data: {
    username: string
    title: string
    gender: 'male' | 'female'
    first_name: string
    last_name: string
    name: string
    email: string
    password: string
    role: UserRole
    department: string
    avatar_url: string
  }) => Promise<void>
  loading: boolean
  onError: (msg: string) => void
  errorMsg?: string
}

export function SignUpForm({ onSignUp, loading, onError, errorMsg }: SignUpFormProps) {
  const [regUsername, setRegUsername] = useState('')
  const [regGender, setRegGender] = useState<'male' | 'female'>('male')
  const [regTitle, setRegTitle] = useState('นาย')
  const [customTitle, setCustomTitle] = useState('')
  const [isCustomTitle, setIsCustomTitle] = useState(false)
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regEmailError, setRegEmailError] = useState<string | null>(null)
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regRole, setRegRole] = useState<UserRole>('teacher')
  const [regDepartment, setRegDepartment] = useState(DEFAULT_DEPARTMENT)
  const [regAvatarUrl, setRegAvatarUrl] = useState(DEFAULT_AVATAR)
  const [localError, setLocalError] = useState<string | null>(null)

  const regFileInputRef = useRef<HTMLInputElement>(null)

  const handleGenderChange = (newGender: 'male' | 'female') => {
    setRegGender(newGender)
    if (!isCustomTitle) {
      if (newGender === 'female' && regTitle === 'นาย') {
        setRegTitle('นางสาว')
      } else if (newGender === 'male' && (regTitle === 'นางสาว' || regTitle === 'นาง')) {
        setRegTitle('นาย')
      }
    }
  }

  const handleRegAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('ขนาดรูปภาพต้องไม่เกิน 5MB')
      onError('ขนาดรูปภาพต้องไม่เกิน 5MB')
      return
    }

    try {
      const uploadRes = await uploadFileToStorage(file, {
        folder: 'avatars',
        subfolder: regUsername.trim() || 'registration',
        fileName: file.name
      })

      if (uploadRes.success && uploadRes.url) {
        setRegAvatarUrl(uploadRes.url)
        setLocalError(null)
        onError('')
      } else {
        throw new Error(uploadRes.error || 'ไม่สามารถอัปโหลดรูปภาพได้')
      }
    } catch (err: any) {
      const msg = err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ'
      setLocalError(msg)
      onError(msg)
    }
  }

  const isPasswordAllValid = validatePassword(regPassword).isValid
  const strengthMeta = getPasswordStrengthMeta(regPassword)

  const effectiveTitle = isCustomTitle ? customTitle.trim() : regTitle
  const cleanFirstName = regFirstName.trim()
  const cleanLastName = regLastName.trim()
  const cleanFullName = `${effectiveTitle ? effectiveTitle + ' ' : ''}${cleanFirstName} ${cleanLastName}`.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const cleanUsername = regUsername.trim().toLowerCase().replace(/\s+/g, '')
    const cleanEmail = regEmail.trim().toLowerCase()

    if (!cleanUsername || !cleanEmail || !cleanFirstName || !cleanLastName || !regPassword) {
      const msg = 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง'
      setLocalError(msg)
      onError(msg)
      return
    }

    const emailCheck = validateEmail(cleanEmail)
    if (!emailCheck.isValid) {
      setRegEmailError(emailCheck.error)
      const msg = emailCheck.error || 'รูปแบบอีเมลไม่ถูกต้อง'
      setLocalError(msg)
      onError(msg)
      return
    }

    const pwCheck = validatePassword(regPassword)
    if (!pwCheck.isValid) {
      const msg = 'รหัสผ่านต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ'
      setLocalError(msg)
      onError(msg)
      return
    }

    onSignUp({
      username: cleanUsername,
      title: effectiveTitle,
      gender: regGender,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      name: cleanFullName,
      email: cleanEmail,
      password: regPassword,
      role: regRole,
      department: regDepartment,
      avatar_url: regAvatarUrl
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[62vh] overflow-y-auto pr-1 custom-scrollbar">

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

      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
        <label className="block text-xs sm:text-sm font-bold text-slate-800">
          ระบุเพศ (Gender) *
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {GENDER_OPTIONS.map((g) => {
            const isSelected = regGender === g.value
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => handleGenderChange(g.value)}
                className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? g.value === 'male'
                      ? 'bg-blue-50 text-[#003B71] border-[#003B71] ring-2 ring-[#003B71]/20 shadow-xs'
                      : 'bg-pink-50 text-pink-700 border-pink-400 ring-2 ring-pink-300/30 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-base font-black">{g.symbol}</span>
                <span>{g.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs sm:text-sm font-bold text-slate-800">
              ยศ / คำนำหน้า *
            </label>
            <button
              type="button"
              onClick={() => setIsCustomTitle(!isCustomTitle)}
              className="text-[11px] text-[#003B71] font-bold hover:underline cursor-pointer"
            >
              {isCustomTitle ? 'เลือกจากรายการ' : 'ระบุยศอื่นๆ'}
            </button>
          </div>
          {isCustomTitle ? (
            <input
              type="text"
              required
              placeholder="เช่น ว่าที่ ร.ต., พ.ต.ท."
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
            />
          ) : (
            <select
              value={regTitle}
              onChange={(e) => setRegTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#003B71]"
            >
              {TITLE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-bold text-slate-800">
            ชื่อ (First Name) *
          </label>
          <input
            type="text"
            required
            placeholder="เช่น สมชาย"
            value={regFirstName}
            onChange={(e) => setRegFirstName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-bold text-slate-800">
            นามสกุล (Last Name) *
          </label>
          <input
            type="text"
            required
            placeholder="เช่น ใจดี"
            value={regLastName}
            onChange={(e) => setRegLastName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
          />
        </div>
      </div>

      {(cleanFirstName || cleanLastName) && (
        <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-700 font-medium flex items-center gap-2">
          <span className="text-slate-500 font-bold">ชื่อที่จะแสดง:</span>
          <span className="font-bold text-[#003B71]">{cleanFullName}</span>
        </div>
      )}

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
            อีเมลมหาวิทยาลัย (Email) *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="name@science.ac.th"
              value={regEmail}
              onChange={(e) => {
                setRegEmail(e.target.value)
                if (regEmailError) setRegEmailError(null)
              }}
              onBlur={() => {
                if (regEmail.trim()) {
                  const check = validateEmail(regEmail)
                  setRegEmailError(check.isValid ? null : check.error)
                }
              }}
              className={`w-full bg-slate-50 border rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71] ${
                regEmailError
                  ? 'border-rose-400 focus:ring-1 focus:ring-rose-300'
                  : regEmail && !regEmailError
                    ? 'border-emerald-400'
                    : 'border-slate-200'
              }`}
            />
          </div>
          {regEmailError ? (
            <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {regEmailError}
            </p>
          ) : regEmail && !regEmailError && validateEmail(regEmail).isValid ? (
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              รูปแบบอีเมลถูกต้อง
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-bold text-slate-800">
          บทบาทในระบบที่ขอสมัคร (Role Type) *
        </label>
        <select
          value={regRole}
          onChange={(e) => setRegRole(e.target.value as UserRole)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#003B71] font-bold focus:bg-white focus:outline-none focus:border-[#003B71]"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {ROLE_CONFIG[opt.value]?.emoji} {opt.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 font-medium">
          * ระบบจะส่งคำขอสิทธิ์ในบทบาทนี้ให้ผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติก่อนเข้าใช้งาน
        </p>
      </div>

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

        {regPassword && <PasswordChecklist password={regPassword} />}
      </div>

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
          {DEPARTMENT_OPTIONS.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {(localError || errorMsg) && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="flex-1 leading-relaxed">{localError || errorMsg}</span>
        </div>
      )}

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
  )
}
