import { Effect } from "effect"
import type { Stock, StockSymbol } from "@/src/stock-trading/domain/model"
import { StockNotFound, ApiError } from "@/src/stock-trading/domain/errors"

const API_BASE =
  typeof window !== "undefined" && window.location?.protocol?.startsWith("http")
    ? ""
    : "http://localhost"

export class StockService extends Effect.Service<StockService>()("StockService", {
  effect: Effect.gen(function* () {
    const getAllStocks = () =>
      Effect.gen(function* () {
        const res = yield* Effect.tryPromise({
          try: () => fetch(`${API_BASE}/api/stocks`),
          catch: (e) => new ApiError({ message: String(e) }),
        })
        if (!res.ok) {
          return yield* Effect.fail(new ApiError({ message: `HTTP ${res.status}` }))
        }
        return yield* Effect.tryPromise({
          try: () => res.json() as Promise<ReadonlyArray<Stock>>,
          catch: (e) => new ApiError({ message: String(e) }),
        })
      })

    const getStock = (symbol: StockSymbol) =>
      Effect.gen(function* () {
        const res = yield* Effect.tryPromise({
          try: () => fetch(`${API_BASE}/api/stocks/${symbol}`),
          catch: () => new StockNotFound({ symbol }),
        })
        if (!res.ok) {
          return yield* Effect.fail(new StockNotFound({ symbol }))
        }
        return yield* Effect.tryPromise({
          try: () => res.json() as Promise<Stock>,
          catch: () => new StockNotFound({ symbol }),
        })
      })

    const updatePrice = (symbol: StockSymbol, newPrice: number) =>
      Effect.gen(function* () {
        const res = yield* Effect.tryPromise({
          try: () =>
            fetch(`${API_BASE}/api/stocks/${symbol}/price`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ price: newPrice }),
            }),
          catch: () => new StockNotFound({ symbol }),
        })
        if (!res.ok) {
          return yield* Effect.fail(new StockNotFound({ symbol }))
        }
        return yield* Effect.tryPromise({
          try: () => res.json() as Promise<Stock>,
          catch: () => new StockNotFound({ symbol }),
        })
      })

    return { getAllStocks, getStock, updatePrice } as const
  }),
}) {}
