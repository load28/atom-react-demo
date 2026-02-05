import { Atom } from "@effect-atom/atom-react"
import type { StockSymbol, StockTick } from "@/src/stock-trading/domain/model"
import type { ConnectionStatus } from "@/src/stock-trading/services/stock-feed"

// ── 실시간 시세 상태 ── (WebSocket 틱 데이터 저장)
export const livePricesAtom = Atom.make<ReadonlyMap<StockSymbol, StockTick>>(new Map())

// ── WebSocket 연결 상태 ──
export const wsStatusAtom = Atom.make<ConnectionStatus>("disconnected")

// ── 가격 플래시 효과 ── (틱 수신 시 방향 표시, 일정 시간 후 자동 소멸)
export const priceFlashAtom = Atom.make<ReadonlyMap<StockSymbol, "up" | "down">>(new Map())
