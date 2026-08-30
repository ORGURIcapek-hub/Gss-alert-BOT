'use client'

import React, { useState, useEffect } from 'react'
import { EvidenceSubmission, ProjectWithHeadAndAssignees, UserProfile } from '@/types/database.types'
import { fetchEvidenceSubmissions, deleteEvidenceSubmission } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'
import {
  FileCheck2,
  Search,
  Eye,
  Download,
  Calendar,
  User,
  FolderGit2,
  FileType,
  X,
  Sparkles,
  Trash2,
  Maximize2,
  FileImage,
  FileText
} from 'lucide-react'

interface HeadEvidenceViewProps {
  projects: ProjectWithHeadAndAssignees[]
}

type EvidenceItem = EvidenceSubmission & {
  sender?: UserProfile
  project?: ProjectWithHeadAndAssignees
}

export function HeadEvidenceView({ projects }: HeadEvidenceViewProps) {
  const { currentUser } = useRole()
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL')
  
  // Preview Modal state
  const [previewFile, setPreviewFile] = useState<EvidenceItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadEvidences = async () => {
    setLoading(true)
    const data = await fetchEvidenceSubmissions()
    setEvidenceList(data)
    setLoading(false)
  }

  useEffect(() => {
    loadEvidences()
  }, [])

  // Filter evidences by project and search term
  const filteredEvidences = evidenceList.filter((item) => {
    const matchesProject =
      selectedProjectId === 'ALL' || item.project_id === selectedProjectId
    
    const senderName = item.sender ? `${item.sender.first_name} ${item.sender.last_name}` : ''
    const senderId = item.sender_id || ''
    const projectName = item.project?.project_name || ''
    const fileName = item.file_name || ''

    const matchesSearch =
      senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      senderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fileName.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesProject && matchesSearch
  })

  const handleDelete = async (evidenceId: string) => {
    if (!confirm('คุณต้องการลบไฟล์หลักฐานนี้ใช่หรือไม่?')) return
    setDeletingId(evidenceId)
    await deleteEvidenceSubmission(evidenceId)
    setDeletingId(null)
    loadEvidences()
  }

  const isPdf = (item: EvidenceItem) => {
    return (
      item.file_type?.toLowerCase().includes('pdf') ||
      item.file_name?.toLowerCase().endsWith('.pdf') ||
      item.file_path?.toLowerCase().endsWith('.pdf')
    )
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#00A8B5] flex-shrink-0 shadow-inner">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#00A8B5] text-white">
                Team Evidence Hub
              </span>
              <span className="text-xs text-sky-200">สิทธิ์หัวหน้าโครงการ OKR</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
              หลักฐานจากลูกทีม (Evidence from Team)
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              ตรวจสอบไฟล์หลักฐาน, รายงานผลงาน, และเอกสารยืนยันความสำเร็จที่ส่งตรงจากอาจารย์ลูกทีม พร้อมระบบดูตัวอย่างไฟล์ (File Preview) แบบอินไลน์
            </p>
          </div>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 text-center flex-shrink-0 self-start md:self-auto">
          <span className="text-[11px] text-sky-200 block font-semibold">ไฟล์ที่ลูกทีมส่งมาทั้งหมด</span>
          <span className="text-xl font-black text-white">{evidenceList.length} ไฟล์</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้ส่ง, รหัสผู้ส่ง (Sender ID), ชื่อไฟล์, โครงการ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
            />
          </div>

          <div className="sm:w-64">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
            >
              <option value="ALL">🌟 โครงการทั้งหมด ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  [{p.department.replace('ภาควิชา', '')}] {p.project_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold self-end md:self-auto">
          แสดง <b>{filteredEvidences.length}</b> รายการ
        </div>
      </div>

      {/* Data Grid / Table List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00A8B5]" />
            ตารางรายการหลักฐานจากลูกทีม (Evidence Data Grid)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            คลิก "ดูตัวอย่างไฟล์" เพื่อเปิดดูเอกสาร PDF หรือรูปภาพในหน้าต่างได้ทันที
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-[#003B71] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold">กำลังโหลดข้อมูลหลักฐาน...</p>
          </div>
        ) : filteredEvidences.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileCheck2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h4 className="text-base font-bold text-slate-700">ไม่พบข้อมูลหลักฐานจากลูกทีม</h4>
            <p className="text-xs text-slate-500 mt-1">ยังไม่มีการส่งไฟล์หลักฐานเข้ามา หรือคำค้นหาไม่ตรงกับรายการใด</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 px-4 rounded-l-xl">ผู้ส่ง (Sender Name & ID)</th>
                  <th className="py-3.5 px-4">โครงการ OKR ที่เกี่ยวข้อง</th>
                  <th className="py-3.5 px-4">ชื่อไฟล์หลักฐาน</th>
                  <th className="py-3.5 px-4">ประเภท / วันที่ส่ง</th>
                  <th className="py-3.5 px-4 text-center rounded-r-xl">การจัดการ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEvidences.map((item) => {
                  const senderName = item.sender
                    ? `${item.sender.first_name} ${item.sender.last_name}`
                    : 'อาจารย์ลูกทีม'
                  const senderEmail = item.sender?.email || '-'
                  const projectName = item.project?.project_name || 'โครงการ OKR'
                  const department = item.project?.department || item.sender?.department || '-'
                  const isPdfFile = isPdf(item)

                  return (
                    <tr key={item.evidence_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Sender Name & Sender ID */}
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#003B71]/10 text-[#003B71] flex items-center justify-center font-bold flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs sm:text-sm">{senderName}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal truncate max-w-[180px]">
                              ID: {item.sender_id || '-'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {senderEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Project Title */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-[#003B71] border border-sky-200 inline-block">
                            {department.replace('ภาควิชา', '')}
                          </span>
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {projectName}
                          </p>
                        </div>
                      </td>

                      {/* File Name */}
                      <td className="py-4 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2 max-w-xs">
                          {isPdfFile ? (
                            <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                          ) : (
                            <FileImage className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          )}
                          <span className="truncate text-xs font-bold text-slate-800" title={item.file_name}>
                            {item.file_name}
                          </span>
                        </div>
                      </td>

                      {/* File Type & Timestamp */}
                      <td className="py-4 px-4 text-slate-500">
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {item.file_type ? item.file_type.split('/')[1] || item.file_type : 'FILE'}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.submitted_at).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewFile(item)}
                            className="px-3 py-1.5 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                            title="ดูตัวอย่างไฟล์ในหน้าเว็บ (In-App Preview)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูตัวอย่าง</span>
                          </button>

                          <a
                            href={item.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="ดาวน์โหลดไฟล์"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.evidence_id)}
                            disabled={deletingId === item.evidence_id}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                            title="ลบหลักฐาน"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FILE PREVIEW MODAL (Inline iframe for PDF / img for JPG & PNG) */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#003B71]/10 text-[#003B71] flex items-center justify-center flex-shrink-0">
                  {isPdf(previewFile) ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {previewFile.file_name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    ผู้ส่ง: {previewFile.sender ? `${previewFile.sender.first_name} ${previewFile.sender.last_name}` : 'อาจารย์ลูกทีม'} • โครงการ: {previewFile.project?.project_name || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewFile.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#003B71] text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด</span>
                </a>

                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Inline Viewer */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-100 flex items-center justify-center">
              {isPdf(previewFile) ? (
                <iframe
                  src={previewFile.file_path}
                  title="PDF Preview"
                  className="w-full h-[65vh] rounded-2xl border border-slate-300 bg-white shadow-inner"
                />
              ) : (
                <div className="max-h-[65vh] flex items-center justify-center overflow-hidden rounded-2xl bg-white p-2 border border-slate-200 shadow-md">
                  <img
                    src={previewFile.file_path}
                    alt={previewFile.file_name}
                    className="max-h-[60vh] max-w-full object-contain rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <span>ประเภทไฟล์: <b className="text-slate-800 uppercase">{previewFile.file_type}</b></span>
              <span>ส่งเมื่อ: <b className="text-slate-800">{new Date(previewFile.submitted_at).toLocaleString('th-TH')}</b></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
