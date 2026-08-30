'use client'

import React, { useState, useEffect } from 'react'
import { OKR, ProjectWithHeadAndAssignees, DashboardReport, UserProfile } from '@/types/database.types'
import {
  Crown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Download,
  CheckCircle2,
  ChevronRight,
  Building,
  Sparkles,
  FileText,
  Star,
  UserCheck,
  Calendar,
  UserPlus,
  X,
  Target,
  BarChart3,
  Award,
  Activity,
  Layers
} from 'lucide-react'
import { ExecutiveAnalytics } from '@/components/ExecutiveAnalytics'
import { fetchDashboardReports, fetchUsers, assignProjectRole, fetchEvaluations, saveEvaluationRecord } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'

interface ExecutiveWorkspaceProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onExportPDF: () => void
}

export function ExecutiveWorkspace({
  okrs,
  projects,
  onSelectProject,
  onExportPDF
}: ExecutiveWorkspaceProps) {
  const { currentUser, allUsers, refreshUsers } = useRole()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL')
  const [dashboardReports, setDashboardReports] = useState<DashboardReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false)

  // Assign OKR Head modal state
  const [isAssignHeadOpen, setIsAssignHeadOpen] = useState(false)
  const [assignProjectId, setAssignProjectId] = useState<string>(projects[0]?.project_id || '')
  const [assignUserId, setAssignUserId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)

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

  useEffect(() => {
    if (projects.length > 0 && !assignProjectId) {
      setAssignProjectId(projects[0].project_id)
    }
  }, [projects])

  const handleAssignHead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignProjectId || !assignUserId || !currentUser) return
    setIsAssigning(true)

    await assignProjectRole({
      project_id: assignProjectId,
      user_id: assignUserId,
      role_type: 'Head',
      assigned_by: currentUser.user_id
    })

    await refreshUsers()
    setIsAssigning(false)
    setAssignSuccess(true)
    setTimeout(() => {
      setAssignSuccess(false)
      setIsAssignHeadOpen(false)
    }, 1800)
  }

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
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-inner flex-shrink-0">
            <Crown className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#F6C343] text-slate-900 shadow-sm">
                Executive Strategy Portal
              </span>
              <span className="text-xs text-sky-200 font-medium">มหาวิทยาลัยสวนดุสิต</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
              แผงยุทธศาสตร์ผู้บริหาร (Executive Strategy Dashboard)
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              ติดตามภาพรวมผลสัมฤทธิ์ OKR, กำหนดหัวหน้าโครงการ (OKR Head), และประเมินผลคะแนนระดับ 5 ดาวส่งตรงถึงหัวหน้าโครงการ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto flex-shrink-0">
          <button
            onClick={() => setIsAssignHeadOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#00A8B5] hover:bg-[#008B97] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>กำหนดหัวหน้าโครงการ (Assign OKR Head)</span>
          </button>

          <button
            onClick={onExportPDF}
            className="px-4 py-2.5 rounded-2xl bg-white text-[#003B71] hover:bg-slate-100 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#003B71]" />
            <span>Export รายงาน</span>
          </button>
        </div>
      </div>

      {/* Main Focus Area: Dynamic Active Projects Filter */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
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
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
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
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ยุทธศาสตร์ OKR คณะ</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{okrs.length} เป้าหมาย</div>
          <span className="text-xs text-[#003B71] font-semibold mt-1 block">{filteredProjects.length} โครงการ</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ความก้าวหน้าเฉลี่ย</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{avgProgress}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">งบประมาณเบิกจ่าย</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {(totalSpent / 1000000).toFixed(2)} / {(totalBudget / 1000000).toFixed(1)} ลบ.
          </div>
          <span className="text-xs text-purple-700 font-semibold mt-1 block">
            เบิกจ่ายแล้ว {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">โครงการที่ต้องเร่งรัด</span>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${delayedProjects.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {delayedProjects.length} โครงการ
          </div>
          <span className="text-xs text-slate-500 font-semibold mt-1 block">สถานะล่าช้าหรือติดปัญหา</span>
        </div>
      </div>

      {/* SECTION: Reports submitted by OKR Head with Visual Infographics & 5-Star Interactive Rating */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#003B71]" />
              อินโฟกราฟิกและรายงานสรุปจากหัวหน้าโครงการ OKR (Table Dashboard View)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แปลงข้อมูลสรุปเป็น Visual Infographics พร้อมระบบคลิกให้คะแนนประเมินหัวหน้าโครงการ (1 - 5 ดาว)
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-[#003B71] border border-sky-200 self-start sm:self-auto">
            {dashboardReports.length} Dashboard Reports
          </span>
        </div>

        {dashboardReports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
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
                  className="rounded-3xl bg-gradient-to-br from-slate-50 via-white to-sky-50/50 border border-slate-200 hover:border-sky-300 hover:shadow-lg transition-all p-6 space-y-5 flex flex-col justify-between"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#003B71]/10 text-[#003B71] flex items-center justify-center font-bold shadow-sm">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          {report.head_name || 'หัวหน้าโครงการ OKR'}
                        </h4>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          ปีการศึกษา {report.academic_year || 2567} • {new Date(report.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
                      ปีงบประมาณ {report.academic_year || 2567}
                    </div>
                  </div>

                  {/* Visual Infographic Cards Representation */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ระดับผลงาน</span>
                      <div className="text-base font-black text-emerald-600 mt-1 flex items-center justify-center gap-1">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span>{displayRating >= 4 ? 'ดีเยี่ยม' : displayRating >= 3 ? 'ดี' : 'ต้องพัฒนา'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">เกณฑ์ประเมิน</span>
                      <div className="text-base font-black text-[#003B71] mt-1">
                        {displayRating * 20}%
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">สถานะส่งมอบ</span>
                      <div className="text-base font-black text-amber-500 mt-1 flex items-center justify-center gap-1">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <span>สมบูรณ์</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Meter Infographic */}
                  <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200/80">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#00A8B5]" />
                        ระดับการบรรลุเป้าหมายยุทธศาสตร์ (OKR Benchmark)
                      </span>
                      <span className="text-[#003B71]">{displayRating * 20}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] transition-all duration-300"
                        style={{ width: `${displayRating * 20}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary Text Content */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#003B71]" />
                      ข้อมูลภาพรวมผลสัมฤทธิ์ (Overall OKR Info):
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {report.overall_okr_info}
                    </p>
                  </div>

                  {/* INTERACTIVE 5-STAR RATING (OKR Head Only - Hide Team Evaluation) */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span>ประเมินผลหัวหน้าโครงการ OKR (Head Evaluation: 1-5 คะแนน)</span>
                      </label>
                      <span className="text-xs font-black text-amber-700">
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
                              className="p-1 rounded-lg hover:scale-125 transition-all cursor-pointer"
                              title={`ให้ ${star} คะแนน`}
                            >
                              <Star
                                className={`w-6 h-6 transition-colors ${
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
                        <span className="text-[11px] text-amber-700 font-bold animate-pulse">กำลังบันทึก...</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-semibold">คลิกดาวเพื่อประเมิน</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Analytics Charts */}
      <ExecutiveAnalytics projects={filteredProjects} />

      {/* Delayed Projects Attention Box */}
      {delayedProjects.length > 0 && (
        <div className="bg-rose-50/70 rounded-2xl p-6 border border-rose-200 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            โครงการที่ติดปัญหาและต้องการการสนับสนุนจากผู้บริหาร ({delayedProjects.length} โครงการ)
          </h3>

          <div className="space-y-3">
            {delayedProjects.map((p) => (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-4 rounded-xl bg-white border border-rose-200 hover:border-rose-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {p.department.replace('ภาควิชา', '')}
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
      {isAssignHeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 relative space-y-5">
            <button
              onClick={() => setIsAssignHeadOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#00A8B5]/10 text-[#00A8B5] flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  กำหนดหัวหน้าโครงการ OKR (Assign OKR Head)
                </h3>
                <p className="text-xs text-slate-500">
                  บันทึกลงตาราง Project_Assignments (role_type: 'Head')
                </p>
              </div>
            </div>

            {assignSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>กำหนดสิทธิ์หัวหน้าโครงการ OKR เรียบร้อยแล้ว!</span>
              </div>
            )}

            <form onSubmit={handleAssignHead} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#003B71]" />
                  เลือกโครงการ OKR *
                </label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      [{p.department.replace('ภาควิชา', '')}] {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#00A8B5]" />
                  เลือกอาจารย์ / บุคลากรที่จะแต่งตั้งเป็น OKR Head *
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  <option value="">-- กรุณาเลือกรายชื่อผู้ใช้งาน --</option>
                  {allUsers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      [{u.role}] {u.first_name} {u.last_name} ({u.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600">
                <span className="font-bold text-slate-800 block">สิทธิ์และหน้าที่ของ OKR Head:</span>
                <p>• สามารถมอบหมายอาจารย์ลูกทีม (Team Members) ในโครงการนี้ได้</p>
                <p>• สามารถสร้าง Dashboard สรุปผลรายงานส่งผู้บริหาร และตรวจสอบหลักฐานจากลูกทีม</p>
              </div>

              <button
                type="submit"
                disabled={isAssigning || !assignUserId}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#00A8B5] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAssigning ? 'กำลังบันทึก...' : 'บันทึกการแต่งตั้ง OKR Head'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
