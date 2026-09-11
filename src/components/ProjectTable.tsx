'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { ProjectWithHeadAndAssignees } from '@/types/database.types'
import { Search, Eye, Plus, AlertCircle, CheckCircle2, Clock, PauseCircle, Trash2 } from 'lucide-react'
import { mockDepartments } from '@/lib/mock-data'
import { useRole } from '@/components/RoleContext'
import { getUserFullName, formatDepartmentShort } from '@/lib/user-constants'
import { deleteProjectRecord } from '@/lib/services/okr-service'

interface ProjectTableProps {
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateModal: () => void
  onProjectsRefresh?: () => void
}

// -------------------------------------------------------------
// 1. Status Badge Component (Declarative Lookup)
// -------------------------------------------------------------
interface StatusBadgeProps {
  status: string
  bottleneck: string | null
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  Completed: {
    label: 'สำเร็จ',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  'In Progress': {
    label: 'ดำเนินการ',
    icon: Clock,
    className: 'bg-sky-50 text-[#003B71] border-sky-200'
  },
  Delayed: {
    label: 'ล่าช้า',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-200'
  }
}

export const ProjectStatusBadge = React.memo(function ProjectStatusBadge({ status, bottleneck }: StatusBadgeProps) {
  if (bottleneck && bottleneck.trim().length > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3.5 h-3.5" />
        ติดปัญหา
      </span>
    )
  }

  const config = STATUS_CONFIG[status] || {
    label: 'ร่าง',
    icon: PauseCircle,
    className: 'bg-slate-50 text-slate-700 border-slate-200'
  }
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
})

// -------------------------------------------------------------
// 2. Project Table Row Component (Memoized)
// -------------------------------------------------------------
interface ProjectTableRowProps {
  project: ProjectWithHeadAndAssignees
  canDelete: boolean
  isDeleting: boolean
  onSelect: (p: ProjectWithHeadAndAssignees) => void
  onDelete: (e: React.MouseEvent, p: ProjectWithHeadAndAssignees) => void
}

const ProjectTableRow = React.memo(function ProjectTableRow({
  project,
  canDelete,
  isDeleting,
  onSelect,
  onDelete
}: ProjectTableRowProps) {
  const headName = getUserFullName(project.head)
  const budgetFormatted = (Number(project.budget) / 1000).toLocaleString()

  return (
    <tr
      onClick={() => onSelect(project)}
      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
    >
      <td className="py-4 px-4">
        <div className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 max-w-sm">
          {project.project_name}
        </div>
        <span className="text-xs text-slate-500 font-medium">{project.project_type}</span>
      </td>
      <td className="py-4 px-4 text-slate-800 font-semibold text-sm">
        {formatDepartmentShort(project.department)}
      </td>
      <td className="py-4 px-4 text-slate-800 font-semibold text-sm">
        {headName}
      </td>
      <td className="py-4 px-4 text-center font-extrabold text-slate-900 text-sm">
        {budgetFormatted}k ฿
      </td>
      <td className="py-4 px-4">
        <div className="w-32">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-slate-800">{project.progress_percentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#003B71] h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.progress_percentage}%` }}
            />
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-center">
        <ProjectStatusBadge status={project.status} bottleneck={project.bottleneck} />
      </td>
      <td className="py-4 px-4 text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(project)
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#003B71] transition-colors inline-flex items-center gap-1 cursor-pointer"
            title="ดูรายละเอียดโครงการ"
          >
            <Eye className="w-4 h-4" />
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={(e) => onDelete(e, project)}
              disabled={isDeleting}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 border border-rose-200 hover:border-rose-300 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="ลบโครงการนี้ออกจากระบบ (เฉพาะผู้บริหาร/ผู้ดูแล)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
})

// -------------------------------------------------------------
// 3. Main ProjectTable Component
// -------------------------------------------------------------
export function ProjectTable({ projects, onSelectProject, onOpenCreateModal, onProjectsRefresh }: ProjectTableProps) {
  const { currentRole } = useRole()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('ทั้งหมด')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canDelete = currentRole === 'executive' || currentRole === 'admin'
  const canCreate = currentRole ? ['admin', 'head_okr', 'executive', 'teacher'].includes(currentRole) : false

  const handleDeleteProject = useCallback(async (e: React.MouseEvent, p: ProjectWithHeadAndAssignees) => {
    e.stopPropagation()
    const confirmMessage = `ยืนยันการลบโครงการ "${p.project_name}" หรือไม่?\n\nคำเตือน: ข้อมูลความก้าวหน้า รายละเอียดการใช้เงิน และหลักฐานทั้งหมดจะถูกลบออกจากระบบอย่างถาวร`
    if (!window.confirm(confirmMessage)) return

    setDeletingId(p.project_id)
    try {
      await deleteProjectRecord(p.project_id)
      onProjectsRefresh?.()
    } catch (err: any) {
      alert(err?.message || 'ไม่สามารถลบโครงการได้')
    } finally {
      setDeletingId(null)
    }
  }, [onProjectsRefresh])

  const filteredProjects = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return projects.filter((p) => {
      const matchesSearch =
        !term ||
        (p.project_name || '').toLowerCase().includes(term) ||
        getUserFullName(p.head).toLowerCase().includes(term) ||
        (p.department || '').toLowerCase().includes(term)

      const matchesDept = selectedDept === 'ทั้งหมด' || p.department === selectedDept
      const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus

      return matchesSearch && matchesDept && matchesStatus
    })
  }, [projects, searchTerm, selectedDept, selectedStatus])

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
                  {formatDepartmentShort(d)}
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
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-7 h-7 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">ไม่พบโครงการที่ตรงกับเงื่อนไขการค้นหา</p>
                    <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหา หรือเลือกหน่วยงาน/สถานะอื่น</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProjects.map((p) => (
                <ProjectTableRow
                  key={p.project_id}
                  project={p}
                  canDelete={canDelete}
                  isDeleting={deletingId === p.project_id}
                  onSelect={onSelectProject}
                  onDelete={handleDeleteProject}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
