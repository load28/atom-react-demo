import { Effect } from "effect"
import type { UserId, StockSymbol, Holding } from "@/src/stock-trading/domain/model"
import { StockNotFound } from "@/src/stock-trading/domain/errors"
import { calculateHoldingPnL, calculatePortfolioValue } from "@/src/stock-trading/domain/calculator"
import { StockService } from "./stock-service"
import { TradingService } from "./trading-service"
import { AuthService } from "./auth-service"

export class PortfolioService extends Effect.Service<PortfolioService>()("PortfolioService", {
  effect: Effect.gen(function* () {
    const getPortfolioSummary = (userId: UserId) =>
      Effect.gen(function* () {
        const trading = yield* TradingService
        const stockService = yield* StockService
        const authService = yield* AuthService
        const holdingsList = yield* trading.getHoldings(userId)
        const allStocks = yield* stockService.getAllStocks()
        const priceMap = new Map(allStocks.map((s) => [s.symbol, s.price])) as Map<StockSymbol, number>

        const totalValue = calculatePortfolioValue(holdingsList, priceMap)
        const totalCost = holdingsList.reduce((sum, h) => sum + h.averagePrice * h.quantity, 0)
        const totalPnL = totalValue - totalCost
        const cashBalance = yield* authService.getBalance(userId)

        return {
          holdings: holdingsList,
          totalValue,
          totalCost,
          totalPnL,
          totalPnLPercent: totalCost === 0 ? 0 : (totalPnL / totalCost) * 100,
          cashBalance,
        }
      })

    const getHoldingDetail = (userId: UserId, symbol: StockSymbol) =>
      Effect.gen(function* () {
        const trading = yield* TradingService
        const stockService = yield* StockService
        const holdingsList = yield* trading.getHoldings(userId)
        const found = holdingsList.find((h) => h.symbol === symbol)

        if (!found) {
          return yield* Effect.fail(new StockNotFound({ symbol }))
        }

        const stock = yield* stockService.getStock(symbol)
        const pnl = calculateHoldingPnL(found, stock.price)

        return {
          symbol: found.symbol,
          quantity: found.quantity,
          averagePrice: found.averagePrice,
          currentPrice: stock.price,
          ...pnl,
        }
      })

    return { getPortfolioSummary, getHoldingDetail } as const
  }),
}) {}
