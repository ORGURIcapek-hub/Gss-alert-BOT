'use client'

import React from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { ShieldCheck, Plus, Users, Lock, Key, Server, FileText, ArrowRight } from 'lucide-react'
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
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-navy-900/60 to-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shadow-glow-primary flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Super Admin Control Center
              </span>
              <span className="text-xs text-rose-400 font-semibold">สิทธิ์ระดับผู้ดูแลระบบสูงสุด</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
              แผงควบคุมระบบและสิทธิ์การเข้าถึงความปลอดภัย (RBAC)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              จัดการผู้ใช้งาน, กำหนดบทบาท, ดูแลความปลอดภัยของฐานข้อมูล Supabase และจัดการ OKR ทุกระดับ
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold shadow-glow-primary transition-all active:scale-95 flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างโครงการในฐานะ Admin</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">PostgreSQL RLS</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-400">Enforced</div>
          <span className="text-[10px] text-slate-400">6 ตารางหลักถูกจำกัดสิทธิ์</span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Admin Connection</span>
            <Key className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-400">Service Role</div>
          <span className="text-[10px] text-slate-400">Isolated Backend Only</span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">โครงการทั้งหมด</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-white">{projects.length} โครงการ</div>
          <span className="text-[10px] text-sky-300">ทุกภาควิชาในคณะ</span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">เป้าหมายหลัก OKR</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-white">{okrs.length} เป้าหมาย</div>
          <span className="text-[10px] text-purple-300">ปี 2566 - 2567</span>
        </div>
      </div>

      <AdminUserManagement />
    </div>
  )
}
