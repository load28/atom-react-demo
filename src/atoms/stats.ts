import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import { tasksAtom } from "./core"
import { TaskStatsService } from "@/src/services/task-stats-service"
import type { TaskStats } from "@/src/services/task-stats-service"

const statsRuntimeAtom = Atom.runtime(TaskStatsService.Default)

const emptyStats: TaskStats = {
  totalCount: 0,
  completedCount: 0,
  overdueCount: 0,
  averageProgress: 0,
  completionRate: 0,
}

export const taskStatsAtom = Atom.make<TaskStats>(emptyStats)

export const refreshStatsAtom = statsRuntimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const service = yield* TaskStatsService
    const tasks = [...get(tasksAtom).values()]
    const stats = service.computeStats(tasks, new Date())
    get.set(taskStatsAtom, stats)
    return stats
  })
)

export const healthStatusAtom = statsRuntimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const service = yield* TaskStatsService
    const stats = get(taskStatsAtom)
    return service.getHealthStatus(stats)
  })
)
