import { describe, it, expect } from "bun:test"
import { Effect, Exit } from "effect"
import { AlertService } from "@/src/stock-trading/services/alert-service"
import type { StockSymbol } from "@/src/stock-trading/domain/model"
import type { WatchlistId, AlertId } from "@/src/stock-trading/domain/watchlist-model"

describe("AlertService", () => {
  const run = <A, E>(effect: Effect.Effect<A, E, AlertService>) =>
    Effect.runPromise(effect.pipe(Effect.provide(AlertService.Default)))

  const runExit = <A, E>(effect: Effect.Effect<A, E, AlertService>) =>
    Effect.runPromiseExit(effect.pipe(Effect.provide(AlertService.Default)))

  // ── Watchlist CRUD ──
  describe("createWatchlist", () => {
    it("should create a watchlist with name and symbols", async () => {
      const wl = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          return yield* service.createWatchlist("My Watchlist", ["AAPL", "GOOGL"])
        }),
      )
      expect(wl.name).toBe("My Watchlist")
      expect(wl.symbols).toEqual(["AAPL", "GOOGL"])
      expect(wl.id).toBeTruthy()
    })
  })

  describe("deleteWatchlist", () => {
    it("should delete an existing watchlist", async () => {
      const result = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          const wl = yield* service.createWatchlist("To Delete", ["AAPL"])
          yield* service.deleteWatchlist(wl.id)
          return yield* service.getWatchlists()
        }),
      )
      expect(result.length).toBe(0)
    })

    it("should fail when deleting non-existent watchlist", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const service = yield* AlertService
          return yield* service.deleteWatchlist("nonexistent" as WatchlistId)
        }),
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("addSymbolToWatchlist", () => {
    it("should add a symbol to a watchlist", async () => {
      const updated = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          const wl = yield* service.createWatchlist("Test", ["AAPL"])
          return yield* service.addSymbolToWatchlist(wl.id, "GOOGL")
        }),
      )
      expect(updated.symbols).toEqual(["AAPL", "GOOGL"])
    })

    it("should fail on duplicate symbol", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const service = yield* AlertService
          const wl = yield* service.createWatchlist("Test", ["AAPL"])
          return yield* service.addSymbolToWatchlist(wl.id, "AAPL")
        }),
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("removeSymbolFromWatchlist", () => {
    it("should remove a symbol from a watchlist", async () => {
      const updated = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          const wl = yield* service.createWatchlist("Test", ["AAPL", "GOOGL"])
          return yield* service.removeSymbolFromWatchlist(wl.id, "AAPL")
        }),
      )
      expect(updated.symbols).toEqual(["GOOGL"])
    })
  })

  // ── Alert CRUD ──
  describe("createAlert", () => {
    it("should create an active alert", async () => {
      const alert = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          return yield* service.createAlert("AAPL" as StockSymbol, "price_above", 200)
        }),
      )
      expect(alert.symbol).toBe("AAPL")
      expect(alert.conditionType).toBe("price_above")
      expect(alert.targetValue).toBe(200)
      expect(alert.status).toBe("active")
    })
  })

  describe("evaluateAlerts", () => {
    it("should trigger matching alerts", async () => {
      const result = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          yield* service.createAlert("AAPL" as StockSymbol, "price_above", 150)
          yield* service.createAlert("GOOGL" as StockSymbol, "price_below", 100)

          const prices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 200],
            ["GOOGL" as StockSymbol, 80],
          ])
          const previousCloses = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 145],
            ["GOOGL" as StockSymbol, 110],
          ])

          return yield* service.evaluateAlerts(prices, previousCloses)
        }),
      )
      expect(result.triggered.length).toBe(2)
      expect(result.triggered[0].status).toBe("triggered")
      expect(result.triggered[1].status).toBe("triggered")
    })

    it("should not trigger non-matching alerts", async () => {
      const result = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          yield* service.createAlert("AAPL" as StockSymbol, "price_above", 300)

          const prices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 150],
          ])
          const previousCloses = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 140],
          ])

          return yield* service.evaluateAlerts(prices, previousCloses)
        }),
      )
      expect(result.triggered.length).toBe(0)
    })

    it("should skip alerts for symbols not in price map", async () => {
      const result = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          yield* service.createAlert("UNKNOWN" as StockSymbol, "price_above", 100)

          const prices = new Map<StockSymbol, number>()
          const previousCloses = new Map<StockSymbol, number>()

          return yield* service.evaluateAlerts(prices, previousCloses)
        }),
      )
      expect(result.triggered.length).toBe(0)
    })
  })

  describe("dismissAlert", () => {
    it("should dismiss a triggered alert", async () => {
      const dismissed = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          const alert = yield* service.createAlert("AAPL" as StockSymbol, "price_above", 100)

          // Trigger the alert
          const prices = new Map<StockSymbol, number>([["AAPL" as StockSymbol, 200]])
          const previousCloses = new Map<StockSymbol, number>([["AAPL" as StockSymbol, 90]])
          yield* service.evaluateAlerts(prices, previousCloses)

          return yield* service.dismissAlert(alert.id)
        }),
      )
      expect(dismissed.status).toBe("dismissed")
    })

    it("should fail when dismissing non-existent alert", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const service = yield* AlertService
          return yield* service.dismissAlert("nonexistent" as AlertId)
        }),
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("getActiveAlerts", () => {
    it("should return only active alerts", async () => {
      const active = await run(
        Effect.gen(function* () {
          const service = yield* AlertService
          yield* service.createAlert("AAPL" as StockSymbol, "price_above", 100)
          yield* service.createAlert("GOOGL" as StockSymbol, "price_below", 50)

          // Trigger one alert
          const prices = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 200],
            ["GOOGL" as StockSymbol, 100],
          ])
          const previousCloses = new Map<StockSymbol, number>([
            ["AAPL" as StockSymbol, 90],
            ["GOOGL" as StockSymbol, 90],
          ])
          yield* service.evaluateAlerts(prices, previousCloses)

          return yield* service.getActiveAlerts()
        }),
      )
      // AAPL alert triggered (price 200 > 100), GOOGL alert stays active (price 100 not < 50)
      expect(active.length).toBe(1)
      expect(active[0].symbol).toBe("GOOGL")
    })
  })
})
