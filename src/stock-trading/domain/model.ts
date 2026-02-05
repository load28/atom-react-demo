import { Schema } from "effect"

// ── Branded Types ──
export const UserId = Schema.NonEmptyString.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const StockSymbol = Schema.NonEmptyString.pipe(Schema.brand("StockSymbol"))
export type StockSymbol = typeof StockSymbol.Type

export const OrderId = Schema.NonEmptyString.pipe(Schema.brand("OrderId"))
export type OrderId = typeof OrderId.Type

// ── User ──
export const User = Schema.Struct({
  id: UserId,
  username: Schema.NonEmptyString,
  balance: Schema.NonNegative,
})
export type User = typeof User.Type

// ── Stock ──
export const Stock = Schema.Struct({
  symbol: StockSymbol,
  name: Schema.NonEmptyString,
  price: Schema.Positive,
  previousClose: Schema.Positive,
})
export type Stock = typeof Stock.Type

// ── Order ──
export const OrderType = Schema.Literal("buy", "sell")
export type OrderType = typeof OrderType.Type

export const OrderStatus = Schema.Literal("pending", "filled", "cancelled")
export type OrderStatus = typeof OrderStatus.Type

export const Order = Schema.Struct({
  id: OrderId,
  userId: UserId,
  symbol: StockSymbol,
  type: OrderType,
  quantity: Schema.Positive,
  price: Schema.Positive,
  status: OrderStatus,
  createdAt: Schema.DateFromSelf,
  filledAt: Schema.optional(Schema.DateFromSelf),
})
export type Order = typeof Order.Type

// ── Holding ──
export const Holding = Schema.Struct({
  symbol: StockSymbol,
  quantity: Schema.Positive,
  averagePrice: Schema.Positive,
})
export type Holding = typeof Holding.Type

// ── StockTick (WebSocket 실시간 시세) ──
export const StockTick = Schema.Struct({
  symbol: StockSymbol,
  price: Schema.Positive,
  previousClose: Schema.Positive,
  timestamp: Schema.Number,
})
export type StockTick = typeof StockTick.Type
