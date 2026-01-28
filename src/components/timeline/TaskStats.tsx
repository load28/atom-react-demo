"use client"

import { useEffect } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { taskStatsAtom, refreshStatsAtom } from "@/src/atoms/stats"
import { tasksAtom } from "@/src/atoms/core"

export function TaskStats() {
  const stats = useAtomValue(taskStatsAtom)
  const tasks = useAtomValue(tasksAtom)
  const refreshStats = useAtomSet(refreshStatsAtom)

  useEffect(() => {
    refreshStats()
  }, [tasks, refreshStats])

  return (
    <div className="flex gap-4 px-4 py-2 border-b bg-gray-50 text-xs" data-testid="task-stats">
      <span data-testid="stats-total">
        Total: <strong>{stats.totalCount}</strong>
      </span>
      <span data-testid="stats-completed">
        Completed: <strong>{stats.completedCount}</strong>
      </span>
      <span data-testid="stats-overdue">
        Overdue: <strong>{stats.overdueCount}</strong>
      </span>
      <span data-testid="stats-avg-progress">
        Avg Progress: <strong>{stats.averageProgress}%</strong>
      </span>
      <span data-testid="stats-completion-rate">
        Completion: <strong>{stats.completionRate}%</strong>
      </span>
    </div>
  )
}
