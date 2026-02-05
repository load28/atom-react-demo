import { Atom } from "@effect-atom/atom-react"
import { Effect, Layer } from "effect"
import type { Order, UserId, StockSymbol } from "@/src/stock-trading/domain/model"
import { StockNotFound } from "@/src/stock-trading/domain/errors"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { currentUserAtom } from "./auth"
import { priceMapAtom } from "./stock"

const runtimeAtom = Atom.runtime(
  Layer.mergeAll(TradingService.Default, AuthService.Default)
)

// 주문 내역 상태
export const ordersAtom = Atom.make<ReadonlyArray<Order>>([])

// 매수 액션 — priceMapAtom(AtomHttpApi query 기반)에서 현재가를 읽어 서비스에 전달
export const placeBuyOrderAtom = runtimeAtom.fn(
  (args: { symbol: StockSymbol; quantity: number }, get) =>
    Effect.gen(function* () {
      const user = get(currentUserAtom)
      if (!user) return yield* Effect.fail(new Error("Not logged in"))
      const prices = get(priceMapAtom)
      const currentPrice = prices.get(args.symbol)
      if (currentPrice === undefined) {
        return yield* Effect.fail(new StockNotFound({ symbol: args.symbol }))
      }
      const trading = yield* TradingService
      const order = yield* trading.placeBuyOrder(user.id, args.symbol, args.quantity, currentPrice)
      const allOrders = yield* trading.getOrders(user.id)
      get.set(ordersAtom, allOrders)
      // 잔고 갱신
      const auth = yield* AuthService
      const updated = yield* auth.getCurrentUser()
      if (updated) get.set(currentUserAtom, updated)
      return order
    })
)

// 매도 액션 — priceMapAtom(AtomHttpApi query 기반)에서 현재가를 읽어 서비스에 전달
export const placeSellOrderAtom = runtimeAtom.fn(
  (args: { symbol: StockSymbol; quantity: number }, get) =>
    Effect.gen(function* () {
      const user = get(currentUserAtom)
      if (!user) return yield* Effect.fail(new Error("Not logged in"))
      const prices = get(priceMapAtom)
      const currentPrice = prices.get(args.symbol)
      if (currentPrice === undefined) {
        return yield* Effect.fail(new StockNotFound({ symbol: args.symbol }))
      }
      const trading = yield* TradingService
      const order = yield* trading.placeSellOrder(user.id, args.symbol, args.quantity, currentPrice)
      const allOrders = yield* trading.getOrders(user.id)
      get.set(ordersAtom, allOrders)
      const auth = yield* AuthService
      const updated = yield* auth.getCurrentUser()
      if (updated) get.set(currentUserAtom, updated)
      return order
    })
)

// 주문 내역 조회 액션
export const fetchOrdersAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const user = get(currentUserAtom)
    if (!user) return []
    const trading = yield* TradingService
    const allOrders = yield* trading.getOrders(user.id)
    get.set(ordersAtom, allOrders)
    return allOrders
  })
)
