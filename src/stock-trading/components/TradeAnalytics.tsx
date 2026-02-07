"use client"

import { useAtomValue } from "@effect-atom/atom-react/Hooks"
import { tradeStatsAtom, tradePairsAtom } from "@/src/stock-trading/atoms/trade-stats"
import { formatHoldingPeriod } from "@/src/stock-trading/domain/trade-stats-calculator"

export const TradeAnalytics = () => {
  const stats = useAtomValue(tradeStatsAtom)
  const pairs = useAtomValue(tradePairsAtom)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">거래 성과 분석</h2>
      </div>

      {stats.totalTrades === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center" data-testid="empty-trades">
          거래 내역이 없습니다
        </p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="trade-summary">
            <div className="space-y-1">
              <span className="text-xs text-gray-500">총 거래 수</span>
              <div className="text-sm font-bold text-gray-900">{stats.totalTrades}건</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500">승률</span>
              <div className={`text-sm font-bold ${stats.winRate >= 50 ? "text-green-600" : "text-red-500"}`}>
                {stats.winRate.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500">순 손익</span>
              <div className={`text-sm font-bold ${stats.netPnL >= 0 ? "text-green-600" : "text-red-500"}`}>
                {stats.netPnL >= 0 ? "+" : ""}₩{stats.netPnL.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500">수익 팩터</span>
              <div className="text-sm font-bold text-gray-900">
                {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Best / Worst Trade */}
          <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.bestTrade && (
              <div className="p-3 rounded-md bg-green-50 border border-green-200" data-testid="best-trade">
                <span className="text-xs font-medium text-green-700">최고 거래</span>
                <div className="mt-1 text-sm font-semibold text-green-600">
                  {stats.bestTrade.symbol} +₩{stats.bestTrade.profit.toLocaleString()}
                  <span className="text-xs ml-1">(+{stats.bestTrade.profitPercent.toFixed(1)}%)</span>
                </div>
              </div>
            )}
            {stats.worstTrade && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200" data-testid="worst-trade">
                <span className="text-xs font-medium text-red-700">최악 거래</span>
                <div className="mt-1 text-sm font-semibold text-red-500">
                  {stats.worstTrade.symbol} ₩{stats.worstTrade.profit.toLocaleString()}
                  <span className="text-xs ml-1">({stats.worstTrade.profitPercent.toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </div>

          {/* Per-Symbol Breakdown */}
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">종목별 성과</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">종목</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">거래 수</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">순 손익</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...stats.tradesBySymbol.entries()].map(([symbol, data]) => (
                  <tr key={symbol} data-testid={`symbol-row-${symbol}`}>
                    <td className="px-5 py-2 text-sm font-medium text-gray-900">{symbol}</td>
                    <td className="px-5 py-2 text-sm text-right text-gray-700">{data.count}건</td>
                    <td className={`px-5 py-2 text-sm text-right font-medium ${data.netPnL >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {data.netPnL >= 0 ? "+" : ""}₩{data.netPnL.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Trade Pairs */}
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">최근 거래 내역</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">종목</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">매수가</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">매도가</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">손익</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">보유 기간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...pairs].reverse().slice(0, 10).map((pair, i) => (
                  <tr key={`${pair.buyOrder.id}-${pair.sellOrder.id}`} data-testid={`trade-pair-${i}`}>
                    <td className="px-5 py-2 text-sm font-medium text-gray-900">{pair.symbol}</td>
                    <td className="px-5 py-2 text-sm text-right text-gray-700">₩{pair.buyOrder.price.toLocaleString()}</td>
                    <td className="px-5 py-2 text-sm text-right text-gray-700">₩{pair.sellOrder.price.toLocaleString()}</td>
                    <td className={`px-5 py-2 text-sm text-right font-medium ${pair.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {pair.profit >= 0 ? "+" : ""}₩{pair.profit.toLocaleString()}
                      <span className="text-xs ml-1">({pair.profitPercent.toFixed(1)}%)</span>
                    </td>
                    <td className="px-5 py-2 text-sm text-right text-gray-500">
                      {formatHoldingPeriod(pair.holdingPeriodMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
