import { describe, expect, test } from "bun:test"
import { dateToX, xToDate, taskToRect } from "@/src/domain/coordinate"
import type { TimelineViewport, TimelineTask } from "@/src/domain/model"

const viewport: TimelineViewport = {
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-03-01"),
  zoom: 20,
}

describe("dateToX", () => {
  test("viewport start date returns 0", () => {
    expect(dateToX(new Date("2025-01-01"), viewport)).toBe(0)
  })

  test("one day after start returns zoom value", () => {
    expect(dateToX(new Date("2025-01-02"), viewport)).toBe(20)
  })

  test("ten days after start returns 10 * zoom", () => {
    expect(dateToX(new Date("2025-01-11"), viewport)).toBe(200)
  })
})

describe("xToDate", () => {
  test("0 returns viewport start date", () => {
    const result = xToDate(0, viewport)
    expect(result.getTime()).toBe(new Date("2025-01-01").getTime())
  })

  test("zoom value returns one day after start", () => {
    const result = xToDate(20, viewport)
    expect(result.getTime()).toBe(new Date("2025-01-02").getTime())
  })

  test("roundtrip: dateToX then xToDate", () => {
    const date = new Date("2025-01-15")
    const x = dateToX(date, viewport)
    const result = xToDate(x, viewport)
    expect(result.getTime()).toBe(date.getTime())
  })
})

describe("taskToRect", () => {
  const ROW_HEIGHT = 40

  test("computes rect from task and viewport", () => {
    const task = {
      id: "task-1" as any,
      title: "Test",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-11"),
      row: 0,
      progress: 0,
    }
    const rect = taskToRect(task, viewport)
    expect(rect.x).toBe(0)
    expect(rect.width).toBe(200)
    expect(rect.y).toBe(0)
    expect(rect.height).toBe(ROW_HEIGHT)
  })

  test("row offset", () => {
    const task = {
      id: "task-2" as any,
      title: "Test",
      startDate: new Date("2025-01-06"),
      endDate: new Date("2025-01-11"),
      row: 2,
      progress: 0,
    }
    const rect = taskToRect(task, viewport)
    expect(rect.x).toBe(100)
    expect(rect.width).toBe(100)
    expect(rect.y).toBe(80)
  })
})
