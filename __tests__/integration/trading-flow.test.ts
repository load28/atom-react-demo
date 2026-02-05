import { describe, it, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { StockService } from "@/src/stock-trading/services/stock-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { PortfolioService } from "@/src/stock-trading/services/portfolio-service"
import type { StockSymbol } from "@/src/stock-trading/domain/model"

// 가이드 섹션 22: 여러 서비스를 조합한 통합 테스트
// Layer.mergeAll로 전체 서비스 조립 → 하나의 Effect 파이프라인으로 검증

describe("Trading Flow Integration", () => {
  const AppLayer = Layer.mergeAll(
    AuthService.Default,
    StockService.Default,
    TradingService.Default,
    PortfolioService.Default,
  )

  type AppServices = AuthService | StockService | TradingService | PortfolioService

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

          // 2. 주식 시세 확인
          const stockService = yield* StockService
          const aapl = yield* stockService.getStock("AAPL" as StockSymbol)

          // 3. 매수
          const trading = yield* TradingService
          const order = yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10)

          // 4. 포트폴리오 확인
          const portfolio = yield* PortfolioService
          const summary = yield* portfolio.getPortfolioSummary(user.id)

          return { initialBalance, order, summary, stockPrice: aapl.price }
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
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 5)
          yield* trading.placeSellOrder(user.id, "AAPL" as StockSymbol, 5)

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
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 5)
          yield* trading.placeBuyOrder(user.id, "GOOGL" as StockSymbol, 3)
          yield* trading.placeBuyOrder(user.id, "MSFT" as StockSymbol, 2)

          const portfolio = yield* PortfolioService
          const summary = yield* portfolio.getPortfolioSummary(user.id)
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
          return yield* trading.placeBuyOrder(user.id, "MSFT" as StockSymbol, 999999)
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
          return yield* trading.placeSellOrder(user.id, "TSLA" as StockSymbol, 10)
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

          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10)
          yield* trading.placeSellOrder(user.id, "AAPL" as StockSymbol, 3)

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
