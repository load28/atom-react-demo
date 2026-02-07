"use client"

import { useState } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { Exit, Cause } from "effect"
import type { StockSymbol, OrderExecutionType } from "@/src/stock-trading/domain/model"
import { currentUserAtom } from "@/src/stock-trading/atoms/auth"
import { stockListAtom } from "@/src/stock-trading/atoms/stock"
import { placeBuyOrderAtom, placeSellOrderAtom, ordersAtom } from "@/src/stock-trading/atoms/trading"
import { placeConditionalOrderAtom } from "@/src/stock-trading/atoms/pending-orders"

const EXECUTION_LABELS: Record<OrderExecutionType, string> = {
  market: "시장가",
  limit: "지정가",
  stop: "손절/추적",
  stop_limit: "스탑리밋",
}

const EXECUTION_DESCRIPTIONS: Record<OrderExecutionType, string> = {
  market: "현재가로 즉시 체결",
  limit: "매수: 지정가 이하 / 매도: 지정가 이상에서 체결",
  stop: "매수: 스탑가 이상 / 매도: 스탑가 이하에서 체결",
  stop_limit: "스탑가 도달 후 지정가 범위 내에서 체결",
}

export const TradingPanel = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [executionType, setExecutionType] = useState<OrderExecutionType>("market")
  const [limitPrice, setLimitPrice] = useState<string>("")
  const [stopPrice, setStopPrice] = useState<string>("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const currentUser = useAtomValue(currentUserAtom)
  const stocks = useAtomValue(stockListAtom)
  const orders = useAtomValue(ordersAtom)
  const buy = useAtomSet(placeBuyOrderAtom, { mode: "promiseExit" })
  const sell = useAtomSet(placeSellOrderAtom, { mode: "promiseExit" })
  const placeConditional = useAtomSet(placeConditionalOrderAtom, { mode: "promiseExit" })

  if (!currentUser) return null

  const selectedStock = stocks.find((s) => s.symbol === selectedSymbol)
  const needsLimitPrice = executionType === "limit" || executionType === "stop_limit"
  const needsStopPrice = executionType === "stop" || executionType === "stop_limit"

  const extractErrorMessage = (exit: Exit.Exit<unknown, unknown>): string => {
    if (!Exit.isFailure(exit)) return ""
    const error = Cause.failureOption(exit.cause)
    if (error._tag === "Some") {
      const e = error.value
      if (e !== null && typeof e === "object" && "_tag" in e) {
        switch ((e as any)._tag) {
          case "InsufficientBalance":
            return `잔고 부족: ₩${(e as any).required.toLocaleString()} 필요 (현재 ₩${(e as any).available.toLocaleString()})`
          case "InsufficientShares":
            return `보유 수량 부족: ${(e as any).symbol} ${(e as any).required}주 필요 (현재 ${(e as any).available}주)`
          case "StockNotFound":
            return `종목을 찾을 수 없습니다: ${(e as any).symbol}`
          case "OrderExpired":
            return `주문이 만료되었습니다`
          case "OrderAlreadyCancelled":
            return `주문이 이미 취소되었습니다`
          default:
            return `주문 실패: ${(e as any)._tag}`
        }
      }
      return "주문 실패: 알 수 없는 오류"
    }
    return "주문 실패: 잔고 또는 보유수량을 확인하세요"
  }

  const handleTrade = async (type: "buy" | "sell") => {
    setMessage("")
    setIsLoading(true)

    try {
      if (executionType === "market") {
        const action = type === "buy" ? buy : sell
        const exit = await action({ symbol: selectedSymbol as StockSymbol, quantity })
        if (Exit.isSuccess(exit)) {
          setMessage(`${type === "buy" ? "매수" : "매도"} 완료: ${selectedSymbol} ${quantity}주`)
        } else {
          setMessage(extractErrorMessage(exit))
        }
      } else {
        const exit = await placeConditional({
          symbol: selectedSymbol as StockSymbol,
          type,
          executionType,
          quantity,
          limitPrice: needsLimitPrice ? Number(limitPrice) : undefined,
          stopPrice: needsStopPrice ? Number(stopPrice) : undefined,
        })
        if (Exit.isSuccess(exit)) {
          setMessage(`${EXECUTION_LABELS[executionType]} ${type === "buy" ? "매수" : "매도"} 주문 등록: ${selectedSymbol} ${quantity}주`)
          setLimitPrice("")
          setStopPrice("")
        } else {
          setMessage(extractErrorMessage(exit))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isConditionalValid =
    executionType === "market" ||
    (needsLimitPrice && Number(limitPrice) > 0 && (!needsStopPrice || Number(stopPrice) > 0)) ||
    (!needsLimitPrice && needsStopPrice && Number(stopPrice) > 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">주문</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-3">
          {/* 주문 유형 선택 */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-lg">
            {(["market", "limit", "stop", "stop_limit"] as const).map((et) => (
              <button
                key={et}
                onClick={() => setExecutionType(et)}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  executionType === et
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {EXECUTION_LABELS[et]}
              </button>
            ))}
          </div>

          {/* 주문 유형 설명 */}
          <p className="text-xs text-gray-400">{EXECUTION_DESCRIPTIONS[executionType]}</p>

          {/* 종목 선택 */}
          <label htmlFor="trading-symbol" className="sr-only">종목 선택</label>
          <select
            id="trading-symbol"
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

          {/* 현재가 표시 */}
          {selectedStock && (
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md">
              <span className="text-xs text-gray-500">현재가</span>
              <span className="text-sm font-semibold text-gray-900">₩{selectedStock.price.toLocaleString()}</span>
            </div>
          )}

          {/* 수량 */}
          <label htmlFor="trading-quantity" className="sr-only">수량</label>
          <input
            id="trading-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="수량"
            data-testid="quantity-input"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* 지정가 입력 */}
          {needsLimitPrice && (
            <div className="relative">
              <input
                type="number"
                min={0.01}
                step={0.1}
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="지정가"
                data-testid="limit-price-input"
                className="w-full px-3 py-2 text-sm border border-amber-300 rounded-md bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600">지정가</span>
            </div>
          )}

          {/* 스탑가 입력 */}
          {needsStopPrice && (
            <div className="relative">
              <input
                type="number"
                min={0.01}
                step={0.1}
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder="스탑가"
                data-testid="stop-price-input"
                className="w-full px-3 py-2 text-sm border border-orange-300 rounded-md bg-orange-50/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-600">스탑가</span>
            </div>
          )}

          {/* 매수/매도 버튼 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTrade("buy")}
              disabled={!selectedSymbol || !isConditionalValid || isLoading}
              data-testid="buy-button"
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "처리 중..." : executionType === "market" ? "매수" : `${EXECUTION_LABELS[executionType]} 매수`}
            </button>
            <button
              onClick={() => handleTrade("sell")}
              disabled={!selectedSymbol || !isConditionalValid || isLoading}
              data-testid="sell-button"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "처리 중..." : executionType === "market" ? "매도" : `${EXECUTION_LABELS[executionType]} 매도`}
            </button>
          </div>
        </div>
        {message && (
          <p className="text-sm text-center py-2 px-3 bg-gray-50 rounded-md text-gray-700" data-testid="trade-message">
            {message}
          </p>
        )}
      </div>

      {/* 체결된 주문 내역 (시장가 + 체결된 조건부 주문) */}
      {orders.length > 0 && (
        <>
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">체결 내역</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th scope="col" className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">종목</th>
                  <th scope="col" className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
                  <th scope="col" className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
                  <th scope="col" className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">가격</th>
                  <th scope="col" className="px-5 py-2 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
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
