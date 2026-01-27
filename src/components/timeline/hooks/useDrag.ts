"use client"

import { useCallback, useEffect } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { dragStateAtom, viewportAtom, tasksAtom } from "@/src/atoms/core"
import type { TaskId } from "@/src/domain/model"

interface DragResult {
  readonly taskId: TaskId
  readonly type: "move" | "resize"
  readonly newStart: Date
  readonly newEnd: Date
}

export function useDrag(onDragEnd: (result: DragResult) => void) {
  const drag = useAtomValue(dragStateAtom)
  const setDrag = useAtomSet(dragStateAtom)
  const viewport = useAtomValue(viewportAtom)
  const tasks = useAtomValue(tasksAtom)

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!drag) return
      setDrag((prev) => (prev ? { ...prev, currentX: e.clientX } : null))
    },
    [drag, setDrag]
  )

  const handlePointerUp = useCallback(() => {
    if (!drag) return
    const task = tasks.get(drag.taskId)
    if (!task) {
      setDrag(null)
      return
    }

    const deltaX = drag.currentX - drag.originX
    const deltaDays = deltaX / viewport.zoom
    const deltaMs = deltaDays * 86_400_000

    if (drag.type === "move") {
      onDragEnd({
        taskId: drag.taskId,
        type: "move",
        newStart: new Date(task.startDate.getTime() + deltaMs),
        newEnd: new Date(task.endDate.getTime() + deltaMs),
      })
    } else {
      onDragEnd({
        taskId: drag.taskId,
        type: "resize",
        newStart: task.startDate,
        newEnd: new Date(task.endDate.getTime() + deltaMs),
      })
    }
    setDrag(null)
  }, [drag, tasks, viewport, onDragEnd, setDrag])

  useEffect(() => {
    if (!drag) return
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [drag, handlePointerMove, handlePointerUp])
}
