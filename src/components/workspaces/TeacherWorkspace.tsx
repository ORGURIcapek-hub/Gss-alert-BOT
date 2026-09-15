'use client'

import React, { useState, useEffect } from 'react'
import { OKR, ProjectWithHeadAndAssignees, Evaluation, NormalReport } from '@/types/database.types'
import { GraduationCap, FileCheck2, Clock, Upload, ArrowRight, Sparkles, CheckCircle2, Plus, Award, Star, Inbox, TrendingUp } from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { getUserFullName, formatDepartmentShort, removeTitlesAndRoles, formatThaiDate, formatThaiDateTime } from '@/lib/user-constants'
import { fetchEvaluations, fetchNormalReports } from '@/lib/services'

interface TeacherWorkspaceProps {
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateModal?: () => void
  initialTab?: 'projects' | 'evaluations'
  onProjectsRefresh?: () => void
}

export function TeacherWorkspace({
  projects,
  onSelectProject,
  onOpenCreateModal,
  initialTab = 'projects',
  onProjectsRefresh
}: TeacherWorkspaceProps) {
  const { currentUser, allUsers } = useRole()
  const [currentTab, setCurrentTab] = useState<'projects' | 'evaluations'>(initialTab)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [normalReports, setNormalReports] = useState<NormalReport[]>([])
  const [isLoadingEvals, setIsLoadingEvals] = useState(false)

  useEffect(() => {
    setCurrentTab(initialTab)
  }, [initialTab])

  const loadEvaluationData = async () => {
    setIsLoadingEvals(true)
    try {
      const [evalList, reportList] = await Promise.all([
        fetchEvaluations(),
        fetchNormalReports()
      ])
      setEvaluations(evalList)
      setNormalReports(reportList)
    } catch (e) {
      console.warn('[TeacherWorkspace] load evals error', e)
    } finally {
      setIsLoadingEvals(false)
    }
  }

  useEffect(() => {
    loadEvaluationData()

    let channel: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('sdu_okr_sync_channel')
        channel.onmessage = (event) => {
          if (event.data?.type === 'PROJECTS_UPDATED') {
            loadEvaluationData()
            onProjectsRefresh?.()
          } else if (event.data?.type === 'EVALUATIONS_UPDATED') {
            loadEvaluationData()
          }
        }
      }
    } catch {}

    return () => {
      channel?.close()
    }
  }, [onProjectsRefresh])

  const myAssignedProjects = projects.filter(p =>
    p.head_of_project === currentUser?.user_id ||
    p.assignees?.some(a => a.user_id === currentUser?.user_id)
  )

  const myCompleted = myAssignedProjects.filter(p => p.progress_percentage === 100).length
  const myTotalEvidences = myAssignedProjects.reduce((acc, p) => acc + (p.evidences?.length || 0), 0)

  const myProjectIds = new Set(myAssignedProjects.map(p => p.project_id))
  const myReports = normalReports.filter(r => {
    if (r.project_id) {
      return myProjectIds.has(r.project_id)
    }
    return Boolean(r.responsible_person_name && currentUser?.name && r.responsible_person_name.includes(currentUser.name))
  })
  const myReportIds = new Set(myReports.map(r => r.report_id))

  const teamEvaluations = evaluations.filter(e => {
    if (e.project_id && !myProjectIds.has(e.project_id)) return false
    if (e.report_id && !myReportIds.has(e.report_id)) return false
    return Boolean((e.report_id && myReportIds.has(e.report_id)) || (e.project_id && myProjectIds.has(e.project_id)))
  }).filter(e => e.team_score !== null && e.team_score !== undefined && e.team_score > 0)

  const totalTeamEvaluationsCount = teamEvaluations.length
  const averageTeamScore = totalTeamEvaluationsCount > 0
    ? (teamEvaluations.reduce((sum, e) => sum + (e.team_score || 0), 0) / totalTeamEvaluationsCount).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            พื้นที่ทำงานอาจารย์ผู้รับผิดชอบโครงการ OKR
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentTab('projects')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'projects'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              โครงการที่ได้รับมอบหมาย ({myAssignedProjects.length})
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('evaluations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'evaluations'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>คะแนนการประเมิน ({totalTeamEvaluationsCount})</span>
            </button>
          </div>
        </div>
      </div>

      {currentTab === 'projects' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold block">งานที่ได้รับมอบหมาย</span>
                <span className="text-2xl font-black text-slate-900">{myAssignedProjects.length} โครงการ</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold block">แนบหลักฐานแล้ว</span>
                <span className="text-2xl font-black text-emerald-700">{myTotalEvidences} รายการ</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>รายการโครงการที่คุณร่วมรับผิดชอบ ({myAssignedProjects.length})</span>
            </h3>

            {myAssignedProjects.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-sm sm:text-base font-medium">คุณยังไม่มีโครงการที่ได้รับมอบหมายในขณะนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {myAssignedProjects.map((p) => {
                  const rawHeadName = getUserFullName(p.head) || 'หัวหน้าโครงการ'
                  const headName = removeTitlesAndRoles(rawHeadName) || 'หัวหน้าโครงการ'
                  const isCompleted = p.progress_percentage === 100
                  return (
                    <div
                      key={p.project_id}
                      onClick={() => onSelectProject(p)}
                      className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {formatDepartmentShort(p.department)}
                          </span>
                          <span className="text-xs sm:text-sm text-slate-600">
                            หัวหน้า: <b className="text-slate-900">{headName}</b>
                          </span>
                        </div>

                        <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                          {p.project_name}
                        </h4>

                        <p className="text-xs sm:text-sm text-slate-700 line-clamp-2 leading-relaxed font-medium">
                          {p.main_objective || p.description || 'ไม่มีข้อมูลเป้าหมายระบุ'}
                        </p>
                      </div>

                      <div className="pt-3.5 border-t border-slate-100 space-y-3.5">
                        <div>
                          <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
                            <span className="text-slate-600">ความก้าวหน้าโครงการ</span>
                            <span className="text-emerald-700">{p.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#003B71]'}`}
                              style={{ width: `${p.progress_percentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs sm:text-sm text-slate-600 font-medium">
                            หลักฐาน: <b className="text-slate-900">{p.evidences?.length || 0} ไฟล์</b>
                          </span>
                          <button
                            type="button"
                            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all border border-emerald-200 cursor-pointer active:scale-95"
                          >
                            <span>อัปเดตงาน & จัดการไฟล์</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-white/80 font-semibold text-sm">คะแนนประเมินทีมงานเฉลี่ยรวม</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-black">{averageTeamScore}</h3>
                  <span className="text-lg font-medium text-white/80">/ 5.0</span>
                </div>
                <div className="flex items-center gap-1 mt-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(Number(averageTeamScore)) ? 'fill-amber-400 text-amber-400' : 'fill-white/20 text-transparent'}`}
                    />
                  ))}
                </div>
              </div>
              <Sparkles className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-slate-500 font-semibold text-sm">จำนวนการประเมินจากผู้ใช้งานทั้งหมด</span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-4xl font-black text-slate-900">{totalTeamEvaluationsCount}</h3>
                <span className="text-lg font-medium text-slate-500">ครั้ง</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl w-fit">
                <TrendingUp className="w-4 h-4" />
                ประเมินผ่าน Report โครงการ OKR
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
              <Inbox className="w-5 h-5 text-emerald-600" />
              <span>ผลคะแนนการประเมินแยกตามโครงการที่คุณรับผิดชอบ ({myAssignedProjects.length} โครงการ)</span>
            </h3>

            {isLoadingEvals ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold">กำลังโหลดคะแนนการประเมิน...</p>
              </div>
            ) : myAssignedProjects.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-sm sm:text-base font-medium">ไม่มีโครงการที่คุณรับผิดชอบในขณะนี้</p>
              </div>
            ) : (
              <div className="space-y-6">
                {myAssignedProjects.map((proj) => {
                  const projReports = normalReports.filter(r => r.project_id === proj.project_id || r.project_name === proj.project_name)
                  const projReportIds = new Set(projReports.map(r => r.report_id))

                  const projEvals = evaluations.filter(e =>
                    (e.project_id && e.project_id === proj.project_id) ||
                    (e.report_id && projReportIds.has(e.report_id))
                  ).filter(e => e.team_score !== null && e.team_score !== undefined && e.team_score > 0)

                  const projAvg = projEvals.length > 0
                    ? (projEvals.reduce((sum, e) => sum + (e.team_score || 0), 0) / projEvals.length).toFixed(1)
                    : null

                  return (
                    <div
                      key={proj.project_id}
                      className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 transition-all hover:border-emerald-500"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {formatDepartmentShort(proj.department)}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ความคืบหน้า {proj.progress_percentage}%
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900">{proj.project_name}</h4>
                        </div>

                        <div className="flex items-center gap-3 self-start sm:self-auto">
                          {projAvg ? (
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-amber-200 shadow-xs">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${star <= Math.round(Number(projAvg)) ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`}
                                  />
                                ))}
                              </div>
                              <span className="font-black text-slate-800 text-sm">{projAvg}</span>
                              <span className="text-[11px] text-slate-500 font-medium">({projEvals.length} คนประเมิน)</span>
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs font-semibold">
                              ยังไม่มีการประเมิน
                            </span>
                          )}
                        </div>
                      </div>

                      {projEvals.length > 0 && (
                        <div className="pt-3 border-t border-slate-200/80 space-y-2">
                          <span className="text-xs font-bold text-slate-700 block">ประวัติการให้คะแนนจากผู้ประเมิน:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {projEvals.map((ev) => {
                              const evaluator = allUsers.find(u => u.user_id === ev.evaluator_id)
                              const evaluatorName = evaluator ? removeTitlesAndRoles(getUserFullName(evaluator)) : 'ผู้ใช้งานในระบบ'
                              return (
                                <div key={ev.eval_id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-slate-900 block truncate max-w-[150px]">{evaluatorName}</span>
                                    <span className="text-[10px] text-slate-400 block">{formatThaiDateTime(ev.created_at)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span className="font-black text-amber-900 text-xs">{ev.team_score}.0</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
