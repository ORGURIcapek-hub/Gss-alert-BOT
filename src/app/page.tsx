'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { DashboardMetrics } from '@/components/DashboardMetrics'
import { ExecutiveAnalytics } from '@/components/ExecutiveAnalytics'
import { ProjectTable } from '@/components/ProjectTable'
import { ProjectDetailModal } from '@/components/ProjectDetailModal'
import { CreateProjectModal } from '@/components/CreateProjectModal'
import { OKRView } from '@/components/OKRView'
import { EvidenceGallery } from '@/components/EvidenceGallery'
import { AdminUserManagement } from '@/components/AdminUserManagement'
import { LoginPage } from '@/components/LoginPage'
import { ExecutiveWorkspace } from '@/components/workspaces/ExecutiveWorkspace'
import { HeadOKRWorkspace } from '@/components/workspaces/HeadOKRWorkspace'
import { TeacherWorkspace } from '@/components/workspaces/TeacherWorkspace'
import { AdminWorkspace } from '@/components/workspaces/AdminWorkspace'
import { CreateDashboardView } from '@/components/CreateDashboardView'
import { CreateNormalReportView } from '@/components/CreateNormalReportView'
import { NormalReportView } from '@/components/NormalReportView'
import { HeadEvidenceView } from '@/components/HeadEvidenceView'
import { useRole } from '@/components/RoleContext'
import { fetchOKRs, fetchProjects } from '@/lib/services/okr-service'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'

export default function HomePage() {
  const { currentUser, currentRole, isAuthenticated, allUsers } = useRole()
  const [activeTab, setActiveTab] = useState('workspace')
  const [selectedYear, setSelectedYear] = useState(2567)
  const [selectedQuarter, setSelectedQuarter] = useState('ALL')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [okrs, setOkrs] = useState<OKR[]>([])
  const [projects, setProjects] = useState<ProjectWithHeadAndAssignees[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectWithHeadAndAssignees | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const loadData = async () => {
    setIsRefreshing(true)
    const [okrsData, projectsData] = await Promise.all([
      fetchOKRs(selectedYear),
      fetchProjects({ year: selectedYear })
    ])
    setOkrs(okrsData)
    setProjects(projectsData)
    setIsRefreshing(false)
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [selectedYear, isAuthenticated])

  useEffect(() => {
    setActiveTab('workspace')
  }, [currentRole])

  const handleExportPDF = () => {
    window.print()
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginPage />
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar bg-slate-50/50">
        <Header
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedQuarter={selectedQuarter}
          setSelectedQuarter={setSelectedQuarter}
          onRefresh={loadData}
          onExportPDF={handleExportPDF}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isRefreshing={isRefreshing}
        />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {activeTab === 'workspace' && (
            <>
              {currentRole === 'executive' && (
                <ExecutiveWorkspace
                  okrs={okrs}
                  projects={projects}
                  onSelectProject={(p) => setSelectedProject(p)}
                  onExportPDF={handleExportPDF}
                />
              )}

              {currentRole === 'head_okr' && (
                <HeadOKRWorkspace
                  okrs={okrs}
                  projects={projects}
                  onSelectProject={(p) => setSelectedProject(p)}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              )}

              {currentRole === 'teacher' && (
                <TeacherWorkspace
                  projects={projects}
                  onSelectProject={(p) => setSelectedProject(p)}
                />
              )}

              {currentRole === 'admin' && (
                <AdminWorkspace
                  okrs={okrs}
                  projects={projects}
                  onSelectProject={(p) => setSelectedProject(p)}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              )}

              {currentRole === 'staff' && (
                <div className="space-y-6">
                  <DashboardMetrics okrs={okrs} projects={projects} />
                  <ProjectTable
                    projects={projects}
                    onSelectProject={(p) => setSelectedProject(p)}
                    onOpenCreateModal={() => setIsCreateModalOpen(true)}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'create_dashboard' && currentRole === 'head_okr' && (
            <CreateDashboardView
              okrs={okrs}
              projects={projects}
              onSuccess={() => {
                loadData()
                setActiveTab('workspace')
              }}
            />
          )}

          {activeTab === 'create_normal_report' && currentRole === 'head_okr' && (
            <CreateNormalReportView
              projects={projects}
              onSuccess={() => {
                loadData()
                setActiveTab('normal_reports')
              }}
            />
          )}

          {activeTab === 'team_evidences' && currentRole === 'head_okr' && (
            <HeadEvidenceView projects={projects} />
          )}

          {activeTab === 'normal_reports' && (
            <NormalReportView />
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <DashboardMetrics okrs={okrs} projects={projects} />
              <ProjectTable
                projects={projects}
                onSelectProject={(p) => setSelectedProject(p)}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <DashboardMetrics okrs={okrs} projects={projects} />
              <ExecutiveAnalytics projects={projects} />
            </div>
          )}

          {activeTab === 'okrs' && (
            <OKRView
              okrs={okrs}
              projects={projects}
              onSelectProject={(p) => setSelectedProject(p)}
              onOpenCreateProject={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectTable
              projects={projects}
              onSelectProject={(p) => setSelectedProject(p)}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeTab === 'evidences' && (
            <EvidenceGallery projects={projects} />
          )}

          {activeTab === 'users' && currentRole === 'admin' && (
            <AdminUserManagement />
          )}
        </div>
      </main>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdated={loadData}
        />
      )}

      {isCreateModalOpen && (
        <CreateProjectModal
          okrs={okrs}
          users={allUsers}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}
