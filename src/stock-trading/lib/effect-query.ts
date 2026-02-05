import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type QueryStatus = "idle" | "loading" | "success" | "error"

export interface QueryState<T> {
  readonly data: T
  readonly status: QueryStatus
  readonly error: string | null
  readonly lastFetchedAt: number
}

// ---------------------------------------------------------------------------
// createEffectQuery
// ---------------------------------------------------------------------------
// Effect 기반 React Query 유사 캐시 관리
//   - staleTime 이내 → 캐시 반환 (네트워크 요청 없음)
//   - staleTime 초과 → loading 상태 + 재요청 (stale-while-revalidate)
//   - 에러 시 → 기존 data 유지 + error 상태
// ---------------------------------------------------------------------------
export function createEffectQuery<T, R = any, ER = never>(options: {
  runtime: Atom.AtomRuntime<R, ER>
  effect: Effect.Effect<T, any, any>
  initialData: T
  staleTime?: number
}) {
  const { runtime, effect, initialData, staleTime = 0 } = options

  // 쿼리 전체 상태
  const stateAtom = Atom.make<QueryState<T>>({
    data: initialData,
    status: "idle",
    error: null,
    lastFetchedAt: 0,
  })

  // 파생 atoms (컴포넌트에서 필요한 슬라이스만 구독)
  const dataAtom = Atom.make((get) => get(stateAtom).data)
  const statusAtom = Atom.make((get) => get(stateAtom).status)
  const isLoadingAtom = Atom.make((get) => get(stateAtom).status === "loading")
  const errorAtom = Atom.make((get) => get(stateAtom).error)

  // 내부: fetch + 상태 업데이트 Effect 생성
  const runFetch = (get: any) => {
    const state: QueryState<T> = get(stateAtom)
    get.set(stateAtom, { ...state, status: "loading" as QueryStatus })

    return effect.pipe(
      Effect.tap((data: T) =>
        Effect.sync(() => {
          get.set(stateAtom, {
            data,
            status: "success" as QueryStatus,
            error: null,
            lastFetchedAt: Date.now(),
          })
        })
      ),
      Effect.tapError((err: unknown) =>
        Effect.sync(() => {
          const current: QueryState<T> = get(stateAtom)
          get.set(stateAtom, {
            ...current,
            status: "error" as QueryStatus,
            error: String(err),
          })
        })
      )
    )
  }

  // fetch: staleTime 이내면 캐시 반환, 초과하면 재요청
  const fetchAtom = runtime.fn((_: void, get: any) => {
    const state: QueryState<T> = get(stateAtom)
    const now = Date.now()

    if (state.status === "success" && now - state.lastFetchedAt < staleTime) {
      return Effect.succeed(state.data)
    }

    return runFetch(get)
  })

  // refetch: 캐시 무시하고 항상 재요청
  const refetchAtom = runtime.fn((_: void, get: any) => runFetch(get))

  // invalidate: 캐시를 stale로 표시 (다음 fetch 시 재요청)
  const invalidateAtom = runtime.fn((_: void, get: any) =>
    Effect.sync(() => {
      const state: QueryState<T> = get(stateAtom)
      get.set(stateAtom, { ...state, lastFetchedAt: 0, status: "idle" as QueryStatus })
    })
  )

  return {
    stateAtom,
    dataAtom,
    statusAtom,
    isLoadingAtom,
    errorAtom,
    fetchAtom,
    refetchAtom,
    invalidateAtom,
  } as const
}
