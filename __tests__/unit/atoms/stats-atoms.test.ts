import { describe, expect, test } from "bun:test"
import type { TaskId, TimelineTask } from "@/src/domain/model"
import type { TaskStats } from "@/src/services/task-stats-service"

const makeTask = (overrides: Partial<TimelineTask> & { id: string }): TimelineTask => ({
  title: "Task",
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-01-10"),
  row: 0,
  progress: 0,
  ...overrides,
  id: overrides.id as TaskId,
})

describe("stats atom logic", () => {
  test("computeStats produces correct stats from task map", () => {
    const tasks = new Map<TaskId, TimelineTask>([
      ["a" as TaskId, makeTask({ id: "a", progress: 100 })],
      ["b" as TaskId, makeTask({ id: "b", progress: 50 })],
      ["c" as TaskId, makeTask({ id: "c", progress: 0, endDate: new Date("2024-12-01") })],
    ])

    const taskList = [...tasks.values()]
    const now = new Date("2025-01-15")

    const totalCount = taskList.length
    const completedCount = taskList.filter((t) => t.progress >= 100).length
    const overdueCount = taskList.filter(
      (t) => t.endDate < now && t.progress < 100
    ).length
    const averageProgress = Math.round(
      taskList.reduce((sum, t) => sum + t.progress, 0) / totalCount
    )
    const completionRate = Math.round((completedCount / totalCount) * 100)

    expect(totalCount).toBe(3)
    expect(completedCount).toBe(1)
    expect(overdueCount).toBe(2)
    expect(averageProgress).toBe(50)
    expect(completionRate).toBe(33)
  })

  test("health status logic returns correct status", () => {
    const getHealthStatus = (stats: TaskStats): "good" | "warning" | "critical" => {
      if (stats.totalCount === 0) return "good"
      if (stats.overdueCount === 0 && stats.completionRate >= 50) return "good"
      if (stats.overdueCount <= 2 || stats.completionRate >= 25) return "warning"
      return "critical"
    }

    expect(getHealthStatus({
      totalCount: 0, completedCount: 0, overdueCount: 0,
      averageProgress: 0, completionRate: 0,
    })).toBe("good")

    expect(getHealthStatus({
      totalCount: 5, completedCount: 3, overdueCount: 0,
      averageProgress: 60, completionRate: 60,
    })).toBe("good")

    expect(getHealthStatus({
      totalCount: 5, completedCount: 0, overdueCount: 1,
      averageProgress: 10, completionRate: 0,
    })).toBe("warning")

    expect(getHealthStatus({
      totalCount: 10, completedCount: 1, overdueCount: 5,
      averageProgress: 10, completionRate: 10,
    })).toBe("critical")
  })
})
