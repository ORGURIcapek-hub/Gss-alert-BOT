'use client'

import React, { useState, useEffect } from 'react'
import { NormalReport, Evaluation, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { fetchNormalReports, fetchEvaluations, saveEvaluationRecord, fetchProjects } from '@/lib/services'
import { useRole } from '@/components/RoleContext'
import { FileText, Search, Star, User, Users, Target, Calendar, CheckCircle2, Award, Printer, ShieldAlert, Check } from 'lucide-react'
import { formatThaiDate } from '@/lib/user-constants'

export function NormalReportView() {
  const { currentUser } = useRole()
  const [reports, setReports] = useState<NormalReport[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [projects, setProjects] = useState<ProjectWithHeadAndAssignees[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [reportScores, setReportScores] = useState<Record<string, { head_score: number; team_score: number }>>({})
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({})

  const loadReportsAndEvaluations = async () => {
    setLoading(true)
    try {
      const [reportList, evalList, projectList] = await Promise.all([
        fetchNormalReports(),
        fetchEvaluations(),
        fetchProjects()
      ])
      setReports(reportList)
      setEvaluations(evalList)
      setProjects(projectList)

      const scoreMap: Record<string, { head_score: number; team_score: number }> = {}
      reportList.forEach((r) => {
        const userEval = evalList.find(e => e.report_id === r.report_id && e.evaluator_id === currentUser?.user_id)
        if (userEval) {
          scoreMap[r.report_id] = {
            head_score: userEval.head_score,
            team_score: userEval.team_score || 4
          }
        } else {
          scoreMap[r.report_id] = {
            head_score: Math.max(1, Math.min(5, Math.round(Number(r.head_evaluation_score || 80) / 20))),
            team_score: Math.max(1, Math.min(5, Math.round(Number(r.team_evaluation_score || 80) / 20)))
          }
        }
      })
      setReportScores(scoreMap)
    } catch (e) {
      console.warn('[NormalReportView] load failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReportsAndEvaluations()

    let channel: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('sdu_okr_sync_channel')
        channel.onmessage = (event) => {
          if (event.data?.type === 'EVALUATIONS_UPDATED' || event.data?.type === 'PROJECTS_UPDATED') {
            loadReportsAndEvaluations()
          }
        }
      }
    } catch {}

    return () => {
      channel?.close()
    }
  }, [currentUser?.user_id])

  const handleRateReport = async (report: NormalReport, type: 'head' | 'team', score: number) => {
    if (!currentUser) return
    const reportId = report.report_id

    const matchedProj = projects.find(p => p.project_id === report.project_id || p.project_name === report.project_name)
    const isResponsible = Boolean(
      (matchedProj && (
        matchedProj.assignees?.some(a => a.user_id === currentUser.user_id) ||
        matchedProj.head_of_project === currentUser.user_id ||
        matchedProj.head?.user_id === currentUser.user_id
      )) ||
      (report.responsible_person_name && currentUser.name && (
        report.responsible_person_name.includes(currentUser.name) ||
        currentUser.name.includes(report.responsible_person_name)
      )) ||
      (report.head_name && currentUser.name && (
        report.head_name.includes(currentUser.name) ||
        currentUser.name.includes(report.head_name)
      ))
    )

    if (type === 'team' && isResponsible) {
      alert('คุณเป็นอาจารย์ลูกทีม/ผู้รับผิดชอบโครงการนี้ จึงไม่สามารถประเมินคะแนนตนเองได้')
      return
    }

    const myExistingEval = evaluations.find(e => e.report_id === reportId && e.evaluator_id === currentUser.user_id)
    if (type === 'team' && myExistingEval && myExistingEval.team_score !== null && myExistingEval.team_score !== undefined) {
      alert('คุณได้ให้คะแนนการประเมินโครงการนี้ไปแล้ว')
      return
    }

    const current = reportScores[reportId] || { head_score: 4, team_score: 4 }
    const updated = {
      ...current,
      [type === 'head' ? 'head_score' : 'team_score']: score
    }

    setReportScores(prev => ({ ...prev, [reportId]: updated }))
    setSavingMap(prev => ({ ...prev, [reportId]: true }))

    try {
      await saveEvaluationRecord({
        report_id: reportId,
        project_id: report.project_id || matchedProj?.project_id || null,
        evaluator_id: currentUser.user_id,
        head_score: updated.head_score,
        team_score: updated.team_score
      })
      await loadReportsAndEvaluations()
    } catch (err) {
      console.warn('Evaluation save error', err)
    } finally {
      setSavingMap(prev => ({ ...prev, [reportId]: false }))
    }
  }

  const filteredReports = reports.filter(r =>
    (r.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.responsible_person_name && r.responsible_person_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.head_name && r.head_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.project_outcome && r.project_outcome.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Report โครงการ OKR (Normal Reports Hub)
          </h2>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-600" />
          <span>พิมพ์รายงาน</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อโครงการ, อาจารย์ผู้รับผิดชอบ, หัวหน้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
          <span>พบทั้งหมด <b>{filteredReports.length}</b> รายงาน</span>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-[#003B71] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold">กำลังโหลดข้อมูลรายงาน OKR...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 shadow-sm">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">ไม่พบรายงานโครงการ OKR</h3>
          <p className="text-xs text-slate-500 mt-1">ยังไม่มีการบันทึกรายงาน หรือคำค้นหาไม่ตรงกับรายการใด</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReports.map((report) => {
            const currentScore = reportScores[report.report_id] || { head_score: 4, team_score: 4 }
            const isSaving = savingMap[report.report_id]

            const matchedProj = projects.find(p => p.project_id === report.project_id || p.project_name === report.project_name)
            const isResponsible = Boolean(
              currentUser && (
                (matchedProj && (
                  matchedProj.assignees?.some(a => a.user_id === currentUser.user_id) ||
                  matchedProj.head_of_project === currentUser.user_id ||
                  matchedProj.head?.user_id === currentUser.user_id
                )) ||
                (report.responsible_person_name && currentUser.name && (
                  report.responsible_person_name.includes(currentUser.name) ||
                  currentUser.name.includes(report.responsible_person_name)
                )) ||
                (report.head_name && currentUser.name && (
                  report.head_name.includes(currentUser.name) ||
                  currentUser.name.includes(report.head_name)
                ))
              )
            )

            const myExistingEval = evaluations.find(e => e.report_id === report.report_id && e.evaluator_id === currentUser?.user_id)
            const hasRatedTeam = Boolean(myExistingEval && myExistingEval.team_score !== null && myExistingEval.team_score !== undefined)

            const allTeamEvals = evaluations.filter(e => e.report_id === report.report_id && e.team_score !== null && e.team_score !== undefined)
            const avgTeam = allTeamEvals.length > 0
              ? (allTeamEvals.reduce((sum, e) => sum + (e.team_score || 0), 0) / allTeamEvals.length).toFixed(1)
              : null

            return (
              <div
                key={report.report_id}
                className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-sky-300 hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
                        Normal Report
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mt-1">
                        {report.project_name}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatThaiDate(report.created_at, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {report.initial_expected_outcome && (
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                        <Target className="w-3 h-3 text-amber-600" />
                        เป้าหมายที่คาดหวังเบื้องต้น (Initial Expected Outcome):
                      </span>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {report.initial_expected_outcome}
                      </p>
                    </div>
                  )}

                  {report.project_outcome && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        ผลสัมฤทธิ์ที่เกิดขึ้นจริง (Project Outcome):
                      </span>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {report.project_outcome}
                      </p>
                    </div>
                  )}

                  {report.project_details && (
                    <p className="text-xs text-slate-600 italic px-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      "{report.project_details}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ผู้รับผิดชอบ: <b className="text-slate-900">{report.responsible_person_name || 'ไม่ระบุ'}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#003B71]" />
                      <span>หัวหน้า: <b className="text-slate-900">{report.head_name || 'ไม่ระบุ'}</b></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">

                    <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-amber-800">คะแนนหัวหน้า (Head)</span>
                        <span className="text-xs font-black text-amber-900">{currentScore.head_score}/5 ดาว</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRateReport(report, 'head', star)}
                            className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
                            title={`ให้คะแนนหัวหน้า ${star} ดาว`}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= currentScore.head_score
                                  ? 'text-amber-500 fill-amber-400'
                                  : 'text-slate-300 fill-transparent'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-emerald-800">คะแนนทีมงาน (Team)</span>
                        {avgTeam ? (
                          <span className="text-[10px] font-bold text-emerald-700">เฉลี่ย {avgTeam}/5 ({allTeamEvals.length} คน)</span>
                        ) : (
                          <span className="text-xs font-black text-emerald-900">{currentScore.team_score}/5 ดาว</span>
                        )}
                      </div>

                      {isResponsible ? (
                        <div className="p-2 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-500 text-[10px] font-bold flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span>ไม่สามารถประเมินโครงการที่ตนเองรับผิดชอบได้</span>
                        </div>
                      ) : hasRatedTeam ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= (myExistingEval?.team_score || 0)
                                    ? 'text-emerald-500 fill-emerald-400'
                                    : 'text-slate-200 fill-transparent'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            ให้คะแนนไปแล้ว ({myExistingEval?.team_score}/5 ดาว)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRateReport(report, 'team', star)}
                              className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
                              title={`ให้คะแนนทีมงาน ${star} ดาว`}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  star <= currentScore.team_score
                                    ? 'text-emerald-500 fill-emerald-400'
                                    : 'text-slate-300 fill-transparent'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSaving && (
                    <div className="text-center text-[10px] text-sky-700 font-bold animate-pulse">
                      กำลังบันทึกคะแนนลงฐานข้อมูล Evaluations...
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
