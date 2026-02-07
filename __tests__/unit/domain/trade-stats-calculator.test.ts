import { describe, it, expect } from "bun:test"
import type { Order, StockSymbol, OrderId, UserId } from "@/src/stock-trading/domain/model"
import {
  matchOrdersToTradePairs,
  calculateTradeStats,
  calculateWinRate,
  calculateProfitFactor,
  formatHoldingPeriod,
  type TradePair,
} from "@/src/stock-trading/domain/trade-stats-calculator"

const makeOrder = (
  overrides: Partial<Order> & {
    id: string
    symbol: string
    type: "buy" | "sell"
    price: number
    quantity: number
  },
): Order =>
  ({
    userId: "user1" as UserId,
    executionType: "market",
    status: "filled",
    createdAt: new Date("2024-01-01"),
    filledAt: new Date("2024-01-01"),
    ...overrides,
    id: overrides.id as OrderId,
    symbol: overrides.symbol as StockSymbol,
  }) as Order

const makePair = (profit: number, holdingMs: number = 0): TradePair =>
  ({
    symbol: "AAPL" as StockSymbol,
    buyOrder: makeOrder({ id: "b1", symbol: "AAPL", type: "buy", price: 100, quantity: 10 }),
    sellOrder: makeOrder({ id: "s1", symbol: "AAPL", type: "sell", price: profit > 0 ? 110 : 90, quantity: 10 }),
    profit,
    profitPercent: profit / 1000 * 100,
    holdingPeriodMs: holdingMs,
  }) as TradePair

describe("Trade Stats Calculator", () => {
  // ── matchOrdersToTradePairs ──
  describe("matchOrdersToTradePairs", () => {
    it("should match a simple buy→sell pair", () => {
      const orders = [
        makeOrder({
          id: "b1",
          symbol: "AAPL",
          type: "buy",
          price: 100,
          quantity: 10,
          filledAt: new Date("2024-01-01T10:00:00"),
        }),
        makeOrder({
          id: "s1",
          symbol: "AAPL",
          type: "sell",
          price: 110,
          quantity: 10,
          filledAt: new Date("2024-01-02T10:00:00"),
        }),
      ]
      const pairs = matchOrdersToTradePairs(orders)
      expect(pairs).toHaveLength(1)
      expect(pairs[0].symbol).toBe("AAPL")
      expect(pairs[0].profit).toBe(100) // (110 - 100) * 10
      expect(pairs[0].profitPercent).toBe(10) // 100 / 1000 * 100
      expect(pairs[0].holdingPeriodMs).toBe(24 * 60 * 60 * 1000)
    })

    it("should handle multiple symbols independently", () => {
      const orders = [
        makeOrder({ id: "b1", symbol: "AAPL", type: "buy", price: 100, quantity: 5, filledAt: new Date("2024-01-01") }),
        makeOrder({ id: "b2", symbol: "GOOGL", type: "buy", price: 200, quantity: 3, filledAt: new Date("2024-01-01") }),
        makeOrder({ id: "s1", symbol: "AAPL", type: "sell", price: 120, quantity: 5, filledAt: new Date("2024-01-02") }),
        makeOrder({ id: "s2", symbol: "GOOGL", type: "sell", price: 180, quantity: 3, filledAt: new Date("2024-01-02") }),
      ]
      const pairs = matchOrdersToTradePairs(orders)
      expect(pairs).toHaveLength(2)

      const aapl = pairs.find((p) => p.symbol === "AAPL")!
      const googl = pairs.find((p) => p.symbol === "GOOGL")!
      expect(aapl.profit).toBe(100) // (120-100)*5
      expect(googl.profit).toBe(-60) // (180-200)*3
    })

    it("should return empty when only buys exist (no matching sells)", () => {
      const orders = [
        makeOrder({ id: "b1", symbol: "AAPL", type: "buy", price: 100, quantity: 10 }),
        makeOrder({ id: "b2", symbol: "AAPL", type: "buy", price: 105, quantity: 5 }),
      ]
      const pairs = matchOrdersToTradePairs(orders)
      expect(pairs).toHaveLength(0)
    })

    it("should match FIFO (first buy matches first sell)", () => {
      const orders = [
        makeOrder({ id: "b1", symbol: "AAPL", type: "buy", price: 100, quantity: 10, filledAt: new Date("2024-01-01") }),
        makeOrder({ id: "b2", symbol: "AAPL", type: "buy", price: 120, quantity: 10, filledAt: new Date("2024-01-02") }),
        makeOrder({ id: "s1", symbol: "AAPL", type: "sell", price: 110, quantity: 10, filledAt: new Date("2024-01-03") }),
      ]
      const pairs = matchOrdersToTradePairs(orders)
      expect(pairs).toHaveLength(1)
      // FIFO: first buy (price=100) matched with first sell (price=110)
      expect(pairs[0].buyOrder.price).toBe(100)
      expect(pairs[0].profit).toBe(100) // (110-100)*10
    })

    it("should return empty for empty orders", () => {
      const pairs = matchOrdersToTradePairs([])
      expect(pairs).toHaveLength(0)
    })

    it("should skip non-filled orders", () => {
      const orders = [
        makeOrder({ id: "b1", symbol: "AAPL", type: "buy", price: 100, quantity: 10, status: "pending" }),
        makeOrder({ id: "s1", symbol: "AAPL", type: "sell", price: 110, quantity: 10, status: "filled" }),
      ]
      const pairs = matchOrdersToTradePairs(orders)
      expect(pairs).toHaveLength(0)
    })
  })

  // ── calculateTradeStats ──
  describe("calculateTradeStats", () => {
    it("should calculate stats for all winning trades", () => {
      const pairs: TradePair[] = [makePair(100, 3600000), makePair(200, 7200000)]
      const stats = calculateTradeStats(pairs)
      expect(stats.totalTrades).toBe(2)
      expect(stats.winCount).toBe(2)
      expect(stats.lossCount).toBe(0)
      expect(stats.winRate).toBe(100)
      expect(stats.totalProfit).toBe(300)
      expect(stats.totalLoss).toBe(0)
      expect(stats.netPnL).toBe(300)
      expect(stats.avgProfit).toBe(150)
      expect(stats.avgLoss).toBe(0)
      expect(stats.profitFactor).toBe(Infinity)
      expect(stats.avgHoldingPeriodMs).toBe(5400000)
    })

    it("should calculate stats for all losing trades", () => {
      const pairs: TradePair[] = [makePair(-100, 3600000), makePair(-200, 7200000)]
      const stats = calculateTradeStats(pairs)
      expect(stats.totalTrades).toBe(2)
      expect(stats.winCount).toBe(0)
      expect(stats.lossCount).toBe(2)
      expect(stats.winRate).toBe(0)
      expect(stats.totalProfit).toBe(0)
      expect(stats.totalLoss).toBe(-300)
      expect(stats.netPnL).toBe(-300)
      expect(stats.avgProfit).toBe(0)
      expect(stats.avgLoss).toBe(-150)
      expect(stats.profitFactor).toBe(0)
    })

    it("should calculate stats for mixed trades", () => {
      const pairs: TradePair[] = [makePair(300, 3600000), makePair(-100, 7200000)]
      const stats = calculateTradeStats(pairs)
      expect(stats.totalTrades).toBe(2)
      expect(stats.winCount).toBe(1)
      expect(stats.lossCount).toBe(1)
      expect(stats.winRate).toBe(50)
      expect(stats.totalProfit).toBe(300)
      expect(stats.totalLoss).toBe(-100)
      expect(stats.netPnL).toBe(200)
      expect(stats.profitFactor).toBe(3) // |300 / -100|
    })

    it("should calculate stats for a single trade", () => {
      const pairs: TradePair[] = [makePair(50, 1800000)]
      const stats = calculateTradeStats(pairs)
      expect(stats.totalTrades).toBe(1)
      expect(stats.winCount).toBe(1)
      expect(stats.bestTrade).toBe(pairs[0])
      expect(stats.worstTrade).toBe(pairs[0])
    })

    it("should return zero stats for empty pairs", () => {
      const stats = calculateTradeStats([])
      expect(stats.totalTrades).toBe(0)
      expect(stats.winRate).toBe(0)
      expect(stats.netPnL).toBe(0)
      expect(stats.bestTrade).toBeNull()
      expect(stats.worstTrade).toBeNull()
    })

    it("should track best and worst trades", () => {
      const pairs: TradePair[] = [makePair(500), makePair(-200), makePair(100)]
      const stats = calculateTradeStats(pairs)
      expect(stats.bestTrade!.profit).toBe(500)
      expect(stats.worstTrade!.profit).toBe(-200)
    })

    it("should group trades by symbol", () => {
      const pair1 = { ...makePair(100), symbol: "AAPL" as StockSymbol }
      const pair2 = { ...makePair(-50), symbol: "GOOGL" as StockSymbol }
      const pair3 = { ...makePair(200), symbol: "AAPL" as StockSymbol }
      const stats = calculateTradeStats([pair1, pair2, pair3])

      const aapl = stats.tradesBySymbol.get("AAPL" as StockSymbol)!
      expect(aapl.count).toBe(2)
      expect(aapl.netPnL).toBe(300)

      const googl = stats.tradesBySymbol.get("GOOGL" as StockSymbol)!
      expect(googl.count).toBe(1)
      expect(googl.netPnL).toBe(-50)
    })
  })

  // ── calculateWinRate ──
  describe("calculateWinRate", () => {
    it("should return 100% for all wins", () => {
      expect(calculateWinRate([makePair(100), makePair(200)])).toBe(100)
    })

    it("should return 0% for all losses", () => {
      expect(calculateWinRate([makePair(-100), makePair(-200)])).toBe(0)
    })

    it("should return 50% for mixed", () => {
      expect(calculateWinRate([makePair(100), makePair(-100)])).toBe(50)
    })

    it("should return 0 for empty pairs", () => {
      expect(calculateWinRate([])).toBe(0)
    })
  })

  // ── calculateProfitFactor ──
  describe("calculateProfitFactor", () => {
    it("should return Infinity when no losses", () => {
      expect(calculateProfitFactor([makePair(100), makePair(200)])).toBe(Infinity)
    })

    it("should return 0 when no wins", () => {
      expect(calculateProfitFactor([makePair(-100), makePair(-200)])).toBe(0)
    })

    it("should calculate ratio for mixed trades", () => {
      // total win: 300, total loss: -100 → |300 / -100| = 3
      expect(calculateProfitFactor([makePair(300), makePair(-100)])).toBe(3)
    })

    it("should return 0 for empty pairs", () => {
      expect(calculateProfitFactor([])).toBe(0)
    })
  })

  // ── formatHoldingPeriod ──
  describe("formatHoldingPeriod", () => {
    it("should format minutes", () => {
      expect(formatHoldingPeriod(30 * 60 * 1000)).toBe("30분")
    })

    it("should format hours and minutes", () => {
      expect(formatHoldingPeriod(2.5 * 60 * 60 * 1000)).toBe("2시간 30분")
    })

    it("should format exact hours", () => {
      expect(formatHoldingPeriod(3 * 60 * 60 * 1000)).toBe("3시간")
    })

    it("should format days", () => {
      expect(formatHoldingPeriod(3 * 24 * 60 * 60 * 1000)).toBe("3일")
    })

    it("should format days and hours", () => {
      expect(formatHoldingPeriod((2 * 24 + 5) * 60 * 60 * 1000)).toBe("2일 5시간")
    })

    it("should format 0ms as 0분", () => {
      expect(formatHoldingPeriod(0)).toBe("0분")
    })
  })
})
