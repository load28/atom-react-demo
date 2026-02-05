import { describe, it, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import type { UserId, StockSymbol, OrderId } from "@/src/stock-trading/domain/model"

// 주식 가격은 AtomHttpApi로 관리되므로, 서비스 테스트에서는 가격을 직접 전달
const AAPL_PRICE = 178.5

describe("TradingService", () => {
  const TestLayer = Layer.mergeAll(
    AuthService.Default,
    TradingService.Default,
  )

  const run = <A, E>(effect: Effect.Effect<A, E, TradingService | AuthService>) =>
    Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

  const runExit = <A, E>(effect: Effect.Effect<A, E, TradingService | AuthService>) =>
    Effect.runPromiseExit(effect.pipe(Effect.provide(TestLayer)))

  // 로그인 후 유저 가져오기 헬퍼
  const loginAndGetUser = Effect.gen(function* () {
    const auth = yield* AuthService
    return yield* auth.login("trader1", "password123")
  })

  describe("placeBuyOrder", () => {
    it("should place a buy order and return filled order", async () => {
      const order = await run(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          return yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
        })
      )
      expect(order.type).toBe("buy")
      expect(order.symbol).toBe("AAPL")
      expect(order.quantity).toBe(5)
      expect(order.status).toBe("filled")
      expect(order.price).toBe(AAPL_PRICE)
    })

    it("should fail with InsufficientBalance when balance too low", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          // 매우 큰 수량으로 잔고 부족 유발
          return yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 999999, AAPL_PRICE)
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })

    it("should deduct balance after buy", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const trading = yield* TradingService
          const order = yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 1, AAPL_PRICE)
          const updatedUser = yield* auth.getCurrentUser()
          return { order, balanceBefore: user.balance, balanceAfter: updatedUser!.balance }
        })
      )
      expect(result.balanceAfter).toBe(result.balanceBefore - result.order.price * result.order.quantity)
    })
  })

  describe("placeSellOrder", () => {
    it("should sell shares that were previously bought", async () => {
      const order = await run(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          // 먼저 매수
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)
          // 그 다음 매도
          return yield* trading.placeSellOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
        })
      )
      expect(order.type).toBe("sell")
      expect(order.quantity).toBe(5)
      expect(order.status).toBe("filled")
    })

    it("should fail with InsufficientShares when no holdings", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          return yield* trading.placeSellOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("getOrders", () => {
    it("should return all orders for a user", async () => {
      const orders = await run(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 3, AAPL_PRICE)
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 2, AAPL_PRICE)
          return yield* trading.getOrders(user.id)
        })
      )
      expect(orders.length).toBe(2)
    })

    it("should return empty array for user with no orders", async () => {
      const orders = await run(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          return yield* trading.getOrders(user.id)
        })
      )
      expect(orders.length).toBe(0)
    })
  })

  describe("getHoldings", () => {
    it("should return holdings after buying", async () => {
      const holdings = await run(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)
          return yield* trading.getHoldings(user.id)
        })
      )
      expect(holdings.length).toBe(1)
      expect(holdings[0].symbol).toBe("AAPL")
      expect(holdings[0].quantity).toBe(10)
    })

    it("should reduce holdings after selling", async () => {
      const holdings = await run(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)
          yield* trading.placeSellOrder(user.id, "AAPL" as StockSymbol, 3, AAPL_PRICE)
          return yield* trading.getHoldings(user.id)
        })
      )
      expect(holdings.length).toBe(1)
      expect(holdings[0].quantity).toBe(7)
    })

    it("should remove holding when all shares sold", async () => {
      const holdings = await run(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
          yield* trading.placeSellOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
          return yield* trading.getHoldings(user.id)
        })
      )
      expect(holdings.length).toBe(0)
    })

    it("should calculate average price for multiple buys", async () => {
      const holdings = await run(
        Effect.gen(function* () {
          const user = yield* loginAndGetUser
          const trading = yield* TradingService
          // 같은 가격으로 두 번 매수
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
          return yield* trading.getHoldings(user.id)
        })
      )
      expect(holdings[0].quantity).toBe(10)
      expect(holdings[0].averagePrice).toBe(AAPL_PRICE)
    })
  })
})
