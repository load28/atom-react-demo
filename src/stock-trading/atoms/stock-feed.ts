import { Atom } from "@effect-atom/atom-react"
import type { StockSymbol, StockTick } from "@/src/stock-trading/domain/model"
import { createStockFeed, type ConnectionStatus } from "@/src/stock-trading/services/stock-feed"
import { STOCK_WS_URL } from "@/src/stock-trading/mocks/ws-handlers"

const ALL_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"] as StockSymbol[]
export const FLASH_DURATION_MS = 600

// ── WebSocket 연결 상태 ──
export const wsStatusAtom = Atom.make<ConnectionStatus>("disconnected")

// ── 가격 플래시 효과 (컴포넌트에서 타이머 관리) ──
export const priceFlashAtom = Atom.make<ReadonlyMap<StockSymbol, "up" | "down">>(new Map())

// ── 가격 방향 변경 이벤트 ──
// livePricesAtom이 방향 변경을 감지하면 이 아톰에 이벤트를 발행한다.
// seq를 통해 동일 종목의 연속된 같은 방향 변경도 구분한다.
let _flashSeq = 0
export const flashTriggerAtom = Atom.make<{
  readonly symbol: StockSymbol
  readonly direction: "up" | "down"
  readonly seq: number
} | null>(null)

// ── 실시간 시세 (자체 관리 구독 아톰) ──
// stockListAtom이 이 아톰을 구독하면 WebSocket이 자동 연결되고,
// 구독이 해제되면 연결이 자동 종료된다.
// HTTP 쿼리(AtomHttpApi.query)가 구독 기반 자동 페칭인 것과 동일한 패턴.
export const livePricesAtom = Atom.make((get) => {
  const prices = new Map<StockSymbol, StockTick>()

  const feed = createStockFeed(
    { url: STOCK_WS_URL, symbols: ALL_SYMBOLS, reconnectMaxRetries: 5, heartbeatIntervalMs: 30_000 },
    {
      onTick: (tick) => {
        const prev = prices.get(tick.symbol)
        const direction = prev && tick.price > prev.price ? "up" : prev && tick.price < prev.price ? "down" : null

        prices.set(tick.symbol, tick)
        get.setSelf(new Map(prices))

        if (direction) {
          get.set(flashTriggerAtom, { symbol: tick.symbol, direction, seq: ++_flashSeq })
        }
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
