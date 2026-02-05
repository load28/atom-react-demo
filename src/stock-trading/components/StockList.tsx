"use client"

import { useEffect } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { stocksWithChangeAtom, fetchStocksAtom } from "@/src/stock-trading/atoms/stock"

export const StockList = () => {
  const stocks = useAtomValue(stocksWithChangeAtom)
  const fetchStocks = useAtomSet(fetchStocksAtom)

  useEffect(() => { fetchStocks() }, [])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">시세</h2>
      </div>
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
    </div>
  )
}
