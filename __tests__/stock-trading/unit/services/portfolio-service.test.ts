import { describe, it, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { PortfolioService } from "@/src/stock-trading/services/portfolio-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { StockService } from "@/src/stock-trading/services/stock-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import type { StockSymbol } from "@/src/stock-trading/domain/model"

describe("PortfolioService", () => {
  const TestLayer = Layer.mergeAll(
    AuthService.Default,
    StockService.Default,
    TradingService.Default,
    PortfolioService.Default,
  )

  type AllServices = TradingService | AuthService | StockService | PortfolioService

  const run = <A, E>(effect: Effect.Effect<A, E, AllServices>) =>
    Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

  const loginAndBuy = Effect.gen(function* () {
    const auth = yield* AuthService
    const user = yield* auth.login("trader1", "password123")
    const trading = yield* TradingService
    yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10)
    return user
  })

  describe("getPortfolioSummary", () => {
    it("should return portfolio with holdings and total value", async () => {
      const summary = await run(
        Effect.gen(function* () {
          const user = yield* loginAndBuy
          const portfolio = yield* PortfolioService
          return yield* portfolio.getPortfolioSummary(user.id)
        })
      )
      expect(summary.holdings.length).toBe(1)
      expect(summary.totalValue).toBeGreaterThan(0)
      expect(summary.cashBalance).toBeGreaterThan(0)
    })

    it("should return empty portfolio for user with no trades", async () => {
      const summary = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const portfolio = yield* PortfolioService
          return yield* portfolio.getPortfolioSummary(user.id)
        })
      )
      expect(summary.holdings.length).toBe(0)
      expect(summary.totalValue).toBe(0)
      expect(summary.totalPnL).toBe(0)
    })
  })

  describe("getHoldingDetail", () => {
    it("should return holding detail with P&L for a specific stock", async () => {
      const detail = await run(
        Effect.gen(function* () {
          const user = yield* loginAndBuy
          const portfolio = yield* PortfolioService
          return yield* portfolio.getHoldingDetail(user.id, "AAPL" as StockSymbol)
        })
      )
      expect(detail.symbol).toBe("AAPL")
      expect(detail.quantity).toBe(10)
      expect(detail.currentPrice).toBeGreaterThan(0)
      expect(typeof detail.unrealizedPnL).toBe("number")
      expect(typeof detail.pnlPercent).toBe("number")
    })

    it("should fail when user has no holding for the symbol", async () => {
      const exit = await Effect.runPromiseExit(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const portfolio = yield* PortfolioService
          return yield* portfolio.getHoldingDetail(user.id, "GOOGL" as StockSymbol)
        }).pipe(Effect.provide(TestLayer))
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })
})
