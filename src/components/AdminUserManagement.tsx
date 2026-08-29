'use client'

import React, { useState } from 'react'
import { UserProfile, UserRole } from '@/types/database.types'
import { Shield, Check, Lock, Unlock, UserCheck, Search } from 'lucide-react'
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
    <div className="glass-panel rounded-2xl p-6 border border-white/10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-400" />
            การจัดการสิทธิ์และบทบาทผู้ใช้งาน (RBAC Panel)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            กำหนดบทบาทและสิทธิ์การเข้าถึงข้อมูลตามมาตรฐาน Row Level Security (RLS)
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่ออาจารย์, อีเมล, ภาควิชา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-white/[0.02]">
              <th className="py-3 px-4">ชื่อ - นามสกุล</th>
              <th className="py-3 px-4">อีเมลมหาวิทยาลัย</th>
              <th className="py-3 px-4">ภาควิชา / หน่วยงาน</th>
              <th className="py-3 px-4">ตำแหน่งงาน</th>
              <th className="py-3 px-4">บทบาทในระบบ (Role)</th>
              <th className="py-3 px-4 text-center">สถานะ RLS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filteredUsers.map((u) => {
              return (
                <tr key={u.user_id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-4 text-white font-medium">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover border border-white/15"
                      />
                      <span>{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {u.email}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {u.department}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {u.position || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={u.role}
                      disabled={updatingId === u.user_id}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value as UserRole)}
                      className="glass-input rounded-lg px-2.5 py-1 text-xs cursor-pointer bg-slate-900 text-sky-300 font-semibold focus:outline-none"
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
