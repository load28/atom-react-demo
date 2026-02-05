"use client"

import { useEffect } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { stocksWithChangeAtom, fetchStocksAtom } from "@/src/stock-trading/atoms/stock"

export const StockList = () => {
  const stocks = useAtomValue(stocksWithChangeAtom)
  const fetchStocks = useAtomSet(fetchStocksAtom)

  useEffect(() => { fetchStocks() }, [])

  return (
    <div className="stock-list">
      <h2>시세</h2>
      <table>
        <thead>
          <tr>
            <th>종목</th>
            <th>현재가</th>
            <th>변동</th>
            <th>변동률</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <tr key={stock.symbol} data-testid={`stock-row-${stock.symbol}`}>
              <td>
                <strong>{stock.symbol}</strong>
                <span className="stock-name">{stock.name}</span>
              </td>
              <td>₩{stock.price.toLocaleString()}</td>
              <td className={stock.change >= 0 ? "positive" : "negative"}>
                {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(1)}
              </td>
              <td className={stock.changePercent >= 0 ? "positive" : "negative"}>
                {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
