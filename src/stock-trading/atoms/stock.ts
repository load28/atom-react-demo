import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import type { Stock, StockSymbol } from "@/src/stock-trading/domain/model"
import { calculatePriceChange } from "@/src/stock-trading/domain/calculator"
import { StockService } from "@/src/stock-trading/services/stock-service"
import { createEffectQuery } from "@/src/stock-trading/lib/effect-query"

const runtimeAtom = Atom.runtime(StockService.Default)

// Effect Query: 서버 상태 캐시 관리 (staleTime 30초)
export const stocksQuery = createEffectQuery({
  runtime: runtimeAtom,
  effect: Effect.gen(function* () {
    const service = yield* StockService
    return yield* service.getAllStocks()
  }),
  initialData: [] as ReadonlyArray<Stock>,
  staleTime: 30_000,
})

// 하위 호환 re-export
export const stockListAtom = stocksQuery.dataAtom
export const fetchStocksAtom = stocksQuery.fetchAtom

// 파생 상태: 가격 변동 정보 포함한 주식 목록
export const stocksWithChangeAtom = Atom.make((get) =>
  get(stockListAtom).map((stock) => ({
    ...stock,
    ...calculatePriceChange(stock),
  }))
)

// 파생 상태: symbol → price 맵
export const priceMapAtom = Atom.make((get) =>
  new Map(get(stockListAtom).map((s) => [s.symbol, s.price])) as Map<StockSymbol, number>
)
