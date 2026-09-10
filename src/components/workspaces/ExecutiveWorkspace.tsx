'use client'

import React, { useState, useEffect } from 'react'
import { OKR, ProjectWithHeadAndAssignees, DashboardReport, UserProfile } from '@/types/database.types'
import {
  Crown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Building,
  Sparkles,
  FileText,
  Star,
  UserCheck,
  Calendar,
  UserPlus,
  BarChart3,
  Award,
  Activity,
  Layers
} from 'lucide-react'
import { ExecutiveAnalytics } from '@/components/ExecutiveAnalytics'
import { AssignHeadModal } from './AssignHeadModal'
import { fetchDashboardReports, fetchEvaluations, saveEvaluationRecord } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'
import { formatDepartmentShort, formatThaiDate, getUserFullName } from '@/lib/user-constants'

interface ExecutiveWorkspaceProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
}

export function ExecutiveWorkspace({
  okrs,
  projects,
  onSelectProject
}: ExecutiveWorkspaceProps) {
  const { currentUser, allUsers, refreshUsers } = useRole()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL')
  const [dashboardReports, setDashboardReports] = useState<DashboardReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false)

  // Assign OKR Head modal state
  const [isAssignHeadOpen, setIsAssignHeadOpen] = useState(false)

  // Interactive 5-point evaluations map for OKR Head (dashboard reports)
  const [evalScores, setEvalScores] = useState<Record<string, number>>({})
  const [hoverScores, setHoverScores] = useState<Record<string, number>>({})
  const [evalSaving, setEvalSaving] = useState<Record<string, boolean>>({})

  const loadReportsAndEvals = async () => {
    setIsLoadingReports(true)
    const [reports, evals] = await Promise.all([
      fetchDashboardReports(),
      fetchEvaluations()
    ])
    setDashboardReports(reports)

    // Populate existing 5-point scores for dashboard reports
    const scoreMap: Record<string, number> = {}
    reports.forEach((r) => {
      const foundEval = evals.find(e => e.dashboard_id === r.dashboard_id)
      if (foundEval) {
        scoreMap[r.dashboard_id] = foundEval.head_score
      } else {
        scoreMap[r.dashboard_id] = Math.max(1, Math.min(5, Math.round(Number(r.okr_head_evaluation_score || 80) / 20)))
      }
    })
    setEvalScores(scoreMap)
    setIsLoadingReports(false)
  }

  useEffect(() => {
    loadReportsAndEvals()
  }, [])

  const handleRateHead = async (dashboardId: string, score: number) => {
    if (!currentUser) return
    setEvalScores(prev => ({ ...prev, [dashboardId]: score }))
    setEvalSaving(prev => ({ ...prev, [dashboardId]: true }))

    await saveEvaluationRecord({
      dashboard_id: dashboardId,
      evaluator_id: currentUser.user_id,
      head_score: score,
      team_score: null // Executive rates OKR Head only
    })

    setEvalSaving(prev => ({ ...prev, [dashboardId]: false }))
  }

  const filteredProjects = selectedProjectId === 'ALL'
    ? projects
    : projects.filter(p => p.project_id === selectedProjectId)

  const totalProjects = projects.length
  const totalBudget = projects.reduce((acc, p) => acc + Number(p.budget), 0)
  const totalSpent = projects.reduce((acc, p) => acc + Number(p.spent_amount), 0)
  const avgProgress = totalProjects > 0
    ? (projects.reduce((acc, p) => acc + Number(p.progress_percentage), 0) / totalProjects).toFixed(1)
    : '0.0'

  const delayedProjects = projects.filter(p => p.status === 'Delayed' || (p.bottleneck && p.bottleneck.length > 0))

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            แผงยุทธศาสตร์ผู้บริหาร (Executive Strategy Dashboard)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => setIsAssignHeadOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#00A8B5] hover:bg-[#008B97] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>กำหนดหัวหน้าโครงการ (Assign OKR Head)</span>
          </button>
        </div>
      </div>

      {/* Main Focus Area: Dynamic Active Projects Filter */}
      <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00A8B5]" />
            <h3 className="text-sm font-bold text-slate-900">
              โฟกัสโครงการยุทธศาสตร์ที่กำลังดำเนินการ (Active Projects Focus)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            เลือกโครงการเพื่อเจาะลึกข้อมูลเฉพาะส่วน ({projects.length} โครงการในระบบ)
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedProjectId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
              selectedProjectId === 'ALL'
                ? 'bg-[#003B71] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-slate-800'
            }`}
          >
            🌟 ภาพรวมทุกโครงการ ({projects.length})
          </button>

          {projects.map((p) => {
            const isSelected = selectedProjectId === p.project_id
            return (
              <button
                key={p.project_id}
                onClick={() => setSelectedProjectId(p.project_id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#003B71] text-white shadow-sm font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${p.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                <span className="max-w-[200px] truncate">{p.project_name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {p.progress_percentage}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ยุทธศาสตร์ OKR คณะ</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{okrs.length} เป้าหมาย</div>
          <span className="text-xs text-[#003B71] font-semibold mt-1 block">{filteredProjects.length} โครงการ</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ความก้าวหน้าเฉลี่ย</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{avgProgress}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">งบประมาณเบิกจ่าย</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {(totalSpent / 1000000).toFixed(2)} / {(totalBudget / 1000000).toFixed(1)} ลบ.
          </div>
          <span className="text-xs text-purple-700 font-semibold mt-1 block">
            เบิกจ่ายแล้ว {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">โครงการที่ต้องเร่งรัด</span>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${delayedProjects.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {delayedProjects.length} โครงการ
          </div>
          <span className="text-xs text-slate-500 font-semibold mt-1 block">สถานะล่าช้าหรือติดปัญหา</span>
        </div>
      </div>

      {/* Analytics Charts & Project Status Breakdown */}
      <ExecutiveAnalytics projects={filteredProjects} onSelectProject={onSelectProject} />

      {/* SECTION: Reports submitted by OKR Head with Visual Infographics & 5-Star Interactive Rating */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#003B71]" />
              <span>อินโฟกราฟิกและรายงานสรุปจากหัวหน้าโครงการ OKR (Table Dashboard View)</span>
            </h3>
          </div>
          <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-sky-50 text-[#003B71] border-2 border-sky-300 self-start sm:self-auto">
            {dashboardReports.length} Dashboard Reports
          </span>
        </div>

        {dashboardReports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm sm:text-base">
            ยังไม่มีรายงานเชิงยุทธศาสตร์ที่ส่งเข้ามาใน Table Dashboard
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dashboardReports.map((report) => {
              const currentScore = evalScores[report.dashboard_id] || 4
              const activeHover = hoverScores[report.dashboard_id] || 0
              const displayRating = activeHover > 0 ? activeHover : currentScore
              const isSavingThis = evalSaving[report.dashboard_id]

              return (
                <div
                  key={report.dashboard_id}
                  className="rounded-3xl bg-gradient-to-br from-slate-50 via-white to-sky-50/50 border-2 border-slate-900 hover:border-[#003B71] hover:shadow-lg transition-all p-6 sm:p-7 space-y-5 flex flex-col justify-between"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#003B71]/10 text-[#003B71] flex items-center justify-center font-bold shadow-sm">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base sm:text-lg font-bold text-slate-900">
                          {report.head_name || 'หัวหน้าโครงการ OKR'}
                        </h4>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          ปีการศึกษา {report.academic_year || 2567} • {formatThaiDate(report.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
                      ปีงบประมาณ {report.academic_year || 2567}
                    </div>
                  </div>

                  {/* Visual Infographic Cards Representation */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">ระดับผลงาน</span>
                      <div className="text-base sm:text-lg font-black text-emerald-600 mt-1 flex items-center justify-center gap-1">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span>{displayRating >= 4 ? 'ดีเยี่ยม' : displayRating >= 3 ? 'ดี' : 'ต้องพัฒนา'}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">เกณฑ์ประเมิน</span>
                      <div className="text-base sm:text-lg font-black text-[#003B71] mt-1">
                        {displayRating * 20}%
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">สถานะส่งมอบ</span>
                      <div className="text-base sm:text-lg font-black text-amber-500 mt-1 flex items-center justify-center gap-1">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <span>สมบูรณ์</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Meter Infographic */}
                  <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200/80">
                    <div className="flex justify-between text-xs sm:text-sm font-bold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-[#00A8B5]" />
                        ระดับการบรรลุเป้าหมายยุทธศาสตร์ (OKR Benchmark)
                      </span>
                      <span className="text-[#003B71]">{displayRating * 20}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] transition-all duration-300"
                        style={{ width: `${displayRating * 20}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary Text Content */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#003B71]" />
                      ข้อมูลภาพรวมผลสัมฤทธิ์ (Overall OKR Info):
                    </span>
                    <p className="text-sm text-slate-800 leading-relaxed font-medium">
                      {report.overall_okr_info}
                    </p>
                  </div>

                  {/* INTERACTIVE 5-STAR RATING */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span>ประเมินผลหัวหน้าโครงการ OKR (Head Evaluation: 1-5 คะแนน)</span>
                      </label>
                      <span className="text-xs sm:text-sm font-black text-amber-700">
                        {displayRating} / 5 ดาว
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = star <= displayRating
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRateHead(report.dashboard_id, star)}
                              onMouseEnter={() => setHoverScores(prev => ({ ...prev, [report.dashboard_id]: star }))}
                              onMouseLeave={() => setHoverScores(prev => ({ ...prev, [report.dashboard_id]: 0 }))}
                              className="p-1 rounded-xl hover:scale-125 transition-all cursor-pointer"
                              title={`ให้ ${star} คะแนน`}
                            >
                              <Star
                                className={`w-7 h-7 transition-colors ${
                                  isFilled
                                    ? 'text-amber-500 fill-amber-400 drop-shadow-sm'
                                    : 'text-slate-300 fill-transparent hover:text-amber-400'
                                }`}
                              />
                            </button>
                          )
                        })}
                      </div>

                      {isSavingThis ? (
                        <span className="text-xs text-amber-700 font-bold animate-pulse">กำลังบันทึก...</span>
                      ) : (
                        <span className="text-xs text-slate-500 font-semibold">คลิกดาวเพื่อประเมิน</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delayed Projects Attention Box */}
      {delayedProjects.length > 0 && (
        <div className="bg-rose-50/70 rounded-2xl p-6 border-2 border-rose-400 space-y-4 shadow-sm">
          <h3 className="text-sm sm:text-base font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            โครงการที่ติดปัญหาและต้องการการสนับสนุนจากผู้บริหาร ({delayedProjects.length} โครงการ)
          </h3>

          <div className="space-y-3">
            {delayedProjects.map((p) => (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-4 rounded-xl bg-white border-2 border-slate-900 hover:border-rose-500 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {formatDepartmentShort(p.department)}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{p.project_name}</h4>
                  </div>
                  <p className="text-xs text-rose-700 mt-1.5 font-medium">
                    <b>ปัญหาที่พบ:</b> {p.bottleneck}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600">{p.progress_percentage}%</span>
                    <span className="text-[11px] text-slate-500 block">งบ {(Number(p.budget) / 1000).toLocaleString()}k</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN OKR HEAD TO PROJECT */}
      <AssignHeadModal
        isOpen={isAssignHeadOpen}
        onClose={() => setIsAssignHeadOpen(false)}
        projects={projects}
        allUsers={allUsers}
        onSuccess={refreshUsers}
      />
    </div>
  )
}
