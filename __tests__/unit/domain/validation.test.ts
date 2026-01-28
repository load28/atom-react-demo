import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { TimelineTask, TaskId, TimelineViewport } from "@/src/domain/model"

describe("TaskId", () => {
  test("brands a string as TaskId", () => {
    const id = Schema.decodeSync(TaskId)("task-1")
    expect(id).toBe("task-1")
  })
})

describe("TimelineTask", () => {
  test("decodes a valid task", () => {
    const task = Schema.decodeSync(TimelineTask)({
      id: "task-1",
      title: "Design phase",
      startDate: "2025-01-01",
      endDate: "2025-01-10",
      row: 0,
      progress: 50,
    })
    expect(task.title).toBe("Design phase")
    expect(task.startDate).toBeInstanceOf(Date)
    expect(task.endDate).toBeInstanceOf(Date)
    expect(task.progress).toBe(50)
  })

  test("decodes task with optional color", () => {
    const task = Schema.decodeSync(TimelineTask)({
      id: "task-2",
      title: "Build",
      startDate: "2025-02-01",
      endDate: "2025-02-15",
      color: "#ff0000",
      row: 1,
      progress: 0,
    })
    expect(task.color).toBe("#ff0000")
  })

  test("rejects invalid progress", () => {
    expect(() =>
      Schema.decodeSync(TimelineTask)({
        id: "task-3",
        title: "Test",
        startDate: "2025-01-01",
        endDate: "2025-01-05",
        row: 0,
        progress: 150,
      })
    ).toThrow()
  })
})

describe("TimelineViewport", () => {
  test("decodes a valid viewport", () => {
    const vp = Schema.decodeSync(TimelineViewport)({
      startDate: "2025-01-01",
      endDate: "2025-03-01",
      zoom: 20,
    })
    expect(vp.zoom).toBe(20)
    expect(vp.startDate).toBeInstanceOf(Date)
  })
})
