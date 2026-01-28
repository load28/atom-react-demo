import { describe, expect, test } from "bun:test"
import { Effect, Exit } from "effect"
import { TimelineService } from "@/src/services/timeline-service"
import type { TaskId } from "@/src/domain/model"

const runWithService = <A, E>(
  effect: Effect.Effect<A, E, TimelineService>
) => Effect.runPromiseExit(Effect.provide(effect, TimelineService.Default))

describe("TimelineService", () => {
  test("createTask returns a valid task", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        return yield* service.createTask({
          title: "Design",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-10"),
          row: 0,
          progress: 0,
        })
      })
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.title).toBe("Design")
      expect(exit.value.id).toBeDefined()
    }
  })

  test("createTask fails on invalid date range", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        return yield* service.createTask({
          title: "Bad",
          startDate: new Date("2025-01-10"),
          endDate: new Date("2025-01-05"),
          row: 0,
          progress: 0,
        })
      })
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })

  test("deleteTask fails on unknown id", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        return yield* service.deleteTask("nonexistent" as TaskId)
      })
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })

  test("updateTask modifies title", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        const task = yield* service.createTask({
          title: "Old",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-10"),
          row: 0,
          progress: 0,
        })
        return yield* service.updateTask(task.id, { title: "New" })
      })
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.title).toBe("New")
    }
  })

  test("moveTask changes start and end dates", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        const task = yield* service.createTask({
          title: "Move me",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-10"),
          row: 0,
          progress: 0,
        })
        return yield* service.moveTask(
          task.id,
          new Date("2025-02-01"),
          new Date("2025-02-10")
        )
      })
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.startDate.getTime()).toBe(new Date("2025-02-01").getTime())
      expect(exit.value.endDate.getTime()).toBe(new Date("2025-02-10").getTime())
    }
  })

  test("resizeTask changes end date", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        const task = yield* service.createTask({
          title: "Resize me",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-10"),
          row: 0,
          progress: 0,
        })
        return yield* service.resizeTask(task.id, new Date("2025-01-20"))
      })
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.endDate.getTime()).toBe(new Date("2025-01-20").getTime())
    }
  })
})
