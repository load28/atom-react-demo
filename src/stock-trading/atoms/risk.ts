import { Atom } from "@effect-atom/atom-react"
import type { StockSymbol } from "@/src/stock-trading/domain/model"
import {
  calculateVolatility,
  calculateMaxDrawdown,
  calculatePositionWeights,
  assessRiskLevel,
} from "@/src/stock-trading/domain/risk-calculator"
import { priceMapAtom } from "./stock"
import { holdingsAtom } from "./portfolio"
import { livePricesAtom } from "./stock-feed"

const MAX_PRICE_HISTORY = 500

// ── 가격 히스토리 축적 (livePricesAtom 구독) ──
export const priceHistoryAtom = Atom.make((get) => {
  const history = new Map<StockSymbol, number[]>()

  get.subscribe(livePricesAtom, (prices) => {
    for (const [symbol, tick] of prices) {
      const arr = history.get(symbol) ?? []
      arr.push(tick.price)
      if (arr.length > MAX_PRICE_HISTORY) {
        arr.splice(0, arr.length - MAX_PRICE_HISTORY)
      }
      history.set(symbol, arr)
    }
    get.setSelf(new Map(history))
  })

  get.addFinalizer(() => {
    history.clear()
  })

  return new Map<StockSymbol, number[]>()
})

// ── 종목별 변동성 ──
export const volatilityMapAtom = Atom.make((get) => {
  const history = get(priceHistoryAtom)
  const volatilities = new Map<StockSymbol, number>()

  for (const [symbol, prices] of history) {
    volatilities.set(symbol, calculateVolatility(prices))
  }

  return volatilities
})

// ── 포트폴리오 리스크 ──
export const portfolioRiskAtom = Atom.make((get) => {
  const holdings = get(holdingsAtom)
  const prices = get(priceMapAtom)
  const volatilities = get(volatilityMapAtom)

  const weights = calculatePositionWeights(holdings, prices)

  // 가중 평균 변동성으로 포트폴리오 변동성 근사
  let portfolioVolatility = 0
  for (const [symbol, weight] of weights) {
    const vol = volatilities.get(symbol) ?? 0
    portfolioVolatility += weight * vol
  }

  const riskLevel = assessRiskLevel(portfolioVolatility)

  return { weights, portfolioVolatility, riskLevel }
})

// ── 종목별 최대 낙폭 ──
export const maxDrawdownAtom = Atom.make((get) => {
  const history = get(priceHistoryAtom)
  const drawdowns = new Map<StockSymbol, { mdd: number; peak: number; trough: number }>()

  for (const [symbol, prices] of history) {
    drawdowns.set(symbol, calculateMaxDrawdown(prices))
  }

  return drawdowns
})
