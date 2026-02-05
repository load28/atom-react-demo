import { describe, it, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { PortfolioService } from "@/src/stock-trading/services/portfolio-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import type { StockSymbol } from "@/src/stock-trading/domain/model"

// 주식 가격은 AtomHttpApi로 관리되므로, 서비스 테스트에서는 가격 맵을 직접 전달
const STOCK_PRICES: Map<StockSymbol, number> = new Map([
  ["AAPL" as StockSymbol, 178.5],
  ["GOOGL" as StockSymbol, 141.8],
  ["MSFT" as StockSymbol, 378.9],
  ["TSLA" as StockSymbol, 248.5],
  ["AMZN" as StockSymbol, 185.6],
])

const AAPL_PRICE = 178.5

describe("PortfolioService", () => {
  const TestLayer = Layer.mergeAll(
    AuthService.Default,
    TradingService.Default,
    PortfolioService.Default,
  )

  type AllServices = TradingService | AuthService | PortfolioService

  const run = <A, E>(effect: Effect.Effect<A, E, AllServices>) =>
    Effect.runPromise(effect.pipe(Effect.provide(TestLayer)))

  const loginAndBuy = Effect.gen(function* () {
    const auth = yield* AuthService
    const user = yield* auth.login("trader1", "password123")
    const trading = yield* TradingService
    yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)
    return user
  })

  describe("getPortfolioSummary", () => {
    it("should return portfolio with holdings and total value", async () => {
      const summary = await run(
        Effect.gen(function* () {
          const user = yield* loginAndBuy
          const portfolio = yield* PortfolioService
          return yield* portfolio.getPortfolioSummary(user.id, STOCK_PRICES)
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
          return yield* portfolio.getPortfolioSummary(user.id, STOCK_PRICES)
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
          return yield* portfolio.getHoldingDetail(user.id, "AAPL" as StockSymbol, AAPL_PRICE)
        })
      )
      expect(detail.symbol).toBe("AAPL")
      expect(detail.quantity).toBe(10)
      expect(detail.currentPrice).toBe(AAPL_PRICE)
      expect(typeof detail.unrealizedPnL).toBe("number")
      expect(typeof detail.pnlPercent).toBe("number")
    })

    it("should fail when user has no holding for the symbol", async () => {
      const exit = await Effect.runPromiseExit(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const portfolio = yield* PortfolioService
          return yield* portfolio.getHoldingDetail(user.id, "GOOGL" as StockSymbol, 141.8)
        }).pipe(Effect.provide(TestLayer))
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })
})
