import { Data } from "effect"
import type { TaskId } from "./model"

export class TaskNotFound extends Data.TaggedError("TaskNotFound")<{
  readonly id: TaskId
}> {}

export class InvalidDateRange extends Data.TaggedError("InvalidDateRange")<{
  readonly startDate: Date
  readonly endDate: Date
  readonly reason: string
}> {}
