"use client"

import { useEffect } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { currentUserAtom } from "@/src/stock-trading/atoms/auth"
import { holdingsAtom, fetchPortfolioAtom, portfolioPnLAtom } from "@/src/stock-trading/atoms/portfolio"

export const PortfolioView = () => {
  const currentUser = useAtomValue(currentUserAtom)
  const holdings = useAtomValue(holdingsAtom)
  const pnl = useAtomValue(portfolioPnLAtom)
  const fetchPortfolio = useAtomSet(fetchPortfolioAtom)

  useEffect(() => {
    if (currentUser) fetchPortfolio()
  }, [currentUser])

  if (!currentUser) return null

  return (
    <div className="portfolio-view">
      <h2>포트폴리오</h2>
      <div className="portfolio-summary" data-testid="portfolio-summary">
        <div>
          <span>총 평가금액</span>
          <strong>₩{pnl.totalValue.toLocaleString()}</strong>
        </div>
        <div>
          <span>총 투자금액</span>
          <span>₩{pnl.totalCost.toLocaleString()}</span>
        </div>
        <div>
          <span>총 손익</span>
          <span className={pnl.totalPnL >= 0 ? "positive" : "negative"}>
            {pnl.totalPnL >= 0 ? "+" : ""}₩{pnl.totalPnL.toLocaleString()}
            ({pnl.totalPnLPercent.toFixed(2)}%)
          </span>
        </div>
        <div>
          <span>보유 현금</span>
          <span>₩{currentUser.balance.toLocaleString()}</span>
        </div>
      </div>

      <h3>보유 종목</h3>
      {holdings.length === 0 ? (
        <p data-testid="empty-holdings">보유 종목이 없습니다</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>종목</th>
              <th>수량</th>
              <th>평균단가</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.symbol} data-testid={`holding-row-${h.symbol}`}>
                <td>{h.symbol}</td>
                <td>{h.quantity}</td>
                <td>₩{h.averagePrice.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
