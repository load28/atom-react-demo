import { Effect, Ref, HashMap, Option } from "effect"
import type { TaskId, TimelineTask } from "@/src/domain/model"
import { TaskNotFound, InvalidDateRange } from "@/src/domain/errors"

interface CreateTaskInput {
  readonly title: string
  readonly startDate: Date
  readonly endDate: Date
  readonly row: number
  readonly progress: number
  readonly color?: string
}

const validateDateRange = (startDate: Date, endDate: Date) =>
  startDate < endDate
    ? Effect.void
    : Effect.fail(
        new InvalidDateRange({
          startDate,
          endDate,
          reason: "startDate must be before endDate",
        })
      )

let counter = 0
const generateId = (): TaskId => `task-${++counter}` as TaskId

export class TimelineService extends Effect.Service<TimelineService>()(
  "TimelineService",
  {
    effect: Effect.gen(function* () {
      const store = yield* Ref.make(HashMap.empty<TaskId, TimelineTask>())

      const createTask = (input: CreateTaskInput) =>
        Effect.gen(function* () {
          yield* validateDateRange(input.startDate, input.endDate)
          const task: TimelineTask = {
            id: generateId(),
            title: input.title,
            startDate: input.startDate,
            endDate: input.endDate,
            row: input.row,
            progress: input.progress,
            color: input.color,
          }
          yield* Ref.update(store, HashMap.set(task.id, task))
          return task
        })

      const getTask = (id: TaskId) =>
        Ref.get(store).pipe(
          Effect.flatMap((tasks) =>
            Option.match(HashMap.get(tasks, id), {
              onNone: () => Effect.fail(new TaskNotFound({ id })),
              onSome: (task) => Effect.succeed(task),
            })
          )
        )

      const updateTask = (id: TaskId, patch: Partial<Omit<TimelineTask, "id">>) =>
        Effect.gen(function* () {
          const existing = yield* getTask(id)
          const updated = { ...existing, ...patch }
          if (patch.startDate || patch.endDate) {
            yield* validateDateRange(updated.startDate, updated.endDate)
          }
          yield* Ref.update(store, HashMap.set(id, updated))
          return updated
        })

      const deleteTask = (id: TaskId) =>
        Effect.gen(function* () {
          yield* getTask(id)
          yield* Ref.update(store, HashMap.remove(id))
        })

      const moveTask = (id: TaskId, newStart: Date, newEnd: Date) =>
        Effect.gen(function* () {
          yield* validateDateRange(newStart, newEnd)
          const existing = yield* getTask(id)
          const updated = { ...existing, startDate: newStart, endDate: newEnd }
          yield* Ref.update(store, HashMap.set(id, updated))
          return updated
        })

      const resizeTask = (id: TaskId, newEnd: Date) =>
        Effect.gen(function* () {
          const existing = yield* getTask(id)
          yield* validateDateRange(existing.startDate, newEnd)
          const updated = { ...existing, endDate: newEnd }
          yield* Ref.update(store, HashMap.set(id, updated))
          return updated
        })

      return { createTask, updateTask, deleteTask, moveTask, resizeTask } as const
    }),
  }
) {}
