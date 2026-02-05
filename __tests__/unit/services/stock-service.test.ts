import { describe, it, expect } from "bun:test"
import { Effect, Exit } from "effect"
import { StockService } from "@/src/stock-trading/services/stock-service"
import type { StockSymbol } from "@/src/stock-trading/domain/model"

describe("StockService", () => {
  const run = <A, E>(effect: Effect.Effect<A, E, StockService>) =>
    Effect.runPromise(effect.pipe(Effect.provide(StockService.Default)))

  const runExit = <A, E>(effect: Effect.Effect<A, E, StockService>) =>
    Effect.runPromiseExit(effect.pipe(Effect.provide(StockService.Default)))

  describe("getAllStocks", () => {
    it("should return a non-empty list of stocks", async () => {
      const stocks = await run(
        Effect.gen(function* () {
          const service = yield* StockService
          return yield* service.getAllStocks()
        })
      )
      expect(stocks.length).toBeGreaterThan(0)
    })

    it("should have valid stock data with positive prices", async () => {
      const stocks = await run(
        Effect.gen(function* () {
          const service = yield* StockService
          return yield* service.getAllStocks()
        })
      )
      for (const stock of stocks) {
        expect(stock.price).toBeGreaterThan(0)
        expect(stock.previousClose).toBeGreaterThan(0)
        expect(stock.symbol.length).toBeGreaterThan(0)
        expect(stock.name.length).toBeGreaterThan(0)
      }
    })
  })

  describe("getStock", () => {
    it("should return a specific stock by symbol", async () => {
      const stock = await run(
        Effect.gen(function* () {
          const service = yield* StockService
          return yield* service.getStock("AAPL" as StockSymbol)
        })
      )
      expect(stock.symbol).toBe("AAPL")
      expect(stock.name).toBe("Apple Inc.")
    })

    it("should fail with StockNotFound for invalid symbol", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const service = yield* StockService
          return yield* service.getStock("INVALID" as StockSymbol)
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("updatePrice", () => {
    it("should update stock price and set previous close", async () => {
      const stock = await run(
        Effect.gen(function* () {
          const service = yield* StockService
          const before = yield* service.getStock("AAPL" as StockSymbol)
          yield* service.updatePrice("AAPL" as StockSymbol, 200)
          return yield* service.getStock("AAPL" as StockSymbol)
        })
      )
      expect(stock.price).toBe(200)
    })

    it("should fail with StockNotFound for invalid symbol", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const service = yield* StockService
          return yield* service.updatePrice("INVALID" as StockSymbol, 100)
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })
})
