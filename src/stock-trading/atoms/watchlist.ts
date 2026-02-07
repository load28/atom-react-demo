import { Atom } from "@effect-atom/atom-react"
import { Effect, Layer } from "effect"
import type { StockSymbol } from "@/src/stock-trading/domain/model"
import type { AlertConditionType, Alert, Watchlist, WatchlistId, AlertId } from "@/src/stock-trading/domain/watchlist-model"
import { AlertService } from "@/src/stock-trading/services/alert-service"
import { priceMapAtom, stockListAtom } from "./stock"

const runtimeAtom = Atom.runtime(Layer.mergeAll(AlertService.Default))

// ── 워치리스트 목록 상태 ──
export const watchlistsAtom = Atom.make<ReadonlyArray<Watchlist>>([])

// ── 활성 알림 상태 ──
export const activeAlertsAtom = Atom.make<ReadonlyArray<Alert>>([])

// ── 파생: 트리거된 알림 ──
export const triggeredAlertsAtom = Atom.make((get) =>
  get(activeAlertsAtom).filter((a) => a.status === "triggered"),
)

// ── 워치리스트 생성 액션 ──
export const createWatchlistAtom = runtimeAtom.fn(
  (args: { name: string; symbols: string[] }, get) =>
    Effect.gen(function* () {
      const service = yield* AlertService
      yield* service.createWatchlist(args.name, args.symbols)
      const all = yield* service.getWatchlists()
      get.set(watchlistsAtom, all)
      return all
    }),
)

// ── 워치리스트 삭제 액션 ──
export const deleteWatchlistAtom = runtimeAtom.fn(
  (id: WatchlistId, get) =>
    Effect.gen(function* () {
      const service = yield* AlertService
      yield* service.deleteWatchlist(id)
      const all = yield* service.getWatchlists()
      get.set(watchlistsAtom, all)
      return all
    }),
)

// ── 알림 생성 액션 ──
export const createAlertAtom = runtimeAtom.fn(
  (args: { symbol: StockSymbol; conditionType: AlertConditionType; targetValue: number }, get) =>
    Effect.gen(function* () {
      const service = yield* AlertService
      yield* service.createAlert(args.symbol, args.conditionType, args.targetValue)
      const allAlerts = yield* service.getAllAlerts()
      get.set(activeAlertsAtom, allAlerts)
      return allAlerts
    }),
)

// ── 알림 해제 액션 ──
export const dismissAlertAtom = runtimeAtom.fn(
  (alertId: AlertId, get) =>
    Effect.gen(function* () {
      const service = yield* AlertService
      yield* service.dismissAlert(alertId)
      const allAlerts = yield* service.getAllAlerts()
      get.set(activeAlertsAtom, allAlerts)
      return allAlerts
    }),
)

// ── 실시간 알림 평가 엔진 ──
// priceMapAtom이 변경될 때마다 자동으로 모든 활성 알림의 조건을 평가한다.
// orderMatchingAtom 패턴을 따른다.
export const alertEvaluationAtom = runtimeAtom.atom((get) =>
  Effect.gen(function* () {
    const prices = get(priceMapAtom)
    if (prices.size === 0) return null

    const stocks = get(stockListAtom)
    const previousCloses = new Map<StockSymbol, number>(
      stocks.map((s) => [s.symbol, s.previousClose]),
    )

    const service = yield* AlertService
    const activeAlerts = yield* service.getActiveAlerts()
    if (activeAlerts.length === 0) return null

    const result = yield* service.evaluateAlerts(prices, previousCloses)

    if (result.triggered.length > 0) {
      const allAlerts = yield* service.getAllAlerts()
      get.set(activeAlertsAtom, allAlerts)
    }

    return result
  }),
)
