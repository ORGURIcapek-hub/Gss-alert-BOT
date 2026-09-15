'use client'

import React, { useState, useEffect } from 'react'
import { Evaluation, DashboardReportWithDetails } from '@/types/database.types'
import { fetchEvaluations, fetchDashboardReports } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'
import { Award, Star, Sparkles, TrendingUp, Inbox } from 'lucide-react'
import { EvaluationCardSkeleton } from '@/components/ui/Skeleton'

export function ExecutiveEvaluationsView() {
  const { currentUser } = useRole()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [dashboards, setDashboards] = useState<DashboardReportWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const evals = await fetchEvaluations()
      const dashes = await fetchDashboardReports()

      setEvaluations(evals)
      setDashboards(dashes)
    } catch (e) {
      console.error('Failed to load executive evaluations', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    let channel: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('sdu_okr_sync_channel')
        channel.onmessage = (event) => {
          if (event.data?.type === 'EVALUATIONS_UPDATED' || event.data?.type === 'PROJECTS_UPDATED') {
            loadData()
          }
        }
      }
    } catch {}

    return () => {
      channel?.close()
    }
  }, [])

  const isMyDashboard = (d: DashboardReportWithDetails) => {
    if (!currentUser) return false
    if (d.head_id && d.head_id === currentUser.user_id) return true
    if (d.head_name && currentUser.name && (d.head_name.includes(currentUser.name) || currentUser.name.includes(d.head_name))) return true
    if (d.project_snapshots && Array.isArray(d.project_snapshots)) {
      if (d.project_snapshots.some(ps => ps.head_name && currentUser.name && (ps.head_name.includes(currentUser.name) || currentUser.name.includes(ps.head_name)))) {
        return true
      }
    }
    return false
  }

  const myDashboards = dashboards.filter(isMyDashboard)
  const myDashboardIds = new Set(myDashboards.map(d => d.dashboard_id))

  const executiveScores = evaluations.filter(e =>
    e.dashboard_id &&
    myDashboardIds.has(e.dashboard_id) &&
    e.executive_score !== null &&
    e.executive_score !== undefined &&
    e.executive_score > 0
  )

  const averageScore = executiveScores.length > 0
    ? executiveScores.reduce((acc, curr) => acc + (curr.executive_score || 0), 0) / executiveScores.length
    : 0

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Award className="w-7 h-7 text-[#003B71]" />
              <span>คะแนนจากผู้บริหาร (Executive Evaluations)</span>
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-white/80 font-semibold text-sm">คะแนนเฉลี่ยรวม</span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-4xl font-black">--</h3>
                <span className="text-lg font-medium text-white/80">/ 5.0</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
            <span className="text-slate-500 font-semibold text-sm">จำนวนการประเมินทั้งหมด</span>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-4xl font-black text-slate-900">--</h3>
              <span className="text-lg font-medium text-slate-500">ครั้ง</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <EvaluationCardSkeleton />
          <EvaluationCardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-[#003B71]" />
            <span>คะแนนจากผู้บริหาร (Executive Evaluations)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            ผลการประเมินความพึงพอใจจากผู้บริหาร ต่อรายงานสรุป Dashboard ที่คุณส่งไป
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-white/80 font-semibold text-sm">คะแนนเฉลี่ยรวม</span>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-4xl font-black">{averageScore.toFixed(1)}</h3>
              <span className="text-lg font-medium text-white/80">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-4">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= Math.round(averageScore) ? 'fill-amber-400 text-amber-400' : 'fill-white/20 text-transparent'}`}
                />
              ))}
            </div>
          </div>
          <Sparkles className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-slate-500 font-semibold text-sm">จำนวนการประเมินทั้งหมด</span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-4xl font-black text-slate-900">{executiveScores.length}</h3>
            <span className="text-lg font-medium text-slate-500">ครั้ง</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl w-fit">
            <TrendingUp className="w-4 h-4" />
            ผู้บริหารประเมินครบถ้วน
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mt-8 space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
          <Inbox className="w-5 h-5 text-slate-500" />
          <span>ประวัติการประเมินรายครั้ง</span>
        </h3>

        {executiveScores.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Award className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <h4 className="text-base font-bold text-slate-600">ยังไม่มีคะแนนการประเมิน</h4>
            <p className="text-sm mt-1">ผู้บริหารยังไม่ได้ประเมินรายงานของคุณ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {executiveScores.map(evaluation => {
              const dash = myDashboards.find(d => d.dashboard_id === evaluation.dashboard_id)
              const score = evaluation.executive_score || 0

              return (
                <div key={evaluation.eval_id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#003B71]">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      รายงานสรุปที่ส่งเมื่อ {new Date(evaluation.created_at).toLocaleDateString('th-TH')}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {dash?.overall_okr_info || 'รายงานสรุปภาพรวม OKR'}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      รวม {dash?.project_snapshots?.length || dash?.project_ids?.length || 0} โครงการในรายงาน
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-white px-4 py-2.5 rounded-xl border border-amber-200 shadow-sm shrink-0">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= score ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`}
                      />
                    ))}
                    <span className="ml-2 font-black text-slate-800 text-sm">{score}.0</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
