import { Schema } from "effect"
import { StockSymbol } from "./model"

// ── Branded Types ──
export const WatchlistId = Schema.NonEmptyString.pipe(Schema.brand("WatchlistId"))
export type WatchlistId = typeof WatchlistId.Type

export const AlertId = Schema.NonEmptyString.pipe(Schema.brand("AlertId"))
export type AlertId = typeof AlertId.Type

// ── Enums ──
export const AlertConditionType = Schema.Literal("price_above", "price_below", "change_percent_above", "change_percent_below")
export type AlertConditionType = typeof AlertConditionType.Type

export const AlertStatus = Schema.Literal("active", "triggered", "dismissed")
export type AlertStatus = typeof AlertStatus.Type

// ── Alert ──
export const Alert = Schema.Struct({
  id: AlertId,
  symbol: StockSymbol,
  conditionType: AlertConditionType,
  targetValue: Schema.Number,
  status: AlertStatus,
  createdAt: Schema.DateFromSelf,
  triggeredAt: Schema.optional(Schema.DateFromSelf),
})
export type Alert = typeof Alert.Type

// ── Watchlist ──
export const Watchlist = Schema.Struct({
  id: WatchlistId,
  name: Schema.NonEmptyString,
  symbols: Schema.Array(StockSymbol),
  createdAt: Schema.DateFromSelf,
})
export type Watchlist = typeof Watchlist.Type

// ── Pure evaluation function ──
export const evaluateAlertCondition = (
  condition: { conditionType: AlertConditionType; targetValue: number },
  currentPrice: number,
  previousClose: number,
): boolean => {
  switch (condition.conditionType) {
    case "price_above":
      return currentPrice > condition.targetValue
    case "price_below":
      return currentPrice < condition.targetValue
    case "change_percent_above": {
      if (previousClose === 0) return false
      const changePercent = ((currentPrice - previousClose) / previousClose) * 100
      return changePercent > condition.targetValue
    }
    case "change_percent_below": {
      if (previousClose === 0) return false
      const changePercent = ((currentPrice - previousClose) / previousClose) * 100
      return changePercent < condition.targetValue
    }
  }
}
