"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { viewportAtom, selectedTaskIdAtom, dragStateAtom } from "@/src/atoms/core"
import { taskToRect } from "@/src/domain/coordinate"
import type { TimelineTask, DragState } from "@/src/domain/model"

interface TimelineBarProps {
  readonly task: TimelineTask
}

export function TimelineBar({ task }: TimelineBarProps) {
  const viewport = useAtomValue(viewportAtom)
  const setSelected = useAtomSet(selectedTaskIdAtom)
  const setDrag = useAtomSet(dragStateAtom)
  const rect = taskToRect(task, viewport)

  const handlePointerDown = (e: React.PointerEvent, type: DragState["type"]) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setSelected(task.id)
    setDrag({
      taskId: task.id,
      type,
      originX: e.clientX,
      currentX: e.clientX,
    })
  }

  const progressWidth = (rect.width * task.progress) / 100

  return (
    <div
      data-testid={`task-bar-${task.id}`}
      className="absolute rounded cursor-grab select-none"
      style={{
        left: rect.x,
        top: 0,
        width: rect.width,
        height: rect.height - 8,
        marginTop: 4,
        backgroundColor: task.color ?? "#3b82f6",
      }}
      onPointerDown={(e) => handlePointerDown(e, "move")}
    >
      <div
        className="absolute top-0 left-0 h-full rounded opacity-30 bg-black"
        style={{ width: progressWidth }}
      />
      <span className="relative z-10 px-2 text-xs text-white leading-8 truncate block">
        {task.title}
      </span>
      <div
        data-testid={`resize-handle-${task.id}`}
        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize"
        onPointerDown={(e) => handlePointerDown(e, "resize")}
      />
    </div>
  )
}
