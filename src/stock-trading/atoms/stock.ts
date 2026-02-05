import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import * as Result from "@effect-atom/atom/Result"
import type { Stock, StockSymbol } from "@/src/stock-trading/domain/model"
import { calculatePriceChange } from "@/src/stock-trading/domain/calculator"
import { StockService } from "@/src/stock-trading/services/stock-service"

const runtimeAtom = Atom.runtime(StockService.Default)

// 캐시된 Effect 참조 (첫 호출 시 초기화, 이후 재사용)
const cachedFetchRef = Atom.make<{
  readonly fetch: Effect.Effect<ReadonlyArray<Stock>, any>
  readonly invalidate: Effect.Effect<void>
} | null>(null)

// 주식 조회 (Effect.cachedInvalidateWithTTL 30초)
// "cached" → TTL 내 캐시 반환 / "fresh" → 캐시 무효화 후 재조회
export const fetchStocksAtom = runtimeAtom.fn<"cached" | "fresh">()(
  (mode, get) => {
    const cache = get(cachedFetchRef)

    if (cache) {
      if (mode === "fresh") {
        return Effect.gen(function* () {
          yield* cache.invalidate
          return yield* cache.fetch
        })
      }
      return cache.fetch
    }

    // 첫 호출: 캐시 초기화
    return Effect.gen(function* () {
      const service = yield* StockService
      const [cachedFetch, invalidate] = yield* Effect.cachedInvalidateWithTTL(
        service.getAllStocks(),
        "30 seconds",
      )
      get.set(cachedFetchRef, { fetch: cachedFetch, invalidate })
      return yield* cachedFetch
    })
  },
)

// 하위 호환: 순수 배열 (Result에서 추출)
export const stockListAtom = Atom.make((get) =>
  Result.getOrElse(get(fetchStocksAtom), () => [] as ReadonlyArray<Stock>),
)

// 파생 상태: 가격 변동 정보 포함한 주식 목록
export const stocksWithChangeAtom = Atom.make((get) =>
  get(stockListAtom).map((stock) => ({
    ...stock,
    ...calculatePriceChange(stock),
  })),
)

// 파생 상태: symbol → price 맵
export const priceMapAtom = Atom.make((get) =>
  new Map(get(stockListAtom).map((s) => [s.symbol, s.price])) as Map<StockSymbol, number>,
)
