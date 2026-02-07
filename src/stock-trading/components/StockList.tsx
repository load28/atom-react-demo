"use client"

import { useAtomValue, useAtomRefresh } from "@effect-atom/atom-react/Hooks"
import * as Result from "@effect-atom/atom/Result"
import { stocksWithChangeAtom, fetchStocksAtom } from "@/src/stock-trading/atoms/stock"
import { wsStatusAtom, priceFlashAtom } from "@/src/stock-trading/atoms/stock-feed"

const STATUS_LABEL: Record<string, string> = {
  connected: "실시간",
  connecting: "연결 중...",
  reconnecting: "재연결 중...",
  disconnected: "연결 끊김",
}

const STATUS_COLOR: Record<string, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500",
  reconnecting: "bg-yellow-500",
  disconnected: "bg-gray-400",
}

export const StockList = () => {
  const result = useAtomValue(fetchStocksAtom)
  const stocks = useAtomValue(stocksWithChangeAtom)
  const refresh = useAtomRefresh(fetchStocksAtom)
  const wsStatus = useAtomValue(wsStatusAtom)
  const flash = useAtomValue(priceFlashAtom)

  const isWaiting = Result.isWaiting(result)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">시세</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className={`inline-block w-2 h-2 rounded-full ${STATUS_COLOR[wsStatus] ?? "bg-gray-400"} ${wsStatus === "connected" ? "animate-pulse" : ""}`}
              role="img"
              aria-label={`연결 상태: ${STATUS_LABEL[wsStatus] ?? wsStatus}`}
            />
            {STATUS_LABEL[wsStatus] ?? wsStatus}
          </span>
        </div>
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
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목</th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">현재가</th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">변동</th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">변동률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stocks.map((stock) => {
                const flashDir = flash.get(stock.symbol)
                const flashClass = flashDir === "up"
                  ? "animate-[flash-up_0.6s_ease-out]"
                  : flashDir === "down"
                    ? "animate-[flash-down_0.6s_ease-out]"
                    : ""

                return (
                  <tr
                    key={stock.symbol}
                    data-testid={`stock-row-${stock.symbol}`}
                    className={`hover:bg-gray-50 transition-colors ${flashClass}`}
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900">{stock.symbol}</div>
                      <div className="text-xs text-gray-500">{stock.name}</div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      ₩{stock.price.toLocaleString("ko-KR")}
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${stock.change >= 0 ? "text-red-500" : "text-blue-500"}`}>
                      {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(1)}
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${stock.changePercent >= 0 ? "text-red-500" : "text-blue-500"}`}>
                      {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
