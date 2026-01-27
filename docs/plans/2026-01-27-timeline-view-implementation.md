# Timeline View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Effect + @effect-atom/atom-react 기반 간트 차트 타임라인뷰 구현 (CRUD + 드래그&드롭, TDD)

**Architecture:** 도메인 모델(Effect Schema) → 서비스(Effect.Service) → Atom 상태(@effect-atom/atom-react) → React 컴포넌트. 각 레이어는 왼쪽만 의존한다.

**Tech Stack:** Effect 3.x, @effect-atom/atom-react, React 19, Next.js 16, Tailwind v4, bun test, @testing-library/react, happy-dom

---

### Task 1: 의존성 설치 & 테스트 환경 설정

**Files:**
- Modify: `package.json`
- Create: `bunfig.toml`

**Step 1: 의존성 설치**

Run:
```bash
bun add @effect-atom/atom-react
bun add -d @testing-library/react @testing-library/dom @happy-dom/global-registrator happy-dom
```

**Step 2: bun test 설정 — happy-dom 프리로드**

Create `bunfig.toml`:
```toml
[test]
preload = ["./test-setup.ts"]
```

Create `test-setup.ts`:
```typescript
import "@happy-dom/global-registrator"
```

**Step 3: 테스트 러너 동작 확인**

Create `__tests__/smoke.test.ts`:
```typescript
import { expect, test } from "bun:test"

test("smoke test", () => {
  expect(1 + 1).toBe(2)
})
```

Run: `bun test __tests__/smoke.test.ts`
Expected: PASS

**Step 4: 커밋**

```bash
git add -A && git commit -m "chore: add dependencies and test setup"
```

---

### Task 2: 도메인 모델 (TDD)

**Files:**
- Create: `src/domain/model.ts`
- Create: `src/domain/errors.ts`
- Create: `__tests__/unit/domain/validation.test.ts`

**Step 1: 유효성 검증 테스트 작성**

Create `__tests__/unit/domain/validation.test.ts`:
```typescript
import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { TimelineTask, TaskId, TimelineViewport } from "@/domain/model"

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
        progress: 150, // invalid
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
```

**Step 2: 테스트 실행 — 실패 확인**

Run: `bun test __tests__/unit/domain/validation.test.ts`
Expected: FAIL — module `@/domain/model` not found

**Step 3: 도메인 모델 구현**

Create `src/domain/model.ts`:
```typescript
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
```

Create `src/domain/errors.ts`:
```typescript
import { Data } from "effect"
import type { TaskId } from "./model"

export class TaskNotFound extends Data.TaggedError("TaskNotFound")<{
  readonly id: TaskId
}> {}

export class InvalidDateRange extends Data.TaggedError("InvalidDateRange")<{
  readonly startDate: Date
  readonly endDate: Date
  readonly reason: string
}> {}
```

**Step 4: 테스트 실행 — 통과 확인**

Run: `bun test __tests__/unit/domain/validation.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/domain/ __tests__/unit/domain/validation.test.ts
git commit -m "feat: add domain model with Effect Schema and tagged errors"
```

---

### Task 3: 좌표 변환 순수 함수 (TDD)

**Files:**
- Create: `src/domain/coordinate.ts`
- Create: `__tests__/unit/domain/coordinate.test.ts`

**Step 1: 좌표 변환 테스트 작성**

Create `__tests__/unit/domain/coordinate.test.ts`:
```typescript
import { describe, expect, test } from "bun:test"
import { dateToX, xToDate, taskToRect } from "@/domain/coordinate"
import type { TimelineViewport, TimelineTask } from "@/domain/model"

const viewport: TimelineViewport = {
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-03-01"),
  zoom: 20, // 20px per day
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
    expect(rect.width).toBe(200) // 10 days * 20px
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
    expect(rect.x).toBe(100) // 5 days * 20px
    expect(rect.width).toBe(100) // 5 days * 20px
    expect(rect.y).toBe(80) // row 2 * 40px
  })
})
```

**Step 2: 테스트 실행 — 실패 확인**

Run: `bun test __tests__/unit/domain/coordinate.test.ts`
Expected: FAIL

**Step 3: 좌표 변환 구현**

Create `src/domain/coordinate.ts`:
```typescript
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
```

**Step 4: 테스트 실행 — 통과 확인**

Run: `bun test __tests__/unit/domain/coordinate.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/domain/coordinate.ts __tests__/unit/domain/coordinate.test.ts
git commit -m "feat: add coordinate conversion pure functions"
```

---

### Task 4: TimelineService (TDD)

**Files:**
- Create: `src/services/timeline-service.ts`
- Create: `__tests__/unit/domain/task-service.test.ts`

**Step 1: 서비스 테스트 작성**

Create `__tests__/unit/domain/task-service.test.ts`:
```typescript
import { describe, expect, test } from "bun:test"
import { Effect, Exit, Cause } from "effect"
import { TimelineService } from "@/services/timeline-service"
import type { TaskId, TimelineTask } from "@/domain/model"

const runWithService = <A, E>(
  effect: Effect.Effect<A, E, TimelineService>
) => Effect.runPromiseExit(Effect.provide(effect, TimelineService.Default))

describe("TimelineService", () => {
  test("createTask returns a valid task", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        return yield* service.createTask({
          title: "Design",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-10"),
          row: 0,
          progress: 0,
        })
      })
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.title).toBe("Design")
      expect(exit.value.id).toBeDefined()
    }
  })

  test("createTask fails on invalid date range", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        return yield* service.createTask({
          title: "Bad",
          startDate: new Date("2025-01-10"),
          endDate: new Date("2025-01-05"),
          row: 0,
          progress: 0,
        })
      })
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })

  test("deleteTask fails on unknown id", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        return yield* service.deleteTask("nonexistent" as TaskId)
      })
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })

  test("updateTask modifies title", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        const task = yield* service.createTask({
          title: "Old",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-10"),
          row: 0,
          progress: 0,
        })
        return yield* service.updateTask(task.id, { title: "New" })
      })
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.title).toBe("New")
    }
  })

  test("moveTask changes start and end dates", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        const task = yield* service.createTask({
          title: "Move me",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-10"),
          row: 0,
          progress: 0,
        })
        return yield* service.moveTask(
          task.id,
          new Date("2025-02-01"),
          new Date("2025-02-10")
        )
      })
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.startDate.getTime()).toBe(new Date("2025-02-01").getTime())
      expect(exit.value.endDate.getTime()).toBe(new Date("2025-02-10").getTime())
    }
  })

  test("resizeTask changes end date", async () => {
    const exit = await runWithService(
      Effect.gen(function* () {
        const service = yield* TimelineService
        const task = yield* service.createTask({
          title: "Resize me",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-10"),
          row: 0,
          progress: 0,
        })
        return yield* service.resizeTask(task.id, new Date("2025-01-20"))
      })
    )
    expect(Exit.isSuccess(exit)).toBe(true)
    if (Exit.isSuccess(exit)) {
      expect(exit.value.endDate.getTime()).toBe(new Date("2025-01-20").getTime())
    }
  })
})
```

**Step 2: 테스트 실행 — 실패 확인**

Run: `bun test __tests__/unit/domain/task-service.test.ts`
Expected: FAIL

**Step 3: 서비스 구현**

Create `src/services/timeline-service.ts`:
```typescript
import { Effect, Context, Ref, HashMap, Option } from "effect"
import type { TaskId, TimelineTask } from "@/domain/model"
import { TaskNotFound, InvalidDateRange } from "@/domain/errors"

interface CreateTaskInput {
  readonly title: string
  readonly startDate: Date
  readonly endDate: Date
  readonly row: number
  readonly progress: number
  readonly color?: string
}

const validateDateRange = (startDate: Date, endDate: Date) =>
  startDate < endDate
    ? Effect.void
    : Effect.fail(
        new InvalidDateRange({
          startDate,
          endDate,
          reason: "startDate must be before endDate",
        })
      )

let counter = 0
const generateId = (): TaskId => `task-${++counter}` as TaskId

export class TimelineService extends Effect.Service<TimelineService>()(
  "TimelineService",
  {
    effect: Effect.gen(function* () {
      const store = yield* Ref.make(HashMap.empty<TaskId, TimelineTask>())

      const createTask = (input: CreateTaskInput) =>
        Effect.gen(function* () {
          yield* validateDateRange(input.startDate, input.endDate)
          const task: TimelineTask = {
            id: generateId(),
            title: input.title,
            startDate: input.startDate,
            endDate: input.endDate,
            row: input.row,
            progress: input.progress,
            color: input.color,
          }
          yield* Ref.update(store, HashMap.set(task.id, task))
          return task
        })

      const getTask = (id: TaskId) =>
        Effect.gen(function* () {
          const tasks = yield* Ref.get(store)
          const opt = HashMap.get(tasks, id)
          return yield* Option.match(opt, {
            onNone: () => Effect.fail(new TaskNotFound({ id })),
            onSome: (task) => Effect.succeed(task),
          })
        }).pipe(Effect.flatten)

      const updateTask = (id: TaskId, patch: Partial<Omit<TimelineTask, "id">>) =>
        Effect.gen(function* () {
          const existing = yield* getTask(id)
          const updated = { ...existing, ...patch }
          if (patch.startDate || patch.endDate) {
            yield* validateDateRange(updated.startDate, updated.endDate)
          }
          yield* Ref.update(store, HashMap.set(id, updated))
          return updated
        })

      const deleteTask = (id: TaskId) =>
        Effect.gen(function* () {
          yield* getTask(id) // verify exists
          yield* Ref.update(store, HashMap.remove(id))
        })

      const moveTask = (id: TaskId, newStart: Date, newEnd: Date) =>
        Effect.gen(function* () {
          yield* validateDateRange(newStart, newEnd)
          const existing = yield* getTask(id)
          const updated = { ...existing, startDate: newStart, endDate: newEnd }
          yield* Ref.update(store, HashMap.set(id, updated))
          return updated
        })

      const resizeTask = (id: TaskId, newEnd: Date) =>
        Effect.gen(function* () {
          const existing = yield* getTask(id)
          yield* validateDateRange(existing.startDate, newEnd)
          const updated = { ...existing, endDate: newEnd }
          yield* Ref.update(store, HashMap.set(id, updated))
          return updated
        })

      return { createTask, updateTask, deleteTask, moveTask, resizeTask } as const
    }),
  }
) {}
```

**Step 4: 테스트 실행 — 통과 확인**

Run: `bun test __tests__/unit/domain/task-service.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/services/ __tests__/unit/domain/task-service.test.ts
git commit -m "feat: add TimelineService with CRUD, move, resize"
```

---

### Task 5: Atom 상태 레이어 (TDD)

**Files:**
- Create: `src/atoms/core.ts`
- Create: `src/atoms/derived.ts`
- Create: `src/atoms/actions.ts`
- Create: `__tests__/unit/atoms/derived-atoms.test.ts`

**Step 1: 파생 atom 테스트 작성**

Create `__tests__/unit/atoms/derived-atoms.test.ts`:
```typescript
import { describe, expect, test } from "bun:test"
import { Atom } from "@effect-atom/atom-react"
import { tasksAtom, selectedTaskIdAtom } from "@/atoms/core"
import { sortedTasksAtom, selectedTaskAtom } from "@/atoms/derived"
import type { TaskId, TimelineTask } from "@/domain/model"

// Note: atom 테스트는 registry를 만들어서 get/set으로 검증한다.
// @effect-atom/atom-react의 Registry API에 맞게 조정 필요.

describe("sortedTasksAtom", () => {
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
    // Direct logic test: the sorting function
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

describe("selectedTaskAtom", () => {
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
```

**Step 2: 테스트 실행 — 통과 확인 (순수 로직 테스트)**

Run: `bun test __tests__/unit/atoms/derived-atoms.test.ts`
Expected: PASS (이 테스트는 atom 인프라 없이 순수 로직만 검증)

**Step 3: Atom 파일 구현**

Create `src/atoms/core.ts`:
```typescript
import { Atom } from "@effect-atom/atom-react"
import type { TaskId, TimelineTask, TimelineViewport, DragState } from "@/domain/model"

export const tasksAtom = Atom.state(new Map<TaskId, TimelineTask>())

export const viewportAtom = Atom.state<TimelineViewport>({
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-04-01"),
  zoom: 20,
})

export const selectedTaskIdAtom = Atom.state<TaskId | null>(null)

export const dragStateAtom = Atom.state<DragState | null>(null)
```

Create `src/atoms/derived.ts`:
```typescript
import { Atom } from "@effect-atom/atom-react"
import { tasksAtom, selectedTaskIdAtom } from "./core"

export const sortedTasksAtom = Atom.make((get) => {
  const tasks = get(tasksAtom)
  return [...tasks.values()].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  )
})

export const selectedTaskAtom = Atom.make((get) => {
  const id = get(selectedTaskIdAtom)
  if (id === null) return null
  const tasks = get(tasksAtom)
  return tasks.get(id) ?? null
})
```

Create `src/atoms/actions.ts`:
```typescript
import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import { TimelineService } from "@/services/timeline-service"
import { tasksAtom } from "./core"
import type { TaskId, TimelineTask } from "@/domain/model"

const runtimeAtom = Atom.runtime(TimelineService.Default)

export const createTaskAtom = runtimeAtom.fn(
  Effect.fnUntraced(function* (input: {
    title: string
    startDate: Date
    endDate: Date
    row: number
    progress: number
    color?: string
  }) {
    const service = yield* TimelineService
    return yield* service.createTask(input)
  })
)

export const updateTaskAtom = runtimeAtom.fn(
  Effect.fnUntraced(function* (args: {
    id: TaskId
    patch: Partial<Omit<TimelineTask, "id">>
  }) {
    const service = yield* TimelineService
    return yield* service.updateTask(args.id, args.patch)
  })
)

export const deleteTaskAtom = runtimeAtom.fn(
  Effect.fnUntraced(function* (id: TaskId) {
    const service = yield* TimelineService
    return yield* service.deleteTask(id)
  })
)

export const moveTaskAtom = runtimeAtom.fn(
  Effect.fnUntraced(function* (args: {
    id: TaskId
    newStart: Date
    newEnd: Date
  }) {
    const service = yield* TimelineService
    return yield* service.moveTask(args.id, args.newStart, args.newEnd)
  })
)

export const resizeTaskAtom = runtimeAtom.fn(
  Effect.fnUntraced(function* (args: {
    id: TaskId
    newEnd: Date
  }) {
    const service = yield* TimelineService
    return yield* service.resizeTask(args.id, args.newEnd)
  })
)
```

**Step 4: 테스트 실행 — 전체 유닛 테스트**

Run: `bun test __tests__/unit/`
Expected: ALL PASS

**Step 5: 커밋**

```bash
git add src/atoms/ __tests__/unit/atoms/
git commit -m "feat: add atom state layer (core, derived, actions)"
```

---

### Task 6: TimelineBar 컴포넌트

**Files:**
- Create: `src/components/timeline/TimelineBar.tsx`

**Step 1: 구현**

Create `src/components/timeline/TimelineBar.tsx`:
```tsx
"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react"
import { viewportAtom, selectedTaskIdAtom, dragStateAtom } from "@/atoms/core"
import { dateToX, taskToRect, ROW_HEIGHT } from "@/domain/coordinate"
import type { TimelineTask, DragState } from "@/domain/model"

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
        top: rect.y,
        width: rect.width,
        height: rect.height - 8,
        marginTop: 4,
        backgroundColor: task.color ?? "#3b82f6",
      }}
      onClick={() => setSelected(task.id)}
      onPointerDown={(e) => handlePointerDown(e, "move")}
    >
      {/* Progress bar */}
      <div
        className="absolute top-0 left-0 h-full rounded opacity-30 bg-black"
        style={{ width: progressWidth }}
      />
      {/* Title */}
      <span className="relative z-10 px-2 text-xs text-white leading-8 truncate block">
        {task.title}
      </span>
      {/* Resize handle */}
      <div
        data-testid={`resize-handle-${task.id}`}
        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize"
        onPointerDown={(e) => handlePointerDown(e, "resize")}
      />
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add src/components/timeline/TimelineBar.tsx
git commit -m "feat: add TimelineBar component with drag/resize handles"
```

---

### Task 7: TimelineHeader, TimelineGrid, TimelineRow

**Files:**
- Create: `src/components/timeline/TimelineHeader.tsx`
- Create: `src/components/timeline/TimelineGrid.tsx`
- Create: `src/components/timeline/TimelineRow.tsx`

**Step 1: TimelineHeader 구현**

Create `src/components/timeline/TimelineHeader.tsx`:
```tsx
"use client"

import { useAtomValue } from "@effect-atom/atom-react"
import { viewportAtom } from "@/atoms/core"
import { dateToX } from "@/domain/coordinate"

export function TimelineHeader() {
  const viewport = useAtomValue(viewportAtom)
  const dates: Date[] = []
  const current = new Date(viewport.startDate)
  while (current <= viewport.endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Show labels based on zoom: every day if zoom >= 30, every week if < 30
  const showEvery = viewport.zoom >= 30 ? 1 : 7

  return (
    <div className="relative h-10 border-b border-gray-300 bg-gray-50" data-testid="timeline-header">
      {dates
        .filter((_, i) => i % showEvery === 0)
        .map((date) => {
          const x = dateToX(date, viewport)
          const label = `${date.getMonth() + 1}/${date.getDate()}`
          return (
            <div
              key={date.toISOString()}
              className="absolute top-0 text-xs text-gray-500 px-1"
              style={{ left: x }}
            >
              {label}
            </div>
          )
        })}
    </div>
  )
}
```

**Step 2: TimelineGrid 구현**

Create `src/components/timeline/TimelineGrid.tsx`:
```tsx
"use client"

import { useAtomValue } from "@effect-atom/atom-react"
import { viewportAtom } from "@/atoms/core"
import { dateToX } from "@/domain/coordinate"

interface TimelineGridProps {
  readonly height: number
}

export function TimelineGrid({ height }: TimelineGridProps) {
  const viewport = useAtomValue(viewportAtom)
  const lines: number[] = []
  const current = new Date(viewport.startDate)
  while (current <= viewport.endDate) {
    lines.push(dateToX(current, viewport))
    current.setDate(current.getDate() + 7) // weekly grid lines
  }

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="timeline-grid">
      {lines.map((x) => (
        <div
          key={x}
          className="absolute top-0 w-px bg-gray-200"
          style={{ left: x, height }}
        />
      ))}
    </div>
  )
}
```

**Step 3: TimelineRow 구현**

Create `src/components/timeline/TimelineRow.tsx`:
```tsx
"use client"

import { ROW_HEIGHT } from "@/domain/coordinate"
import type { TimelineTask } from "@/domain/model"
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
```

**Step 4: 커밋**

```bash
git add src/components/timeline/TimelineHeader.tsx src/components/timeline/TimelineGrid.tsx src/components/timeline/TimelineRow.tsx
git commit -m "feat: add TimelineHeader, TimelineGrid, TimelineRow"
```

---

### Task 8: useDrag 훅 & useViewport 훅

**Files:**
- Create: `src/components/timeline/hooks/useDrag.ts`
- Create: `src/components/timeline/hooks/useViewport.ts`

**Step 1: useDrag 구현**

Create `src/components/timeline/hooks/useDrag.ts`:
```typescript
"use client"

import { useCallback, useEffect } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react"
import { dragStateAtom, viewportAtom, tasksAtom } from "@/atoms/core"
import { xToDate } from "@/domain/coordinate"
import type { TaskId } from "@/domain/model"

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
```

**Step 2: useViewport 구현**

Create `src/components/timeline/hooks/useViewport.ts`:
```typescript
"use client"

import { useCallback } from "react"
import { useAtom } from "@effect-atom/atom-react"
import { viewportAtom } from "@/atoms/core"

export function useViewport() {
  const [viewport, setViewport] = useAtom(viewportAtom)

  const zoomIn = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.min(v.zoom * 1.5, 100) }))
  }, [setViewport])

  const zoomOut = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.max(v.zoom / 1.5, 5) }))
  }, [setViewport])

  const scrollBy = useCallback(
    (days: number) => {
      setViewport((v) => {
        const ms = days * 86_400_000
        return {
          ...v,
          startDate: new Date(v.startDate.getTime() + ms),
          endDate: new Date(v.endDate.getTime() + ms),
        }
      })
    },
    [setViewport]
  )

  return { viewport, zoomIn, zoomOut, scrollBy }
}
```

**Step 3: 커밋**

```bash
git add src/components/timeline/hooks/
git commit -m "feat: add useDrag and useViewport hooks"
```

---

### Task 9: TaskForm 컴포넌트

**Files:**
- Create: `src/components/timeline/TaskForm.tsx`

**Step 1: 구현**

Create `src/components/timeline/TaskForm.tsx`:
```tsx
"use client"

import { useState } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react"
import { selectedTaskIdAtom } from "@/atoms/core"
import { selectedTaskAtom } from "@/atoms/derived"
import { createTaskAtom, updateTaskAtom, deleteTaskAtom } from "@/atoms/actions"

export function TaskForm() {
  const selectedTask = useAtomValue(selectedTaskAtom)
  const setSelectedId = useAtomSet(selectedTaskIdAtom)
  const createTask = useAtomSet(createTaskAtom)
  const updateTask = useAtomSet(updateTaskAtom)
  const deleteTask = useAtomSet(deleteTaskAtom)

  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [row, setRow] = useState(0)

  const handleCreate = () => {
    if (!title || !startDate || !endDate) return
    createTask({
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      row,
      progress: 0,
    })
    setTitle("")
    setStartDate("")
    setEndDate("")
  }

  const handleDelete = () => {
    if (!selectedTask) return
    deleteTask(selectedTask.id)
    setSelectedId(null)
  }

  return (
    <div className="p-4 border-t border-gray-200 bg-white" data-testid="task-form">
      <h3 className="text-sm font-semibold mb-2">
        {selectedTask ? "Edit Task" : "New Task"}
      </h3>
      <div className="flex gap-2 items-end flex-wrap">
        <label className="flex flex-col text-xs">
          Title
          <input
            data-testid="input-title"
            className="border rounded px-2 py-1 text-sm"
            value={selectedTask?.title ?? title}
            onChange={(e) => {
              if (selectedTask) {
                updateTask({ id: selectedTask.id, patch: { title: e.target.value } })
              } else {
                setTitle(e.target.value)
              }
            }}
          />
        </label>
        <label className="flex flex-col text-xs">
          Start
          <input
            data-testid="input-start"
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs">
          End
          <input
            data-testid="input-end"
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs">
          Row
          <input
            data-testid="input-row"
            type="number"
            className="border rounded px-2 py-1 text-sm w-16"
            value={row}
            onChange={(e) => setRow(Number(e.target.value))}
          />
        </label>
        {selectedTask ? (
          <button
            data-testid="btn-delete"
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            onClick={handleDelete}
          >
            Delete
          </button>
        ) : (
          <button
            data-testid="btn-create"
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            onClick={handleCreate}
          >
            Add
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: 커밋**

```bash
git add src/components/timeline/TaskForm.tsx
git commit -m "feat: add TaskForm component for CRUD"
```

---

### Task 10: TimelineContainer — 전체 조합

**Files:**
- Create: `src/components/timeline/TimelineContainer.tsx`
- Modify: `app/page.tsx`

**Step 1: TimelineContainer 구현**

Create `src/components/timeline/TimelineContainer.tsx`:
```tsx
"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react"
import { tasksAtom } from "@/atoms/core"
import { sortedTasksAtom } from "@/atoms/derived"
import { moveTaskAtom, resizeTaskAtom } from "@/atoms/actions"
import { ROW_HEIGHT } from "@/domain/coordinate"
import { TimelineHeader } from "./TimelineHeader"
import { TimelineGrid } from "./TimelineGrid"
import { TimelineRow } from "./TimelineRow"
import { TaskForm } from "./TaskForm"
import { useDrag } from "./hooks/useDrag"
import { useViewport } from "./hooks/useViewport"
import type { TaskId } from "@/domain/model"

export function TimelineContainer() {
  const sortedTasks = useAtomValue(sortedTasksAtom)
  const moveTask = useAtomSet(moveTaskAtom)
  const resizeTask = useAtomSet(resizeTaskAtom)
  const { viewport, zoomIn, zoomOut, scrollBy } = useViewport()

  useDrag((result) => {
    if (result.type === "move") {
      moveTask({ id: result.taskId, newStart: result.newStart, newEnd: result.newEnd })
    } else {
      resizeTask({ id: result.taskId, newEnd: result.newEnd })
    }
  })

  // Group tasks by row
  const maxRow = sortedTasks.reduce((max, t) => Math.max(max, t.row), 0)
  const rows = Array.from({ length: maxRow + 1 }, (_, i) =>
    sortedTasks.filter((t) => t.row === i)
  )
  const gridHeight = rows.length * ROW_HEIGHT

  return (
    <div className="flex flex-col h-screen" data-testid="timeline-container">
      {/* Toolbar */}
      <div className="flex gap-2 p-2 border-b bg-white">
        <button onClick={zoomIn} className="px-2 py-1 border rounded text-sm" data-testid="btn-zoom-in">
          Zoom +
        </button>
        <button onClick={zoomOut} className="px-2 py-1 border rounded text-sm" data-testid="btn-zoom-out">
          Zoom -
        </button>
        <button onClick={() => scrollBy(-7)} className="px-2 py-1 border rounded text-sm">
          &larr; Week
        </button>
        <button onClick={() => scrollBy(7)} className="px-2 py-1 border rounded text-sm">
          Week &rarr;
        </button>
      </div>

      {/* Timeline area */}
      <div className="flex-1 overflow-auto relative">
        <TimelineHeader />
        <div className="relative" style={{ minHeight: gridHeight }}>
          <TimelineGrid height={gridHeight} />
          {rows.map((tasks, rowIndex) => (
            <TimelineRow key={rowIndex} rowIndex={rowIndex} tasks={tasks} />
          ))}
        </div>
      </div>

      {/* Form */}
      <TaskForm />
    </div>
  )
}
```

**Step 2: app/page.tsx 수정**

Replace `app/page.tsx` with:
```tsx
import { TimelineContainer } from "@/components/timeline/TimelineContainer"

export default function Home() {
  return <TimelineContainer />
}
```

**Step 3: 빌드 확인**

Run: `bun run build`
Expected: No errors

**Step 4: 커밋**

```bash
git add src/components/timeline/TimelineContainer.tsx app/page.tsx
git commit -m "feat: add TimelineContainer and wire up page"
```

---

### Task 11: 통합 테스트 — CRUD 플로우

**Files:**
- Create: `__tests__/integration/timeline-crud.test.tsx`

**Step 1: 테스트 작성**

Create `__tests__/integration/timeline-crud.test.tsx`:
```tsx
import { describe, expect, test } from "bun:test"
import { render, screen, fireEvent } from "@testing-library/react"
import { TimelineContainer } from "@/components/timeline/TimelineContainer"

describe("Timeline CRUD integration", () => {
  test("creates a task via form and displays it", () => {
    render(<TimelineContainer />)

    fireEvent.change(screen.getByTestId("input-title"), {
      target: { value: "New Task" },
    })
    fireEvent.change(screen.getByTestId("input-start"), {
      target: { value: "2025-01-05" },
    })
    fireEvent.change(screen.getByTestId("input-end"), {
      target: { value: "2025-01-15" },
    })
    fireEvent.click(screen.getByTestId("btn-create"))

    // Task bar should appear
    expect(screen.getByText("New Task")).toBeDefined()
  })

  test("selects a task and deletes it", () => {
    render(<TimelineContainer />)

    // Create first
    fireEvent.change(screen.getByTestId("input-title"), {
      target: { value: "Delete Me" },
    })
    fireEvent.change(screen.getByTestId("input-start"), {
      target: { value: "2025-01-01" },
    })
    fireEvent.change(screen.getByTestId("input-end"), {
      target: { value: "2025-01-10" },
    })
    fireEvent.click(screen.getByTestId("btn-create"))

    // Click task bar to select
    const bar = screen.getByText("Delete Me")
    fireEvent.click(bar)

    // Delete button should appear
    const deleteBtn = screen.getByTestId("btn-delete")
    fireEvent.click(deleteBtn)

    // Task should be gone
    expect(screen.queryByText("Delete Me")).toBeNull()
  })
})
```

**Step 2: 테스트 실행**

Run: `bun test __tests__/integration/timeline-crud.test.tsx`
Expected: PASS

**Step 3: 커밋**

```bash
git add __tests__/integration/timeline-crud.test.tsx
git commit -m "test: add CRUD integration tests"
```

---

### Task 12: 통합 테스트 — 드래그 & 뷰포트

**Files:**
- Create: `__tests__/integration/timeline-drag.test.tsx`
- Create: `__tests__/integration/timeline-viewport.test.tsx`

**Step 1: 드래그 테스트 작성**

Create `__tests__/integration/timeline-drag.test.tsx`:
```tsx
import { describe, expect, test } from "bun:test"
import { render, screen, fireEvent } from "@testing-library/react"
import { TimelineContainer } from "@/components/timeline/TimelineContainer"

describe("Timeline drag integration", () => {
  test("drag task bar triggers pointer events", () => {
    render(<TimelineContainer />)

    // Create a task first
    fireEvent.change(screen.getByTestId("input-title"), {
      target: { value: "Drag Task" },
    })
    fireEvent.change(screen.getByTestId("input-start"), {
      target: { value: "2025-01-01" },
    })
    fireEvent.change(screen.getByTestId("input-end"), {
      target: { value: "2025-01-11" },
    })
    fireEvent.click(screen.getByTestId("btn-create"))

    const bar = screen.getByText("Drag Task")

    // Simulate drag: pointerdown → pointermove → pointerup
    fireEvent.pointerDown(bar, { clientX: 100 })
    fireEvent.pointerMove(bar, { clientX: 200 })
    fireEvent.pointerUp(bar)

    // Task should still exist after drag
    expect(screen.getByText("Drag Task")).toBeDefined()
  })
})
```

**Step 2: 뷰포트 테스트 작성**

Create `__tests__/integration/timeline-viewport.test.tsx`:
```tsx
import { describe, expect, test } from "bun:test"
import { render, screen, fireEvent } from "@testing-library/react"
import { TimelineContainer } from "@/components/timeline/TimelineContainer"

describe("Timeline viewport integration", () => {
  test("zoom in button exists and is clickable", () => {
    render(<TimelineContainer />)
    const zoomInBtn = screen.getByTestId("btn-zoom-in")
    expect(zoomInBtn).toBeDefined()
    fireEvent.click(zoomInBtn)
    // Should not crash
  })

  test("zoom out button exists and is clickable", () => {
    render(<TimelineContainer />)
    const zoomOutBtn = screen.getByTestId("btn-zoom-out")
    expect(zoomOutBtn).toBeDefined()
    fireEvent.click(zoomOutBtn)
    // Should not crash
  })
})
```

**Step 3: 전체 테스트 실행**

Run: `bun test`
Expected: ALL PASS

**Step 4: 커밋**

```bash
git add __tests__/integration/
git commit -m "test: add drag and viewport integration tests"
```

---

### Task 13: 스모크 테스트 정리 & 최종 확인

**Step 1: 스모크 테스트 삭제**

```bash
rm __tests__/smoke.test.ts
```

**Step 2: 전체 테스트 실행**

Run: `bun test`
Expected: ALL PASS

**Step 3: 빌드 확인**

Run: `bun run build`
Expected: No errors

**Step 4: 최종 커밋**

```bash
git add -A && git commit -m "chore: cleanup smoke test, verify all tests pass"
```
