'use client'

import React, { useState } from 'react'
import { ProjectWithHeadAndAssignees } from '@/types/database.types'
import { FileCheck2, Download, Search, FileText, Calendar, Building2, User } from 'lucide-react'

interface EvidenceGalleryProps {
  projects: ProjectWithHeadAndAssignees[]
}

export function EvidenceGallery({ projects }: EvidenceGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const allEvidences = projects.flatMap(p =>
    (p.evidences || []).map(e => ({
      ...e,
      projectName: p.project_name,
      department: p.department,
      headName: p.head ? `${p.head.first_name} ${p.head.last_name}` : 'ไม่ระบุ'
    }))
  )

  const filteredEvidences = allEvidences.filter(e =>
    e.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    e.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            คลังหลักฐานและเอกสารผลการดำเนินงาน (Evidences Vault)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            รวบรวมไฟล์บทความวิจัย, ใบตอบรับ, รายงานการอบรม และเอกสารรับรอง OKR
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อเอกสาร, โครงการ, ภาควิชา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs placeholder:text-slate-500"
          />
        </div>
      </div>

      {filteredEvidences.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <p className="text-sm">ไม่พบเอกสารหลักฐานตามคำค้นหา</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidences.map((ev) => (
            <div
              key={ev.evidence_id}
              className="glass-card p-4 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-300">
                    {ev.department.replace('ภาควิชา', '')}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2">
                  {ev.file_name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {ev.description || 'เอกสารรายงานผลประกอบตัวชี้วัด OKR'}
                </p>

                <div className="mt-3 pt-3 border-t border-white/5 space-y-1 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    <span className="truncate">{ev.projectName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{new Date(ev.upload_date).toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {ev.file_size ? `${(ev.file_size / (1024 * 1024)).toFixed(2)} MB` : 'PDF Document'}
                </span>
                <a
                  href={ev.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-all"
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
