import type { Rect, TimelineTask, TimelineViewport } from "./model"

const MS_PER_DAY = 86_400_000

export const ROW_HEIGHT = 40

export const dateToX = (date: Date, viewport: TimelineViewport): number => {
  const diffMs = date.getTime() - viewport.startDate.getTime()
  return (diffMs / MS_PER_DAY) * viewport.zoom
}

export const xToDate = (x: number, viewport: TimelineViewport): Date => {
  const diffMs = (x / viewport.zoom) * MS_PER_DAY
  return new Date(viewport.startDate.getTime() + diffMs)
}

export const taskToRect = (task: TimelineTask, viewport: TimelineViewport): Rect => {
  const x = dateToX(task.startDate, viewport)
  const endX = dateToX(task.endDate, viewport)
  return {
    x,
    y: task.row * ROW_HEIGHT,
    width: endX - x,
    height: ROW_HEIGHT,
  }
}
