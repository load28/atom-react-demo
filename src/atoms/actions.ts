import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import { TimelineService } from "@/src/services/timeline-service"
import type { TaskId, TimelineTask } from "@/src/domain/model"

const runtimeAtom = Atom.runtime(TimelineService.Default)

export const createTaskAtom = runtimeAtom.fn(
  (input: {
    title: string
    startDate: Date
    endDate: Date
    row: number
    progress: number
    color?: string
  }) =>
    Effect.gen(function* () {
      const service = yield* TimelineService
      return yield* service.createTask(input)
    })
)

export const updateTaskAtom = runtimeAtom.fn(
  (args: { id: TaskId; patch: Partial<Omit<TimelineTask, "id">> }) =>
    Effect.gen(function* () {
      const service = yield* TimelineService
      return yield* service.updateTask(args.id, args.patch)
    })
)

export const deleteTaskAtom = runtimeAtom.fn((id: TaskId) =>
  Effect.gen(function* () {
    const service = yield* TimelineService
    return yield* service.deleteTask(id)
  })
)

export const moveTaskAtom = runtimeAtom.fn(
  (args: { id: TaskId; newStart: Date; newEnd: Date }) =>
    Effect.gen(function* () {
      const service = yield* TimelineService
      return yield* service.moveTask(args.id, args.newStart, args.newEnd)
    })
)

export const resizeTaskAtom = runtimeAtom.fn(
  (args: { id: TaskId; newEnd: Date }) =>
    Effect.gen(function* () {
      const service = yield* TimelineService
      return yield* service.resizeTask(args.id, args.newEnd)
    })
)
