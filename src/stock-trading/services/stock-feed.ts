import type { StockSymbol, StockTick } from "@/src/stock-trading/domain/model"

// ── 연결 상태 ──
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting"

// ── 콜백 인터페이스 ──
export type StockFeedCallbacks = {
  readonly onTick: (tick: StockTick) => void
  readonly onSnapshot: (ticks: ReadonlyArray<StockTick>) => void
  readonly onStatusChange: (status: ConnectionStatus) => void
}

// ── 설정 ──
export type StockFeedConfig = {
  readonly url: string
  readonly symbols: ReadonlyArray<StockSymbol>
  readonly reconnectMaxRetries?: number
  readonly heartbeatIntervalMs?: number
}

const DEFAULT_MAX_RETRIES = 5
const DEFAULT_HEARTBEAT_MS = 30_000
const MAX_RECONNECT_DELAY_MS = 30_000

// ── WebSocket 클라이언트 팩토리 ──
export const createStockFeed = (config: StockFeedConfig, callbacks: StockFeedCallbacks) => {
  const maxRetries = config.reconnectMaxRetries ?? DEFAULT_MAX_RETRIES
  const heartbeatMs = config.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS

  let ws: WebSocket | null = null
  let reconnectAttempt = 0
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const startHeartbeat = () => {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }))
      }
    }, heartbeatMs)
  }

  const scheduleReconnect = () => {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY_MS)
    reconnectAttempt++
    callbacks.onStatusChange("reconnecting")
    reconnectTimer = setTimeout(connect, delay)
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return

    intentionalClose = false
    callbacks.onStatusChange("connecting")

    ws = new WebSocket(config.url)

    ws.onopen = () => {
      reconnectAttempt = 0
      callbacks.onStatusChange("connected")

      // 구독 요청
      ws?.send(JSON.stringify({ type: "subscribe", symbols: [...config.symbols] }))

      startHeartbeat()
    }

    ws.onmessage = (event) => {
      let message: { type: string; data?: unknown }
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }

      switch (message.type) {
        case "tick":
          callbacks.onTick(message.data as StockTick)
          break
        case "snapshot":
          callbacks.onSnapshot(message.data as ReadonlyArray<StockTick>)
          break
        case "pong":
          // heartbeat 응답 수신
          break
      }
    }

    ws.onclose = () => {
      stopHeartbeat()
      if (!intentionalClose && reconnectAttempt < maxRetries) {
        scheduleReconnect()
      } else {
        callbacks.onStatusChange("disconnected")
      }
    }

    ws.onerror = () => {
      // onclose가 onerror 이후 호출됨
    }
  }

  const disconnect = () => {
    intentionalClose = true
    stopHeartbeat()
    clearReconnectTimer()
    ws?.close()
    ws = null
    callbacks.onStatusChange("disconnected")
  }

  return { connect, disconnect }
}
