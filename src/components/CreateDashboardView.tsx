'use client'

import React, { useState } from 'react'
import { ProjectWithHeadAndAssignees, OKR, ExecutiveSummaryProjectSnapshot } from '@/types/database.types'
import { useRole } from '@/components/RoleContext'
import { createDashboardReport } from '@/lib/services/okr-service'
import { Sparkles, CheckCircle2, Send, Layers, BarChart3, AlertCircle, TrendingUp, DollarSign } from 'lucide-react'
import { formatDepartmentShort, getUserFullName, removeTitlesAndRoles } from '@/lib/user-constants'

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

    const totalChosenBudget = chosen.reduce((acc, p) => acc + Number(p.budget || 0), 0)
    const totalChosenSpent = chosen.reduce((acc, p) => acc + Number(p.spent_amount || 0), 0)
    const avgProgress = Math.round(chosen.reduce((acc, p) => acc + Number(p.progress_percentage || 0), 0) / chosen.length)
    const delayed = chosen.filter(p => p.status === 'Delayed' || (p.bottleneck && p.bottleneck.trim().length > 0))

    const projectLines = chosen.map((p, idx) => {
      const budgetK = (Number(p.budget || 0) / 1000).toLocaleString()
      const spentK = (Number(p.spent_amount || 0) / 1000).toLocaleString()
      return `• [${formatDepartmentShort(p.department)}] ${p.project_name} (ความคืบหน้า ${p.progress_percentage}%, งบประมาณ ${budgetK}k บาท, ใช้จริง ${spentK}k บาท) ${p.bottleneck ? `⚠️ ปัญหา: ${p.bottleneck}` : '✅ ตามแผนงาน'}`
    }).join('\n')

    const summaryText = `รายงานสรุปผลการดำเนินงานโครงการ OKR ประจำปีงบประมาณ 2567 (ส่งมอบให้ผู้บริหารพิจารณา)
จำนวนโครงการที่รายงาน: ${chosen.length} โครงการ | ความคืบหน้าเฉลี่ย: ${avgProgress}%
งบประมาณรวมที่ได้รับจัดสรร: ${(totalChosenBudget).toLocaleString()} บาท | เบิกจ่ายแล้ว: ${(totalChosenSpent).toLocaleString()} บาท (${totalChosenBudget > 0 ? ((totalChosenSpent / totalChosenBudget) * 100).toFixed(1) : 0}%)

สรุปผลการดำเนินงานรายโครงการ:
${projectLines}

${delayed.length > 0 ? `ประเด็นเร่งด่วนและข้อเสนอแนะ:\nมีโครงการที่ติดปัญหา ${delayed.length} โครงการ ขอรับการสนับสนุนทรัพยากรและคำแนะนำเชิงยุทธศาสตร์จากผู้บริหาร` : 'ภาพรวมโครงการดำเนินงานตามแผนงานด้วยความเรียบร้อย'}`

    setOverallInfo(summaryText)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overallInfo.trim() || !currentUser) return

    setIsSubmitting(true)

    const chosen = projects.filter(p => selectedProjectIds.includes(p.project_id))
    const projectSnapshots: ExecutiveSummaryProjectSnapshot[] = chosen.map(p => ({
      project_id: p.project_id,
      project_name: p.project_name,
      department: p.department,
      progress_percentage: p.progress_percentage,
      budget: Number(p.budget) || 0,
      spent_amount: Number(p.spent_amount) || 0,
      status: p.status || 'In Progress',
      bottleneck: p.bottleneck || null,
      main_objective: p.main_objective || null,
      head_name: removeTitlesAndRoles(getUserFullName(p.head)) || null,
      start_date: p.start_date || null,
      end_date: p.end_date || null
    }))

    await createDashboardReport({
      overall_okr_info: overallInfo.trim(),
      okr_head_evaluation_score: 80, // Default baseline for Executive to evaluate
      head_id: currentUser.user_id,
      head_name: getUserFullName(currentUser),
      academic_year: 2567,
      project_ids: selectedProjectIds,
      project_snapshots: projectSnapshots
    })

    setIsSubmitting(false)
    setSubmitSuccess(true)
    setTimeout(() => {
      setSubmitSuccess(false)
      if (onSuccess) onSuccess()
    }, 2000)
  }

  const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.project_id))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {submitSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-bold flex items-center gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <span>ส่งสรุป Dashboard ไปยังห้องมองสรุปของผู้บริหารเรียบร้อยแล้ว! ข้อมูลจะแสดงผลเป็นกราฟเดี่ยวของแต่ละงานพร้อมคำเขียนสรุปทันที</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Send className="w-6 h-6 text-[#003B71]" />
            <span>ส่งสรุป Dashboard ให้ผู้บริหาร</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            เลือกโครงการ OKR สรุปผลสัมฤทธิ์เชิงยุทธศาสตร์ และส่งตรงไปยังห้องมองสรุปของผู้บริหาร เพื่อให้ผู้บริหารเห็นเป็นกราฟเดี่ยวของแต่ละงานพร้อมคำเขียนสรุป
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Quick Select Projects for Summary */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#003B71]" />
                เลือกโครงการที่ต้องการส่งสรุปให้ผู้บริหาร ({selectedProjectIds.length}/{projects.length} โครงการ)
              </label>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllProjects}
                  className="text-xs font-semibold text-[#003B71] hover:underline cursor-pointer"
                >
                  {selectedProjectIds.length === projects.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleAutoSummarize}
                  disabled={selectedProjectIds.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>สร้างข้อความสรุปอัตโนมัติ (AI Generate)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-2xl custom-scrollbar">
              {projects.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
                  ยังไม่มีโครงการในระบบ
                </div>
              ) : (
                projects.map((p) => {
                  const isChecked = selectedProjectIds.includes(p.project_id)
                  return (
                    <div
                      key={p.project_id}
                      onClick={() => toggleProjectSelection(p.project_id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isChecked
                          ? 'bg-sky-50 border-[#003B71] text-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="accent-[#003B71] rounded w-4 h-4 pointer-events-none"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                            {formatDepartmentShort(p.department)}
                          </span>
                          <span className="text-xs font-bold truncate block">{p.project_name}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-[#003B71]">คืบหน้า {p.progress_percentage}%</span>
                          <span>งบ {(Number(p.budget) / 1000).toLocaleString()}k ฿</span>
                        </div>
                        {p.bottleneck && (
                          <span className="text-[10px] text-rose-600 truncate block mt-0.5">
                            ⚠️ {p.bottleneck}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Preview of chosen projects that will appear as individual graphs to Executive */}
          {selectedProjects.length > 0 && (
            <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#003B71] flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  ตัวอย่างงานที่จะแสดงเป็นกราฟเดี่ยวในห้องผู้บริหาร ({selectedProjects.length} โครงการ):
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  ผู้บริหารจะเห็นกราฟความคืบหน้า & การใช้เงินของแต่ละโครงการแยกเป็นรายกล่อง
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedProjects.map(p => (
                  <span
                    key={p.project_id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-sky-300 text-xs font-semibold text-slate-800 shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#00A8B5]" />
                    <span className="truncate max-w-[200px]">{p.project_name}</span>
                    <span className="text-[#003B71] font-bold">({p.progress_percentage}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Text Area for overall_okr_info (คำเขียนสรุป) */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              คำเขียนสรุปสำหรับผู้บริหาร (Executive Summary Note) *
            </label>
            <p className="text-[11px] text-slate-500 font-medium">
              ข้อความนี้จะแสดงเป็นคำเขียนสรุปคู่กับกราฟเดี่ยวของแต่ละงานในห้องมองสรุปของผู้บริหาร
            </p>
            <textarea
              required
              rows={7}
              value={overallInfo}
              onChange={(e) => setOverallInfo(e.target.value)}
              placeholder="กรอกสรุปผลการดำเนินงานเชิงยุทธศาสตร์, ร้อยละความสำเร็จ, ข้อจำกัด, และข้อเสนอแนะสำหรับผู้บริหาร (หรือกดปุ่ม 'สร้างข้อความสรุปอัตโนมัติ' ด้านบน)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 font-medium leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
            />
          </div>

          {/* Submitter Info Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block">ผู้ส่งสรุป (Head of OKR):</span>
              <span className="font-bold text-slate-900">{getUserFullName(currentUser)} ({formatDepartmentShort(currentUser?.department)})</span>
            </div>
            <div className="sm:text-right">
              <span className="text-slate-500 font-semibold block">ห้องปลายทาง:</span>
              <span className="font-bold text-[#003B71]">ห้องมองสรุปที่ส่งมา (Executive Summary Room)</span>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || !overallInfo.trim() || selectedProjectIds.length === 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] hover:opacity-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#003B71]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>กำลังส่งข้อมูลไปยังห้องผู้บริหาร...</span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>ส่งสรุป Dashboard ให้ผู้บริหาร</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
