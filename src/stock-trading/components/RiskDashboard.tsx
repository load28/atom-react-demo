"use client"

import { useAtomValue } from "@effect-atom/atom-react/Hooks"
import { holdingsAtom } from "@/src/stock-trading/atoms/portfolio"
import { volatilityMapAtom, portfolioRiskAtom, maxDrawdownAtom } from "@/src/stock-trading/atoms/risk"
import type { StockSymbol } from "@/src/stock-trading/domain/model"

const RISK_BADGE: Record<"low" | "medium" | "high", { label: string; bg: string; text: string }> = {
  low: { label: "낮음", bg: "bg-green-100", text: "text-green-700" },
  medium: { label: "보통", bg: "bg-yellow-100", text: "text-yellow-700" },
  high: { label: "높음", bg: "bg-red-100", text: "text-red-700" },
}

const BAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
]

export const RiskDashboard = () => {
  const holdings = useAtomValue(holdingsAtom)
  const volatilities = useAtomValue(volatilityMapAtom)
  const risk = useAtomValue(portfolioRiskAtom)
  const drawdowns = useAtomValue(maxDrawdownAtom)

  if (holdings.length === 0) return null

  const badge = RISK_BADGE[risk.riskLevel]
  const symbols = Array.from(risk.weights.keys()) as StockSymbol[]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">리스크 대시보드</h2>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
          리스크: {badge.label}
        </span>
      </div>

      {/* 포트폴리오 변동성 요약 */}
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-xs text-gray-500">포트폴리오 변동성</span>
        <div className="text-sm font-bold text-gray-900 mt-1">
          {(risk.portfolioVolatility * 100).toFixed(2)}%
        </div>
      </div>

      {/* 포지션 비중 (컬러 바) */}
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">포지션 비중</h3>
        <div className="flex w-full h-4 rounded-full overflow-hidden">
          {symbols.map((symbol, i) => {
            const weight = risk.weights.get(symbol) ?? 0
            return (
              <div
                key={symbol}
                className={`${BAR_COLORS[i % BAR_COLORS.length]} transition-all`}
                style={{ width: `${(weight * 100).toFixed(1)}%` }}
                title={`${symbol}: ${(weight * 100).toFixed(1)}%`}
              />
            )
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {symbols.map((symbol, i) => {
            const weight = risk.weights.get(symbol) ?? 0
            return (
              <div key={symbol} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`inline-block w-2.5 h-2.5 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                {symbol} {(weight * 100).toFixed(1)}%
              </div>
            )
          })}
        </div>
      </div>

      {/* 종목별 변동성 & 최대 낙폭 */}
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">종목별 리스크 지표</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th scope="col" className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">종목</th>
              <th scope="col" className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">변동성</th>
              <th scope="col" className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">MDD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {symbols.map((symbol) => {
              const vol = volatilities.get(symbol) ?? 0
              const dd = drawdowns.get(symbol)
              return (
                <tr key={symbol}>
                  <td className="px-5 py-2 text-sm font-medium text-gray-900">{symbol}</td>
                  <td className="px-5 py-2 text-sm text-right text-gray-700">
                    {(vol * 100).toFixed(2)}%
                  </td>
                  <td className="px-5 py-2 text-sm text-right text-gray-700">
                    {dd ? `${(dd.mdd * 100).toFixed(2)}%` : "-"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
