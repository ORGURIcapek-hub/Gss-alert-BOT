'use client'

import React from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { ShieldCheck, Plus, Users, Lock, Key, Server, FileText } from 'lucide-react'
import { AdminUserManagement } from '@/components/AdminUserManagement'

interface AdminWorkspaceProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateModal: () => void
}

export function AdminWorkspace({
  okrs,
  projects,
  onSelectProject,
  onOpenCreateModal
}: AdminWorkspaceProps) {
  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            แผงควบคุมระบบและสิทธิ์การเข้าถึงความปลอดภัย (RBAC)
          </h2>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 self-start sm:self-auto flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>สร้างโครงการในฐานะ Admin</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">PostgreSQL RLS</span>
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">Enforced</div>
          <span className="text-[11px] text-slate-500 font-medium">ตารางหลักถูกจำกัดสิทธิ์</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Admin Connection</span>
            <Key className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">Service Role</div>
          <span className="text-[11px] text-slate-500 font-medium">Isolated Backend Only</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">โครงการทั้งหมด</span>
            <FileText className="w-4 h-4 text-[#003B71]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{projects.length} โครงการ</div>
          <span className="text-[11px] text-[#005B94] font-medium">ทุกหน่วยงานในมหาวิทยาลัย</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">เป้าหมายหลัก OKR</span>
            <Server className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{okrs.length} เป้าหมาย</div>
          <span className="text-[11px] text-purple-700 font-medium">ปี 2566 - 2567</span>
        </div>
      </div>

      <AdminUserManagement />
    </div>
  )
}
