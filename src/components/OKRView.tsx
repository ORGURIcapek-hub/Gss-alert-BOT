'use client'

import React, { useState } from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { Target, ChevronDown, ChevronRight, Plus, FolderGit2, Calendar, CheckCircle2, Clock, X, Loader2 } from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { getUserFullName, formatDepartmentShort } from '@/lib/user-constants'
import { createOKR } from '@/lib/services/project-service'

interface OKRViewProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateProject: () => void
  onRefresh?: () => void
}

export function OKRView({ okrs, projects, onSelectProject, onOpenCreateProject, onRefresh }: OKRViewProps) {
  const { currentRole, currentUser } = useRole()
  const [expandedOkr, setExpandedOkr] = useState<string | null>(okrs[0]?.okr_id || null)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('ยุทธศาสตร์ที่ 1: การพัฒนาคุณภาพบัณฑิต')
  const [newYear, setNewYear] = useState(2567)
  const [newQuarter, setNewQuarter] = useState('ALL')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateOKR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      alert('กรุณาระบุชื่อเป้าหมาย OKR')
      return
    }

    setIsSubmitting(true)
    try {
      await createOKR({
        okr_title: newTitle.trim(),
        okr_type: newType,
        year: Number(newYear),
        quarter: newQuarter,
        created_by: currentUser?.user_id
      })
      setIsAddModalOpen(false)
      setNewTitle('')
      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to create OKR:', err)
      alert('เกิดข้อผิดพลาดในการบันทึกเป้าหมาย OKR')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            โครงสร้างเป้าหมาย OKR และโครงการรองรับ
          </h2>
        </div>

        {currentRole === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>เพิ่มเป้าหมาย OKR คณะ</span>
          </button>
        )}
      </div>

      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#003B71]/10 text-[#003B71] flex items-center justify-center font-bold">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">เพิ่มเป้าหมาย OKR คณะ</h3>
                  <p className="text-xs text-slate-500">กำหนดเป้าหมายยุทธศาสตร์ระดับคณะประจำปีงบประมาณ</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOKR} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อเป้าหมาย OKR / ตัวชี้วัดหลัก <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เพิ่มอัตราการได้งานทำของบัณฑิตไม่น้อยกว่า 90%"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ประเภทยุทธศาสตร์ / หมวดหมู่
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] bg-white"
                >
                  <option value="ยุทธศาสตร์ที่ 1: การพัฒนาคุณภาพบัณฑิต">ยุทธศาสตร์ที่ 1: การพัฒนาคุณภาพบัณฑิต</option>
                  <option value="ยุทธศาสตร์ที่ 2: การวิจัยและนวัตกรรม">ยุทธศาสตร์ที่ 2: การวิจัยและนวัตกรรม</option>
                  <option value="ยุทธศาสตร์ที่ 3: การบริการวิชาการสู่สังคม">ยุทธศาสตร์ที่ 3: การบริการวิชาการสู่สังคม</option>
                  <option value="ยุทธศาสตร์ที่ 4: การบริหารจัดการที่มีประสิทธิภาพ">ยุทธศาสตร์ที่ 4: การบริหารจัดการที่มีประสิทธิภาพ</option>
                  <option value="ยุทธศาสตร์คณะ">ยุทธศาสตร์คณะทั่วไป</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ปีงบประมาณ พ.ศ.
                  </label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] bg-white"
                  >
                    <option value={2567}>2567</option>
                    <option value={2568}>2568</option>
                    <option value={2569}>2569</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ไตรมาสที่กำหนด
                  </label>
                  <select
                    value={newQuarter}
                    onChange={(e) => setNewQuarter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71] bg-white"
                  >
                    <option value="ALL">ทั้งปีงบประมาณ (ALL)</option>
                    <option value="Q1">ไตรมาส 1 (Q1)</option>
                    <option value="Q2">ไตรมาส 2 (Q2)</option>
                    <option value="Q3">ไตรมาส 3 (Q3)</option>
                    <option value="Q4">ไตรมาส 4 (Q4)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกเป้าหมาย OKR</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {okrs.map((okr) => {
          const okrProjects = projects.filter((p) => p.okr_id === okr.okr_id)
          const isExpanded = expandedOkr === okr.okr_id
          const totalBudget = okrProjects.reduce((acc, p) => acc + Number(p.budget), 0)
          const avgProgress = okrProjects.length > 0
            ? (okrProjects.reduce((acc, p) => acc + Number(p.progress_percentage), 0) / okrProjects.length).toFixed(1)
            : '0.0'

          return (
            <div
              key={okr.okr_id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all"
            >
              <div
                onClick={() => setExpandedOkr(isExpanded ? null : okr.okr_id)}
                className="p-6 cursor-pointer hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#003B71] flex items-center justify-center flex-shrink-0 font-bold">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
                        {okr.okr_type}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        ปี {okr.year} {okr.quarter && `(${okr.quarter})`}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {okr.okr_title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end md:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium block">
                      {okrProjects.length} โครงการรองรับ
                    </span>
                    <span className="text-xs font-bold text-emerald-600 block mt-0.5">
                      คืบหน้าเฉลี่ย {avgProgress}%
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100 text-slate-500">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-3 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 pt-2">
                    โครงการภายใต้เป้าหมายยุทธศาสตร์นี้ ({okrProjects.length}):
                  </div>

                  {okrProjects.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white text-center text-slate-400 text-xs border border-slate-200">
                      ยังไม่มีโครงการที่ผูกกับเป้าหมาย OKR นี้
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {okrProjects.map((p) => {
                        const headName = getUserFullName(p.head)
                        return (
                          <div
                            key={p.project_id}
                            onClick={() => onSelectProject(p)}
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#003B71] transition-all cursor-pointer shadow-sm space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {formatDepartmentShort(p.department)}
                              </span>
                              <span className="text-xs text-slate-500">
                                หัวหน้า: <b className="text-slate-800">{headName}</b>
                              </span>
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                              {p.project_name}
                            </h4>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                              <span className="text-slate-500">งบ {(Number(p.budget) / 1000).toLocaleString()}k ฿</span>
                              <span className="font-bold text-[#003B71]">{p.progress_percentage}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
