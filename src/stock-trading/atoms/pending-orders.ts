import { Atom } from "@effect-atom/atom-react"
import { Effect, Layer } from "effect"
import type { Order, OrderId, StockSymbol, OrderExecutionType, OrderType } from "@/src/stock-trading/domain/model"
import { StockNotFound } from "@/src/stock-trading/domain/errors"
import { OrderMatchingService, type MatchResult } from "@/src/stock-trading/services/order-matching-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { currentUserAtom } from "./auth"
import { priceMapAtom } from "./stock"
import { ordersAtom } from "./trading"

const runtimeAtom = Atom.runtime(
  Layer.mergeAll(
    OrderMatchingService.Default,
    TradingService.Default,
    AuthService.Default,
  )
)

// ── 대기 주문 목록 상태 ──
export const pendingOrdersAtom = Atom.make<ReadonlyArray<Order>>([])

// ── 최근 매칭 결과 (체결 알림용) ──
export const lastMatchResultAtom = Atom.make<MatchResult | null>(null)

// ── 지정가/스탑 주문 생성 액션 ──
export const placeConditionalOrderAtom = runtimeAtom.fn(
  (args: {
    symbol: StockSymbol
    type: OrderType
    executionType: OrderExecutionType
    quantity: number
    limitPrice?: number
    stopPrice?: number
    expiresAt?: Date
  }, get) =>
    Effect.gen(function* () {
      const user = get(currentUserAtom)
      if (!user) return yield* Effect.fail(new Error("Not logged in"))

      const prices = get(priceMapAtom)
      const currentPrice = prices.get(args.symbol)
      if (currentPrice === undefined) {
        return yield* Effect.fail(new StockNotFound({ symbol: args.symbol }))
      }

      const matching = yield* OrderMatchingService
      const order = yield* matching.placeConditionalOrder({
        userId: user.id,
        symbol: args.symbol,
        type: args.type,
        executionType: args.executionType,
        quantity: args.quantity,
        currentPrice,
        limitPrice: args.limitPrice,
        stopPrice: args.stopPrice,
        expiresAt: args.expiresAt,
      })

      // 대기 주문 목록 갱신
      const pending = yield* matching.getPendingOrders(user.id)
      get.set(pendingOrdersAtom, pending)

      // 잔고 갱신
      const auth = yield* AuthService
      const updated = yield* auth.getCurrentUser()
      if (updated) get.set(currentUserAtom, updated)

      return order
    })
)

// ── 대기 주문 취소 액션 ──
export const cancelPendingOrderAtom = runtimeAtom.fn(
  (orderId: OrderId, get) =>
    Effect.gen(function* () {
      const user = get(currentUserAtom)
      if (!user) return yield* Effect.fail(new Error("Not logged in"))

      const matching = yield* OrderMatchingService
      const cancelled = yield* matching.cancelOrder(orderId, user.id)

      // 대기 주문 목록 갱신
      const pending = yield* matching.getPendingOrders(user.id)
      get.set(pendingOrdersAtom, pending)

      // 잔고 갱신 (매수 주문 취소 시 복구됨)
      const auth = yield* AuthService
      const updated = yield* auth.getCurrentUser()
      if (updated) get.set(currentUserAtom, updated)

      return cancelled
    })
)

// ── 실시간 매칭 엔진 (핵심!) ──
// priceMapAtom이 변경될 때마다 구독하여 대기 주문의 체결 조건을 자동 평가한다.
// 이것이 Atom 파생 상태 패턴의 진수 — WebSocket 가격 피드가 바뀌면
// 매칭 엔진이 자동으로 돌아가고, 체결된 주문은 ordersAtom에 반영된다.
export const orderMatchingAtom = runtimeAtom.atom((get) =>
  Effect.gen(function* () {
    const user = get(currentUserAtom)
    if (!user) return null

    const prices = get(priceMapAtom)
    if (prices.size === 0) return null

    const matching = yield* OrderMatchingService
    const pendingList = yield* matching.getPendingOrders(user.id)
    if (pendingList.length === 0) return null

    // 체결 조건 평가
    const result = yield* matching.evaluateOrders(prices)

    // 체결 또는 만료가 있으면 상태 갱신
    if (result.filled.length > 0 || result.expired.length > 0) {
      // 대기 주문 목록 갱신
      const updatedPending = yield* matching.getPendingOrders(user.id)
      get.set(pendingOrdersAtom, updatedPending)

      // 체결된 주문이 있으면 전체 주문 내역 갱신
      if (result.filled.length > 0) {
        const trading = yield* TradingService
        const allOrders = yield* trading.getOrders(user.id)
        get.set(ordersAtom, allOrders)

        // 잔고 갱신
        const auth = yield* AuthService
        const updated = yield* auth.getCurrentUser()
        if (updated) get.set(currentUserAtom, updated)
      }

      get.set(lastMatchResultAtom, result)
    }

    return result
  })
)

// ── 대기 주문 조회 액션 ──
export const fetchPendingOrdersAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const user = get(currentUserAtom)
    if (!user) return []
    const matching = yield* OrderMatchingService
    const pending = yield* matching.getPendingOrders(user.id)
    get.set(pendingOrdersAtom, pending)
    return pending
  })
)
