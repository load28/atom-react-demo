"use client"

import { MSWProvider } from "../mocks/MSWProvider"
import { ErrorBoundary } from "./ErrorBoundary"
import { ToastContainer } from "./ToastContainer"
import { LoginForm } from "./LoginForm"
import { StockList } from "./StockList"
import { TradingPanel } from "./TradingPanel"
import { PendingOrders } from "./PendingOrders"
import { PortfolioView } from "./PortfolioView"
import { RiskDashboard } from "./RiskDashboard"
import { WatchlistPanel } from "./WatchlistPanel"
import { TradeAnalytics } from "./TradeAnalytics"

export const StockTradingApp = () => (
  <ErrorBoundary>
    <MSWProvider>
      <div className="min-h-screen bg-gray-50">
        <ToastContainer />
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">모의 주식 트레이딩</h1>
            <LoginForm />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <StockList />
            <PendingOrders />
            <TradeAnalytics />
          </section>
          <section className="space-y-6">
            <TradingPanel />
            <PortfolioView />
            <RiskDashboard />
            <WatchlistPanel />
          </section>
        </main>
      </div>
    </MSWProvider>
  </ErrorBoundary>
)
