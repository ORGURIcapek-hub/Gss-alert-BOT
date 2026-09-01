'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRole } from '@/components/RoleContext'
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Camera,
  Check,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Shield,
  Upload,
  RotateCcw,
  Sparkles
} from 'lucide-react'

// Curated academic preset avatars
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
]

const ROLE_DISPLAY_MAP: Record<string, { label: string; color: string }> = {
  admin: { label: '🛡️ ผู้ดูแลระบบ (Admin)', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  executive: { label: '👑 ผู้บริหารระดับสูง (Executive)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  head_okr: { label: '🎯 หัวหน้าโครงการ OKR (Head OKR)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  teacher: { label: '🎓 อาจารย์ลูกทีม (Teacher / Member)', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  staff: { label: '📋 บุคลากร / เจ้าหน้าที่ (Staff)', color: 'bg-slate-50 text-slate-700 border-slate-200' },
}

export function UserProfileModal() {
  const {
    currentUser,
    isProfileModalOpen,
    closeProfileModal,
    updateProfile,
    openChangePasswordModal
  } = useRole()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('ภาควิชาวิทยาการคอมพิวเตอร์')
  const [position, setPosition] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate form with current user data on open
  useEffect(() => {
    if (currentUser && isProfileModalOpen) {
      setFirstName(currentUser.first_name || (currentUser.name ? currentUser.name.split(' ')[0] : ''))
      setLastName(currentUser.last_name || (currentUser.name ? currentUser.name.split(' ').slice(1).join(' ') : ''))
      setDepartment(currentUser.department || 'ภาควิชาวิทยาการคอมพิวเตอร์')
      setPosition(currentUser.position || '')
      setAvatarUrl(currentUser.avatar_url || PRESET_AVATARS[0])
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [currentUser, isProfileModalOpen])

  if (!isProfileModalOpen || !currentUser) return null

  // Handle local image file upload & convert to base64 data URL
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('ขนาดรูปภาพต้องไม่เกิน 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setAvatarUrl(base64)
      setErrorMsg('')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('กรุณากรอกชื่อและนามสกุลให้ครบถ้วน')
      return
    }

    setLoading(true)
    const result = await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      department: department.trim(),
      position: position.trim(),
      avatar_url: avatarUrl
    })

    setLoading(false)

    if (!result.success) {
      setErrorMsg(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์')
    } else {
      setSuccessMsg('บันทึกข้อมูลโปรไฟล์สำเร็จเรียบร้อยแล้ว!')
      setTimeout(() => {
        setSuccessMsg('')
      }, 3000)
    }
  }

  const roleInfo = ROLE_DISPLAY_MAP[currentUser.role] || ROLE_DISPLAY_MAP.teacher

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden relative my-8">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] p-6 text-white relative">
          <button
            onClick={closeProfileModal}
            type="button"
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            ✕
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-sky-200 shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider">
                ข้อมูลส่วนตัว (User Profile)
              </span>
              <h3 className="text-lg sm:text-xl font-black mt-0.5">
                โปรไฟล์และข้อมูลผู้ใช้งาน
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Alerts */}
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

          {/* Section 1: Avatar Upload & Selection */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar Preview with Camera Overlay */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img
                src={avatarUrl || PRESET_AVATARS[0]}
                alt="Profile Preview"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:opacity-90 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold">เปลี่ยนรูป</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#003B71]" />
                  <span>รูปโปรไฟล์ของคุณ (Profile Picture)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  อัปโหลดรูปภาพของท่าน (JPG, PNG ไม่เกิน 2MB) หรือเลือกจากอวาตาร์ตัวอย่าง
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[#003B71] text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูปเอง</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAvatarUrl(PRESET_AVATARS[0])}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  title="รีเซ็ตเป็นรูปเริ่มต้น"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>รีเซ็ต</span>
                </button>
              </div>

              {/* Preset Avatars Row */}
              <div className="pt-1.5">
                <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center justify-center sm:justify-start gap-1">
                  <Sparkles className="w-3 h-3 text-[#00A8B5]" />
                  เลือกรูปโปรไฟล์ตัวอย่าง:
                </span>
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        avatarUrl === preset ? 'border-[#003B71] ring-2 ring-[#003B71]/30 scale-110' : 'border-white opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt={`preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Full Name (Editable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                ชื่อจริง (First Name) *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="เช่น ผศ.ดร.สมชาย"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                นามสกุล (Last Name) *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ใจดี"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
              />
            </div>
          </div>

          {/* Section 3: Department & Position (Editable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#003B71]" />
                <span>ภาควิชา / หน่วยงาน</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
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
                <span>ตำแหน่งงาน</span>
              </label>
              <input
                type="text"
                placeholder="เช่น อาจารย์ประจำภาควิชา"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
              />
            </div>
          </div>

          {/* Section 4: Account Details & Security Badges (Read-Only) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                อีเมลผู้ใช้:
              </span>
              <span className="font-bold text-slate-900">{currentUser.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                บทบาทในระบบ:
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">ความปลอดภัยของบัญชี:</span>
              <button
                type="button"
                onClick={() => {
                  closeProfileModal()
                  openChangePasswordModal()
                }}
                className="text-xs font-bold text-[#003B71] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>เปลี่ยนรหัสผ่าน (Change Password)</span>
              </button>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeProfileModal}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#003B71]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>บันทึกข้อมูลโปรไฟล์ (Save Profile)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
