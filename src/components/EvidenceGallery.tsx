'use client'

import React, { useState } from 'react'
import { ProjectWithHeadAndAssignees, Evidence } from '@/types/database.types'
import { FileCheck2, Download, Search, FolderGit2, Calendar, FileText } from 'lucide-react'

interface EvidenceGalleryProps {
  projects: ProjectWithHeadAndAssignees[]
}

export function EvidenceGallery({ projects }: EvidenceGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const allEvidences: { evidence: Evidence; project: ProjectWithHeadAndAssignees }[] = []
  projects.forEach((p) => {
    p.evidences?.forEach((e) => {
      allEvidences.push({ evidence: e, project: p })
    })
  })

  const filteredEvidences = allEvidences.filter((item) => {
    return (
      item.evidence.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.evidence.description && item.evidence.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.project.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-200 flex-shrink-0 shadow-inner">
          <FileCheck2 className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#00A8B5] text-white">
              Evidence Repository
            </span>
            <span className="text-xs text-sky-200">คลังเอกสารและหลักฐานผลงาน</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
            คลังเอกสารหลักฐานผลสัมฤทธิ์ OKR
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
            รวบรวมไฟล์หลักฐานความสำเร็จ, เอกสารรับรอง, และรายงานฉบับสมบูรณ์ของทุกโครงการ
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อไฟล์, โครงการ, ภาควิชา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
          />
        </div>

        <span className="text-xs text-slate-500 font-semibold">
          พบทั้งหมด <b>{filteredEvidences.length}</b> ไฟล์
        </span>
      </div>

      {/* Grid */}
      {filteredEvidences.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 shadow-sm">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">ไม่พบเอกสารหลักฐาน</h3>
          <p className="text-xs text-slate-500 mt-1">ยังไม่มีการอัปโหลดไฟล์ หรือคำค้นหาไม่ตรงกับรายการใด</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidences.map((item) => (
            <div
              key={item.evidence.evidence_id}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#003B71] border border-sky-200">
                    {item.project.department.replace('ภาควิชา', '')}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.evidence.upload_date).toLocaleDateString('th-TH')}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                  {item.evidence.file_name}
                </h4>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {item.evidence.description || 'ไม่มีคำอธิบายระบุ'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                  {item.project.project_name}
                </span>

                <a
                  href={item.evidence.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#003B71] text-xs font-bold border border-sky-200 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
