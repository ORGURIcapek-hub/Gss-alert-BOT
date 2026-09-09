'use client'

import React, { useState } from 'react'
import { ProjectWithHeadAndAssignees } from '@/types/database.types'
import { Search, Eye, Plus, AlertCircle, CheckCircle2, Clock, PauseCircle, Users } from 'lucide-react'
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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5" />
          ติดปัญหา
        </span>
      )
    }
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            สำเร็จ
          </span>
        )
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-[#003B71] border border-sky-200">
            <Clock className="w-3.5 h-3.5" />
            ดำเนินการ
          </span>
        )
      case 'Delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            ล่าช้า
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
            <PauseCircle className="w-3.5 h-3.5" />
            ร่าง
          </span>
        )
    }
  }

  const canCreate = currentRole ? ['admin', 'head_okr', 'executive'].includes(currentRole) : false

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            โครงการและภารกิจ OKR
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-sky-50 text-[#003B71] font-bold border border-sky-200">
              {filteredProjects.length}
            </span>
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาโครงการ, อาจารย์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#003B71]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
            >
              {mockDepartments.map((d) => (
                <option key={d} value={d}>
                  {d.replace('ภาควิชา', '')}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="In Progress">ดำเนินการ</option>
              <option value="Completed">สำเร็จ</option>
              <option value="Delayed">ล่าช้า</option>
            </select>

            {canCreate && (
              <button
                onClick={onOpenCreateModal}
                className="px-3.5 py-2 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">เพิ่มโครงการ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider bg-slate-50/80">
              <th className="py-4 px-4 rounded-l-2xl">ชื่อโครงการ</th>
              <th className="py-4 px-4">หน่วยงาน / ภาควิชา</th>
              <th className="py-4 px-4">หัวหน้าโครงการ</th>
              <th className="py-4 px-4 text-center">งบประมาณ</th>
              <th className="py-4 px-4">ความก้าวหน้า</th>
              <th className="py-4 px-4 text-center">สถานะ</th>
              <th className="py-4 px-4 text-right rounded-r-2xl">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredProjects.map((p) => {
              const headName = p.head ? `${p.head.first_name} ${p.head.last_name}` : 'ไม่ระบุ'
              return (
                <tr
                  key={p.project_id}
                  onClick={() => onSelectProject(p)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 max-w-sm">{p.project_name}</div>
                    <span className="text-xs text-slate-500 font-medium">{p.project_type}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-800 font-semibold text-sm">
                    {p.department.replace('ภาควิชา', '')}
                  </td>
                  <td className="py-4 px-4 text-slate-800 font-semibold text-sm">
                    {headName}
                  </td>
                  <td className="py-4 px-4 text-center font-extrabold text-slate-900 text-sm">
                    {(Number(p.budget) / 1000).toLocaleString()}k ฿
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-800">{p.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#003B71] h-2 rounded-full"
                          style={{ width: `${p.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(p.status, p.bottleneck)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectProject(p)
                      }}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#003B71] transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="ดูรายละเอียดโครงการ"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
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
