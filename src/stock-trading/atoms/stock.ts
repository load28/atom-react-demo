import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import type { Stock, StockSymbol } from "@/src/stock-trading/domain/model"
import { calculatePriceChange } from "@/src/stock-trading/domain/calculator"
import { StockService } from "@/src/stock-trading/services/stock-service"

const runtimeAtom = Atom.runtime(StockService.Default)

// 주식 목록 상태
export const stockListAtom = Atom.make<ReadonlyArray<Stock>>([])

// 주식 목록 조회 액션
export const fetchStocksAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const service = yield* StockService
    const stocks = yield* service.getAllStocks()
    get.set(stockListAtom, stocks)
    return stocks
  })
)

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
