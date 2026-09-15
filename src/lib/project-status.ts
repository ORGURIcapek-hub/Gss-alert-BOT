import type { ProjectWithHeadAndAssignees, ExecutiveSummaryProjectSnapshot } from '@/types/database.types'

type StatusLike = Pick<ProjectWithHeadAndAssignees, 'progress_percentage' | 'status' | 'bottleneck' | 'isOverdue'> | Pick<ExecutiveSummaryProjectSnapshot, 'progress_percentage' | 'status' | 'bottleneck'> | null | undefined

export function getProjectProgress(p: StatusLike): number {
  if (!p) return 0
  const n = Number((p as { progress_percentage?: unknown }).progress_percentage)
  return Number.isFinite(n) ? n : 0
}

export function hasProjectBottleneck(p: StatusLike): boolean {
  if (!p) return false
  const b = (p as { bottleneck?: unknown }).bottleneck
  if (typeof b === 'string') return b.trim().length > 0
  return Boolean(b)
}

export function isProjectCompleted(p: StatusLike): boolean {
  if (!p) return false
  if (getProjectProgress(p) >= 100) return true
  return (p as { status?: unknown }).status === 'Completed'
}

export function isProjectDelayed(p: StatusLike): boolean {
  if (!p) return false
  if (isProjectCompleted(p)) return false
  if ((p as { status?: unknown }).status === 'Delayed') return true
  if ((p as { isOverdue?: unknown }).isOverdue === true) return true
  return hasProjectBottleneck(p)
}

export function isProjectOnHold(p: StatusLike): boolean {
  if (!p) return false
  if (isProjectCompleted(p) || isProjectDelayed(p)) return false
  const s = (p as { status?: unknown }).status
  return s === 'On Hold' || s === 'Draft'
}

export function isProjectInProgress(p: StatusLike): boolean {
  if (!p) return false
  if (isProjectCompleted(p) || isProjectDelayed(p) || isProjectOnHold(p)) return false
  return true
}

export function getProjectStatusKind(p: StatusLike): 'completed' | 'delayed' | 'on_hold' | 'in_progress' {
  if (isProjectCompleted(p)) return 'completed'
  if (isProjectDelayed(p)) return 'delayed'
  if (isProjectOnHold(p)) return 'on_hold'
  return 'in_progress'
}
