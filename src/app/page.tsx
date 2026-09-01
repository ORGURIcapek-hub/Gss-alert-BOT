'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { DashboardMetrics } from '@/components/DashboardMetrics'
import { ExecutiveAnalytics } from '@/components/ExecutiveAnalytics'
import { ProjectTable } from '@/components/ProjectTable'
import { ProjectDetailModal } from '@/components/ProjectDetailModal'
import { CreateProjectModal } from '@/components/CreateProjectModal'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { UserProfileModal } from '@/components/UserProfileModal'
import { OKRView } from '@/components/OKRView'
import { EvidenceGallery } from '@/components/EvidenceGallery'
import { AdminUserManagement } from '@/components/AdminUserManagement'
import { AdminPendingApprovals } from '@/components/AdminPendingApprovals'
import { LoginPage } from '@/components/LoginPage'
import { ExecutiveWorkspace } from '@/components/workspaces/ExecutiveWorkspace'
import { HeadOKRWorkspace } from '@/components/workspaces/HeadOKRWorkspace'
import { TeacherWorkspace } from '@/components/workspaces/TeacherWorkspace'
import { CreateDashboardView } from '@/components/CreateDashboardView'
import { CreateNormalReportView } from '@/components/CreateNormalReportView'
import { NormalReportView } from '@/components/NormalReportView'
import { HeadEvidenceView } from '@/components/HeadEvidenceView'
import { useRole } from '@/components/RoleContext'
import { fetchOKRs, fetchProjects } from '@/lib/services/okr-service'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { SDULogo } from '@/components/SDULogo'

export default function HomePage() {
  const { currentUser, currentRole, isAuthenticated, isAuthLoading, allUsers, refreshUsers } = useRole()
  
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('workspace')
  const [selectedYear, setSelectedYear] = useState(2567)
  const [selectedQuarter, setSelectedQuarter] = useState('ALL')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [okrs, setOkrs] = useState<OKR[]>([])
  const [projects, setProjects] = useState<ProjectWithHeadAndAssignees[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectWithHeadAndAssignees | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('sdu_okr_active_tab', tabId)
      } catch {}
    }
  }

  const loadData = async () => {
    setIsRefreshing(true)
    try {
      const [okrsData, projectsData] = await Promise.all([
        fetchOKRs(selectedYear),
        fetchProjects({ year: selectedYear }),
        refreshUsers()
      ])
      setOkrs(okrsData)
      setProjects(projectsData)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      try {
        const savedTab = sessionStorage.getItem('sdu_okr_active_tab')
        if (savedTab) {
          setActiveTab(savedTab)
        } else if (currentRole === 'admin') {
          handleTabChange('pending_users')
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadData()
    }
  }, [selectedYear, isAuthenticated, mounted])

  useEffect(() => {
    if (!mounted) return
    if (currentRole === 'admin' && activeTab === 'workspace') {
      handleTabChange('pending_users')
    }
  }, [currentRole, mounted])

  const handleExportPDF = () => {
    window.print()
  }

  // During SSR or while auth session is initializing, render smooth loading screen
  if (!mounted || (isAuthLoading && !currentUser)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <SDULogo size="lg" textColor="light" showText={true} />
          <div className="flex items-center gap-2.5 text-sky-200 text-xs font-semibold mt-3">
            <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span>กำลังโหลดข้อมูลระบบและเชื่อมต่อเซสชัน...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginPage />
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
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

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1680px] mx-auto w-full">
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
                handleTabChange('workspace')
              }}
            />
          )}

          {activeTab === 'create_normal_report' && currentRole === 'head_okr' && (
            <CreateNormalReportView
              projects={projects}
              onSuccess={() => {
                loadData()
                handleTabChange('normal_reports')
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

          {activeTab === 'pending_users' && currentRole === 'admin' && (
            <AdminPendingApprovals />
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

      <ChangePasswordModal />
      <UserProfileModal />
    </div>
  )
}
