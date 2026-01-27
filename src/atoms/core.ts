import { Atom } from "@effect-atom/atom-react"
import type { TaskId, TimelineTask, TimelineViewport, DragState } from "@/src/domain/model"

export const tasksAtom = Atom.make(new Map<TaskId, TimelineTask>())

export const viewportAtom = Atom.make<TimelineViewport>({
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-04-01"),
  zoom: 20,
})

export const selectedTaskIdAtom = Atom.make<TaskId | null>(null)

export const dragStateAtom = Atom.make<DragState | null>(null)
