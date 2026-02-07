import type { Holding, Order, Stock, StockSymbol } from "./model"

// ── Holding P&L ──
export const calculateHoldingPnL = (holding: Holding, currentPrice: number) => ({
  unrealizedPnL: (currentPrice - holding.averagePrice) * holding.quantity,
  pnlPercent: holding.averagePrice === 0 ? 0 : ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100,
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
  changePercent: stock.previousClose === 0 ? 0 : ((stock.price - stock.previousClose) / stock.previousClose) * 100,
})

// ── 주문 매칭 조건 평가 (순수 함수) ──
// 현재 가격이 주문의 체결 조건을 만족하는지 평가한다.
// limit buy: 현재가 ≤ 지정가 (싸게 살 수 있을 때)
// limit sell: 현재가 ≥ 지정가 (비싸게 팔 수 있을 때)
// stop buy: 현재가 ≥ 스탑가 (상승 돌파 시 매수)
// stop sell: 현재가 ≤ 스탑가 (하락 돌파 시 매도)
// stop_limit buy: 현재가 ≥ 스탑가 AND 현재가 ≤ 지정가
// stop_limit sell: 현재가 ≤ 스탑가 AND 현재가 ≥ 지정가
export const shouldFillOrder = (order: Order, currentPrice: number): boolean => {
  if (order.status !== "pending") return false

  if (order.expiresAt && order.expiresAt.getTime() < Date.now()) return false

  switch (order.executionType) {
    case "market":
      return true
    case "limit":
      return order.type === "buy"
        ? currentPrice <= (order.limitPrice ?? Infinity)
        : currentPrice >= (order.limitPrice ?? 0)
    case "stop":
      return order.type === "buy"
        ? currentPrice >= (order.stopPrice ?? 0)
        : currentPrice <= (order.stopPrice ?? Infinity)
    case "stop_limit":
      if (order.type === "buy") {
        return currentPrice >= (order.stopPrice ?? 0) && currentPrice <= (order.limitPrice ?? Infinity)
      }
      return currentPrice <= (order.stopPrice ?? Infinity) && currentPrice >= (order.limitPrice ?? 0)
    default:
      return false
  }
}

// ── 주문 만료 여부 평가 ──
export const isOrderExpired = (order: Order): boolean =>
  order.status === "pending" && !!order.expiresAt && order.expiresAt.getTime() < Date.now()

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
