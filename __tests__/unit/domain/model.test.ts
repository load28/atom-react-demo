import { describe, it, expect } from "bun:test"
import { Schema } from "effect"
import {
  UserId,
  StockSymbol,
  OrderId,
  User,
  Stock,
  OrderType,
  OrderStatus,
  Order,
  Holding,
} from "@/src/stock-trading/domain/model"

describe("Stock Trading Domain Models", () => {
  // ── Branded Types ──
  describe("UserId", () => {
    it("should accept valid string as UserId", () => {
      const decoded = Schema.decodeSync(UserId)("user-1")
      expect(decoded).toBe("user-1")
    })

    it("should reject empty string", () => {
      expect(() => Schema.decodeSync(UserId)("")).toThrow()
    })
  })

  describe("StockSymbol", () => {
    it("should accept valid stock symbol", () => {
      const decoded = Schema.decodeSync(StockSymbol)("AAPL")
      expect(decoded).toBe("AAPL")
    })

    it("should reject empty string", () => {
      expect(() => Schema.decodeSync(StockSymbol)("")).toThrow()
    })
  })

  describe("OrderId", () => {
    it("should accept valid order id", () => {
      const decoded = Schema.decodeSync(OrderId)("order-1")
      expect(decoded).toBe("order-1")
    })
  })

  // ── User ──
  describe("User", () => {
    it("should decode valid user", () => {
      const user = Schema.decodeSync(User)({
        id: "user-1",
        username: "trader1",
        balance: 10000,
      })
      expect(user.id).toBe("user-1")
      expect(user.username).toBe("trader1")
      expect(user.balance).toBe(10000)
    })

    it("should reject negative balance", () => {
      expect(() =>
        Schema.decodeSync(User)({
          id: "user-1",
          username: "trader1",
          balance: -100,
        })
      ).toThrow()
    })

    it("should reject empty username", () => {
      expect(() =>
        Schema.decodeSync(User)({
          id: "user-1",
          username: "",
          balance: 10000,
        })
      ).toThrow()
    })

    it("should accept zero balance", () => {
      const user = Schema.decodeSync(User)({
        id: "user-1",
        username: "trader1",
        balance: 0,
      })
      expect(user.balance).toBe(0)
    })
  })

  // ── Stock ──
  describe("Stock", () => {
    it("should decode valid stock", () => {
      const stock = Schema.decodeSync(Stock)({
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 150.5,
        previousClose: 148.0,
      })
      expect(stock.symbol).toBe("AAPL")
      expect(stock.name).toBe("Apple Inc.")
      expect(stock.price).toBe(150.5)
      expect(stock.previousClose).toBe(148.0)
    })

    it("should reject non-positive price", () => {
      expect(() =>
        Schema.decodeSync(Stock)({
          symbol: "AAPL",
          name: "Apple Inc.",
          price: 0,
          previousClose: 148.0,
        })
      ).toThrow()
    })

    it("should reject non-positive previousClose", () => {
      expect(() =>
        Schema.decodeSync(Stock)({
          symbol: "AAPL",
          name: "Apple Inc.",
          price: 150.0,
          previousClose: -1,
        })
      ).toThrow()
    })
  })

  // ── Order ──
  describe("Order", () => {
    const validOrder = {
      id: "order-1",
      userId: "user-1",
      symbol: "AAPL",
      type: "buy" as const,
      quantity: 10,
      price: 150.0,
      status: "pending" as const,
      createdAt: new Date("2026-01-01"),
    }

    it("should decode valid buy order", () => {
      const order = Schema.decodeSync(Order)(validOrder)
      expect(order.type).toBe("buy")
      expect(order.quantity).toBe(10)
      expect(order.status).toBe("pending")
    })

    it("should decode valid sell order", () => {
      const order = Schema.decodeSync(Order)({ ...validOrder, type: "sell" })
      expect(order.type).toBe("sell")
    })

    it("should accept all valid statuses", () => {
      for (const status of ["pending", "filled", "cancelled"] as const) {
        const order = Schema.decodeSync(Order)({ ...validOrder, status })
        expect(order.status).toBe(status)
      }
    })

    it("should reject invalid order type", () => {
      expect(() =>
        Schema.decodeSync(Order)({ ...validOrder, type: "short" })
      ).toThrow()
    })

    it("should reject zero quantity", () => {
      expect(() =>
        Schema.decodeSync(Order)({ ...validOrder, quantity: 0 })
      ).toThrow()
    })

    it("should reject negative price", () => {
      expect(() =>
        Schema.decodeSync(Order)({ ...validOrder, price: -10 })
      ).toThrow()
    })

    it("should accept filledAt as optional", () => {
      const order = Schema.decodeSync(Order)({
        ...validOrder,
        status: "filled",
        filledAt: new Date("2026-01-02"),
      })
      expect(order.filledAt).toEqual(new Date("2026-01-02"))
    })
  })

  // ── OrderType / OrderStatus ──
  describe("OrderType", () => {
    it("should only accept buy or sell", () => {
      expect(Schema.decodeSync(OrderType)("buy")).toBe("buy")
      expect(Schema.decodeSync(OrderType)("sell")).toBe("sell")
      expect(() => Schema.decodeSync(OrderType)("hold")).toThrow()
    })
  })

  describe("OrderStatus", () => {
    it("should only accept pending, filled, cancelled", () => {
      expect(Schema.decodeSync(OrderStatus)("pending")).toBe("pending")
      expect(Schema.decodeSync(OrderStatus)("filled")).toBe("filled")
      expect(Schema.decodeSync(OrderStatus)("cancelled")).toBe("cancelled")
      expect(() => Schema.decodeSync(OrderStatus)("expired")).toThrow()
    })
  })

  // ── Holding ──
  describe("Holding", () => {
    it("should decode valid holding", () => {
      const holding = Schema.decodeSync(Holding)({
        symbol: "AAPL",
        quantity: 10,
        averagePrice: 145.5,
      })
      expect(holding.symbol).toBe("AAPL")
      expect(holding.quantity).toBe(10)
      expect(holding.averagePrice).toBe(145.5)
    })

    it("should reject zero quantity", () => {
      expect(() =>
        Schema.decodeSync(Holding)({
          symbol: "AAPL",
          quantity: 0,
          averagePrice: 145.5,
        })
      ).toThrow()
    })

    it("should reject non-positive averagePrice", () => {
      expect(() =>
        Schema.decodeSync(Holding)({
          symbol: "AAPL",
          quantity: 10,
          averagePrice: 0,
        })
      ).toThrow()
    })
  })
})
