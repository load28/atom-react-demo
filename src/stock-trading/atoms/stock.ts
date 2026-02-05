import { Atom } from "@effect-atom/atom-react"
import * as Result from "@effect-atom/atom/Result"
import type { Stock, StockSymbol } from "@/src/stock-trading/domain/model"
import { calculatePriceChange } from "@/src/stock-trading/domain/calculator"
import { StockApiClient } from "@/src/stock-trading/client"
import { livePricesAtom } from "./stock-feed"

// reactivityKeys: mutation 실행 시 query 자동 리프레시
const stocksKey = ["stocks"] as const

// 주식 목록 조회 (AtomHttpApi query — 구독 시 자동 fetch, TTL 30초)
export const fetchStocksAtom = StockApiClient.query("stocks", "getAll", {
  timeToLive: "30 seconds",
  reactivityKeys: stocksKey,
})

// 가격 변경 mutation (실행 후 stocksKey를 통해 query 자동 리프레시)
export const updatePriceAtom = StockApiClient.mutation("stocks", "updatePrice")

// 하위 호환: 순수 배열 (Result에서 추출, WebSocket 실시간 시세 머지)
export const stockListAtom = Atom.make((get) => {
  const httpStocks = Result.getOrElse(get(fetchStocksAtom), () => [] as ReadonlyArray<Stock>)
  const live = get(livePricesAtom)

  if (live.size === 0) return httpStocks

  return httpStocks.map((stock) => {
    const tick = live.get(stock.symbol)
    if (!tick) return stock
    return { ...stock, price: tick.price, previousClose: tick.previousClose } as Stock
  })
})

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
