import { Effect } from "effect"
import type { UserId, StockSymbol, Holding } from "@/src/stock-trading/domain/model"
import { StockNotFound } from "@/src/stock-trading/domain/errors"
import { calculateHoldingPnL, calculatePortfolioValue } from "@/src/stock-trading/domain/calculator"
import { TradingService } from "./trading-service"
import { AuthService } from "./auth-service"

export class PortfolioService extends Effect.Service<PortfolioService>()("PortfolioService", {
  effect: Effect.gen(function* () {
    const getPortfolioSummary = (userId: UserId, priceMap: Map<StockSymbol, number>) =>
      Effect.gen(function* () {
        const trading = yield* TradingService
        const authService = yield* AuthService
        const holdingsList = yield* trading.getHoldings(userId)

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

    const getHoldingDetail = (userId: UserId, symbol: StockSymbol, currentPrice: number) =>
      Effect.gen(function* () {
        const trading = yield* TradingService
        const holdingsList = yield* trading.getHoldings(userId)
        const found = holdingsList.find((h) => h.symbol === symbol)

        if (!found) {
          return yield* Effect.fail(new StockNotFound({ symbol }))
        }

        const pnl = calculateHoldingPnL(found, currentPrice)

        return {
          symbol: found.symbol,
          quantity: found.quantity,
          averagePrice: found.averagePrice,
          currentPrice,
          ...pnl,
        }
      })

    return { getPortfolioSummary, getHoldingDetail } as const
  }),
}) {}
