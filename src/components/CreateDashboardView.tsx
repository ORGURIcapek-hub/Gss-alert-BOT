'use client'

import React, { useState } from 'react'
import { ProjectWithHeadAndAssignees, OKR } from '@/types/database.types'
import { useRole } from '@/components/RoleContext'
import { createDashboardReport } from '@/lib/services/okr-service'
import { Crown, Sparkles, CheckCircle2, Send, Layers, BarChart3 } from 'lucide-react'

interface CreateDashboardViewProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSuccess?: () => void
}

export function CreateDashboardView({ okrs, projects, onSuccess }: CreateDashboardViewProps) {
  const { currentUser } = useRole()
  const [overallInfo, setOverallInfo] = useState('')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    )
  }

  const handleSelectAllProjects = () => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([])
    } else {
      setSelectedProjectIds(projects.map(p => p.project_id))
    }
  }

  const handleAutoSummarize = () => {
    const chosen = projects.filter(p => selectedProjectIds.includes(p.project_id))
    if (chosen.length === 0) return

    const summaryText = chosen.map((p, idx) =>
      `${idx + 1}. [${p.department.replace('ภาควิชา', '')}] ${p.project_name}: ความคืบหน้า ${p.progress_percentage}%, งบประมาณ ${(Number(p.budget) / 1000).toLocaleString()}k บาท ${p.bottleneck ? `(ติดปัญหา: ${p.bottleneck})` : '(ดำเนินการตามแผน)'}`
    ).join('\n')

    setOverallInfo(`สรุปภาพรวมผลการดำเนินงาน OKR ประจำปีงบประมาณ 2567 (${chosen.length} โครงการ):\n${summaryText}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overallInfo.trim() || !currentUser) return

    setIsSubmitting(true)
    await createDashboardReport({
      overall_okr_info: overallInfo.trim(),
      okr_head_evaluation_score: 80, // Default baseline, evaluated interactively by Executive in view mode
      head_id: currentUser.user_id,
      head_name: `${currentUser.first_name} ${currentUser.last_name}`,
      academic_year: 2567
    })

    setIsSubmitting(false)
    setSubmitSuccess(true)
    setTimeout(() => {
      setSubmitSuccess(false)
      if (onSuccess) onSuccess()
    }, 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#00264D] to-[#005B94] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#F6C343] flex-shrink-0 shadow-inner">
          <Crown className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#F6C343] text-slate-900">
              Table Dashboard Entry
            </span>
            <span className="text-xs text-sky-200">สิทธิ์หัวหน้าโครงการ OKR</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
            สร้าง Dashboard สำหรับผู้บริหาร (Executive Strategy Dashboard)
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
            กรอกข้อมูลสรุปภาพรวมผลสัมฤทธิ์ของโครงการ OKR ที่อยู่ในความดูแล เพื่อแปลงเป็น Infographics และรายงานตรงสู่แผงยุทธศาสตร์ผู้บริหาร
          </p>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-bold flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <span>บันทึกและส่งข้อมูลไปยัง Table Dashboard สำหรับผู้บริหารเรียบร้อยแล้ว!</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Quick Select Projects for Summary */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#003B71]" />
                เลือกโครงการที่ต้องการนำมารวมในรายงานสรุป ({selectedProjectIds.length}/{projects.length})
              </label>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllProjects}
                  className="text-xs font-semibold text-[#003B71] hover:underline"
                >
                  {selectedProjectIds.length === projects.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleAutoSummarize}
                  disabled={selectedProjectIds.length === 0}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>สร้างข้อความสรุปอัตโนมัติ (AI Generate)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-2xl custom-scrollbar">
              {projects.map((p) => {
                const isChecked = selectedProjectIds.includes(p.project_id)
                return (
                  <div
                    key={p.project_id}
                    onClick={() => toggleProjectSelection(p.project_id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                      isChecked
                        ? 'bg-sky-50 border-[#003B71] text-slate-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="accent-[#003B71] rounded pointer-events-none"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">
                          {p.department.replace('ภาควิชา', '')}
                        </span>
                        <span className="text-xs font-bold truncate block">{p.project_name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        คืบหน้า {p.progress_percentage}% • {(Number(p.budget) / 1000).toLocaleString()}k ฿
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Text Area for overall_okr_info */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              ข้อมูลภาพรวมผลสัมฤทธิ์ (overall_okr_info) *
            </label>
            <textarea
              required
              rows={6}
              value={overallInfo}
              onChange={(e) => setOverallInfo(e.target.value)}
              placeholder="กรอกสรุปผลการดำเนินงานเชิงยุทธศาสตร์, ร้อยละความสำเร็จ, ผลกระทบ, และเป้าหมายที่บรรลุ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 font-medium leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
            />
            <p className="text-[11px] text-slate-400">
              ข้อความนี้จะถูกจัดแสดงในรูปแบบ Infographics บนแผงยุทธศาสตร์ผู้บริหาร (Executive Strategy Dashboard)
            </p>
          </div>

          {/* Submitter Info Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 font-semibold block">ผู้บันทึก (Head Name):</span>
              <span className="font-bold text-slate-900">{currentUser?.first_name} {currentUser?.last_name} ({currentUser?.department})</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-semibold block">เป้าหมายปลายทาง:</span>
              <span className="font-bold text-[#003B71]">แผงยุทธศาสตร์ผู้บริหาร (Table Dashboard)</span>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#003B71]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>กำลังบันทึกข้อมูล...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>ส่งข้อมูลไปยัง Table Dashboard ผู้บริหาร</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
