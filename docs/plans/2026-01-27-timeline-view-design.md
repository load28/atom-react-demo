# Timeline View Design

## Overview

Effect + @effect-atom/atom-react 기반 간트 차트 타임라인뷰. CRUD와 드래그&드롭 인터랙션을 지원하며, 모든 도메인 로직은 Effect 서비스로 분리한다.

## 도메인 모델

Effect Schema로 정의한다.

```typescript
const TaskId = Schema.String.pipe(Schema.brand("TaskId"))

const TimelineTask = Schema.Struct({
  id: TaskId,
  title: Schema.String,
  startDate: Schema.DateFromString,
  endDate: Schema.DateFromString,
  color: Schema.optional(Schema.String),
  row: Schema.Number,
  progress: Schema.Number, // 0-100
})

const TimelineViewport = Schema.Struct({
  startDate: Schema.DateFromString,
  endDate: Schema.DateFromString,
  zoom: Schema.Number, // pixels per day
})
```

에러는 tagged error로 모델링: `TaskNotFound`, `InvalidDateRange`.

## 서비스 레이어

```typescript
class TimelineService extends Effect.Service<TimelineService>()("TimelineService", {
  effect: Effect.gen(function* () {
    return {
      createTask, updateTask, deleteTask, moveTask, resizeTask
    }
  })
}) {}
```

모든 도메인 로직(유효성 검증, 날짜 계산)은 이 서비스 안에 위치한다. React와 완전 분리.

## Atom 상태 설계

### 코어 상태

- `tasksAtom` — `Map<TaskId, TimelineTask>`
- `viewportAtom` — `TimelineViewport`
- `selectedTaskIdAtom` — `TaskId | null`
- `dragStateAtom` — `DragState | null` (taskId, type: move/resize, originX, currentX)

### 파생 상태

- `sortedTasksAtom` — startDate 기준 정렬
- `selectedTaskAtom` — 선택된 태스크 객체

### Effect 연동

- `runtimeAtom` — `Atom.runtime(TimelineService.Default)`
- `createTaskAtom`, `deleteTaskAtom` 등 — `runtimeAtom.fn`으로 서비스 호출

## 컴포넌트 구조

```
TimelineContainer (뷰포트 관리, 전체 레이아웃)
├── TimelineHeader (날짜/시간 눈금자)
├── TimelineGrid (배경 그리드)
└── TimelineRow[] (태스크 행)
    └── TimelineBar[] (개별 태스크 바, 드래그/리사이즈 핸들)
TaskForm (태스크 생성/수정 폼)
```

### 좌표 변환 (순수 함수)

- `dateToX(date, viewport): number`
- `xToDate(x, viewport): Date`
- `taskToRect(task, viewport): Rect`

### 커스텀 훅

- `useDrag` — pointer 이벤트 → dragStateAtom 업데이트
- `useViewport` — 줌/스크롤 제어

## 테스트 전략

### 유닛 테스트 (bun test)

| 대상 | 파일 | 검증 내용 |
|------|------|-----------|
| 좌표 변환 | `coordinate.test.ts` | dateToX/xToDate 정확성, 엣지 케이스 |
| 유효성 검증 | `validation.test.ts` | Schema 파싱, 날짜 범위 검증 |
| 서비스 로직 | `task-service.test.ts` | CRUD, tagged error 발생 |
| 파생 atom | `derived-atoms.test.ts` | 정렬, 선택 로직 |

### 통합 테스트 (bun test + @testing-library/react)

| 대상 | 파일 | 검증 내용 |
|------|------|-----------|
| CRUD 플로우 | `timeline-crud.test.tsx` | 폼 → 생성 → 표시 → 수정 → 삭제 |
| 드래그 | `timeline-drag.test.tsx` | pointerDown/Move/Up → 날짜 변경 |
| 뷰포트 | `timeline-viewport.test.tsx` | 줌/스크롤 → 뷰포트 업데이트 |

## 디렉토리 구조

```
src/
├── domain/
│   ├── model.ts
│   ├── errors.ts
│   ├── coordinate.ts
│   └── validation.ts
├── services/
│   └── timeline-service.ts
├── atoms/
│   ├── core.ts
│   ├── derived.ts
│   └── actions.ts
├── components/timeline/
│   ├── TimelineContainer.tsx
│   ├── TimelineHeader.tsx
│   ├── TimelineGrid.tsx
│   ├── TimelineRow.tsx
│   ├── TimelineBar.tsx
│   ├── TaskForm.tsx
│   └── hooks/
│       ├── useDrag.ts
│       └── useViewport.ts
__tests__/
├── unit/
│   ├── domain/
│   │   ├── coordinate.test.ts
│   │   ├── validation.test.ts
│   │   └── task-service.test.ts
│   └── atoms/
│       └── derived-atoms.test.ts
└── integration/
    ├── timeline-crud.test.tsx
    ├── timeline-drag.test.tsx
    └── timeline-viewport.test.tsx
```

## 의존성

```bash
bun add @effect-atom/atom-react
bun add -d @testing-library/react @testing-library/dom happy-dom
```

## 의존성 흐름

```
domain (순수) → services (Effect) → atoms (atom-react) → components (React)
```

각 레이어는 왼쪽만 의존한다. 역방향 의존 없음.
