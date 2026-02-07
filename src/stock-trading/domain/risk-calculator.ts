import type { Holding, StockSymbol } from "@/src/stock-trading/domain/model"

// ── Daily Returns ──
export const calculateDailyReturns = (priceHistory: number[]): number[] => {
  if (priceHistory.length < 2) return []
  return priceHistory.slice(1).map((price, i) => (price - priceHistory[i]) / priceHistory[i])
}

// ── Volatility (standard deviation of returns) ──
export const calculateVolatility = (priceHistory: number[]): number => {
  const returns = calculateDailyReturns(priceHistory)
  if (returns.length === 0) return 0

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance)
}

// ── Sharpe Ratio ──
export const calculateSharpeRatio = (returns: number[], riskFreeRate: number = 0): number => {
  if (returns.length === 0) return 0

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const mean = avgReturn
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) return 0
  return (avgReturn - riskFreeRate) / stdDev
}

// ── Max Drawdown ──
export const calculateMaxDrawdown = (
  priceHistory: number[],
): { mdd: number; peak: number; trough: number } => {
  if (priceHistory.length < 2) return { mdd: 0, peak: 0, trough: 0 }

  let maxPeak = priceHistory[0]
  let mdd = 0
  let mddPeak = priceHistory[0]
  let mddTrough = priceHistory[0]

  for (const price of priceHistory) {
    if (price > maxPeak) {
      maxPeak = price
    }
    const drawdown = (maxPeak - price) / maxPeak
    if (drawdown > mdd) {
      mdd = drawdown
      mddPeak = maxPeak
      mddTrough = price
    }
  }

  return { mdd, peak: mddPeak, trough: mddTrough }
}

// ── Position Weights ──
export const calculatePositionWeights = (
  holdings: ReadonlyArray<Holding>,
  prices: ReadonlyMap<StockSymbol, number>,
): Map<StockSymbol, number> => {
  const weights = new Map<StockSymbol, number>()
  if (holdings.length === 0) return weights

  const totalValue = holdings.reduce(
    (sum, h) => sum + (prices.get(h.symbol) ?? 0) * h.quantity,
    0,
  )

  if (totalValue === 0) return weights

  for (const h of holdings) {
    const value = (prices.get(h.symbol) ?? 0) * h.quantity
    weights.set(h.symbol, value / totalValue)
  }

  return weights
}

// ── Risk Level Assessment ──
export const assessRiskLevel = (volatility: number): "low" | "medium" | "high" => {
  if (volatility < 0.02) return "low"
  if (volatility < 0.05) return "medium"
  return "high"
}
