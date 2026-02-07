"use client"

import { useAtomValue } from "@effect-atom/atom-react/Hooks"
import { currentUserAtom } from "@/src/stock-trading/atoms/auth"
import { holdingsAtom, portfolioPnLAtom } from "@/src/stock-trading/atoms/portfolio"

export const PortfolioView = () => {
  const currentUser = useAtomValue(currentUserAtom)
  const holdings = useAtomValue(holdingsAtom)
  const pnl = useAtomValue(portfolioPnLAtom)

  if (!currentUser) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">포트폴리오</h2>
      </div>

      <div className="p-5 grid grid-cols-2 gap-4" data-testid="portfolio-summary">
        <div className="space-y-1">
          <span className="text-xs text-gray-500">총 평가금액</span>
          <div className="text-sm font-bold text-gray-900">₩{pnl.totalValue.toLocaleString("ko-KR")}</div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-gray-500">총 투자금액</span>
          <div className="text-sm font-medium text-gray-700">₩{pnl.totalCost.toLocaleString("ko-KR")}</div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-gray-500">총 손익</span>
          <div className={`text-sm font-bold ${pnl.totalPnL >= 0 ? "text-red-500" : "text-blue-500"}`}>
            {pnl.totalPnL >= 0 ? "+" : ""}₩{pnl.totalPnL.toLocaleString("ko-KR")}
            <span className="text-xs ml-1">({pnl.totalPnLPercent.toFixed(2)}%)</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-gray-500">보유 현금</span>
          <div className="text-sm font-medium text-gray-700">₩{currentUser.balance.toLocaleString("ko-KR")}</div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">보유 종목</h3>
      </div>
      {holdings.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400 text-center" data-testid="empty-holdings">
          보유 종목이 없습니다
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">종목</th>
                <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
                <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">평균단가</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {holdings.map((h) => (
                <tr key={h.symbol} data-testid={`holding-row-${h.symbol}`}>
                  <td className="px-5 py-2 text-sm font-medium text-gray-900">{h.symbol}</td>
                  <td className="px-5 py-2 text-sm text-right text-gray-700">{h.quantity}</td>
                  <td className="px-5 py-2 text-sm text-right text-gray-700">₩{h.averagePrice.toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
