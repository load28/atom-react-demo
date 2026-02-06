import { describe, it, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { PortfolioService } from "@/src/stock-trading/services/portfolio-service"
import { OrderMatchingService } from "@/src/stock-trading/services/order-matching-service"
import type { StockSymbol } from "@/src/stock-trading/domain/model"

const STOCK_PRICES: Map<StockSymbol, number> = new Map([
  ["AAPL" as StockSymbol, 178.5],
  ["GOOGL" as StockSymbol, 141.8],
  ["MSFT" as StockSymbol, 378.9],
  ["TSLA" as StockSymbol, 248.5],
  ["AMZN" as StockSymbol, 185.6],
])

const AAPL_PRICE = STOCK_PRICES.get("AAPL" as StockSymbol)!

describe("Conditional Order Flow Integration", () => {
  const AppLayer = Layer.mergeAll(
    AuthService.Default,
    TradingService.Default,
    PortfolioService.Default,
    OrderMatchingService.Default,
  )

  type AppServices = AuthService | TradingService | PortfolioService | OrderMatchingService

  const run = <A, E>(effect: Effect.Effect<A, E, AppServices>) =>
    Effect.runPromise(effect.pipe(Effect.provide(AppLayer)))

  describe("지정가 매수 → 가격 하락 → 자동 체결 → 포트폴리오 반영", () => {
    it("should auto-fill limit buy when price drops and reflect in portfolio", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const initialBalance = user.balance

          // 1. 지정가 170에 매수 주문
          const matching = yield* OrderMatchingService
          const order = yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "buy",
            executionType: "limit",
            quantity: 10,
            currentPrice: AAPL_PRICE,
            limitPrice: 170,
          })

          // 2. 대기 주문 확인
          const pending = yield* matching.getPendingOrders(user.id)

          // 3. 가격이 168로 하락 → 체결 평가
          const droppedPrices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 168],
            ["GOOGL" as StockSymbol, 141.8],
          ])
          const matchResult = yield* matching.evaluateOrders(droppedPrices)

          // 4. 포트폴리오 확인
          const portfolio = yield* PortfolioService
          const summary = yield* portfolio.getPortfolioSummary(user.id, droppedPrices)

          // 5. 체결 후 대기 주문 확인
          const remainingPending = yield* matching.getPendingOrders(user.id)

          return {
            initialBalance,
            order,
            pendingCount: pending.length,
            matchResult,
            summary,
            remainingPendingCount: remainingPending.length,
          }
        })
      )

      // 주문이 대기 상태로 생성됨
      expect(result.order.status).toBe("pending")
      expect(result.pendingCount).toBe(1)

      // 가격 하락 후 체결됨
      expect(result.matchResult.filled.length).toBe(1)
      expect(result.matchResult.filled[0].status).toBe("filled")

      // 포트폴리오에 반영됨
      expect(result.summary.holdings.length).toBe(1)
      expect(result.summary.holdings[0].symbol).toBe("AAPL")
      expect(result.summary.holdings[0].quantity).toBe(10)

      // 체결 후 대기 주문이 비어있음
      expect(result.remainingPendingCount).toBe(0)
    })
  })

  describe("손절 매도 → 가격 하락 → 자동 손절 체결", () => {
    it("should auto-fill stop sell when price drops below stop price", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")

          // 1. 먼저 시장가로 매수
          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 10, AAPL_PRICE)

          // 2. 손절 주문 등록 (스탑가: 160)
          const matching = yield* OrderMatchingService
          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "sell",
            executionType: "stop",
            quantity: 10,
            currentPrice: AAPL_PRICE,
            stopPrice: 160,
          })

          // 3. 가격이 155로 급락 → 손절 체결
          const crashedPrices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 155],
          ])
          const matchResult = yield* matching.evaluateOrders(crashedPrices)

          // 4. 보유 확인
          const holdings = yield* trading.getHoldings(user.id)

          // 5. 잔고 확인
          const balance = yield* auth.getBalance(user.id)

          return { matchResult, holdings, balance, initialBalance: user.balance }
        })
      )

      // 손절 체결됨
      expect(result.matchResult.filled.length).toBe(1)
      expect(result.matchResult.filled[0].type).toBe("sell")

      // 보유 종목이 비어있음 (전부 매도)
      expect(result.holdings.length).toBe(0)
    })
  })

  describe("지정가 매수 → 가격 미도달 → 취소 → 잔고 복구", () => {
    it("should restore balance when cancelling a limit buy order", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const initialBalance = user.balance

          // 1. 지정가 매수 주문
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

          // 2. 주문 취소
          yield* matching.cancelOrder(order.id, user.id)
          const balanceAfterCancel = yield* auth.getBalance(user.id)

          return { initialBalance, balanceAfterOrder, balanceAfterCancel }
        })
      )

      // 주문 후 잔고 차감 (170 * 5 = 850)
      expect(result.balanceAfterOrder).toBe(result.initialBalance - 170 * 5)
      // 취소 후 잔고 복구
      expect(result.balanceAfterCancel).toBe(result.initialBalance)
    })
  })

  describe("만료된 주문 처리", () => {
    it("should expire orders and restore balance", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")
          const initialBalance = user.balance

          // 1. 이미 만료된 주문 생성
          const matching = yield* OrderMatchingService
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

          // 2. 매칭 평가 → 만료 처리
          const matchResult = yield* matching.evaluateOrders(STOCK_PRICES)

          // 3. 잔고 확인 (만료된 매수 주문의 예약금이 복구되어야 함)
          const finalBalance = yield* auth.getBalance(user.id)

          return { initialBalance, matchResult, finalBalance }
        })
      )

      expect(result.matchResult.expired.length).toBe(1)
      expect(result.matchResult.filled.length).toBe(0)
      // 만료 후 잔고 복구
      expect(result.finalBalance).toBe(result.initialBalance)
    })
  })

  describe("복합 시나리오: 시장가 매수 + 지정가 매도 + 손절", () => {
    it("should handle mixed order types in single portfolio", async () => {
      const result = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          const user = yield* auth.login("trader1", "password123")

          // 1. 시장가로 AAPL 20주 매수
          const trading = yield* TradingService
          yield* trading.placeBuyOrder(user.id, "AAPL" as StockSymbol, 20, AAPL_PRICE)

          // 2. 지정가 매도 10주 (목표가: 190)
          const matching = yield* OrderMatchingService
          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "sell",
            executionType: "limit",
            quantity: 10,
            currentPrice: AAPL_PRICE,
            limitPrice: 190,
          })

          // 3. 손절 매도 10주 (스탑가: 160)
          yield* matching.placeConditionalOrder({
            userId: user.id,
            symbol: "AAPL" as StockSymbol,
            type: "sell",
            executionType: "stop",
            quantity: 10,
            currentPrice: AAPL_PRICE,
            stopPrice: 160,
          })

          // 4. 대기 주문 확인
          const pending = yield* matching.getPendingOrders(user.id)

          // 5. 가격이 195로 상승 → 지정가 매도 체결, 손절 미체결
          const riseResult = yield* matching.evaluateOrders(
            new Map([["AAPL" as StockSymbol, 195]])
          )

          // 6. 남은 대기 주문 확인
          const remainingPending = yield* matching.getPendingOrders(user.id)

          // 7. 보유 확인 (20 - 10 = 10주)
          const holdings = yield* trading.getHoldings(user.id)

          return {
            pendingCount: pending.length,
            riseResult,
            remainingPendingCount: remainingPending.length,
            holdings,
          }
        })
      )

      // 2개의 대기 주문 (지정가 매도 + 손절 매도)
      expect(result.pendingCount).toBe(2)

      // 가격 상승 시 지정가 매도만 체결, 손절은 미체결
      expect(result.riseResult.filled.length).toBe(1)
      expect(result.riseResult.filled[0].type).toBe("sell")

      // 손절 주문만 남아있음
      expect(result.remainingPendingCount).toBe(1)

      // 보유 수량: 20 - 10 = 10
      expect(result.holdings.length).toBe(1)
      expect(result.holdings[0].quantity).toBe(10)
    })
  })
})
