'use client'

import React, { useState } from 'react'
import { UserProfile, UserRole } from '@/types/database.types'
import { Shield, Search, Trash2, AlertTriangle, X, Loader2, CheckCircle2, Eye, EyeOff, Clock } from 'lucide-react'
import { updateUserRoleRecord } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'
import { usePasswordReveal } from '@/components/ui/usePasswordReveal'
import { PasswordCell } from '@/components/ui/PasswordCell'
import { ROLE_OPTIONS, filterUsersBySearchQuery, getUserFullName } from '@/lib/user-constants'

export function AdminUserManagement() {
  const { currentUser, allUsers, pendingUsers, deleteUser, refreshUsers } = useRole()
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    revealedPasswords,
    showAllPasswords,
    copiedId,
    toggleRevealPassword,
    handleCopyPassword,
    setShowAllPasswords
  } = usePasswordReveal()

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId)
    await updateUserRoleRecord(userId, newRole)
    await refreshUsers()
    setUpdatingId(null)
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    const targetUser = userToDelete
    setDeletingId(targetUser.user_id)
    setDeleteError(null)
    try {
      const res = await deleteUser(targetUser.user_id)
      if (res.success) {
        setDeleteSuccess(`ลบผู้ใช้งาน "${getUserFullName(targetUser)}" ออกจากระบบเรียบร้อยแล้ว`)
        setUserToDelete(null)
        setTimeout(() => setDeleteSuccess(null), 3500)
      } else {
        setDeleteError(res.error || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน')
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredUsers = filterUsersBySearchQuery(allUsers, searchTerm)

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#003B71]" />
            การจัดการสิทธิ์และบทบาทผู้ใช้งาน (RBAC Panel)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            กำหนดบทบาท ตรวจสอบรหัสผ่าน และสิทธิ์การเข้าถึงข้อมูลตามมาตรฐาน Row Level Security (RLS)
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setShowAllPasswords(!showAllPasswords)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              showAllPasswords
                ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="สลับการแสดงรหัสผ่านของผู้ใช้งานทุกคน"
          >
            {showAllPasswords ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
            <span>{showAllPasswords ? 'ซ่อนรหัสผ่านทั้งหมด' : 'แสดงรหัสผ่านทุกคน'}</span>
          </button>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่ออาจารย์, อีเมล, ภาควิชา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#003B71]"
            />
          </div>
        </div>
      </div>

      {deleteSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{deleteSuccess}</span>
          </div>
          <button onClick={() => setDeleteSuccess(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {pendingUsers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-amber-950">มีผู้สมัครสมาชิกรอการอนุมัติสิทธิ์ {pendingUsers.length} บัญชี</span>
              <p className="text-xs text-amber-700 font-medium">กรุณาตรวจสอบและอนุมัติสิทธิ์การเข้าใช้งานที่เมนู &quot;อนุมัติผู้สมัครใหม่&quot;</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold w-fit">
            {pendingUsers.length} รายการรอพิจารณา
          </span>
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider bg-slate-50/80">
              <th className="py-4 px-4 rounded-l-2xl">Username</th>
              <th className="py-4 px-4">ชื่อ - นามสกุล</th>
              <th className="py-4 px-4">อีเมลมหาวิทยาลัย</th>
              <th className="py-4 px-4">ภาควิชา / หน่วยงาน</th>
              <th className="py-4 px-4">ตำแหน่งงาน</th>
              <th className="py-4 px-4">บทบาทในระบบ (Role)</th>
              <th className="py-4 px-4">รหัสผ่าน (Password)</th>
              <th className="py-4 px-4 text-center rounded-r-2xl">จัดการ / ลบ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredUsers.map((u) => {
              const isCurrentUser = currentUser?.user_id === u.user_id
              const isPasswordVisible = showAllPasswords || revealedPasswords[u.user_id]
              const userPassword = u.password || 'password123'

              return (
                <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm flex-shrink-0"
                      />
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
                        {u.username || u.email.split('@')[0]}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-900 text-sm sm:text-base">
                    {getUserFullName(u)}
                  </td>
                  <td className="py-4 px-4 text-slate-700 font-medium text-sm">
                    {u.email}
                  </td>
                  <td className="py-4 px-4 text-slate-800 font-semibold text-sm">
                    {u.department}
                  </td>
                  <td className="py-4 px-4 text-slate-700 font-medium text-sm">
                    {u.position || '-'}
                  </td>
                  <td className="py-4 px-4">
                    <select
                      value={u.role}
                      disabled={updatingId === u.user_id}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value as UserRole)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm cursor-pointer text-[#003B71] font-bold focus:bg-white focus:outline-none focus:border-[#003B71]"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Admin Password Inspection Column */}
                  <td className="py-4 px-4">
                    <PasswordCell
                      userId={u.user_id}
                      password={userPassword}
                      isVisible={isPasswordVisible}
                      isCopied={copiedId === u.user_id}
                      onToggleReveal={toggleRevealPassword}
                      onCopy={handleCopyPassword}
                    />
                  </td>

                  <td className="py-4 px-4 text-center">
                    {isCurrentUser ? (
                      <span className="text-xs text-slate-400 font-semibold px-3 py-1 bg-slate-100 rounded-lg" title="ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่">
                        บัญชีปัจจุบัน
                      </span>
                    ) : (
                      <button
                        onClick={() => setUserToDelete(u)}
                        disabled={deletingId === u.user_id}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                        title="ลบผู้ใช้งานออกจากระบบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for deleting user */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 relative space-y-5">
            <button
              onClick={() => setUserToDelete(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบผู้ใช้งาน
                </h3>
                <p className="text-xs text-slate-500">
                  การดำเนินการนี้จะลบผู้ใช้งานและยกเลิกสิทธิ์ทั้งหมด
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-3">
                <img
                  src={userToDelete.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {getUserFullName(userToDelete)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {userToDelete.email}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-600 pt-2 border-t border-slate-200/80 flex justify-between">
                <span>ภาควิชา: <b className="text-slate-800">{userToDelete.department}</b></span>
                <span>บทบาท: <b className="text-slate-800">{userToDelete.role}</b></span>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingId !== null ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>ยืนยันลบคนออก</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
