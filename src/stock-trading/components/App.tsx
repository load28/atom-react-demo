"use client"

import { LoginForm } from "./LoginForm"
import { StockList } from "./StockList"
import { TradingPanel } from "./TradingPanel"
import { PortfolioView } from "./PortfolioView"

export const StockTradingApp = () => (
  <div className="stock-trading-app">
    <header>
      <h1>모의 주식 트레이딩</h1>
      <LoginForm />
    </header>
    <main>
      <section className="market-section">
        <StockList />
      </section>
      <section className="trading-section">
        <TradingPanel />
      </section>
      <section className="portfolio-section">
        <PortfolioView />
      </section>
    </main>
  </div>
)
