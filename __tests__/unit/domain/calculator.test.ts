import { describe, it, expect } from "bun:test"
import {
  calculateHoldingPnL,
  calculatePortfolioValue,
  calculatePriceChange,
  calculateTotalPnL,
} from "@/src/stock-trading/domain/calculator"
import type { Holding, Stock, StockSymbol } from "@/src/stock-trading/domain/model"

const holding = (symbol: string, quantity: number, averagePrice: number): Holding =>
  ({ symbol, quantity, averagePrice }) as Holding

const stock = (symbol: string, name: string, price: number, previousClose: number): Stock =>
  ({ symbol, name, price, previousClose }) as Stock

describe("Stock Trading Calculator", () => {
  // ── Holding P&L ──
  describe("calculateHoldingPnL", () => {
    it("should calculate positive P&L when price goes up", () => {
      const result = calculateHoldingPnL(holding("AAPL", 10, 100), 150)
      expect(result.unrealizedPnL).toBe(500) // (150 - 100) * 10
      expect(result.pnlPercent).toBe(50) // (150 - 100) / 100 * 100
    })

    it("should calculate negative P&L when price goes down", () => {
      const result = calculateHoldingPnL(holding("AAPL", 10, 100), 80)
      expect(result.unrealizedPnL).toBe(-200) // (80 - 100) * 10
      expect(result.pnlPercent).toBe(-20)
    })

    it("should return zero P&L when price unchanged", () => {
      const result = calculateHoldingPnL(holding("AAPL", 5, 200), 200)
      expect(result.unrealizedPnL).toBe(0)
      expect(result.pnlPercent).toBe(0)
    })

    it("should handle fractional prices", () => {
      const result = calculateHoldingPnL(holding("AAPL", 3, 100.5), 101.5)
      expect(result.unrealizedPnL).toBeCloseTo(3.0) // (101.5 - 100.5) * 3
      expect(result.pnlPercent).toBeCloseTo(0.995, 2)
    })
  })

  // ── Portfolio Value ──
  describe("calculatePortfolioValue", () => {
    it("should calculate total value of all holdings", () => {
      const holdings = [
        holding("AAPL", 10, 100),
        holding("GOOGL", 5, 200),
      ]
      const prices = new Map<StockSymbol, number>([
        ["AAPL" as StockSymbol, 150],
        ["GOOGL" as StockSymbol, 250],
      ])
      // (10 * 150) + (5 * 250) = 1500 + 1250 = 2750
      expect(calculatePortfolioValue(holdings, prices)).toBe(2750)
    })

    it("should return 0 for empty holdings", () => {
      expect(calculatePortfolioValue([], new Map())).toBe(0)
    })

    it("should skip holdings without matching price", () => {
      const holdings = [holding("AAPL", 10, 100)]
      const prices = new Map<StockSymbol, number>()
      expect(calculatePortfolioValue(holdings, prices)).toBe(0)
    })
  })

  // ── Price Change ──
  describe("calculatePriceChange", () => {
    it("should calculate positive change", () => {
      const result = calculatePriceChange(stock("AAPL", "Apple", 155, 150))
      expect(result.change).toBe(5)
      expect(result.changePercent).toBeCloseTo(3.33, 1)
    })

    it("should calculate negative change", () => {
      const result = calculatePriceChange(stock("AAPL", "Apple", 140, 150))
      expect(result.change).toBe(-10)
      expect(result.changePercent).toBeCloseTo(-6.67, 1)
    })

    it("should return zero for unchanged price", () => {
      const result = calculatePriceChange(stock("AAPL", "Apple", 150, 150))
      expect(result.change).toBe(0)
      expect(result.changePercent).toBe(0)
    })
  })

  // ── Total P&L ──
  describe("calculateTotalPnL", () => {
    it("should aggregate P&L across all holdings", () => {
      const holdings = [
        holding("AAPL", 10, 100),  // cost: 1000
        holding("GOOGL", 5, 200),  // cost: 1000
      ]
      const prices = new Map<StockSymbol, number>([
        ["AAPL" as StockSymbol, 120],   // value: 1200, pnl: +200
        ["GOOGL" as StockSymbol, 180],  // value: 900,  pnl: -100
      ])
      const result = calculateTotalPnL(holdings, prices)
      expect(result.totalPnL).toBe(100)        // 200 + (-100)
      expect(result.totalCost).toBe(2000)       // 1000 + 1000
      expect(result.totalValue).toBe(2100)      // 1200 + 900
      expect(result.totalPnLPercent).toBe(5)    // 100 / 2000 * 100
    })

    it("should return zeros for empty holdings", () => {
      const result = calculateTotalPnL([], new Map())
      expect(result.totalPnL).toBe(0)
      expect(result.totalCost).toBe(0)
      expect(result.totalValue).toBe(0)
      expect(result.totalPnLPercent).toBe(0)
    })
  })
})
