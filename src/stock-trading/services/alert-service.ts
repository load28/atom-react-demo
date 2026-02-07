import { Effect, Ref, HashMap } from "effect"
import type { StockSymbol } from "@/src/stock-trading/domain/model"
import {
  type WatchlistId,
  type AlertId,
  type AlertConditionType,
  type Alert,
  type Watchlist,
  evaluateAlertCondition,
} from "@/src/stock-trading/domain/watchlist-model"
import {
  WatchlistNotFound,
  AlertNotFound,
  DuplicateSymbolInWatchlist,
} from "@/src/stock-trading/domain/watchlist-errors"

let watchlistCounter = 0
const nextWatchlistId = (): WatchlistId => `watchlist-${++watchlistCounter}` as WatchlistId

let alertCounter = 0
const nextAlertId = (): AlertId => `alert-${++alertCounter}` as AlertId

export class AlertService extends Effect.Service<AlertService>()("AlertService", {
  effect: Effect.gen(function* () {
    const watchlists = yield* Ref.make(HashMap.empty<WatchlistId, Watchlist>())
    const alerts = yield* Ref.make(HashMap.empty<AlertId, Alert>())

    const createWatchlist = (name: string, symbols: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const watchlist: Watchlist = {
          id: nextWatchlistId(),
          name: name as Watchlist["name"],
          symbols: symbols as unknown as Watchlist["symbols"],
          createdAt: new Date(),
        }
        yield* Ref.update(watchlists, HashMap.set(watchlist.id, watchlist))
        return watchlist
      })

    const deleteWatchlist = (id: WatchlistId) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(watchlists)
        const existing = HashMap.get(map, id)
        if (existing._tag === "None") {
          return yield* Effect.fail(new WatchlistNotFound({ id }))
        }
        yield* Ref.update(watchlists, HashMap.remove(id))
        return existing.value
      })

    const addSymbolToWatchlist = (watchlistId: WatchlistId, symbol: string) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(watchlists)
        const existing = HashMap.get(map, watchlistId)
        if (existing._tag === "None") {
          return yield* Effect.fail(new WatchlistNotFound({ id: watchlistId }))
        }
        const wl = existing.value
        if (wl.symbols.some((s) => s === symbol)) {
          return yield* Effect.fail(new DuplicateSymbolInWatchlist({ symbol }))
        }
        const updated: Watchlist = {
          ...wl,
          symbols: [...wl.symbols, symbol as StockSymbol],
        }
        yield* Ref.update(watchlists, HashMap.set(watchlistId, updated))
        return updated
      })

    const removeSymbolFromWatchlist = (watchlistId: WatchlistId, symbol: string) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(watchlists)
        const existing = HashMap.get(map, watchlistId)
        if (existing._tag === "None") {
          return yield* Effect.fail(new WatchlistNotFound({ id: watchlistId }))
        }
        const wl = existing.value
        const updated: Watchlist = {
          ...wl,
          symbols: wl.symbols.filter((s) => s !== symbol),
        }
        yield* Ref.update(watchlists, HashMap.set(watchlistId, updated))
        return updated
      })

    const getWatchlists = () =>
      Effect.map(Ref.get(watchlists), (map) => [...HashMap.values(map)])

    const createAlert = (symbol: StockSymbol, conditionType: AlertConditionType, targetValue: number) =>
      Effect.gen(function* () {
        const alert: Alert = {
          id: nextAlertId(),
          symbol,
          conditionType,
          targetValue,
          status: "active",
          createdAt: new Date(),
        }
        yield* Ref.update(alerts, HashMap.set(alert.id, alert))
        return alert
      })

    const dismissAlert = (alertId: AlertId) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(alerts)
        const existing = HashMap.get(map, alertId)
        if (existing._tag === "None") {
          return yield* Effect.fail(new AlertNotFound({ id: alertId }))
        }
        const updated: Alert = { ...existing.value, status: "dismissed" }
        yield* Ref.update(alerts, HashMap.set(alertId, updated))
        return updated
      })

    const getActiveAlerts = () =>
      Effect.map(Ref.get(alerts), (map) =>
        [...HashMap.values(map)].filter((a) => a.status === "active"),
      )

    const getAllAlerts = () =>
      Effect.map(Ref.get(alerts), (map) => [...HashMap.values(map)])

    const evaluateAlerts = (
      prices: Map<StockSymbol, number>,
      previousCloses: Map<StockSymbol, number>,
    ) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(alerts)
        const activeAlerts = [...HashMap.values(map)].filter((a) => a.status === "active")
        const triggered: Alert[] = []

        for (const alert of activeAlerts) {
          const currentPrice = prices.get(alert.symbol)
          const previousClose = previousCloses.get(alert.symbol)
          if (currentPrice === undefined || previousClose === undefined) continue

          if (evaluateAlertCondition(alert, currentPrice, previousClose)) {
            const updated: Alert = {
              ...alert,
              status: "triggered",
              triggeredAt: new Date(),
            }
            yield* Ref.update(alerts, HashMap.set(alert.id, updated))
            triggered.push(updated)
          }
        }

        return { triggered }
      })

    return {
      createWatchlist,
      deleteWatchlist,
      addSymbolToWatchlist,
      removeSymbolFromWatchlist,
      getWatchlists,
      createAlert,
      dismissAlert,
      getActiveAlerts,
      getAllAlerts,
      evaluateAlerts,
    } as const
  }),
}) {}
