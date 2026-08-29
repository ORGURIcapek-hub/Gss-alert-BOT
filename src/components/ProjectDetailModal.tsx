'use client'

import React, { useState } from 'react'
import { ProjectWithHeadAndAssignees, ProjectStatus } from '@/types/database.types'
import { X, Calendar, DollarSign, Upload, FileText, CheckCircle, UserCheck } from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { updateProjectProgressRecord, uploadEvidenceRecord } from '@/lib/services/okr-service'
import confetti from 'canvas-confetti'

interface ProjectDetailModalProps {
  project: ProjectWithHeadAndAssignees | null
  onClose: () => void
  onUpdated: () => void
}

export function ProjectDetailModal({ project, onClose, onUpdated }: ProjectDetailModalProps) {
  const { currentUser, currentRole } = useRole()
  if (!project) return null

  const isHead = currentUser ? project.head_of_project === currentUser.user_id : false
  const isAssignee = currentUser ? project.assignees?.some(a => a.user_id === currentUser.user_id) : false
  const isAdmin = currentRole === 'admin'
  const canEdit = isHead || isAssignee || isAdmin

  const [progress, setProgress] = useState(Number(project.progress_percentage))
  const [spent, setSpent] = useState(Number(project.spent_amount))
  const [bottleneck, setBottleneck] = useState(project.bottleneck || '')
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleSaveProgress = async () => {
    setIsSaving(true)
    let newStatus = status
    if (progress === 100) {
      newStatus = 'Completed'
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } })
    } else if (bottleneck.trim().length > 0) {
      newStatus = 'Delayed'
    } else {
      newStatus = 'In Progress'
    }

    await updateProjectProgressRecord(
      project.project_id,
      progress,
      bottleneck.trim().length > 0 ? bottleneck.trim() : null,
      newStatus,
      spent
    )

    setStatus(newStatus)
    setIsSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
    onUpdated()
  }

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFileName || !currentUser) return
    setIsUploading(true)
    await uploadEvidenceRecord(
      project.project_id,
      currentUser.user_id,
      uploadFileName,
      uploadDescription
    )
    setUploadFileName('')
    setUploadDescription('')
    setIsUploading(false)
    onUpdated()
  }

  const headName = project.head ? `${project.head.first_name} ${project.head.last_name}` : 'ไม่ระบุ'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-white/15 shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 pr-10">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            {project.department.replace('ภาควิชา', '')}
          </span>
          <span className="text-[11px] text-slate-400 font-medium truncate">
            {project.project_type}
          </span>
        </div>

        <h2 className="text-base sm:text-xl font-bold text-white leading-snug pr-8">
          {project.project_name}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4">
          <div className="glass-card p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">หัวหน้าโครงการ</span>
              <p className="text-[11px] font-bold text-white truncate">{headName}</p>
            </div>
          </div>

          <div className="glass-card p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">งบประมาณ</span>
              <p className="text-[11px] font-bold text-white truncate">
                {Number(project.budget).toLocaleString()} ฿
              </p>
            </div>
          </div>

          <div className="glass-card p-3 flex items-center gap-2.5 col-span-2 sm:col-span-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">ระยะเวลา</span>
              <p className="text-[11px] font-bold text-white truncate">
                {project.start_date || '2024-01-01'} ถึง {project.end_date || '2024-12-31'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
            <h3 className="font-bold text-white text-xs mb-1">เป้าหมายหลักและตัวชี้วัด (Objectives)</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">{project.main_objective || 'ไม่มีข้อมูลระบุ'}</p>
            {project.sub_objective && (
              <p className="text-slate-400 text-[11px] mt-1.5 pt-1.5 border-t border-white/5">
                เป้าหมายย่อย: {project.sub_objective}
              </p>
            )}
          </div>

          <div className="glass-card p-4 border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs">อัปเดตความก้าวหน้าและการเบิกจ่าย</h3>
              {!canEdit && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                  Read-Only
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300 text-[11px]">ระดับความก้าวหน้า</span>
                <span className="text-sky-400 font-bold">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                disabled={!canEdit}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                  งบประมาณที่ใช้จริง (บาท)
                </label>
                <input
                  type="number"
                  value={spent}
                  disabled={!canEdit}
                  onChange={(e) => setSpent(Number(e.target.value))}
                  className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                  ปัญหา/อุปสรรค (Bottleneck)
                </label>
                <input
                  type="text"
                  placeholder="ระบุข้อจำกัด..."
                  value={bottleneck}
                  disabled={!canEdit}
                  onChange={(e) => setBottleneck(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center justify-between pt-1">
                {saveSuccess && (
                  <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> บันทึกสำเร็จ
                  </span>
                )}
                <button
                  onClick={handleSaveProgress}
                  disabled={isSaving}
                  className="ml-auto px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold text-xs shadow-glow-emerald transition-all active:scale-95"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกความก้าวหน้า'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
            <h3 className="font-bold text-white text-xs mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              หลักฐานและเอกสารแนบ ({project.evidences?.length || 0})
            </h3>

            <div className="space-y-1.5 mb-3">
              {!project.evidences || project.evidences.length === 0 ? (
                <p className="text-slate-500 text-[11px]">ยังไม่มีเอกสารแนบ</p>
              ) : (
                project.evidences.map((ev) => (
                  <div
                    key={ev.evidence_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-white/10"
                  >
                    <span className="text-white text-[11px] truncate max-w-[200px] sm:max-w-xs">{ev.file_name}</span>
                    <a
                      href={ev.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-semibold"
                    >
                      ดาวน์โหลด
                    </a>
                  </div>
                ))
              )}
            </div>

            {canEdit && (
              <form onSubmit={handleUploadEvidence} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                <input
                  type="text"
                  placeholder="ชื่อไฟล์ (เช่น report.pdf)"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  required
                  className="glass-input rounded-xl px-2.5 py-1.5 text-xs flex-1"
                />
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>แนบไฟล์</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
