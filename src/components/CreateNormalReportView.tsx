'use client'

import React, { useState, useEffect } from 'react'
import { ProjectWithHeadAndAssignees, UserProfile } from '@/types/database.types'
import { useRole } from '@/components/RoleContext'
import { createNormalReport } from '@/lib/services/okr-service'
import { FileSpreadsheet, CheckCircle2, Send, FolderGit2, User, Users, Target, Plus, X, UserCheck } from 'lucide-react'

interface CreateNormalReportViewProps {
  projects: ProjectWithHeadAndAssignees[]
  onSuccess?: () => void
}

export function CreateNormalReportView({ projects, onSuccess }: CreateNormalReportViewProps) {
  const { currentUser, allUsers } = useRole()
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.project_id || '')
  const [projectName, setProjectName] = useState<string>(projects[0]?.project_name || '')
  const [projectDetails, setProjectDetails] = useState<string>('')
  
  // Multi-Select Responsible Persons (Tags/Badges)
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [assigneeSelectValue, setAssigneeSelectValue] = useState<string>('')
  
  const [headName, setHeadName] = useState<string>(currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '')
  const [projectOutcome, setProjectOutcome] = useState<string>('')
  const [initialExpectedOutcome, setInitialExpectedOutcome] = useState<string>(projects[0]?.main_objective || '')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Whenever selected project changes, automatically pull initial_expected_outcome from project's main_objective
  useEffect(() => {
    const proj = projects.find(p => p.project_id === selectedProjectId)
    if (proj) {
      setProjectName(proj.project_name)
      setInitialExpectedOutcome(proj.main_objective || proj.description || '')
      
      const headStr = proj.head ? `${proj.head.first_name} ${proj.head.last_name}` : (currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '')
      setHeadName(headStr)

      // Initialize default assignees from project
      if (proj.assignees && proj.assignees.length > 0) {
        const initialNames = proj.assignees
          .map(a => a.user ? `${a.user.first_name} ${a.user.last_name}` : '')
          .filter(Boolean)
        setSelectedAssignees(initialNames)
      } else {
        setSelectedAssignees([])
      }
    }
  }, [selectedProjectId, projects, currentUser])

  const handleAddAssignee = (name: string) => {
    if (!name.trim()) return
    if (!selectedAssignees.includes(name.trim())) {
      setSelectedAssignees(prev => [...prev, name.trim()])
    }
    setAssigneeSelectValue('')
  }

  const handleRemoveAssignee = (nameToRemove: string) => {
    setSelectedAssignees(prev => prev.filter(name => name !== nameToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return

    const responsiblePersonString = selectedAssignees.length > 0
      ? selectedAssignees.join(', ')
      : 'อาจารย์ผู้รับผิดชอบโครงการ'

    setIsSubmitting(true)
    await createNormalReport({
      project_id: selectedProjectId || undefined,
      project_name: projectName,
      project_details: projectDetails.trim() || undefined,
      responsible_person_name: responsiblePersonString,
      head_name: headName.trim() || undefined,
      project_outcome: projectOutcome.trim() || undefined,
      initial_expected_outcome: initialExpectedOutcome.trim() || undefined,
      head_evaluation_score: 80, // Default baseline for report record, evaluated interactively in view mode
      team_evaluation_score: 80,
      created_by: currentUser?.user_id
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
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#003B71] via-[#005B94] to-[#00A8B5] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-200 flex-shrink-0 shadow-inner">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-white text-[#003B71]">
              Normal Report Creator
            </span>
            <span className="text-xs text-sky-100">กระจายรายงานสู่ทุกบทบาท (ยกเว้นผู้บริหาร)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
            สร้างรายงานทั่วไป (Table Normal Report)
          </h2>
          <p className="text-xs sm:text-sm text-slate-100 mt-1 max-w-2xl leading-relaxed">
            ป้อนรายละเอียดผลสัมฤทธิ์โครงการ, เป้าหมายที่คาดหวัง, และระบุอาจารย์ผู้ร่วมรับผิดชอบแบบหลายท่าน (Multi-Select) เพื่อเผยแพร่ในเมนู "Report โครงการ OKR"
          </p>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-bold flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <span>สร้างรายงานทั่วไปและเผยแพร่ไปยังเมนู "Report โครงการ OKR" เรียบร้อยแล้ว!</span>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Select Project */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4 text-[#003B71]" />
              เลือกโครงการ OKR ต้นทาง (project_id & project_name) *
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  [{p.department.replace('ภาควิชา', '')}] {p.project_name} ({p.progress_percentage}%)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Multi-Select Responsible Persons (Tag Input UI) */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  ผู้รับผิดชอบโครงการ (Multi-Select Assignees) *
                </span>
                <span className="text-[11px] text-slate-400 font-normal">เลือกได้หลายท่าน</span>
              </label>

              {/* Tag / Badge List */}
              <div className="min-h-[46px] p-2 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-1.5">
                {selectedAssignees.length === 0 ? (
                  <span className="text-xs text-slate-400 px-2">ยังไม่ได้เลือกผู้รับผิดชอบ (กรุณาเลือกจากดรอปดาวน์ด้านล่าง)</span>
                ) : (
                  selectedAssignees.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#003B71]/10 border border-[#003B71]/20 text-[#003B71] text-xs font-bold shadow-xs animate-fadeIn"
                    >
                      <UserCheck className="w-3 h-3 text-[#003B71]" />
                      <span>{name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignee(name)}
                        className="p-0.5 rounded-full hover:bg-[#003B71]/20 text-slate-500 hover:text-rose-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Dropdown to add assignee from registered users */}
              <div className="flex gap-2">
                <select
                  value={assigneeSelectValue}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddAssignee(e.target.value)
                    }
                  }}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#003B71]"
                >
                  <option value="">+ เพิ่มอาจารย์ผู้รับผิดชอบจากรายชื่อ...</option>
                  {allUsers.map((u) => {
                    const fullName = `${u.first_name} ${u.last_name}`
                    return (
                      <option key={u.user_id} value={fullName}>
                        [{u.role}] {fullName} ({u.department})
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Head Name */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#003B71]" />
                หัวหน้าโครงการ (head_name) *
              </label>
              <input
                type="text"
                required
                placeholder="ระบุชื่อหัวหน้าโครงการ..."
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
              />
            </div>
          </div>

          {/* Initial Expected Outcome - pulled from main_objective */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-500" />
                เป้าหมายที่คาดหวังเบื้องต้น (initial_expected_outcome - ดึงจาก objective โครงการ) *
              </label>
              <span className="text-[11px] text-[#003B71] font-semibold">Auto-synced จาก Table Projects</span>
            </div>
            <textarea
              required
              rows={2}
              placeholder="เป้าหมายที่ตั้งไว้ตั้งแต่แรก..."
              value={initialExpectedOutcome}
              onChange={(e) => setInitialExpectedOutcome(e.target.value)}
              className="w-full bg-amber-50/50 border border-amber-200 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
            />
          </div>

          {/* Project Details */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-slate-800">
              รายละเอียดความก้าวหน้าโครงการ (project_details)
            </label>
            <textarea
              rows={3}
              placeholder="ระบุกิจกรรมที่ได้ดำเนินการ, การทดลอง, การจัดอบรม หรือการดำเนินงานในงวด..."
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
            />
          </div>

          {/* Project Outcome */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-slate-800">
              ผลสัมฤทธิ์ที่เกิดขึ้นจริง (project_outcome) *
            </label>
            <textarea
              required
              rows={3}
              placeholder="ระบุผลผลิต ผลลัพธ์ หรือข้อสรุปที่ได้จริง เช่น จำนวนผู้เข้าอบรม, ผลวิจัย, สิทธิบัตร..."
              value={projectOutcome}
              onChange={(e) => setProjectOutcome(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B71]/20 focus:border-[#003B71]"
            />
          </div>

          {/* Note: Scoring removed from creation forms per requirements and moved to view-mode evaluation */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs text-[#003B71] flex items-center gap-2">
            <Target className="w-4 h-4 flex-shrink-0" />
            <span>หมายเหตุ: การให้คะแนนประเมิน (1-5 ดาว) จะทำผ่านมุมมองการตรวจรายงานในเมนู "Report โครงการ OKR"</span>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#00A8B5] hover:opacity-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#003B71]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>กำลังบันทึกและกระจายรายงาน...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>บันทึก Normal Report และกระจายสู่เมนู "Report โครงการ OKR"</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
