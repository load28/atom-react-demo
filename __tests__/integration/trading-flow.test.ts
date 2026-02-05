import { describe, it, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { PortfolioService } from "@/src/stock-trading/services/portfolio-service"
import type { StockSymbol } from "@/src/stock-trading/domain/model"

// 주식 가격은 AtomHttpApi로 관리되므로, 통합 테스트에서는 가격을 직접 전달
const STOCK_PRICES: Map<StockSymbol, number> = new Map([
  ["AAPL" as StockSymbol, 178.5],
  ["GOOGL" as StockSymbol, 141.8],
  ["MSFT" as StockSymbol, 378.9],
  ["TSLA" as StockSymbol, 248.5],
  ["AMZN" as StockSymbol, 185.6],
])

const AAPL_PRICE = STOCK_PRICES.get("AAPL" as StockSymbol)!
const GOOGL_PRICE = STOCK_PRICES.get("GOOGL" as StockSymbol)!
const MSFT_PRICE = STOCK_PRICES.get("MSFT" as StockSymbol)!
const TSLA_PRICE = STOCK_PRICES.get("TSLA" as StockSymbol)!

// Layer.mergeAll로 전체 서비스 조립 → 하나의 Effect 파이프라인으로 검증

describe("Trading Flow Integration", () => {
  const AppLayer = Layer.mergeAll(
    AuthService.Default,
    TradingService.Default,
    PortfolioService.Default,
  )

  type AppServices = AuthService | TradingService | PortfolioService

  const run = <A, E>(effect: Effect.Effect<A, E, AppServices>) =>
    Effect.runPromise(effect.pipe(Effect.provide(AppLayer)))

  describe("로그인 → 매수 → 포트폴리오 확인 전체 플로우", () => {
    it("should complete full buy flow and reflect in portfolio", async () => {
      const result = await run(
        Effect.gen(function* () {
          // 1. 로그인
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const initialBalance = user.balance

          // 2. 매수 (가격은 AtomHttpApi에서 관리 → 테스트에서는 직접 전달)
          const trading = yield* TradingService
          const order = yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)

          // 3. 포트폴리오 확인
          const portfolio = yield* PortfolioService
          const summary = yield* portfolio.getPortfolioSummary(user.id, STOCK_PRICES)

          return { initialBalance, order, summary, stockPrice: AAPL_PRICE }
        })
      )

      // 주문 검증
      expect(result.order.type).toBe("buy")
      expect(result.order.status).toBe("filled")
      expect(result.order.quantity).toBe(10)

      // 포트폴리오 검증
      expect(result.summary.holdings.length).toBe(1)
      expect(result.summary.holdings[0].symbol).toBe("AAPL")
      expect(result.summary.holdings[0].quantity).toBe(10)

      // 잔고 검증: 초기 잔고 - (주가 × 수량) = 남은 잔고
      const expectedBalance = result.initialBalance - result.stockPrice * 10
      expect(result.summary.cashBalance).toBe(expectedBalance)
    })
  })

  describe("매수 → 매도 → 잔고 복구 플로우", () => {
    it("should restore balance after buy and sell at same price", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const initialBalance = user.balance

          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
          yield* trading.placeSellOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)

          const finalBalance = yield* auth.getBalance(user.id)
          const holdings = yield* trading.getHoldings(user.id)

          return { initialBalance, finalBalance, holdings }
        })
      )

      // 같은 가격에 매수/매도하면 잔고 복구
      expect(result.finalBalance).toBe(result.initialBalance)
      // 보유 종목 없음
      expect(result.holdings.length).toBe(0)
    })
  })

  describe("다중 종목 트레이딩", () => {
    it("should handle multiple stocks in portfolio", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")

          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 5, AAPL_PRICE)
          yield* trading.placeBuyOrder(user.id, "GOOGL" as StockSymbol, 3, GOOGL_PRICE)
          yield* trading.placeBuyOrder(user.id, "MSFT" as StockSymbol, 2, MSFT_PRICE)

          const portfolio = yield* PortfolioService
          const summary = yield* portfolio.getPortfolioSummary(user.id, STOCK_PRICES)
          const orders = yield* trading.getOrders(user.id)

          return { summary, orderCount: orders.length }
        })
      )

      expect(result.summary.holdings.length).toBe(3)
      expect(result.orderCount).toBe(3)
      expect(result.summary.totalValue).toBeGreaterThan(0)
    })
  })

  describe("잔고 부족 에러 처리", () => {
    it("should fail gracefully when balance insufficient", async () => {
      const exit = await Effect.runPromiseExit(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const trading = yield* TradingService
          // 잔고를 초과하는 대량 매수
          return yield* trading.placeBuyOrder(user.id, "MSFT" as StockSymbol, 999999, MSFT_PRICE)
        }).pipe(Effect.provide(AppLayer))
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("미보유 종목 매도 에러 처리", () => {
    it("should fail gracefully when selling shares not owned", async () => {
      const exit = await Effect.runPromiseExit(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const trading = yield* TradingService
          return yield* trading.placeSellOrder(user.id, "TSLA" as StockSymbol, 10, TSLA_PRICE)
        }).pipe(Effect.provide(AppLayer))
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("부분 매도", () => {
    it("should correctly reduce holding quantity on partial sell", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const trading = yield* TradingService

          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)
          yield* trading.placeSellOrder(user.id, "AAPL" as StockSymbol, 3, AAPL_PRICE)

          const holdings = yield* trading.getHoldings(user.id)
          const orders = yield* trading.getOrders(user.id)

          return { holdings, orders }
        })
      )

      expect(result.holdings[0].quantity).toBe(7)
      expect(result.orders.length).toBe(2) // 1 buy + 1 sell
    })
  })
})
