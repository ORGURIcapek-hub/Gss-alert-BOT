'use client'

import React, { useState, useEffect } from 'react'
import { useRole } from '@/components/RoleContext'
import { UserRole, UserProfile } from '@/types/database.types'
import { usePasswordReveal } from '@/components/ui/usePasswordReveal'
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Building2,
  Mail,
  User,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'
import { PasswordCell } from '@/components/ui/PasswordCell'
import {
  ROLE_OPTIONS,
  getRoleBadge,
  getGenderBadge,
  filterUsersBySearchQuery,
  getUserFullName,
  formatThaiDate
} from '@/lib/user-constants'

export function AdminPendingApprovals() {
  const { allUsers, pendingUsers, approveUser, rejectUser, refreshUsers } = useRole()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'pending' | 'approved'>('pending')
  const [selectedRoleOverrides, setSelectedRoleOverrides] = useState<Record<string, UserRole>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshUsers(true)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    refreshUsers(true)
  }, [refreshUsers])

  const {
    revealedPasswords,
    showAllPasswords,
    copiedId,
    toggleRevealPassword,
    handleCopyPassword,
    setShowAllPasswords
  } = usePasswordReveal()

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    action: 'approve' | 'reject'
    user: UserProfile | null
  }>({
    isOpen: false,
    action: 'approve',
    user: null
  })

  const approvedUsers = allUsers.filter(u => (u.status || 'approved') === 'approved')
  const rejectedUsers = allUsers.filter(u => u.status === 'rejected')
  const approvedUsersCount = approvedUsers.length
  const rejectedUsersCount = rejectedUsers.length

  const filteredPending = filterUsersBySearchQuery(pendingUsers, searchQuery)
  const filteredApproved = filterUsersBySearchQuery(approvedUsers, searchQuery)

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setSelectedRoleOverrides(prev => ({ ...prev, [userId]: newRole }))
  }

  const handleOpenConfirm = (user: UserProfile, action: 'approve' | 'reject') => {
    setConfirmModal({
      isOpen: true,
      action,
      user
    })
  }

  const handleConfirmAction = async () => {
    if (!confirmModal.user) return
    const user = confirmModal.user
    const action = confirmModal.action
    setProcessingId(user.user_id)
    setConfirmModal({ isOpen: false, action: 'approve', user: null })

    try {
      if (action === 'approve') {
        const assignedRole = selectedRoleOverrides[user.user_id] || user.role
        const res = await approveUser(user.user_id, assignedRole)
        if (res.success) {
          setNotification({
            type: 'success',
            message: `อนุมัติสิทธิ์สำหรับ ${getUserFullName(user)} เรียบร้อยแล้ว (บทบาท: ${getRoleBadge(assignedRole).label})`
          })
          setViewMode('approved')
        } else {
          setNotification({
            type: 'error',
            message: res.error || 'เกิดข้อผิดพลาดในการอนุมัติ'
          })
        }
      } else {
        const res = await rejectUser(user.user_id)
        if (res.success) {
          setNotification({
            type: 'success',
            message: `ปฏิเสธคำขอสมัครของ ${getUserFullName(user)} เรียบร้อยแล้ว`
          })
        } else {
          setNotification({
            type: 'error',
            message: res.error || 'เกิดข้อผิดพลาดในการปฏิเสธ'
          })
        }
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'เกิดข้อผิดพลาดในการดำเนินการ'
      })
    } finally {
      setProcessingId(null)
      setTimeout(() => {
        setNotification(null)
      }, 4000)
    }
  }

  return (
    <div className="space-y-6">

      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-all ${notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="flex-1">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setViewMode('pending')}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${viewMode === 'pending'
              ? 'border-amber-400 ring-2 ring-amber-300 shadow-amber-500/10'
              : 'border-slate-200 hover:border-slate-300'
            }`}
        >
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">รอการอนุมัติ</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{pendingUsers.length} รายการ</div>
            <div className="text-xs text-slate-500 mt-1">ผู้ใช้ลงทะเบียนผ่าน Sign Up</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setViewMode('approved')}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${viewMode === 'approved'
              ? 'border-emerald-400 ring-2 ring-emerald-300 shadow-emerald-500/10'
              : 'border-slate-200 hover:border-slate-300'
            }`}
        >
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">อนุมัติแล้วในระบบ</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{approvedUsersCount} บัญชี</div>
            <div className="text-xs text-slate-500 mt-1">ใช้งานระบบได้ตามปกติ (คลิกเพื่อดูรายชื่อ)</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">ปฏิเสธคำขอ</div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{rejectedUsersCount} รายการ</div>
            <div className="text-xs text-slate-500 mt-1">ไม่อนุญาตให้เข้าสู่ระบบ</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center p-1 bg-slate-200/70 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'pending'
                      ? 'bg-white text-[#003B71] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>รอการตรวจสอบสิทธิ์</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                    {pendingUsers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'approved'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>อนุมัติแล้วในระบบ</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    {approvedUsersCount}
                  </span>
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {viewMode === 'pending'
                ? 'ตรวจสอบข้อมูลและรหัสผ่านของผู้สมัคร แล้วคลิกอนุมัติเพื่อให้ผู้ใช้สามารถล็อกอินเข้าสู่ระบบได้'
                : 'รายชื่อผู้ใช้งานทั้งหมดที่ได้รับการอนุมัติและสามารถเข้าสู่ระบบเพื่อปฏิบัติงานได้'}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm bg-white hover:bg-slate-100 text-[#003B71] border-slate-300 disabled:opacity-50"
              title="ดึงข้อมูลคำขอสิทธิ์ล่าสุดจากเซิร์ฟเวอร์"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#003B71] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}</span>
            </button>

            <button
              onClick={() => setShowAllPasswords(!showAllPasswords)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${showAllPasswords
                  ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              title="สลับการแสดงรหัสผ่านของทุกคน"
            >
              {showAllPasswords ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{showAllPasswords ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}</span>
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, อีเมล, หรือภาควิชา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71]"
              />
            </div>
          </div>
        </div>

        {viewMode === 'pending' && (
          filteredPending.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                ไม่มีคำขอสมัครสมาชิกรอการอนุมัติในขณะนี้
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                ทุกคำขอได้รับการอนุมัติเรียบร้อยแล้ว เมื่อมีผู้ใช้งานสมัครสมาชิกใหม่ผ่านหน้า Sign Up รายชื่อจะปรากฏที่นี่ทันที
              </p>
              <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'กำลังโหลดคำขอใหม่...' : 'ตรวจสอบคำขอใหม่อีกครั้ง'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('approved')}
                  className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ดูรายชื่อผู้ใช้งานที่อนุมัติแล้ว ({approvedUsersCount} บัญชี)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-4">ข้อมูลผู้สมัคร</th>
                    <th className="py-4 px-4">หน่วยงาน / ตำแหน่ง</th>
                    <th className="py-4 px-4">บทบาทที่ขอสมัคร</th>
                    <th className="py-4 px-4">รหัสผ่านที่ตั้ง (Password)</th>
                    <th className="py-4 px-4">กำหนดสิทธิ์ให้ (Role Grant)</th>
                    <th className="py-4 px-4">วันที่สมัคร</th>
                    <th className="py-4 px-4 text-right">ดำเนินการ (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredPending.map((user) => {
                    const reqRoleInfo = getRoleBadge(user.role)
                    const chosenRole = selectedRoleOverrides[user.user_id] || user.role
                    const isProcessing = processingId === user.user_id
                    const isPasswordVisible = showAllPasswords || revealedPasswords[user.user_id]
                    const userPassword = user.password || 'password123'

                    return (
                      <tr key={user.user_id} className="hover:bg-slate-50/80 transition-colors">

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={getUserFullName(user)}
                              className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm"
                            />
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {getUserFullName(user)}
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-600 text-xs mt-0.5 font-medium">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>{user.email}</span>
                                {user.username && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-700 font-mono font-semibold">@{user.username}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {user.gender && (() => {
                                  const gb = getGenderBadge(user.gender)
                                  return (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${gb.badgeClass}`}>
                                      <span>{gb.icon}</span>
                                      <span>{gb.label}</span>
                                    </span>
                                  )
                                })()}
                                {user.title && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {user.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                            <Building2 className="w-4 h-4 text-[#003B71]" />
                            <span>{user.department}</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 font-medium">
                            {user.position || 'บุคลากรประจำภาควิชา'}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${reqRoleInfo.color}`}>
                            <reqRoleInfo.icon className="w-3.5 h-3.5" />
                            <span>{reqRoleInfo.label}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <PasswordCell
                            userId={user.user_id}
                            password={userPassword}
                            isVisible={isPasswordVisible}
                            isCopied={copiedId === user.user_id}
                            onToggleReveal={toggleRevealPassword}
                            onCopy={handleCopyPassword}
                          />
                        </td>

                        <td className="py-4 px-4">
                          <select
                            value={chosenRole}
                            onChange={(e) => handleRoleChange(user.user_id, e.target.value as UserRole)}
                            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 font-bold focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71] cursor-pointer"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-4 px-4 text-slate-600 text-xs font-medium">
                          {user.created_at ? formatThaiDate(user.created_at, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'เพิ่งสมัคร'}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenConfirm(user, 'approve')}
                              disabled={isProcessing}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="อนุมัติสิทธิ์ให้เข้าใช้งาน"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>อนุมัติ</span>
                            </button>

                            <button
                              onClick={() => handleOpenConfirm(user, 'reject')}
                              disabled={isProcessing}
                              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="ปฏิเสธคำขอสมัคร"
                            >
                              <UserX className="w-4 h-4" />
                              <span>ปฏิเสธ</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {viewMode === 'approved' && (
          filteredApproved.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <p className="text-xs text-slate-500">ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-4">ข้อมูลผู้ใช้งาน</th>
                    <th className="py-4 px-4">หน่วยงาน / ตำแหน่ง</th>
                    <th className="py-4 px-4">บทบาทที่ได้รับอนุมัติ</th>
                    <th className="py-4 px-4">รหัสผ่าน (Password)</th>
                    <th className="py-4 px-4">วันที่ลงทะเบียน / อนุมัติ</th>
                    <th className="py-4 px-4 text-right">สถานะบัญชี</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredApproved.map((user) => {
                    const roleInfo = getRoleBadge(user.role)
                    const isPasswordVisible = showAllPasswords || revealedPasswords[user.user_id]
                    const userPassword = user.password || 'password123'

                    return (
                      <tr key={user.user_id} className="hover:bg-slate-50/80 transition-colors">

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={getUserFullName(user)}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                            />
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {getUserFullName(user)}
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-600 text-xs mt-0.5 font-medium">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>{user.email}</span>
                                {user.username && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-700 font-mono font-semibold">@{user.username}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {user.gender && (() => {
                                  const gb = getGenderBadge(user.gender)
                                  return (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${gb.badgeClass}`}>
                                      <span>{gb.icon}</span>
                                      <span>{gb.label}</span>
                                    </span>
                                  )
                                })()}
                                {user.title && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {user.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                            <Building2 className="w-4 h-4 text-[#003B71]" />
                            <span>{user.department}</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 font-medium">
                            {user.position || 'บุคลากรประจำภาควิชา'}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleInfo.color}`}>
                            <roleInfo.icon className="w-3.5 h-3.5" />
                            <span>{roleInfo.label}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <PasswordCell
                            userId={user.user_id}
                            password={userPassword}
                            isVisible={isPasswordVisible}
                            isCopied={copiedId === user.user_id}
                            onToggleReveal={toggleRevealPassword}
                            onCopy={handleCopyPassword}
                          />
                        </td>

                        <td className="py-4 px-4 text-slate-600 text-xs font-medium">
                          {user.updated_at || user.created_at ? formatThaiDate(user.updated_at || user.created_at, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>อนุมัติแล้ว (ใช้งานได้ปกติ)</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {confirmModal.isOpen && confirmModal.user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${confirmModal.action === 'approve'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}>
              {confirmModal.action === 'approve' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <UserX className="w-6 h-6" />
              )}
            </div>

            <h3 className="text-lg font-black text-slate-900">
              {confirmModal.action === 'approve' ? 'ยืนยันการอนุมัติสิทธิ์ผู้ใช้งาน' : 'ยืนยันการปฏิเสธคำขอสมัคร'}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              {confirmModal.action === 'approve' ? (
                <>
                  คุณต้องการอนุมัติสิทธิ์ให้กับ{' '}
                  <span className="font-bold text-slate-900">
                    {getUserFullName(confirmModal.user)}
                  </span>{' '}
                  ในบทบาท{' '}
                  <span className="font-bold text-[#003B71]">
                    {getRoleBadge(selectedRoleOverrides[confirmModal.user.user_id] || confirmModal.user.role).label}
                  </span>{' '}
                  ใช่หรือไม่? ผู้ใช้จะสามารถล็อกอินเข้าสู่ระบบได้ทันที
                </>
              ) : (
                <>
                  คุณต้องการปฏิเสธคำขอสมัครของ{' '}
                  <span className="font-bold text-slate-900">
                    {getUserFullName(confirmModal.user)}
                  </span>{' '}
                  ใช่หรือไม่? ผู้ใช้นี้จะไม่สามารถล็อกอินเข้าสู่ระบบได้
                </>
              )}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, action: 'approve', user: null })}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${confirmModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
              >
                {confirmModal.action === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
