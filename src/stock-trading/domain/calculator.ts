import type { Holding, Stock, StockSymbol } from "./model"

// ── Holding P&L ──
export const calculateHoldingPnL = (holding: Holding, currentPrice: number) => ({
  unrealizedPnL: (currentPrice - holding.averagePrice) * holding.quantity,
  pnlPercent: ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100,
})

// ── Portfolio Value ──
export const calculatePortfolioValue = (
  holdings: ReadonlyArray<Holding>,
  prices: ReadonlyMap<StockSymbol, number>,
): number =>
  holdings.reduce((sum, h) => sum + (prices.get(h.symbol) ?? 0) * h.quantity, 0)

// ── Price Change ──
export const calculatePriceChange = (stock: Stock) => ({
  change: stock.price - stock.previousClose,
  changePercent: ((stock.price - stock.previousClose) / stock.previousClose) * 100,
})

// ── Total P&L ──
export const calculateTotalPnL = (
  holdings: ReadonlyArray<Holding>,
  prices: ReadonlyMap<StockSymbol, number>,
) => {
  const totalCost = holdings.reduce((sum, h) => sum + h.averagePrice * h.quantity, 0)
  const totalValue = calculatePortfolioValue(holdings, prices)
  const totalPnL = totalValue - totalCost
  return {
    totalPnL,
    totalCost,
    totalValue,
    totalPnLPercent: totalCost === 0 ? 0 : (totalPnL / totalCost) * 100,
  }
}
