import { http, HttpResponse } from "msw"
import type { Stock, StockSymbol } from "@/src/stock-trading/domain/model"

const INITIAL_STOCKS: ReadonlyArray<Stock> = [
  { symbol: "AAPL" as StockSymbol, name: "Apple Inc.", price: 178.5, previousClose: 176.0 },
  { symbol: "GOOGL" as StockSymbol, name: "Alphabet Inc.", price: 141.8, previousClose: 140.2 },
  { symbol: "MSFT" as StockSymbol, name: "Microsoft Corp.", price: 378.9, previousClose: 375.0 },
  { symbol: "TSLA" as StockSymbol, name: "Tesla Inc.", price: 248.5, previousClose: 252.0 },
  { symbol: "AMZN" as StockSymbol, name: "Amazon.com Inc.", price: 185.6, previousClose: 183.0 },
]

let stocks = new Map<string, Stock>(INITIAL_STOCKS.map((s) => [s.symbol, { ...s }]))

export const resetStockData = () => {
  stocks = new Map<string, Stock>(INITIAL_STOCKS.map((s) => [s.symbol, { ...s }]))
}

export const handlers = [
  http.get("*/api/stocks", () => {
    return HttpResponse.json([...stocks.values()])
  }),

  http.get("*/api/stocks/:symbol", ({ params }) => {
    const symbol = params.symbol as string
    const stock = stocks.get(symbol)
    if (!stock) {
      return HttpResponse.json({ error: "Stock not found" }, { status: 404 })
    }
    return HttpResponse.json(stock)
  }),

  http.put("*/api/stocks/:symbol/price", async ({ params, request }) => {
    const symbol = params.symbol as string
    const stock = stocks.get(symbol)
    if (!stock) {
      return HttpResponse.json({ error: "Stock not found" }, { status: 404 })
    }
    const body = (await request.json()) as { price: number }
    const updated: Stock = {
      ...stock,
      previousClose: stock.price,
      price: body.price,
    }
    stocks.set(symbol, updated)
    return HttpResponse.json(updated)
  }),
]
