"use client"

import { useAtomValue, useAtomRefresh } from "@effect-atom/atom-react/Hooks"
import * as Result from "@effect-atom/atom/Result"
import { stocksWithChangeAtom, fetchStocksAtom } from "@/src/stock-trading/atoms/stock"

export const StockList = () => {
  const result = useAtomValue(fetchStocksAtom)
  const stocks = useAtomValue(stocksWithChangeAtom)
  const refresh = useAtomRefresh(fetchStocksAtom)

  const isWaiting = Result.isWaiting(result)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">시세</h2>
        <div className="flex items-center gap-2">
          {isWaiting && <span className="text-xs text-gray-400">갱신 중...</span>}
          {Result.isSuccess(result) && !isWaiting && (
            <button
              onClick={refresh}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              새로고침
            </button>
          )}
        </div>
      </div>

      {Result.isFailure(result) && stocks.length === 0 && !isWaiting && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-red-500">시세 정보를 불러올 수 없습니다</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {Result.isInitial(result) && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">시세 정보를 불러오는 중...</p>
        </div>
      )}

      {stocks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">현재가</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">변동</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">변동률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stocks.map((stock) => (
                <tr key={stock.symbol} data-testid={`stock-row-${stock.symbol}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900">{stock.symbol}</div>
                    <div className="text-xs text-gray-500">{stock.name}</div>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    ₩{stock.price.toLocaleString()}
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${stock.change >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(1)}
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${stock.changePercent >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
