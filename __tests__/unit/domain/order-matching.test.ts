import { describe, it, expect } from "bun:test"
import { shouldFillOrder, isOrderExpired } from "@/src/stock-trading/domain/calculator"
import type { Order, OrderId, UserId, StockSymbol } from "@/src/stock-trading/domain/model"

const makeOrder = (overrides: Partial<Order>): Order => ({
  id: "order-1" as OrderId,
  userId: "user-1" as UserId,
  symbol: "AAPL" as StockSymbol,
  type: "buy",
  executionType: "market",
  quantity: 10,
  price: 100,
  status: "pending",
  createdAt: new Date(),
  ...overrides,
} as Order)

describe("shouldFillOrder", () => {
  // ── Market Orders ──
  describe("market orders", () => {
    it("should always fill pending market orders", () => {
      const order = makeOrder({ executionType: "market" })
      expect(shouldFillOrder(order, 100)).toBe(true)
      expect(shouldFillOrder(order, 200)).toBe(true)
      expect(shouldFillOrder(order, 50)).toBe(true)
    })

    it("should not fill non-pending market orders", () => {
      const order = makeOrder({ executionType: "market", status: "filled" })
      expect(shouldFillOrder(order, 100)).toBe(false)
    })
  })

  // ── Limit Buy Orders ──
  describe("limit buy orders", () => {
    it("should fill when current price <= limit price", () => {
      const order = makeOrder({ executionType: "limit", type: "buy", limitPrice: 150 })
      expect(shouldFillOrder(order, 140)).toBe(true)  // 현재가 < 지정가
      expect(shouldFillOrder(order, 150)).toBe(true)  // 현재가 == 지정가
    })

    it("should not fill when current price > limit price", () => {
      const order = makeOrder({ executionType: "limit", type: "buy", limitPrice: 150 })
      expect(shouldFillOrder(order, 151)).toBe(false)
      expect(shouldFillOrder(order, 200)).toBe(false)
    })
  })

  // ── Limit Sell Orders ──
  describe("limit sell orders", () => {
    it("should fill when current price >= limit price", () => {
      const order = makeOrder({ executionType: "limit", type: "sell", limitPrice: 150 })
      expect(shouldFillOrder(order, 160)).toBe(true)  // 현재가 > 지정가
      expect(shouldFillOrder(order, 150)).toBe(true)  // 현재가 == 지정가
    })

    it("should not fill when current price < limit price", () => {
      const order = makeOrder({ executionType: "limit", type: "sell", limitPrice: 150 })
      expect(shouldFillOrder(order, 149)).toBe(false)
      expect(shouldFillOrder(order, 100)).toBe(false)
    })
  })

  // ── Stop Buy Orders ──
  describe("stop buy orders", () => {
    it("should fill when current price >= stop price (breakout buy)", () => {
      const order = makeOrder({ executionType: "stop", type: "buy", stopPrice: 200 })
      expect(shouldFillOrder(order, 210)).toBe(true)
      expect(shouldFillOrder(order, 200)).toBe(true)
    })

    it("should not fill when current price < stop price", () => {
      const order = makeOrder({ executionType: "stop", type: "buy", stopPrice: 200 })
      expect(shouldFillOrder(order, 199)).toBe(false)
    })
  })

  // ── Stop Sell Orders ──
  describe("stop sell orders", () => {
    it("should fill when current price <= stop price (stop-loss)", () => {
      const order = makeOrder({ executionType: "stop", type: "sell", stopPrice: 80 })
      expect(shouldFillOrder(order, 70)).toBe(true)
      expect(shouldFillOrder(order, 80)).toBe(true)
    })

    it("should not fill when current price > stop price", () => {
      const order = makeOrder({ executionType: "stop", type: "sell", stopPrice: 80 })
      expect(shouldFillOrder(order, 81)).toBe(false)
    })
  })

  // ── Stop-Limit Buy Orders ──
  describe("stop-limit buy orders", () => {
    it("should fill when price >= stop AND price <= limit", () => {
      const order = makeOrder({
        executionType: "stop_limit", type: "buy", stopPrice: 100, limitPrice: 110,
      })
      expect(shouldFillOrder(order, 105)).toBe(true)  // 100 <= 105 <= 110
      expect(shouldFillOrder(order, 100)).toBe(true)  // 경계값
      expect(shouldFillOrder(order, 110)).toBe(true)  // 경계값
    })

    it("should not fill when price < stop or price > limit", () => {
      const order = makeOrder({
        executionType: "stop_limit", type: "buy", stopPrice: 100, limitPrice: 110,
      })
      expect(shouldFillOrder(order, 99)).toBe(false)
      expect(shouldFillOrder(order, 111)).toBe(false)
    })
  })

  // ── Stop-Limit Sell Orders ──
  describe("stop-limit sell orders", () => {
    it("should fill when price <= stop AND price >= limit", () => {
      const order = makeOrder({
        executionType: "stop_limit", type: "sell", stopPrice: 100, limitPrice: 90,
      })
      expect(shouldFillOrder(order, 95)).toBe(true)   // 90 <= 95 <= 100
      expect(shouldFillOrder(order, 100)).toBe(true)  // 경계값
      expect(shouldFillOrder(order, 90)).toBe(true)   // 경계값
    })

    it("should not fill when price > stop or price < limit", () => {
      const order = makeOrder({
        executionType: "stop_limit", type: "sell", stopPrice: 100, limitPrice: 90,
      })
      expect(shouldFillOrder(order, 101)).toBe(false)
      expect(shouldFillOrder(order, 89)).toBe(false)
    })
  })

  // ── Expiration ──
  describe("expired orders", () => {
    it("should not fill expired orders", () => {
      const pastDate = new Date(Date.now() - 60_000) // 1분 전 만료
      const order = makeOrder({
        executionType: "limit",
        type: "buy",
        limitPrice: 200,
        expiresAt: pastDate,
      })
      expect(shouldFillOrder(order, 100)).toBe(false)
    })

    it("should fill non-expired orders", () => {
      const futureDate = new Date(Date.now() + 3600_000) // 1시간 후 만료
      const order = makeOrder({
        executionType: "limit",
        type: "buy",
        limitPrice: 200,
        expiresAt: futureDate,
      })
      expect(shouldFillOrder(order, 100)).toBe(true)
    })
  })
})

describe("isOrderExpired", () => {
  it("should return true for expired pending orders", () => {
    const order = makeOrder({
      status: "pending",
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(isOrderExpired(order)).toBe(true)
  })

  it("should return false for non-expired pending orders", () => {
    const order = makeOrder({
      status: "pending",
      expiresAt: new Date(Date.now() + 3600_000),
    })
    expect(isOrderExpired(order)).toBe(false)
  })

  it("should return false for orders without expiresAt", () => {
    const order = makeOrder({ status: "pending" })
    expect(isOrderExpired(order)).toBe(false)
  })

  it("should return false for filled orders even if past expiry", () => {
    const order = makeOrder({
      status: "filled",
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(isOrderExpired(order)).toBe(false)
  })
})
