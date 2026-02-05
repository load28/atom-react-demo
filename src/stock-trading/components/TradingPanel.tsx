"use client"

import { useState } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { Exit } from "effect"
import type { StockSymbol } from "@/src/stock-trading/domain/model"
import { currentUserAtom } from "@/src/stock-trading/atoms/auth"
import { stockListAtom } from "@/src/stock-trading/atoms/stock"
import { placeBuyOrderAtom, placeSellOrderAtom, ordersAtom } from "@/src/stock-trading/atoms/trading"

export const TradingPanel = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState("")

  const currentUser = useAtomValue(currentUserAtom)
  const stocks = useAtomValue(stockListAtom)
  const orders = useAtomValue(ordersAtom)
  const buy = useAtomSet(placeBuyOrderAtom, { mode: "promiseExit" })
  const sell = useAtomSet(placeSellOrderAtom, { mode: "promiseExit" })

  if (!currentUser) return null

  const handleTrade = async (type: "buy" | "sell") => {
    setMessage("")
    const action = type === "buy" ? buy : sell
    const exit = await action({ symbol: selectedSymbol as StockSymbol, quantity })
    if (Exit.isSuccess(exit)) {
      setMessage(`${type === "buy" ? "매수" : "매도"} 완료: ${selectedSymbol} ${quantity}주`)
    } else {
      setMessage(`주문 실패: 잔고 또는 보유수량을 확인하세요`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">주문</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-3">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            data-testid="symbol-select"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">종목 선택</option>
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} - {s.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            data-testid="quantity-input"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTrade("buy")}
              disabled={!selectedSymbol}
              data-testid="buy-button"
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              매수
            </button>
            <button
              onClick={() => handleTrade("sell")}
              disabled={!selectedSymbol}
              data-testid="sell-button"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              매도
            </button>
          </div>
        </div>
        {message && (
          <p className="text-sm text-center py-2 px-3 bg-gray-50 rounded-md text-gray-700" data-testid="trade-message">
            {message}
          </p>
        )}
      </div>

      {orders.length > 0 && (
        <>
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">주문 내역</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">종목</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">가격</th>
                  <th className="px-5 py-2 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} data-testid={`order-row-${order.id}`}>
                    <td className="px-5 py-2 text-sm font-medium text-gray-900">{order.symbol}</td>
                    <td className={`px-5 py-2 text-sm font-medium ${order.type === "buy" ? "text-red-500" : "text-blue-500"}`}>
                      {order.type === "buy" ? "매수" : "매도"}
                    </td>
                    <td className="px-5 py-2 text-sm text-right text-gray-700">{order.quantity}</td>
                    <td className="px-5 py-2 text-sm text-right text-gray-700">₩{order.price.toLocaleString()}</td>
                    <td className="px-5 py-2 text-sm text-center">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        {order.status}
                      </span>
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
