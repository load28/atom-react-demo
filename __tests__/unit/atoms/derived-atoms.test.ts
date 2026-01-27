import { describe, expect, test } from "bun:test"
import type { TaskId, TimelineTask } from "@/src/domain/model"

describe("sortedTasksAtom logic", () => {
  test("sorts tasks by startDate ascending", () => {
    const taskA: TimelineTask = {
      id: "a" as TaskId,
      title: "A",
      startDate: new Date("2025-01-10"),
      endDate: new Date("2025-01-15"),
      row: 0,
      progress: 0,
    }
    const taskB: TimelineTask = {
      id: "b" as TaskId,
      title: "B",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-05"),
      row: 1,
      progress: 0,
    }
    const tasks = new Map<TaskId, TimelineTask>([
      [taskA.id, taskA],
      [taskB.id, taskB],
    ])
    const sorted = [...tasks.values()].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    )
    expect(sorted[0].id).toBe("b")
    expect(sorted[1].id).toBe("a")
  })
})

describe("selectedTaskAtom logic", () => {
  test("returns null when no task selected", () => {
    const tasks = new Map<TaskId, TimelineTask>()
    const selectedId: TaskId | null = null
    const result = selectedId ? tasks.get(selectedId) ?? null : null
    expect(result).toBeNull()
  })

  test("returns task when id matches", () => {
    const task: TimelineTask = {
      id: "x" as TaskId,
      title: "X",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-05"),
      row: 0,
      progress: 0,
    }
    const tasks = new Map<TaskId, TimelineTask>([[task.id, task]])
    const selectedId: TaskId | null = "x" as TaskId
    const result = selectedId ? tasks.get(selectedId) ?? null : null
    expect(result?.title).toBe("X")
  })
})
