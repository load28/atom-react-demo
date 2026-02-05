import { Atom } from "@effect-atom/atom-react"
import type { StockSymbol, StockTick } from "@/src/stock-trading/domain/model"
import { createStockFeed, type ConnectionStatus } from "@/src/stock-trading/services/stock-feed"
import { STOCK_WS_URL } from "@/src/stock-trading/mocks/ws-handlers"

const ALL_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"] as StockSymbol[]
const FLASH_DURATION_MS = 600

// ── WebSocket 연결 상태 ──
export const wsStatusAtom = Atom.make<ConnectionStatus>("disconnected")

// ── 실시간 시세 (단일 책임: 가격만 관리) ──
// stockListAtom이 이 아톰을 구독하면 WebSocket이 자동 연결되고,
// 구독이 해제되면 연결이 자동 종료된다.
export const livePricesAtom = Atom.make((get) => {
  const prices = new Map<StockSymbol, StockTick>()

  const feed = createStockFeed(
    { url: STOCK_WS_URL, symbols: ALL_SYMBOLS, reconnectMaxRetries: 5, heartbeatIntervalMs: 30_000 },
    {
      onTick: (tick) => {
        prices.set(tick.symbol, tick)
        get.setSelf(new Map(prices))
      },
      onSnapshot: (ticks) => {
        for (const tick of ticks) prices.set(tick.symbol, tick)
        get.setSelf(new Map(prices))
      },
      onStatusChange: (status) => get.set(wsStatusAtom, status),
    },
  )

  feed.connect()

  get.addFinalizer(() => {
    feed.disconnect()
  })

  return new Map<StockSymbol, StockTick>()
})

// ── 가격 플래시 효과 (파생 아톰: livePricesAtom → 방향 감지 → 타이머) ──
// livePricesAtom을 구독하여 이전 가격과 비교해 방향을 감지하고,
// 감지된 방향에 따라 플래시 상태를 자체 관리한다.
export const priceFlashAtom = Atom.make((get) => {
  const prevPrices = new Map<StockSymbol, number>()
  const flashes = new Map<StockSymbol, "up" | "down">()
  const flashTimers = new Map<StockSymbol, ReturnType<typeof setTimeout>>()

  get.subscribe(livePricesAtom, (prices) => {
    for (const [symbol, tick] of prices) {
      const prev = prevPrices.get(symbol)
      prevPrices.set(symbol, tick.price)

      if (prev === undefined) continue
      const direction = tick.price > prev ? "up" : tick.price < prev ? "down" : null
      if (!direction) continue

      const prevTimer = flashTimers.get(symbol)
      if (prevTimer) clearTimeout(prevTimer)

      flashes.set(symbol, direction)
      get.setSelf(new Map(flashes))

      flashTimers.set(
        symbol,
        setTimeout(() => {
          flashes.delete(symbol)
          flashTimers.delete(symbol)
          get.setSelf(new Map(flashes))
        }, FLASH_DURATION_MS),
      )
    }
  })

  get.addFinalizer(() => {
    flashTimers.forEach(clearTimeout)
    flashTimers.clear()
  })

  return new Map<StockSymbol, "up" | "down">()
})
