'use client'

import React, { useState } from 'react'
import { UserProfile, UserRole } from '@/types/database.types'
import { Shield, Check, Lock, Search } from 'lucide-react'
import { updateUserRoleRecord } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'

export function AdminUserManagement() {
  const { allUsers, refreshUsers } = useRole()
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId)
    await updateUserRoleRecord(userId, newRole)
    await refreshUsers()
    setUpdatingId(null)
  }

  const filteredUsers = allUsers.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'admin', label: 'ผู้ดูแลระบบ (Admin)' },
    { value: 'executive', label: 'ผู้บริหารระดับสูง (Executive)' },
    { value: 'head_okr', label: 'หัวหน้า OKR (Head OKR)' },
    { value: 'teacher', label: 'อาจารย์ผู้รับผิดชอบ (Teacher)' },
    { value: 'staff', label: 'บุคลากรทั่วไป (Staff)' }
  ]

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#003B71]" />
            การจัดการสิทธิ์และบทบาทผู้ใช้งาน (RBAC Panel)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            กำหนดบทบาทและสิทธิ์การเข้าถึงข้อมูลตามมาตรฐาน Row Level Security (RLS)
          </p>
        </div>

        <div className="relative min-w-[260px]">
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

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
              <th className="py-3.5 px-4 rounded-l-xl">ชื่อ - นามสกุล</th>
              <th className="py-3.5 px-4">อีเมลมหาวิทยาลัย</th>
              <th className="py-3.5 px-4">ภาควิชา / หน่วยงาน</th>
              <th className="py-3.5 px-4">ตำแหน่งงาน</th>
              <th className="py-3.5 px-4">บทบาทในระบบ (Role)</th>
              <th className="py-3.5 px-4 text-center rounded-r-xl">สถานะ RLS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredUsers.map((u) => {
              return (
                <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
                      />
                      <span>{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                    {u.email}
                  </td>
                  <td className="py-4 px-4 text-slate-700 font-medium">
                    {u.department}
                  </td>
                  <td className="py-4 px-4 text-slate-700 font-medium">
                    {u.position || '-'}
                  </td>
                  <td className="py-4 px-4">
                    <select
                      value={u.role}
                      disabled={updatingId === u.user_id}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value as UserRole)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs cursor-pointer text-[#003B71] font-bold focus:bg-white focus:outline-none focus:border-[#003B71]"
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Lock className="w-3 h-3" /> Protected
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
