"use client"

import { ROW_HEIGHT } from "@/src/domain/coordinate"
import type { TimelineTask } from "@/src/domain/model"
import { TimelineBar } from "./TimelineBar"

interface TimelineRowProps {
  readonly rowIndex: number
  readonly tasks: TimelineTask[]
}

export function TimelineRow({ rowIndex, tasks }: TimelineRowProps) {
  return (
    <div
      data-testid={`timeline-row-${rowIndex}`}
      className="relative border-b border-gray-100"
      style={{ height: ROW_HEIGHT }}
    >
      {tasks.map((task) => (
        <TimelineBar key={task.id} task={task} />
      ))}
    </div>
  )
}
