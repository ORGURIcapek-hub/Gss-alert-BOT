'use client'

import React, { useState } from 'react'
import { ProjectWithHeadAndAssignees } from '@/types/database.types'
import { Search, Eye, Plus, AlertCircle, CheckCircle2, Clock, PauseCircle } from 'lucide-react'
import { mockDepartments } from '@/lib/mock-data'
import { useRole } from '@/components/RoleContext'

interface ProjectTableProps {
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateModal: () => void
}

export function ProjectTable({ projects, onSelectProject, onOpenCreateModal }: ProjectTableProps) {
  const { currentRole } = useRole()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('ทั้งหมด')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.head && `${p.head.first_name} ${p.head.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.department.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDept = selectedDept === 'ทั้งหมด' || p.department === selectedDept
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus

    return matchesSearch && matchesDept && matchesStatus
  })

  const getStatusBadge = (status: string, bottleneck: string | null) => {
    if (bottleneck && bottleneck.length > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3 h-3" />
          ติดปัญหา
        </span>
      )
    }
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            สำเร็จ
          </span>
        )
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Clock className="w-3 h-3" />
            ดำเนินการ
          </span>
        )
      case 'Delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            ล่าช้า
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <PauseCircle className="w-3 h-3" />
            ร่าง
          </span>
        )
    }
  }

  const canCreate = currentRole ? ['admin', 'head_okr', 'executive'].includes(currentRole) : false

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-white/10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            โครงการและภารกิจ OKR
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-sky-500/20 text-sky-300 font-semibold">
              {filteredProjects.length}
            </span>
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาโครงการ, อาจารย์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input rounded-xl pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="glass-input rounded-xl px-2.5 py-1.5 text-xs cursor-pointer bg-slate-900 flex-1 sm:flex-none"
            >
              {mockDepartments.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-white">
                  {d.replace('ภาควิชา', '')}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="glass-input rounded-xl px-2.5 py-1.5 text-xs cursor-pointer bg-slate-900 flex-1 sm:flex-none"
            >
              <option value="all" className="bg-slate-900 text-white">ทุกสถานะ</option>
              <option value="In Progress" className="bg-slate-900 text-white">กำลังดำเนินการ</option>
              <option value="Completed" className="bg-slate-900 text-white">สำเร็จ</option>
              <option value="Delayed" className="bg-slate-900 text-white">ล่าช้า/ติดปัญหา</option>
            </select>

            {canCreate && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-primary transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เพิ่มโครงการ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="block lg:hidden space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            ไม่พบโครงการตามเงื่อนไขที่เลือก
          </div>
        ) : (
          filteredProjects.map((p) => {
            const headName = p.head ? `${p.head.first_name} ${p.head.last_name}` : 'ไม่ระบุ'
            return (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 active:bg-sky-500/10 transition-all flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-sky-400 font-semibold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                      {p.department.replace('ภาควิชา', '')}
                    </span>
                    <h3 className="text-xs font-bold text-white mt-1.5 leading-snug">
                      {p.project_name}
                    </h3>
                  </div>
                  {getStatusBadge(p.status, p.bottleneck)}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>ผู้รับผิดชอบ: <b className="text-slate-200">{headName}</b></span>
                  <span>งบ: <b className="text-white">{(Number(p.budget) / 1000).toLocaleString()}k</b></span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>ความก้าวหน้า</span>
                    <span className="text-sky-400 font-bold">{p.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        p.progress_percentage === 100
                          ? 'bg-emerald-400'
                          : p.bottleneck
                          ? 'bg-rose-500'
                          : 'bg-sky-400'
                      }`}
                      style={{ width: `${p.progress_percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden lg:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-white/[0.02]">
              <th className="py-3 px-4">ชื่อโครงการ OKR</th>
              <th className="py-3 px-4">ผู้รับผิดชอบ</th>
              <th className="py-3 px-4">ภาควิชา</th>
              <th className="py-3 px-4">งบประมาณ / เบิกจ่าย</th>
              <th className="py-3 px-4 min-w-[140px]">ความก้าวหน้า</th>
              <th className="py-3 px-4">สถานะ</th>
              <th className="py-3 px-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  ไม่พบโครงการตามเงื่อนไขที่เลือก
                </td>
              </tr>
            ) : (
              filteredProjects.map((p) => {
                const headName = p.head ? `${p.head.first_name} ${p.head.last_name}` : 'ไม่ระบุ'
                return (
                  <tr
                    key={p.project_id}
                    onClick={() => onSelectProject(p)}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white group-hover:text-sky-300 transition-colors max-w-xs truncate">
                      {p.project_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 truncate max-w-[140px]">
                      {headName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
                        {p.department.replace('ภาควิชา', '')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="font-semibold text-white">
                        {(Number(p.budget) / 1000).toLocaleString()}k ฿
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ใช้ {(Number(p.spent_amount) / 1000).toLocaleString()}k
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-white">{p.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            p.progress_percentage === 100
                              ? 'bg-emerald-400'
                              : p.bottleneck
                              ? 'bg-rose-500'
                              : 'bg-sky-400'
                          }`}
                          style={{ width: `${Math.min(Number(p.progress_percentage), 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(p.status, p.bottleneck)}
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectProject(p)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 transition-all border border-white/10"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
