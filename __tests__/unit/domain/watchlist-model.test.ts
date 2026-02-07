import { describe, it, expect } from "bun:test"
import { evaluateAlertCondition } from "@/src/stock-trading/domain/watchlist-model"
import type { AlertConditionType } from "@/src/stock-trading/domain/watchlist-model"

const condition = (conditionType: AlertConditionType, targetValue: number) => ({
  conditionType,
  targetValue,
})

describe("evaluateAlertCondition", () => {
  // ── price_above ──
  describe("price_above", () => {
    it("should trigger when current price is above target", () => {
      expect(evaluateAlertCondition(condition("price_above", 100), 150, 90)).toBe(true)
    })

    it("should not trigger when current price is below target", () => {
      expect(evaluateAlertCondition(condition("price_above", 100), 80, 90)).toBe(false)
    })

    it("should not trigger when current price equals target (strict >)", () => {
      expect(evaluateAlertCondition(condition("price_above", 100), 100, 90)).toBe(false)
    })
  })

  // ── price_below ──
  describe("price_below", () => {
    it("should trigger when current price is below target", () => {
      expect(evaluateAlertCondition(condition("price_below", 100), 80, 110)).toBe(true)
    })

    it("should not trigger when current price is above target", () => {
      expect(evaluateAlertCondition(condition("price_below", 100), 150, 110)).toBe(false)
    })

    it("should not trigger when current price equals target (strict <)", () => {
      expect(evaluateAlertCondition(condition("price_below", 100), 100, 110)).toBe(false)
    })
  })

  // ── change_percent_above ──
  describe("change_percent_above", () => {
    it("should trigger when percent change exceeds target", () => {
      // previousClose=100, currentPrice=115 => +15%
      expect(evaluateAlertCondition(condition("change_percent_above", 10), 115, 100)).toBe(true)
    })

    it("should not trigger when percent change is below target", () => {
      // previousClose=100, currentPrice=105 => +5%
      expect(evaluateAlertCondition(condition("change_percent_above", 10), 105, 100)).toBe(false)
    })

    it("should not trigger at exact threshold", () => {
      // previousClose=100, currentPrice=110 => +10%
      expect(evaluateAlertCondition(condition("change_percent_above", 10), 110, 100)).toBe(false)
    })

    it("should return false when previousClose is zero", () => {
      expect(evaluateAlertCondition(condition("change_percent_above", 5), 100, 0)).toBe(false)
    })
  })

  // ── change_percent_below ──
  describe("change_percent_below", () => {
    it("should trigger when percent change is below target (negative)", () => {
      // previousClose=100, currentPrice=80 => -20%
      expect(evaluateAlertCondition(condition("change_percent_below", -10), 80, 100)).toBe(true)
    })

    it("should not trigger when percent change is above target", () => {
      // previousClose=100, currentPrice=95 => -5%
      expect(evaluateAlertCondition(condition("change_percent_below", -10), 95, 100)).toBe(false)
    })

    it("should not trigger at exact threshold", () => {
      // previousClose=100, currentPrice=90 => -10%
      expect(evaluateAlertCondition(condition("change_percent_below", -10), 90, 100)).toBe(false)
    })

    it("should return false when previousClose is zero", () => {
      expect(evaluateAlertCondition(condition("change_percent_below", -5), 100, 0)).toBe(false)
    })
  })

  // ── Edge cases ──
  describe("edge cases", () => {
    it("should handle zero current price for price_below", () => {
      expect(evaluateAlertCondition(condition("price_below", 50), 0, 100)).toBe(true)
    })

    it("should handle zero target for price_above", () => {
      expect(evaluateAlertCondition(condition("price_above", 0), 10, 100)).toBe(true)
    })

    it("should handle large percent changes", () => {
      // previousClose=100, currentPrice=300 => +200%
      expect(evaluateAlertCondition(condition("change_percent_above", 100), 300, 100)).toBe(true)
    })
  })
})
