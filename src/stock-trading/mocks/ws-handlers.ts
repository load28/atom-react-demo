import { ws } from "msw"
import type { Stock, StockSymbol } from "@/src/stock-trading/domain/model"

// ── WebSocket URL (클라이언트와 동일한 URL 사용) ──
export const STOCK_WS_URL = "wss://stream.stock-api.com/ws/stocks"

const stockFeedLink = ws.link(STOCK_WS_URL)

// ── 초기 가격 데이터 (handlers.ts의 INITIAL_STOCKS와 동일) ──
const INITIAL_PRICES: ReadonlyArray<{ symbol: string; price: number; previousClose: number }> = [
  { symbol: "AAPL", price: 178.5, previousClose: 176.0 },
  { symbol: "GOOGL", price: 141.8, previousClose: 140.2 },
  { symbol: "MSFT", price: 378.9, previousClose: 375.0 },
  { symbol: "TSLA", price: 248.5, previousClose: 252.0 },
  { symbol: "AMZN", price: 185.6, previousClose: 183.0 },
]

// ── 종목별 연간 변동성 (시뮬레이션 파라미터) ──
const VOLATILITY: Record<string, number> = {
  AAPL: 0.25,
  GOOGL: 0.28,
  MSFT: 0.22,
  TSLA: 0.55,
  AMZN: 0.30,
}

// ── 시뮬레이션 상태 ──
let prices = new Map<string, { price: number; previousClose: number }>()

const resetPrices = () => {
  prices = new Map(INITIAL_PRICES.map((s) => [s.symbol, { price: s.price, previousClose: s.previousClose }]))
}
resetPrices()

export const resetWsPrices = resetPrices

// ── Geometric Brownian Motion 한 스텝 ──
const simulatePriceStep = (currentPrice: number, volatility: number): number => {
  // dt = 1초를 연간 거래시간으로 환산 (252일 × 6.5시간 × 3600초)
  const dt = 1 / (252 * 6.5 * 3600)
  const randomShock = (Math.random() - 0.5) * 2
  const dS = currentPrice * volatility * Math.sqrt(dt) * randomShock
  return Math.max(0.01, parseFloat((currentPrice + dS).toFixed(1)))
}

// ── MSW WebSocket 핸들러 ──
export const wsHandlers = [
  stockFeedLink.addEventListener("connection", ({ client }) => {
    let subscribedSymbols: string[] = []
    let tickTimer: ReturnType<typeof setInterval> | null = null

    // 클라이언트 메시지 처리
    client.addEventListener("message", (event) => {
      const data = typeof event.data === "string" ? event.data : ""
      let message: { type: string; symbols?: string[] }
      try {
        message = JSON.parse(data)
      } catch {
        client.send(JSON.stringify({ type: "error", code: "PARSE_ERROR", message: "Invalid JSON" }))
        return
      }

      switch (message.type) {
        case "subscribe": {
          subscribedSymbols = message.symbols ?? []

          // 현재 스냅샷 전송
          const snapshot = subscribedSymbols
            .map((symbol) => {
              const p = prices.get(symbol)
              return p ? { symbol, price: p.price, previousClose: p.previousClose, timestamp: Date.now() } : null
            })
            .filter(Boolean)
          client.send(JSON.stringify({ type: "snapshot", data: snapshot }))
          client.send(JSON.stringify({ type: "subscribed", symbols: subscribedSymbols }))

          // 시뮬레이션 시작 (아직 돌고 있지 않을 때만)
          if (!tickTimer) {
            tickTimer = setInterval(() => {
              if (subscribedSymbols.length === 0) return

              // 매 틱마다 랜덤 종목 1개 업데이트
              const symbol = subscribedSymbols[Math.floor(Math.random() * subscribedSymbols.length)]
              const current = prices.get(symbol)
              if (!current) return

              const volatility = VOLATILITY[symbol] ?? 0.3
              const newPrice = simulatePriceStep(current.price, volatility)

              prices.set(symbol, { price: newPrice, previousClose: current.previousClose })

              client.send(
                JSON.stringify({
                  type: "tick",
                  data: {
                    symbol,
                    price: newPrice,
                    previousClose: current.previousClose,
                    timestamp: Date.now(),
                  },
                }),
              )
            }, 1500)
          }
          break
        }

        case "unsubscribe": {
          const toRemove = new Set(message.symbols ?? [])
          subscribedSymbols = subscribedSymbols.filter((s) => !toRemove.has(s))
          if (subscribedSymbols.length === 0 && tickTimer) {
            clearInterval(tickTimer)
            tickTimer = null
          }
          break
        }

        case "ping": {
          client.send(JSON.stringify({ type: "pong" }))
          break
        }
      }
    })

    // 연결 종료 시 정리
    client.addEventListener("close", () => {
      if (tickTimer) {
        clearInterval(tickTimer)
        tickTimer = null
      }
      subscribedSymbols = []
    })
  }),
]
