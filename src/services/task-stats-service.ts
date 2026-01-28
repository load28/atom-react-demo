import { Effect } from "effect"
import type { TimelineTask } from "@/src/domain/model"

export interface TaskStats {
  readonly totalCount: number
  readonly completedCount: number
  readonly overdueCount: number
  readonly averageProgress: number
  readonly completionRate: number
}

const isCompleted = (task: TimelineTask): boolean => task.progress >= 100

const isOverdue = (task: TimelineTask, now: Date): boolean =>
  task.endDate < now && !isCompleted(task)

export class TaskStatsService extends Effect.Service<TaskStatsService>()(
  "TaskStatsService",
  {
    succeed: {
      computeStats: (tasks: readonly TimelineTask[], now: Date): TaskStats => {
        const totalCount = tasks.length
        if (totalCount === 0) {
          return {
            totalCount: 0,
            completedCount: 0,
            overdueCount: 0,
            averageProgress: 0,
            completionRate: 0,
          }
        }
        const completedCount = tasks.filter(isCompleted).length
        const overdueCount = tasks.filter((t) => isOverdue(t, now)).length
        const averageProgress =
          Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / totalCount)
        const completionRate = Math.round((completedCount / totalCount) * 100)

        return { totalCount, completedCount, overdueCount, averageProgress, completionRate }
      },

      getHealthStatus: (stats: TaskStats): "good" | "warning" | "critical" => {
        if (stats.totalCount === 0) return "good"
        if (stats.overdueCount === 0 && stats.completionRate >= 50) return "good"
        if (stats.overdueCount <= 2 || stats.completionRate >= 25) return "warning"
        return "critical"
      },
    },
  }
) {}
