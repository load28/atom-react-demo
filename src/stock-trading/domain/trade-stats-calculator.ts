import type { Order, StockSymbol } from "./model"

// ── Trade Pair: a buy matched with its corresponding sell ──
export interface TradePair {
  symbol: StockSymbol
  buyOrder: Order
  sellOrder: Order
  profit: number
  profitPercent: number
  holdingPeriodMs: number
}

// ── Aggregated Trade Statistics ──
export interface TradeStats {
  totalTrades: number
  winCount: number
  lossCount: number
  winRate: number
  totalProfit: number
  totalLoss: number
  netPnL: number
  avgProfit: number
  avgLoss: number
  profitFactor: number
  avgHoldingPeriodMs: number
  bestTrade: TradePair | null
  worstTrade: TradePair | null
  tradesBySymbol: Map<StockSymbol, { count: number; netPnL: number }>
}

// ── FIFO matching of filled buy/sell orders into trade pairs ──
export const matchOrdersToTradePairs = (orders: ReadonlyArray<Order>): TradePair[] => {
  const filled = orders.filter((o) => o.status === "filled")
  const buyQueues = new Map<StockSymbol, Order[]>()
  const pairs: TradePair[] = []

  // Sort by filledAt (or createdAt) for correct FIFO
  const sorted = [...filled].sort(
    (a, b) => (a.filledAt ?? a.createdAt).getTime() - (b.filledAt ?? b.createdAt).getTime(),
  )

  for (const order of sorted) {
    if (order.type === "buy") {
      const queue = buyQueues.get(order.symbol) ?? []
      queue.push(order)
      buyQueues.set(order.symbol, queue)
    } else {
      const queue = buyQueues.get(order.symbol)
      if (!queue || queue.length === 0) continue
      const buyOrder = queue.shift()!
      const quantity = Math.min(buyOrder.quantity, order.quantity)
      const profit = (order.price - buyOrder.price) * quantity
      const cost = buyOrder.price * quantity
      const profitPercent = cost === 0 ? 0 : (profit / cost) * 100
      const buyTime = (buyOrder.filledAt ?? buyOrder.createdAt).getTime()
      const sellTime = (order.filledAt ?? order.createdAt).getTime()

      pairs.push({
        symbol: order.symbol,
        buyOrder,
        sellOrder: order,
        profit,
        profitPercent,
        holdingPeriodMs: sellTime - buyTime,
      })
    }
  }

  return pairs
}

// ── Calculate aggregated trade statistics from pairs ──
export const calculateTradeStats = (pairs: TradePair[]): TradeStats => {
  if (pairs.length === 0) {
    return {
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netPnL: 0,
      avgProfit: 0,
      avgLoss: 0,
      profitFactor: 0,
      avgHoldingPeriodMs: 0,
      bestTrade: null,
      worstTrade: null,
      tradesBySymbol: new Map(),
    }
  }

  const wins = pairs.filter((p) => p.profit > 0)
  const losses = pairs.filter((p) => p.profit < 0)

  const totalProfit = wins.reduce((sum, p) => sum + p.profit, 0)
  const totalLoss = losses.reduce((sum, p) => sum + p.profit, 0)

  const tradesBySymbol = new Map<StockSymbol, { count: number; netPnL: number }>()
  for (const pair of pairs) {
    const entry = tradesBySymbol.get(pair.symbol) ?? { count: 0, netPnL: 0 }
    entry.count += 1
    entry.netPnL += pair.profit
    tradesBySymbol.set(pair.symbol, entry)
  }

  let bestTrade: TradePair | null = null
  let worstTrade: TradePair | null = null
  for (const pair of pairs) {
    if (!bestTrade || pair.profit > bestTrade.profit) bestTrade = pair
    if (!worstTrade || pair.profit < worstTrade.profit) worstTrade = pair
  }

  const totalHoldingMs = pairs.reduce((sum, p) => sum + p.holdingPeriodMs, 0)

  return {
    totalTrades: pairs.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate: calculateWinRate(pairs),
    totalProfit,
    totalLoss,
    netPnL: totalProfit + totalLoss,
    avgProfit: wins.length > 0 ? totalProfit / wins.length : 0,
    avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
    profitFactor: calculateProfitFactor(pairs),
    avgHoldingPeriodMs: totalHoldingMs / pairs.length,
    bestTrade,
    worstTrade,
    tradesBySymbol,
  }
}

// ── Win rate as percentage ──
export const calculateWinRate = (pairs: TradePair[]): number => {
  if (pairs.length === 0) return 0
  const wins = pairs.filter((p) => p.profit > 0).length
  return (wins / pairs.length) * 100
}

// ── Profit factor: |totalWins / totalLosses| ──
export const calculateProfitFactor = (pairs: TradePair[]): number => {
  const totalProfit = pairs.filter((p) => p.profit > 0).reduce((sum, p) => sum + p.profit, 0)
  const totalLoss = pairs.filter((p) => p.profit < 0).reduce((sum, p) => sum + p.profit, 0)

  if (totalLoss === 0 && totalProfit > 0) return Infinity
  if (totalLoss === 0) return 0
  return Math.abs(totalProfit / totalLoss)
}

// ── Human-readable holding period ──
export const formatHoldingPeriod = (ms: number): string => {
  const totalMinutes = Math.floor(ms / (1000 * 60))
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  if (totalDays > 0) {
    const remainingHours = totalHours % 24
    if (remainingHours > 0) return `${totalDays}일 ${remainingHours}시간`
    return `${totalDays}일`
  }

  if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60
    if (remainingMinutes > 0) return `${totalHours}시간 ${remainingMinutes}분`
    return `${totalHours}시간`
  }

  return `${totalMinutes}분`
}
