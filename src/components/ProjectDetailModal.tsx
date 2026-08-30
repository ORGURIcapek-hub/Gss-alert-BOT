'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ProjectWithHeadAndAssignees, ProjectStatus, ProjectAssignment } from '@/types/database.types'
import { X, Calendar, DollarSign, Upload, FileText, CheckCircle, UserCheck, Trash2, Download, ExternalLink, FileUp, AlertCircle, FileImage } from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { updateProjectProgressRecord, submitEvidenceSubmission, deleteEvidenceSubmission, fetchProjectAssignments } from '@/lib/services/okr-service'
import confetti from 'canvas-confetti'

interface ProjectDetailModalProps {
  project: ProjectWithHeadAndAssignees | null
  onClose: () => void
  onUpdated: () => void
}

export function ProjectDetailModal({ project, onClose, onUpdated }: ProjectDetailModalProps) {
  const { currentUser, currentRole } = useRole()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [assignments, setAssignments] = useState<ProjectAssignment[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadDescription, setUploadDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [progress, setProgress] = useState(Number(project?.progress_percentage || 0))
  const [spent, setSpent] = useState(Number(project?.spent_amount || 0))
  const [bottleneck, setBottleneck] = useState(project?.bottleneck || '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status || 'In Progress')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (project) {
      fetchProjectAssignments(project.project_id).then(setAssignments)
    }
  }, [project])

  if (!project) return null

  // Check if current user is assigned to this project in Project_Assignments or is Head or Admin
  const isHead = currentUser ? project.head_of_project === currentUser.user_id : false
  const isAssigneeFromProp = currentUser ? project.assignees?.some(a => a.user_id === currentUser.user_id) : false
  const isAssignedInTable = currentUser ? assignments.some(a => a.user_id === currentUser.user_id) : false
  const isAdmin = currentRole === 'admin'
  const isExecutive = currentRole === 'executive'

  const canEdit = isHead || isAssigneeFromProp || isAssignedInTable || isAdmin
  const canUploadEvidence = (isAssigneeFromProp || isAssignedInTable || isHead || isAdmin) && !isExecutive

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('')
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (!validTypes.includes(file.type) && !['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        setUploadError('ระบบรองรับเฉพาะไฟล์เอกสาร PDF หรือรูปภาพ JPG, JPEG, PNG เท่านั้น')
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError('')

    if (!selectedFile) {
      setUploadError('กรุณาเลือกไฟล์หลักฐาน (PDF หรือ JPG/PNG) จากเครื่องของคุณ')
      return
    }
    if (!currentUser) return

    setIsUploading(true)

    try {
      // Create local object URL for preview and simulated storage path
      const fakeStorageUrl = URL.createObjectURL(selectedFile)
      const mimeType = selectedFile.type || (selectedFile.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')

      await submitEvidenceSubmission({
        project_id: project.project_id,
        sender_id: currentUser.user_id,
        file_name: selectedFile.name,
        file_path: fakeStorageUrl,
        file_type: mimeType,
        description: uploadDescription.trim() || undefined
      })

      setSelectedFile(null)
      setUploadDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      setIsUploading(false)
      onUpdated()
    } catch (err: any) {
      setUploadError(err?.message || 'ไม่สามารถอัปโหลดไฟล์ได้')
      setIsUploading(false)
    }
  }

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('คุณต้องการลบไฟล์แนบนี้ใช่หรือไม่?')) return
    setDeletingId(evidenceId)
    await deleteEvidenceSubmission(evidenceId)
    setDeletingId(null)
    onUpdated()
  }

  const headName = project.head ? `${project.head.first_name} ${project.head.last_name}` : 'ไม่ระบุ'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto custom-scrollbar relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Department and Type Badge */}
        <div className="flex items-center gap-2 mb-2 pr-12">
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
            {project.department.replace('ภาควิชา', '')}
          </span>
          <span className="text-xs text-slate-500 font-medium truncate">
            {project.project_type}
          </span>
        </div>

        {/* Project Name */}
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug pr-8">
          {project.project_name}
        </h2>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#003B71]/10 flex items-center justify-center text-[#003B71] flex-shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 font-semibold block">หัวหน้าโครงการ</span>
              <p className="text-xs font-bold text-slate-900 truncate">{headName}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 font-semibold block">งบประมาณ</span>
              <p className="text-xs font-bold text-slate-900 truncate">
                {Number(project.budget).toLocaleString()} ฿
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 font-semibold block">ระยะเวลา</span>
              <p className="text-xs font-bold text-slate-900 truncate">
                {project.start_date || '2024-01-01'} ถึง {project.end_date || '2024-12-31'}
              </p>
            </div>
          </div>
        </div>

        {/* Objectives Box */}
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h3 className="font-bold text-slate-900 text-xs mb-1">เป้าหมายหลักและตัวชี้วัด (Objectives)</h3>
            <p className="text-slate-700 text-xs leading-relaxed font-medium">{project.main_objective || 'ไม่มีข้อมูลระบุ'}</p>
            {project.sub_objective && (
              <p className="text-slate-500 text-xs mt-2 pt-2 border-t border-slate-200">
                เป้าหมายย่อย: {project.sub_objective}
              </p>
            )}
          </div>

          {/* Progress & Bottleneck Update */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">อัปเดตความก้าวหน้าและการเบิกจ่าย</h3>
              {!canEdit && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  Read-Only (ดูได้อย่างเดียว)
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700">ระดับความก้าวหน้า</span>
                <span className="text-[#003B71]">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                disabled={!canEdit}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-[#003B71] cursor-pointer disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  งบประมาณที่ใช้จริง (บาท)
                </label>
                <input
                  type="number"
                  value={spent}
                  disabled={!canEdit}
                  onChange={(e) => setSpent(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  ปัญหา/อุปสรรค (Bottleneck)
                </label>
                <input
                  type="text"
                  placeholder="ระบุข้อจำกัดหรือปัญหา..."
                  value={bottleneck}
                  disabled={!canEdit}
                  onChange={(e) => setBottleneck(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#003B71]"
                />
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center justify-between pt-1">
                {saveSuccess && (
                  <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> บันทึกสำเร็จ
                  </span>
                )}
                <button
                  onClick={handleSaveProgress}
                  disabled={isSaving}
                  className="ml-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกความก้าวหน้า'}
                </button>
              </div>
            )}
          </div>

          {/* Evidence Attachments Section with Native Picker & Permission Validation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#003B71]" />
                หลักฐานและเอกสารแนบ ({project.evidences?.length || 0})
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">
                รองรับเฉพาะ PDF, JPG, JPEG, PNG
              </span>
            </div>

            <div className="space-y-2 mb-3">
              {!project.evidences || project.evidences.length === 0 ? (
                <p className="text-slate-400 text-xs py-2">ยังไม่มีเอกสารหลักฐานแนบ</p>
              ) : (
                project.evidences.map((ev) => (
                  <div
                    key={ev.evidence_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {ev.file_name.toLowerCase().endsWith('.pdf') ? (
                        <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : (
                        <FileImage className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="text-slate-900 text-xs font-semibold truncate block max-w-[180px] sm:max-w-xs">
                          {ev.file_name}
                        </span>
                        {ev.description && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {ev.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={ev.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#003B71] text-[11px] font-bold border border-sky-200 transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>เปิดดู/ดาวน์โหลด</span>
                      </a>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEvidence(ev.evidence_id)}
                          disabled={deletingId === ev.evidence_id}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                          title="ลบไฟล์แนบนี้ (Delete file)"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Validation Check: Only Assigned Members / OKR Head can view upload form */}
            {canUploadEvidence ? (
              <form onSubmit={handleUploadEvidence} className="space-y-3 pt-3 border-t border-slate-200">
                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Hidden Native File Input restricted strictly to PDF, JPG, JPEG, PNG */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf, .jpg, .jpeg, .png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="evidence-native-file-picker"
                  />

                  {/* Native Picker Trigger Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-[#003B71] text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <FileUp className="w-4 h-4 text-[#003B71]" />
                    <span>{selectedFile ? selectedFile.name : 'เลือกไฟล์จากเครื่อง (Attach Evidence)...'}</span>
                  </button>

                  <input
                    type="text"
                    placeholder="คำอธิบายไฟล์หลักฐาน (ไม่บังคับ)"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-medium flex-1 focus:outline-none focus:border-[#003B71]"
                  />

                  <button
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className="px-4 py-2 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'กำลังอัปโหลด...' : 'ส่งหลักฐาน'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>เฉพาะอาจารย์ลูกทีมที่ได้รับมอบหมายในโครงการนี้ (Project Assignments) เท่านั้นที่สามารถแนบหลักฐานได้</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
