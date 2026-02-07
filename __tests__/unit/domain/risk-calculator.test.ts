import { describe, it, expect } from "bun:test"
import {
  calculateVolatility,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculatePositionWeights,
  calculateDailyReturns,
  assessRiskLevel,
} from "@/src/stock-trading/domain/risk-calculator"
import type { Holding, StockSymbol } from "@/src/stock-trading/domain/model"

const holding = (symbol: string, quantity: number, averagePrice: number): Holding =>
  ({ symbol, quantity, averagePrice }) as Holding

describe("Risk Calculator", () => {
  // ── calculateDailyReturns ──
  describe("calculateDailyReturns", () => {
    it("should calculate returns from a basic price series", () => {
      const returns = calculateDailyReturns([100, 110, 105])
      expect(returns).toHaveLength(2)
      expect(returns[0]).toBeCloseTo(0.1, 5) // (110-100)/100
      expect(returns[1]).toBeCloseTo(-0.04545, 4) // (105-110)/110
    })

    it("should return empty array for single price", () => {
      expect(calculateDailyReturns([100])).toEqual([])
    })

    it("should return empty array for empty input", () => {
      expect(calculateDailyReturns([])).toEqual([])
    })
  })

  // ── calculateVolatility ──
  describe("calculateVolatility", () => {
    it("should calculate volatility for a known sequence", () => {
      // prices: 100, 102, 98, 104, 100
      // returns: 0.02, -0.03922, 0.06122, -0.03846
      const vol = calculateVolatility([100, 102, 98, 104, 100])
      expect(vol).toBeGreaterThan(0)
      expect(vol).toBeLessThan(1)
    })

    it("should return 0 for constant prices", () => {
      expect(calculateVolatility([100, 100, 100, 100])).toBe(0)
    })

    it("should return 0 for single value", () => {
      expect(calculateVolatility([100])).toBe(0)
    })

    it("should return 0 for empty array", () => {
      expect(calculateVolatility([])).toBe(0)
    })

    it("should be higher for more volatile sequences", () => {
      const stable = calculateVolatility([100, 101, 100, 101, 100])
      const volatile = calculateVolatility([100, 120, 80, 120, 80])
      expect(volatile).toBeGreaterThan(stable)
    })
  })

  // ── calculateSharpeRatio ──
  describe("calculateSharpeRatio", () => {
    it("should calculate positive Sharpe ratio for positive returns", () => {
      const returns = [0.05, 0.03, 0.04, 0.06, 0.02]
      const sharpe = calculateSharpeRatio(returns)
      expect(sharpe).toBeGreaterThan(0)
    })

    it("should calculate negative Sharpe ratio for negative returns", () => {
      const returns = [-0.05, -0.03, -0.04, -0.06, -0.02]
      const sharpe = calculateSharpeRatio(returns)
      expect(sharpe).toBeLessThan(0)
    })

    it("should return 0 for zero-variance returns", () => {
      const returns = [0.05, 0.05, 0.05]
      expect(calculateSharpeRatio(returns)).toBe(0)
    })

    it("should return 0 for empty returns", () => {
      expect(calculateSharpeRatio([])).toBe(0)
    })

    it("should account for risk-free rate", () => {
      const returns = [0.05, 0.03, 0.04, 0.06, 0.02]
      const withoutRf = calculateSharpeRatio(returns, 0)
      const withRf = calculateSharpeRatio(returns, 0.02)
      expect(withRf).toBeLessThan(withoutRf)
    })
  })

  // ── calculateMaxDrawdown ──
  describe("calculateMaxDrawdown", () => {
    it("should return 0 for consistent uptrend", () => {
      const result = calculateMaxDrawdown([100, 110, 120, 130, 140])
      expect(result.mdd).toBe(0)
    })

    it("should calculate MDD for downtrend", () => {
      const result = calculateMaxDrawdown([100, 90, 80, 70])
      expect(result.mdd).toBeCloseTo(0.3, 5) // (100-70)/100
      expect(result.peak).toBe(100)
      expect(result.trough).toBe(70)
    })

    it("should calculate MDD for V-shape recovery", () => {
      const result = calculateMaxDrawdown([100, 80, 60, 80, 100])
      expect(result.mdd).toBeCloseTo(0.4, 5) // (100-60)/100
      expect(result.peak).toBe(100)
      expect(result.trough).toBe(60)
    })

    it("should find the largest drawdown among multiple dips", () => {
      const result = calculateMaxDrawdown([100, 90, 95, 70, 80])
      expect(result.mdd).toBeCloseTo(0.3, 5) // (100-70)/100
      expect(result.peak).toBe(100)
      expect(result.trough).toBe(70)
    })

    it("should return 0 for single price", () => {
      const result = calculateMaxDrawdown([100])
      expect(result.mdd).toBe(0)
    })

    it("should return 0 for empty array", () => {
      const result = calculateMaxDrawdown([])
      expect(result.mdd).toBe(0)
    })
  })

  // ── calculatePositionWeights ──
  describe("calculatePositionWeights", () => {
    it("should calculate weights for multiple holdings", () => {
      const holdings = [
        holding("AAPL", 10, 100),
        holding("GOOGL", 5, 200),
      ]
      const prices = new Map<StockSymbol, number>([
        ["AAPL" as StockSymbol, 150],  // value: 1500
        ["GOOGL" as StockSymbol, 200], // value: 1000
      ])
      // total: 2500
      const weights = calculatePositionWeights(holdings, prices)
      expect(weights.get("AAPL" as StockSymbol)).toBeCloseTo(0.6, 5) // 1500/2500
      expect(weights.get("GOOGL" as StockSymbol)).toBeCloseTo(0.4, 5) // 1000/2500
    })

    it("should return 100% for single holding", () => {
      const holdings = [holding("AAPL", 10, 100)]
      const prices = new Map<StockSymbol, number>([
        ["AAPL" as StockSymbol, 150],
      ])
      const weights = calculatePositionWeights(holdings, prices)
      expect(weights.get("AAPL" as StockSymbol)).toBe(1)
    })

    it("should return empty map for empty holdings", () => {
      const weights = calculatePositionWeights([], new Map())
      expect(weights.size).toBe(0)
    })

    it("should return empty map when total value is 0", () => {
      const holdings = [holding("AAPL", 10, 100)]
      const prices = new Map<StockSymbol, number>()
      const weights = calculatePositionWeights(holdings, prices)
      expect(weights.size).toBe(0)
    })
  })

  // ── assessRiskLevel ──
  describe("assessRiskLevel", () => {
    it("should return 'low' for volatility below 2%", () => {
      expect(assessRiskLevel(0.01)).toBe("low")
      expect(assessRiskLevel(0.019)).toBe("low")
    })

    it("should return 'medium' for volatility between 2% and 5%", () => {
      expect(assessRiskLevel(0.02)).toBe("medium")
      expect(assessRiskLevel(0.035)).toBe("medium")
      expect(assessRiskLevel(0.049)).toBe("medium")
    })

    it("should return 'high' for volatility 5% and above", () => {
      expect(assessRiskLevel(0.05)).toBe("high")
      expect(assessRiskLevel(0.1)).toBe("high")
      expect(assessRiskLevel(0.5)).toBe("high")
    })

    it("should return 'low' for zero volatility", () => {
      expect(assessRiskLevel(0)).toBe("low")
    })
  })
})
