import { Schema } from "effect"

export const TaskId = Schema.String.pipe(Schema.brand("TaskId"))
export type TaskId = typeof TaskId.Type

export const TimelineTask = Schema.Struct({
  id: TaskId,
  title: Schema.NonEmptyString,
  startDate: Schema.DateFromString,
  endDate: Schema.DateFromString,
  color: Schema.optional(Schema.String),
  row: Schema.NonNegativeInt,
  progress: Schema.Int.pipe(Schema.between(0, 100)),
})
export type TimelineTask = typeof TimelineTask.Type

export const TimelineViewport = Schema.Struct({
  startDate: Schema.DateFromString,
  endDate: Schema.DateFromString,
  zoom: Schema.Positive,
})
export type TimelineViewport = typeof TimelineViewport.Type

export interface DragState {
  readonly taskId: TaskId
  readonly type: "move" | "resize"
  readonly originX: number
  readonly currentX: number
}

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}
