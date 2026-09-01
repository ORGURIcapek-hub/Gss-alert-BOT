'use client'

import React, { useState } from 'react'
import { useRole } from '@/components/RoleContext'
import { UserRole, UserProfile } from '@/types/database.types'
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Shield,
  Building2,
  Mail,
  User,
  Crown,
  Layers,
  GraduationCap,
  Briefcase
} from 'lucide-react'

export function AdminPendingApprovals() {
  const { allUsers, pendingUsers, approveUser, rejectUser } = useRole()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleOverrides, setSelectedRoleOverrides] = useState<Record<string, UserRole>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
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

  const approvedUsersCount = allUsers.filter(u => (u.status || 'approved') === 'approved').length
  const rejectedUsersCount = allUsers.filter(u => u.status === 'rejected').length

  const filteredPending = pendingUsers.filter(u => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      u.name?.toLowerCase().includes(query) ||
      u.first_name.toLowerCase().includes(query) ||
      u.last_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      u.department.toLowerCase().includes(query)
    )
  })

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'executive':
        return { label: 'ผู้บริหารระดับสูง (Executive)', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Crown }
      case 'head_okr':
        return { label: 'หัวหน้าโครงการ OKR (Head OKR)', color: 'bg-sky-50 text-[#003B71] border-sky-200', icon: Layers }
      case 'teacher':
        return { label: 'อาจารย์ลูกทีม OKR (Teacher)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: GraduationCap }
      case 'staff':
        return { label: 'เจ้าหน้าที่ / บุคลากร (Staff)', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Briefcase }
      case 'admin':
        return { label: 'ผู้ดูแลระบบ (Admin)', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Shield }
      default:
        return { label: role, color: 'bg-slate-50 text-slate-700 border-slate-200', icon: User }
    }
  }

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

    if (action === 'approve') {
      const assignedRole = selectedRoleOverrides[user.user_id] || user.role
      const res = await approveUser(user.user_id, assignedRole)
      if (res.success) {
        setNotification({
          type: 'success',
          message: `อนุมัติสิทธิ์สำหรับ ${user.first_name} ${user.last_name} เรียบร้อยแล้ว (บทบาท: ${getRoleBadge(assignedRole).label})`
        })
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
          message: `ปฏิเสธคำขอสมัครของ ${user.first_name} ${user.last_name} เรียบร้อยแล้ว`
        })
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'เกิดข้อผิดพลาดในการปฏิเสธ'
        })
      }
    }

    setProcessingId(null)
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 flex-shrink-0 shadow-inner">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                Admin Approval Center
              </span>
              <span className="text-xs text-sky-200 font-semibold">ระบบตรวจสอบผู้สมัครสมาชิกใหม่</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
              อนุมัติคำขอสมัครสมาชิก (Sign-Up Approvals)
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              ตรวจสอบรายชื่อผู้ลงทะเบียนใหม่ กำหนดหรือปรับเปลี่ยนสิทธิ์ก่อนอนุมัติเข้าใช้งานระบบ OKR
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3.5 rounded-2xl flex items-center gap-3.5 self-start md:self-auto">
          <Clock className="w-5 h-5 text-amber-300" />
          <div>
            <div className="text-2xl font-black text-white leading-none">{pendingUsers.length}</div>
            <div className="text-[11px] text-sky-200 font-medium mt-1">คำขอรอตรวจสอบ</div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-all ${
            notification.type === 'success'
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">รอการอนุมัติ</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{pendingUsers.length} รายการ</div>
            <div className="text-xs text-slate-500 mt-1">ผู้ใช้ลงทะเบียนผ่าน Sign Up</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">อนุมัติแล้วในระบบ</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{approvedUsersCount} บัญชี</div>
            <div className="text-xs text-slate-500 mt-1">ใช้งานระบบได้ตามปกติ</div>
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

      {/* Main Table / List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#003B71]" />
              <span>รายชื่อผู้สมัครที่รอการตรวจสอบสิทธิ์</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกปุ่มอนุมัติเพื่อให้ผู้ใช้สามารถล็อกอินเข้าใช้งานตามบทบาทที่กำหนด
            </p>
          </div>

          <div className="relative w-full sm:w-72">
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

        {/* Content Section */}
        {filteredPending.length === 0 ? (
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
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ข้อมูลผู้สมัคร</th>
                  <th className="py-3 px-4">หน่วยงาน / ตำแหน่ง</th>
                  <th className="py-3 px-4">บทบาทที่ขอสมัคร</th>
                  <th className="py-3 px-4">กำหนดสิทธิ์ให้ (Role Grant)</th>
                  <th className="py-3 px-4">วันที่สมัคร</th>
                  <th className="py-3 px-4 text-right">ดำเนินการ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPending.map((user) => {
                  const reqRoleInfo = getRoleBadge(user.role)
                  const chosenRole = selectedRoleOverrides[user.user_id] || user.role
                  const isProcessing = processingId === user.user_id

                  return (
                    <tr key={user.user_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={user.first_name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{user.email}</span>
                              {user.username && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-600 font-mono">@{user.username}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Position */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-[#003B71]" />
                          <span>{user.department}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {user.position || 'บุคลากรประจำภาควิชา'}
                        </div>
                      </td>

                      {/* Requested Role */}
                      <td className="py-3.5 px-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${reqRoleInfo.color}`}>
                          <reqRoleInfo.icon className="w-3.5 h-3.5" />
                          <span>{reqRoleInfo.label}</span>
                        </div>
                      </td>

                      {/* Role Selector Override */}
                      <td className="py-3.5 px-4">
                        <select
                          value={chosenRole}
                          onChange={(e) => handleRoleChange(user.user_id, e.target.value as UserRole)}
                          className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71]"
                        >
                          <option value="teacher">🎓 อาจารย์ลูกทีม (Teacher)</option>
                          <option value="head_okr">🎯 หัวหน้าโครงการ (Head OKR)</option>
                          <option value="executive">👑 ผู้บริหาร (Executive)</option>
                          <option value="staff">📋 เจ้าหน้าที่ (Staff)</option>
                          <option value="admin">🛡️ ผู้ดูแลระบบ (Admin)</option>
                        </select>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'เพิ่งสมัคร'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenConfirm(user, 'approve')}
                            disabled={isProcessing}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="อนุมัติสิทธิ์ให้เข้าใช้งาน"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>อนุมัติ</span>
                          </button>

                          <button
                            onClick={() => handleOpenConfirm(user, 'reject')}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="ปฏิเสธคำขอสมัคร"
                          >
                            <UserX className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              confirmModal.action === 'approve'
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
                    {confirmModal.user.first_name} {confirmModal.user.last_name}
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
                    {confirmModal.user.first_name} {confirmModal.user.last_name}
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
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                  confirmModal.action === 'approve'
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
