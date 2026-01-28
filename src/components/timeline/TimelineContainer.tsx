"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { sortedTasksAtom } from "@/src/atoms/derived"
import { moveTaskAtom, resizeTaskAtom } from "@/src/atoms/actions"
import { ROW_HEIGHT } from "@/src/domain/coordinate"
import { TimelineHeader } from "./TimelineHeader"
import { TimelineGrid } from "./TimelineGrid"
import { TimelineRow } from "./TimelineRow"
import { TaskForm } from "./TaskForm"
import { TaskStats } from "./TaskStats"
import { useDrag } from "./hooks/useDrag"
import { useViewport } from "./hooks/useViewport"

export function TimelineContainer() {
  const sortedTasks = useAtomValue(sortedTasksAtom)
  const moveTask = useAtomSet(moveTaskAtom)
  const resizeTask = useAtomSet(resizeTaskAtom)
  const { zoomIn, zoomOut, scrollBy } = useViewport()

  useDrag((result) => {
    if (result.type === "move") {
      moveTask({ id: result.taskId, newStart: result.newStart, newEnd: result.newEnd })
    } else {
      resizeTask({ id: result.taskId, newEnd: result.newEnd })
    }
  })

  const maxRow = sortedTasks.reduce((max, t) => Math.max(max, t.row), 0)
  const rows = Array.from({ length: maxRow + 1 }, (_, i) =>
    sortedTasks.filter((t) => t.row === i)
  )
  const gridHeight = Math.max(rows.length * ROW_HEIGHT, ROW_HEIGHT)

  return (
    <div className="flex flex-col h-screen" data-testid="timeline-container">
      <div className="flex gap-2 p-2 border-b bg-white">
        <button onClick={zoomIn} className="px-2 py-1 border rounded text-sm" data-testid="btn-zoom-in">
          Zoom +
        </button>
        <button onClick={zoomOut} className="px-2 py-1 border rounded text-sm" data-testid="btn-zoom-out">
          Zoom -
        </button>
        <button onClick={() => scrollBy(-7)} className="px-2 py-1 border rounded text-sm">
          ← Week
        </button>
        <button onClick={() => scrollBy(7)} className="px-2 py-1 border rounded text-sm">
          Week →
        </button>
      </div>
      <TaskStats />
      <div className="flex-1 overflow-auto relative">
        <TimelineHeader />
        <div className="relative" style={{ minHeight: gridHeight }}>
          <TimelineGrid height={gridHeight} />
          {rows.map((tasks, rowIndex) => (
            <TimelineRow key={rowIndex} rowIndex={rowIndex} tasks={tasks} />
          ))}
        </div>
      </div>
      <TaskForm />
    </div>
  )
}
