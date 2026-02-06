import { Effect, Ref, HashMap } from "effect"
import type { Order, UserId, StockSymbol, OrderId, OrderExecutionType, OrderType } from "@/src/stock-trading/domain/model"
import { OrderNotFound, OrderAlreadyCancelled, OrderExpired, InsufficientBalance, InsufficientShares } from "@/src/stock-trading/domain/errors"
import { shouldFillOrder, isOrderExpired } from "@/src/stock-trading/domain/calculator"
import { TradingService } from "./trading-service"
import { AuthService } from "./auth-service"

let pendingOrderCounter = 0
const nextPendingOrderId = (): OrderId => `pending-${++pendingOrderCounter}` as OrderId

export type PlaceConditionalOrderParams = {
  readonly userId: UserId
  readonly symbol: StockSymbol
  readonly type: OrderType
  readonly executionType: OrderExecutionType
  readonly quantity: number
  readonly currentPrice: number
  readonly limitPrice?: number
  readonly stopPrice?: number
  readonly expiresAt?: Date
}

export type MatchResult = {
  readonly filled: ReadonlyArray<Order>
  readonly expired: ReadonlyArray<OrderId>
}

export class OrderMatchingService extends Effect.Service<OrderMatchingService>()("OrderMatchingService", {
  effect: Effect.gen(function* () {
    const pendingOrders = yield* Ref.make(HashMap.empty<OrderId, Order>())

    // 지정가/스탑 주문 생성 → pending 상태로 저장
    const placeConditionalOrder = (params: PlaceConditionalOrderParams) =>
      Effect.gen(function* () {
        // 매수 주문의 경우 잔고를 미리 확보(예약)
        if (params.type === "buy") {
          const authService = yield* AuthService
          const estimatedCost = (params.limitPrice ?? params.currentPrice) * params.quantity
          const balance = yield* authService.getBalance(params.userId)
          if (balance < estimatedCost) {
            return yield* Effect.fail(new InsufficientBalance({ required: estimatedCost, available: balance }))
          }
          // 잔고 예약 (차감)
          yield* authService.updateBalance(params.userId, balance - estimatedCost)
        }

        // 매도 주문의 경우 보유 수량 확인
        if (params.type === "sell") {
          const trading = yield* TradingService
          const holdings = yield* trading.getHoldings(params.userId)
          const holding = holdings.find((h) => h.symbol === params.symbol)
          const available = holding?.quantity ?? 0

          // 기존 pending 매도 주문의 수량도 합산
          const currentPending = yield* Ref.get(pendingOrders)
          const pendingSellQty = [...HashMap.values(currentPending)]
            .filter((o) => o.userId === params.userId && o.symbol === params.symbol && o.type === "sell")
            .reduce((sum, o) => sum + o.quantity, 0)

          if (available - pendingSellQty < params.quantity) {
            return yield* Effect.fail(new InsufficientShares({
              symbol: params.symbol,
              required: params.quantity,
              available: Math.max(0, available - pendingSellQty),
            }))
          }
        }

        const order: Order = {
          id: nextPendingOrderId(),
          userId: params.userId,
          symbol: params.symbol,
          type: params.type,
          executionType: params.executionType,
          quantity: params.quantity,
          price: params.currentPrice,
          limitPrice: params.limitPrice,
          stopPrice: params.stopPrice,
          status: "pending",
          createdAt: new Date(),
          expiresAt: params.expiresAt,
        }

        yield* Ref.update(pendingOrders, HashMap.set(order.id, order))
        return order
      })

    // 대기 주문 취소
    const cancelOrder = (orderId: OrderId, userId: UserId) =>
      Effect.gen(function* () {
        const current = yield* Ref.get(pendingOrders)
        const found = HashMap.get(current, orderId)

        if (found._tag === "None") {
          return yield* Effect.fail(new OrderNotFound({ id: orderId }))
        }

        const order = found.value
        if (order.status === "cancelled") {
          return yield* Effect.fail(new OrderAlreadyCancelled({ id: orderId }))
        }

        // 매수 주문 취소 시 예약 잔고 복구
        if (order.type === "buy") {
          const authService = yield* AuthService
          const balance = yield* authService.getBalance(userId)
          const reservedAmount = (order.limitPrice ?? order.price) * order.quantity
          yield* authService.updateBalance(userId, balance + reservedAmount)
        }

        const cancelled: Order = {
          ...order,
          status: "cancelled",
          cancelledAt: new Date(),
        }
        yield* Ref.update(pendingOrders, HashMap.set(orderId, cancelled))
        return cancelled
      })

    // 가격 맵을 받아 체결 조건 평가 → 매칭된 주문을 TradingService로 위임
    const evaluateOrders = (prices: Map<StockSymbol, number>) =>
      Effect.gen(function* () {
        const current = yield* Ref.get(pendingOrders)
        const trading = yield* TradingService
        const authService = yield* AuthService

        const filled: Order[] = []
        const expired: OrderId[] = []

        for (const order of HashMap.values(current)) {
          if (order.status !== "pending") continue

          const currentPrice = prices.get(order.symbol)
          if (currentPrice === undefined) continue

          // 만료 확인
          if (isOrderExpired(order)) {
            const expiredOrder: Order = { ...order, status: "expired" }
            yield* Ref.update(pendingOrders, HashMap.set(order.id, expiredOrder))

            // 매수 주문 만료 시 예약 잔고 복구
            if (order.type === "buy") {
              const balance = yield* authService.getBalance(order.userId)
              const reservedAmount = (order.limitPrice ?? order.price) * order.quantity
              yield* authService.updateBalance(order.userId, balance + reservedAmount)
            }

            expired.push(order.id)
            continue
          }

          // 체결 조건 평가
          if (shouldFillOrder(order, currentPrice)) {
            const executeOrder = order.type === "buy"
              ? Effect.gen(function* () {
                  // 매수: 예약 잔고를 복구한 뒤 실제 체결가로 재차감
                  const balance = yield* authService.getBalance(order.userId)
                  const reservedAmount = (order.limitPrice ?? order.price) * order.quantity
                  yield* authService.updateBalance(order.userId, balance + reservedAmount)
                  return yield* trading.placeBuyOrder(order.userId, order.symbol, order.quantity, currentPrice)
                })
              : trading.placeSellOrder(order.userId, order.symbol, order.quantity, currentPrice)

            const filledResult = yield* Effect.either(
              executeOrder as Effect.Effect<Order, InsufficientBalance | InsufficientShares, never>
            )

            if (filledResult._tag === "Right") {
              const filledOrder: Order = {
                ...order,
                status: "filled",
                price: currentPrice,
                filledAt: new Date(),
              }
              yield* Ref.update(pendingOrders, HashMap.set(order.id, filledOrder))
              filled.push(filledOrder)
            }
            // 체결 실패 시 (잔고 부족 등) pending 유지
          }
        }

        return { filled, expired } as MatchResult
      })

    // 대기 주문 목록 조회
    const getPendingOrders = (userId: UserId) =>
      Effect.map(Ref.get(pendingOrders), (map) =>
        [...HashMap.values(map)].filter((o) => o.userId === userId && o.status === "pending")
      )

    // 전체 조건부 주문 조회 (pending + filled + cancelled + expired)
    const getAllConditionalOrders = (userId: UserId) =>
      Effect.map(Ref.get(pendingOrders), (map) =>
        [...HashMap.values(map)].filter((o) => o.userId === userId)
      )

    return {
      placeConditionalOrder,
      cancelOrder,
      evaluateOrders,
      getPendingOrders,
      getAllConditionalOrders,
    } as const
  }),
}) {}
