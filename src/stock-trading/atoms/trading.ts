import { Atom } from "@effect-atom/atom-react"
import { Effect, Layer } from "effect"
import type { Order, UserId, StockSymbol } from "@/src/stock-trading/domain/model"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { StockService } from "@/src/stock-trading/services/stock-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { currentUserAtom } from "./auth"

const runtimeAtom = Atom.runtime(
  Layer.mergeAll(TradingService.Default, StockService.Default, AuthService.Default)
)

// 주문 내역 상태
export const ordersAtom = Atom.make<ReadonlyArray<Order>>([])

// 매수 액션
export const placeBuyOrderAtom = runtimeAtom.fn(
  (args: { symbol: StockSymbol; quantity: number }, get) =>
    Effect.gen(function* () {
      const user = get(currentUserAtom)
      if (!user) return yield* Effect.fail(new Error("Not logged in"))
      const trading = yield* TradingService
      const order = yield* trading.placeBuyOrder(user.id, args.symbol, args.quantity)
      const allOrders = yield* trading.getOrders(user.id)
      get.set(ordersAtom, allOrders)
      // 잔고 갱신
      const auth = yield* AuthService
      const updated = yield* auth.getCurrentUser()
      if (updated) get.set(currentUserAtom, updated)
      return order
    })
)

// 매도 액션
export const placeSellOrderAtom = runtimeAtom.fn(
  (args: { symbol: StockSymbol; quantity: number }, get) =>
    Effect.gen(function* () {
      const user = get(currentUserAtom)
      if (!user) return yield* Effect.fail(new Error("Not logged in"))
      const trading = yield* TradingService
      const order = yield* trading.placeSellOrder(user.id, args.symbol, args.quantity)
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
