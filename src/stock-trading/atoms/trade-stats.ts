import { Atom } from "@effect-atom/atom-react"
import {
  matchOrdersToTradePairs,
  calculateTradeStats,
} from "@/src/stock-trading/domain/trade-stats-calculator"
import { ordersAtom } from "./trading"

// ── 주문 내역에서 매매 쌍 매칭 ──
export const tradePairsAtom = Atom.make((get) => matchOrdersToTradePairs(get(ordersAtom)))

// ── 매매 통계 산출 ──
export const tradeStatsAtom = Atom.make((get) => calculateTradeStats(get(tradePairsAtom)))

// ── 승률 ──
export const winRateAtom = Atom.make((get) => get(tradeStatsAtom).winRate)

// ── 수익 팩터 ──
export const profitFactorAtom = Atom.make((get) => get(tradeStatsAtom).profitFactor)

// ── 종목별 매매 내역 ──
export const tradesBySymbolAtom = Atom.make((get) => get(tradeStatsAtom).tradesBySymbol)
