import { Effect, Ref, HashMap, Option } from "effect"
import type { Stock, StockSymbol } from "@/src/stock-trading/domain/model"
import { StockNotFound } from "@/src/stock-trading/domain/errors"

const INITIAL_STOCKS: ReadonlyArray<Stock> = [
  { symbol: "AAPL" as StockSymbol, name: "Apple Inc.", price: 178.5, previousClose: 176.0 },
  { symbol: "GOOGL" as StockSymbol, name: "Alphabet Inc.", price: 141.8, previousClose: 140.2 },
  { symbol: "MSFT" as StockSymbol, name: "Microsoft Corp.", price: 378.9, previousClose: 375.0 },
  { symbol: "TSLA" as StockSymbol, name: "Tesla Inc.", price: 248.5, previousClose: 252.0 },
  { symbol: "AMZN" as StockSymbol, name: "Amazon.com Inc.", price: 185.6, previousClose: 183.0 },
]

export class StockService extends Effect.Service<StockService>()("StockService", {
  effect: Effect.gen(function* () {
    const store = yield* Ref.make(
      HashMap.fromIterable(INITIAL_STOCKS.map((s) => [s.symbol, s] as const))
    )

    const getAllStocks = () =>
      Effect.map(Ref.get(store), (map) => [...HashMap.values(map)])

    const getStock = (symbol: StockSymbol) =>
      Effect.flatMap(Ref.get(store), (map) =>
        Option.match(HashMap.get(map, symbol), {
          onNone: () => Effect.fail(new StockNotFound({ symbol })),
          onSome: Effect.succeed,
        })
      )

    const updatePrice = (symbol: StockSymbol, newPrice: number) =>
      Effect.gen(function* () {
        const stock = yield* getStock(symbol)
        const updated: Stock = { ...stock, previousClose: stock.price, price: newPrice }
        yield* Ref.update(store, HashMap.set(symbol, updated))
        return updated
      })

    return { getAllStocks, getStock, updatePrice } as const
  }),
}) {}
