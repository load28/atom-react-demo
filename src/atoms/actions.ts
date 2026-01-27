import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import { TimelineService } from "@/src/services/timeline-service"
import type { TaskId, TimelineTask } from "@/src/domain/model"
import { tasksAtom, selectedTaskIdAtom } from "./core"

const runtimeAtom = Atom.runtime(TimelineService.Default)

export const createTaskAtom = runtimeAtom.fn(
  (input: {
    title: string
    startDate: Date
    endDate: Date
    row: number
    progress: number
    color?: string
  }, get) =>
    Effect.gen(function* () {
      const service = yield* TimelineService
      const task = yield* service.createTask(input)
      const tasks = new Map(get(tasksAtom))
      tasks.set(task.id, task)
      get.set(tasksAtom, tasks)
      return task
    })
)

export const updateTaskAtom = runtimeAtom.fn(
  (args: { id: TaskId; patch: Partial<Omit<TimelineTask, "id">> }, get) =>
    Effect.gen(function* () {
      const service = yield* TimelineService
      const updated = yield* service.updateTask(args.id, args.patch)
      const tasks = new Map(get(tasksAtom))
      tasks.set(args.id, updated)
      get.set(tasksAtom, tasks)
      return updated
    })
)

export const deleteTaskAtom = runtimeAtom.fn((id: TaskId, get) =>
  Effect.gen(function* () {
    const service = yield* TimelineService
    yield* service.deleteTask(id)
    const tasks = new Map(get(tasksAtom))
    tasks.delete(id)
    get.set(tasksAtom, tasks)
    get.set(selectedTaskIdAtom, null)
  })
)

export const moveTaskAtom = runtimeAtom.fn(
  (args: { id: TaskId; newStart: Date; newEnd: Date }, get) =>
    Effect.gen(function* () {
      const service = yield* TimelineService
      const updated = yield* service.moveTask(args.id, args.newStart, args.newEnd)
      const tasks = new Map(get(tasksAtom))
      tasks.set(args.id, updated)
      get.set(tasksAtom, tasks)
      return updated
    })
)

export const resizeTaskAtom = runtimeAtom.fn(
  (args: { id: TaskId; newEnd: Date }, get) =>
    Effect.gen(function* () {
      const service = yield* TimelineService
      const updated = yield* service.resizeTask(args.id, args.newEnd)
      const tasks = new Map(get(tasksAtom))
      tasks.set(args.id, updated)
      get.set(tasksAtom, tasks)
      return updated
    })
)
