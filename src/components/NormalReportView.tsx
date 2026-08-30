'use client'

import React, { useState, useEffect } from 'react'
import { NormalReport, Evaluation } from '@/types/database.types'
import { fetchNormalReports, fetchEvaluations, saveEvaluationRecord } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'
import { FileText, Search, Star, User, Users, Target, Calendar, CheckCircle2, Award, Printer, Sparkles } from 'lucide-react'

export function NormalReportView() {
  const { currentUser } = useRole()
  const [reports, setReports] = useState<NormalReport[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  
  // Head & Team 5-point scores map: { [report_id]: { head_score: number, team_score: number } }
  const [reportScores, setReportScores] = useState<Record<string, { head_score: number; team_score: number }>>({})
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({})

  const loadReportsAndEvaluations = async () => {
    setLoading(true)
    const [reportList, evalList] = await Promise.all([
      fetchNormalReports(),
      fetchEvaluations()
    ])
    setReports(reportList)

    // Build initial 5-point score map
    const scoreMap: Record<string, { head_score: number; team_score: number }> = {}
    reportList.forEach((r) => {
      const foundEval = evalList.find(e => e.report_id === r.report_id)
      if (foundEval) {
        scoreMap[r.report_id] = {
          head_score: foundEval.head_score,
          team_score: foundEval.team_score || 4
        }
      } else {
        scoreMap[r.report_id] = {
          head_score: Math.max(1, Math.min(5, Math.round(Number(r.head_evaluation_score || 80) / 20))),
          team_score: Math.max(1, Math.min(5, Math.round(Number(r.team_evaluation_score || 80) / 20)))
        }
      }
    })
    setReportScores(scoreMap)
    setLoading(false)
  }

  useEffect(() => {
    loadReportsAndEvaluations()
  }, [])

  const handleRateReport = async (reportId: string, type: 'head' | 'team', score: number) => {
    if (!currentUser) return
    const current = reportScores[reportId] || { head_score: 4, team_score: 4 }
    const updated = {
      ...current,
      [type === 'head' ? 'head_score' : 'team_score']: score
    }

    setReportScores(prev => ({ ...prev, [reportId]: updated }))
    setSavingMap(prev => ({ ...prev, [reportId]: true }))

    await saveEvaluationRecord({
      report_id: reportId,
      evaluator_id: currentUser.user_id,
      head_score: updated.head_score,
      team_score: updated.team_score
    })

    setSavingMap(prev => ({ ...prev, [reportId]: false }))
  }

  const filteredReports = reports.filter(r =>
    r.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.responsible_person_name && r.responsible_person_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.head_name && r.head_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.project_outcome && r.project_outcome.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-200 flex-shrink-0 shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#00A8B5] text-white">
                OKR Reports Feed
              </span>
              <span className="text-xs text-sky-200">ระบบรายงานทั่วไปและประเมินผล 5 ดาว</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
              Report โครงการ OKR (Normal Reports Hub)
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              สืบค้นและติดตามรายงานความก้าวหน้าโครงการ OKR, ผลสัมฤทธิ์ที่เกิดขึ้นจริง, และประเมินคะแนน 5 ดาวร่วมกันระหว่างหัวหน้าและลูกทีม (บันทึกลงตาราง Evaluations)
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-2xl bg-white text-[#003B71] hover:bg-slate-100 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#003B71]" />
          <span>พิมพ์รายงาน</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
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

      {/* Reports Grid */}
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
                        {new Date(report.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Initial Expected Outcome (pulled from objective) */}
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

                  {/* Project Outcome */}
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

                  {/* Project Details if available */}
                  {report.project_details && (
                    <p className="text-xs text-slate-600 italic px-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      "{report.project_details}"
                    </p>
                  )}
                </div>

                {/* Footer: Responsible people & 5-Star Interactive Rating Bars */}
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

                  {/* Interactive 5-Point Evaluation Bars (Head & Team) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    
                    {/* Head Evaluation Bar */}
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
                            onClick={() => handleRateReport(report.report_id, 'head', star)}
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

                    {/* Team Evaluation Bar */}
                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-emerald-800">คะแนนทีมงาน (Team)</span>
                        <span className="text-xs font-black text-emerald-900">{currentScore.team_score}/5 ดาว</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRateReport(report.report_id, 'team', star)}
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
