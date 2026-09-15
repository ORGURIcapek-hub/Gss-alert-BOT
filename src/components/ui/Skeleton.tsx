'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-sm ${className}`} />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

export function ProjectRowSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <ProjectRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function ReportCardSkeleton() {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}

export function EvaluationCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="pt-3 border-t border-slate-200">
        <Skeleton className="h-3 w-1/4 mb-2" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="h-64 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}

export function WorkspaceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-72" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  )
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="h-64 rounded-xl bg-slate-100" />
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="h-64 rounded-xl bg-slate-100" />
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="h-80 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}
