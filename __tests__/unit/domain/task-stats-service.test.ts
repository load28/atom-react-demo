import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { TaskStatsService } from "@/src/services/task-stats-service"
import type { TaskId, TimelineTask } from "@/src/domain/model"

const runWithService = <A, E>(
  effect: Effect.Effect<A, E, TaskStatsService>
) => Effect.runSync(Effect.provide(effect, TaskStatsService.Default))

const makeTask = (overrides: Partial<TimelineTask> & { id: string }): TimelineTask => ({
  title: "Task",
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-01-10"),
  row: 0,
  progress: 0,
  ...overrides,
  id: overrides.id as TaskId,
})

describe("TaskStatsService", () => {
  describe("computeStats", () => {
    test("returns zero stats for empty task list", () => {
      const stats = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.computeStats([], new Date())
        })
      )
      expect(stats.totalCount).toBe(0)
      expect(stats.completedCount).toBe(0)
      expect(stats.overdueCount).toBe(0)
      expect(stats.averageProgress).toBe(0)
      expect(stats.completionRate).toBe(0)
    })

    test("counts total tasks", () => {
      const tasks = [
        makeTask({ id: "a", progress: 0 }),
        makeTask({ id: "b", progress: 50 }),
        makeTask({ id: "c", progress: 100 }),
      ]
      const stats = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.computeStats(tasks, new Date("2025-01-05"))
        })
      )
      expect(stats.totalCount).toBe(3)
    })

    test("counts completed tasks (progress >= 100)", () => {
      const tasks = [
        makeTask({ id: "a", progress: 100 }),
        makeTask({ id: "b", progress: 50 }),
        makeTask({ id: "c", progress: 100 }),
      ]
      const stats = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.computeStats(tasks, new Date("2025-01-05"))
        })
      )
      expect(stats.completedCount).toBe(2)
      expect(stats.completionRate).toBe(67)
    })

    test("counts overdue tasks (endDate < now and not completed)", () => {
      const now = new Date("2025-02-01")
      const tasks = [
        makeTask({ id: "a", endDate: new Date("2025-01-15"), progress: 50 }),  // overdue
        makeTask({ id: "b", endDate: new Date("2025-01-15"), progress: 100 }), // completed, not overdue
        makeTask({ id: "c", endDate: new Date("2025-03-01"), progress: 0 }),   // not past due
      ]
      const stats = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.computeStats(tasks, now)
        })
      )
      expect(stats.overdueCount).toBe(1)
    })

    test("computes average progress rounded", () => {
      const tasks = [
        makeTask({ id: "a", progress: 30 }),
        makeTask({ id: "b", progress: 70 }),
        makeTask({ id: "c", progress: 50 }),
      ]
      const stats = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.computeStats(tasks, new Date())
        })
      )
      expect(stats.averageProgress).toBe(50)
    })
  })

  describe("getHealthStatus", () => {
    test("returns good for empty stats", () => {
      const result = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.getHealthStatus({
            totalCount: 0,
            completedCount: 0,
            overdueCount: 0,
            averageProgress: 0,
            completionRate: 0,
          })
        })
      )
      expect(result).toBe("good")
    })

    test("returns good when no overdue and high completion", () => {
      const result = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.getHealthStatus({
            totalCount: 10,
            completedCount: 6,
            overdueCount: 0,
            averageProgress: 60,
            completionRate: 60,
          })
        })
      )
      expect(result).toBe("good")
    })

    test("returns warning when few overdue tasks", () => {
      const result = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.getHealthStatus({
            totalCount: 10,
            completedCount: 2,
            overdueCount: 2,
            averageProgress: 20,
            completionRate: 20,
          })
        })
      )
      expect(result).toBe("warning")
    })

    test("returns critical when many overdue and low completion", () => {
      const result = runWithService(
        Effect.gen(function* () {
          const service = yield* TaskStatsService
          return service.getHealthStatus({
            totalCount: 10,
            completedCount: 1,
            overdueCount: 5,
            averageProgress: 10,
            completionRate: 10,
          })
        })
      )
      expect(result).toBe("critical")
    })
  })
})
