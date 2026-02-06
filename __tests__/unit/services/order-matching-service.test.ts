import { describe, it, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { OrderMatchingService } from "@/src/stock-trading/services/order-matching-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import type { StockSymbol } from "@/src/stock-trading/domain/model"

const AAPL_PRICE = 178.5

describe("OrderMatchingService", () => {
  const TestLayer = Layer.mergeAll(
    AuthService.Default,
    TradingService.Default,
    OrderMatchingService.Default,
  )

  type AppServices = OrderMatchingService | TradingService | AuthService

  const run = <A, E>(effect: Effect.Effect<A, E, AppServices>) =>
    Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

  const runExit = <A, E>(effect: Effect.Effect<A, E, AppServices>) =>
    Effect.runPromiseExit(effect.pipe(Effect.provide(TestLayer)))

  const loginHelper = Effect.gen(function* () {
    const auth = yield* AuthService
    return yield* auth.login("trader1", "password123")
  })

  describe("placeConditionalOrder", () => {
    it("should create a pending limit buy order", async () => {
      const order = await run(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const matching = yield* OrderMatchingService
          return yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 5,
            currentPrice: AAPL_PRICE,
            limitPrice: 170,
          })
        })
      )
      expect(order.status).toBe("pending")
      expect(order.executionType).toBe("limit")
      expect(order.limitPrice).toBe(170)
      expect(order.quantity).toBe(5)
    })

    it("should create a pending stop sell order", async () => {
      const order = await run(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const trading = yield* TradingService
          // 먼저 주식 보유
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)

          const matching = yield* OrderMatchingService
          return yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "sell",
            executionType: "stop",
            quantity: 5,
            currentPrice: AAPL_PRICE,
            stopPrice: 160,
          })
        })
      )
      expect(order.status).toBe("pending")
      expect(order.executionType).toBe("stop")
      expect(order.stopPrice).toBe(160)
    })

    it("should fail with InsufficientBalance for limit buy exceeding balance", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const matching = yield* OrderMatchingService
          return yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 999999,
            currentPrice: AAPL_PRICE,
            limitPrice: 170,
          })
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })

    it("should fail with InsufficientShares for stop sell without holdings", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const matching = yield* OrderMatchingService
          return yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "sell",
            executionType: "stop",
            quantity: 10,
            currentPrice: AAPL_PRICE,
            stopPrice: 160,
          })
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("cancelOrder", () => {
    it("should cancel a pending order and restore balance for buy", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const initialBalance = user.balance

          const matching = yield* OrderMatchingService
          const order = yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 5,
            currentPrice: AAPL_PRICE,
            limitPrice: 170,
          })

          const balanceAfterOrder = yield* auth.getBalance(user.id)
          const cancelled = yield* matching.cancelOrder(order.id, user.id)
          const balanceAfterCancel = yield* auth.getBalance(user.id)

          return { initialBalance, balanceAfterOrder, balanceAfterCancel, cancelled }
        })
      )

      expect(result.cancelled.status).toBe("cancelled")
      // 주문 후 잔고가 줄고, 취소 후 복구
      expect(result.balanceAfterOrder).toBeLessThan(result.initialBalance)
      expect(result.balanceAfterCancel).toBe(result.initialBalance)
    })

    it("should fail when cancelling non-existent order", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const matching = yield* OrderMatchingService
          return yield* matching.cancelOrder("non-existent" as any, user.id)
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("evaluateOrders", () => {
    it("should fill limit buy order when price drops to limit", async () => {
      const result = await run(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const matching = yield* OrderMatchingService

          // 지정가 170에 매수 주문
          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 5,
            currentPrice: AAPL_PRICE,
            limitPrice: 170,
          })

          // 가격이 170으로 하락 → 체결
          const prices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 168],
          ])
          return yield* matching.evaluateOrders(prices)
        })
      )

      expect(result.filled.length).toBe(1)
      expect(result.filled[0].symbol).toBe("AAPL")
      expect(result.filled[0].status).toBe("filled")
    })

    it("should not fill limit buy when price is above limit", async () => {
      const result = await run(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const matching = yield* OrderMatchingService

          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 5,
            currentPrice: AAPL_PRICE,
            limitPrice: 170,
          })

          // 가격이 여전히 지정가 위 → 미체결
          const prices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 175],
          ])
          return yield* matching.evaluateOrders(prices)
        })
      )

      expect(result.filled.length).toBe(0)
    })

    it("should fill stop sell order when price drops to stop", async () => {
      const result = await run(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)

          const matching = yield* OrderMatchingService
          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "sell",
            executionType: "stop",
            quantity: 5,
            currentPrice: AAPL_PRICE,
            stopPrice: 160,
          })

          // 가격이 160으로 하락 → 손절 체결
          const prices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 155],
          ])
          return yield* matching.evaluateOrders(prices)
        })
      )

      expect(result.filled.length).toBe(1)
      expect(result.filled[0].type).toBe("sell")
    })

    it("should handle order expiration", async () => {
      const result = await run(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const matching = yield* OrderMatchingService

          // 이미 만료된 주문 생성
          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 5,
            currentPrice: AAPL_PRICE,
            limitPrice: 170,
            expiresAt: new Date(Date.now() - 1000), // 이미 만료
          })

          const prices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 160],
          ])
          return yield* matching.evaluateOrders(prices)
        })
      )

      expect(result.filled.length).toBe(0)
      expect(result.expired.length).toBe(1)
    })
  })

  describe("getPendingOrders", () => {
    it("should return only pending orders for the user", async () => {
      const pending = await run(
        Effect.gen(function* () {
          const user = yield* loginHelper
          const matching = yield* OrderMatchingService

          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 5,
            currentPrice: AAPL_PRICE,
            limitPrice: 170,
          })

          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 3,
            currentPrice: AAPL_PRICE,
            limitPrice: 165,
          })

          return yield* matching.getPendingOrders(user.id)
        })
      )

      expect(pending.length).toBe(2)
      expect(pending.every((o) => o.status === "pending")).toBe(true)
    })
  })
})
