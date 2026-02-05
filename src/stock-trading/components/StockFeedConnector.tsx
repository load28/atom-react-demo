"use client"

import { useEffect, useRef } from "react"
import { useAtomSet } from "@effect-atom/atom-react/Hooks"
import { livePricesAtom, wsStatusAtom, priceFlashAtom } from "@/src/stock-trading/atoms/stock-feed"
import { createStockFeed, type ConnectionStatus } from "@/src/stock-trading/services/stock-feed"
import { STOCK_WS_URL } from "@/src/stock-trading/mocks/ws-handlers"
import type { StockSymbol, StockTick } from "@/src/stock-trading/domain/model"

const ALL_SYMBOLS: StockSymbol[] = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"] as StockSymbol[]
const FLASH_DURATION_MS = 600

/**
 * 인프라 컴포넌트: WebSocket ↔ Atom 브릿지
 * MSWProvider와 동일한 레벨 — 비즈니스 로직 없음, 연결 생명주기만 관리
 */
export const StockFeedConnector = () => {
  const setLivePrices = useAtomSet(livePricesAtom)
  const setWsStatus = useAtomSet(wsStatusAtom)
  const setFlash = useAtomSet(priceFlashAtom)

  // WebSocket 콜백에서 atom을 업데이트하기 위한 로컬 캐시
  const pricesRef = useRef(new Map<StockSymbol, StockTick>())
  const flashTimers = useRef(new Map<StockSymbol, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const applyFlash = (symbol: StockSymbol, direction: "up" | "down") => {
      // 기존 타이머 제거
      const existing = flashTimers.current.get(symbol)
      if (existing) clearTimeout(existing)

      setFlash((prev) => {
        const next = new Map(prev)
        next.set(symbol, direction)
        return next
      })

      flashTimers.current.set(
        symbol,
        setTimeout(() => {
          setFlash((prev) => {
            const next = new Map(prev)
            next.delete(symbol)
            return next
          })
          flashTimers.current.delete(symbol)
        }, FLASH_DURATION_MS),
      )
    }

    const handleTick = (tick: StockTick) => {
      const prev = pricesRef.current.get(tick.symbol)
      const direction = prev && tick.price > prev.price ? "up" : prev && tick.price < prev.price ? "down" : null

      pricesRef.current.set(tick.symbol, tick)
      setLivePrices(new Map(pricesRef.current))

      if (direction) applyFlash(tick.symbol, direction)
    }

    const handleSnapshot = (ticks: ReadonlyArray<StockTick>) => {
      for (const tick of ticks) {
        pricesRef.current.set(tick.symbol, tick)
      }
      setLivePrices(new Map(pricesRef.current))
    }

    const handleStatus = (status: ConnectionStatus) => {
      setWsStatus(status)
    }

    const feed = createStockFeed(
      { url: STOCK_WS_URL, symbols: ALL_SYMBOLS, reconnectMaxRetries: 5, heartbeatIntervalMs: 30_000 },
      { onTick: handleTick, onSnapshot: handleSnapshot, onStatusChange: handleStatus },
    )

    feed.connect()

    return () => {
      feed.disconnect()
      flashTimers.current.forEach(clearTimeout)
      flashTimers.current.clear()
    }
  }, [setLivePrices, setWsStatus, setFlash])

  return null
}
