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
    <div className="trading-panel">
      <h2>주문</h2>
      <div className="trade-form">
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          data-testid="symbol-select"
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
        />
        <div className="trade-buttons">
          <button
            onClick={() => handleTrade("buy")}
            disabled={!selectedSymbol}
            data-testid="buy-button"
          >
            매수
          </button>
          <button
            onClick={() => handleTrade("sell")}
            disabled={!selectedSymbol}
            data-testid="sell-button"
          >
            매도
          </button>
        </div>
      </div>
      {message && <p className="trade-message" data-testid="trade-message">{message}</p>}

      <h3>주문 내역</h3>
      <table>
        <thead>
          <tr>
            <th>종목</th>
            <th>유형</th>
            <th>수량</th>
            <th>가격</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} data-testid={`order-row-${order.id}`}>
              <td>{order.symbol}</td>
              <td>{order.type === "buy" ? "매수" : "매도"}</td>
              <td>{order.quantity}</td>
              <td>₩{order.price.toLocaleString()}</td>
              <td>{order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
