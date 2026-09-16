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
  Sparkles,
  Crop
} from 'lucide-react'

import {
  PRESET_AVATARS,
  DEPARTMENT_OPTIONS,
  DEFAULT_DEPARTMENT,
  TITLE_OPTIONS,
  GENDER_OPTIONS,
  getRoleBadge,
  splitFullName
} from '@/lib/user-constants'
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/services/okr-service'
import { AvatarCropModal } from '@/components/ui/AvatarCropModal'

export function UserProfileModal() {
  const {
    currentUser,
    isProfileModalOpen,
    closeProfileModal,
    updateProfile,
    openChangePasswordModal
  } = useRole()

  const [title, setTitle] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENT)
  const [position, setPosition] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [isCropOpen, setIsCropOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('avatar.jpg')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const prevOpenRef = useRef(false)
  const currentLoadedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isProfileModalOpen) {
      if (!prevOpenRef.current || currentLoadedUserIdRef.current !== currentUser?.user_id) {
        if (currentUser) {
          const split = splitFullName(currentUser.name || '')
          setTitle(currentUser.title || '')
          setGender(currentUser.gender || '')
          setFirstName(currentUser.first_name || split.firstName)
          setLastName(currentUser.last_name || split.lastName)
          setDepartment(currentUser.department || DEFAULT_DEPARTMENT)
          setPosition(currentUser.position || '')
          setAvatarUrl(currentUser.avatar_url || PRESET_AVATARS[0])
          setErrorMsg('')
          setSuccessMsg('')
          currentLoadedUserIdRef.current = currentUser.user_id
        }
      }
    }
    prevOpenRef.current = isProfileModalOpen
  }, [isProfileModalOpen, currentUser?.user_id])

  if (!isProfileModalOpen || !currentUser) return null

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('ขนาดรูปภาพต้องไม่เกิน 8MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropImageSrc(event.target.result as string)
        setCropFileName(file.name)
        setIsCropOpen(true)
      }
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleOpenCropCurrent = () => {
    if (avatarUrl) {
      setCropImageSrc(avatarUrl)
      setCropFileName('current-avatar.jpg')
      setIsCropOpen(true)
    }
  }

  const handleCropComplete = async (croppedFile: File, previewUrl: string) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const uploadRes = await uploadFileToStorage(croppedFile, {
        folder: 'avatars',
        subfolder: currentUser.user_id,
        fileName: croppedFile.name
      })

      if (uploadRes.success && uploadRes.url) {
        if (avatarUrl && avatarUrl.includes('/OKR-files/')) {
          deleteFileFromStorage(avatarUrl)
        }
        setAvatarUrl(uploadRes.url)
        setSuccessMsg('ตัดขอบและอัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว')
        setTimeout(() => setSuccessMsg(''), 3000)
      } else {
        setAvatarUrl(previewUrl)
        setSuccessMsg('ตัดขอบรูปโปรไฟล์เรียบร้อยแล้ว')
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err: any) {
      setAvatarUrl(previewUrl)
      setSuccessMsg('ตัดขอบรูปโปรไฟล์เรียบร้อยแล้ว')
      setTimeout(() => setSuccessMsg(''), 3000)
    } finally {
      setLoading(false)
    }
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
      title: title.trim() || undefined,
      gender: (gender as any) || undefined,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      name: `${title ? title.trim() + ' ' : ''}${firstName.trim()} ${lastName.trim()}`.trim(),
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

  const roleInfo = getRoleBadge(currentUser.role)

  return (
    <div
      onClick={closeProfileModal}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 relative my-8 mobile-modal-sheet animate-slide-up max-h-[92dvh]"
      >

        <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] p-6 sm:p-7 text-white relative">
          <button
            onClick={closeProfileModal}
            type="button"
            className="absolute right-5 top-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            ✕
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-sky-200 shadow-inner">
              <User className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-sky-200 uppercase tracking-wider">
                ข้อมูลส่วนตัว (User Profile)
              </span>
              <h3 className="text-xl sm:text-2xl font-black mt-0.5">
                โปรไฟล์และข้อมูลผู้ใช้งาน
              </h3>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">

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

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">

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

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[#003B71] text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูปเอง</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleOpenCropCurrent}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title="ปรับตำแหน่งและตัดขอบรูปภาพนี้"
                  >
                    <Crop className="w-3.5 h-3.5 text-sky-600" />
                    <span>ตัดขอบรูป</span>
                  </button>
                )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                เพศ (Gender)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      gender === g.value
                        ? g.value === 'male'
                          ? 'bg-blue-50 text-[#003B71] border-[#003B71] ring-2 ring-[#003B71]/20'
                          : 'bg-pink-50 text-pink-700 border-pink-400 ring-2 ring-pink-300/30'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>{g.symbol}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                ยศ / คำนำหน้าชื่อ
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#003B71]"
              >
                <option value="">-- ไม่ระบุ --</option>
                {TITLE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                นามสกุล (Last Name) *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ใจดี"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#003B71]" />
                <span>ภาควิชา / หน่วยงาน</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
              >
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#003B71]" />
                <span>ตำแหน่งงาน</span>
              </label>
              <input
                type="text"
                placeholder="เช่น อาจารย์ประจำภาควิชา"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                อีเมลผู้ใช้:
              </span>
              <span className="font-bold text-slate-900">{currentUser.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-400" />
                บทบาทในระบบ:
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>

            <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500 text-xs sm:text-sm">ความปลอดภัยของบัญชี:</span>
              <button
                type="button"
                onClick={() => {
                  closeProfileModal()
                  openChangePasswordModal()
                }}
                className="text-xs sm:text-sm font-bold text-[#003B71] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>เปลี่ยนรหัสผ่าน (Change Password)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeProfileModal}
              className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#003B71]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      <AvatarCropModal
        isOpen={isCropOpen}
        imageSrc={cropImageSrc}
        fileName={cropFileName}
        onClose={() => {
          setIsCropOpen(false)
          setCropImageSrc(null)
        }}
        onCrop={handleCropComplete}
      />
    </div>
  )
}
