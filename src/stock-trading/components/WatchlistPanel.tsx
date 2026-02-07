"use client"

import { useState } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { Exit, Cause } from "effect"
import type { StockSymbol } from "@/src/stock-trading/domain/model"
import type { AlertConditionType, WatchlistId, AlertId } from "@/src/stock-trading/domain/watchlist-model"
import type { DuplicateSymbolInWatchlist } from "@/src/stock-trading/domain/watchlist-errors"
import { stockListAtom, priceMapAtom } from "@/src/stock-trading/atoms/stock"
import {
  watchlistsAtom,
  activeAlertsAtom,
  triggeredAlertsAtom,
  createWatchlistAtom,
  deleteWatchlistAtom,
  createAlertAtom,
  dismissAlertAtom,
  alertEvaluationAtom,
} from "@/src/stock-trading/atoms/watchlist"

const CONDITION_LABELS: Record<AlertConditionType, string> = {
  price_above: "가격 이상",
  price_below: "가격 이하",
  change_percent_above: "변동률 이상(%)",
  change_percent_below: "변동률 이하(%)",
}

export const WatchlistPanel = () => {
  const [wlName, setWlName] = useState("")
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([])
  const [alertSymbol, setAlertSymbol] = useState("")
  const [alertCondition, setAlertCondition] = useState<AlertConditionType>("price_above")
  const [alertTarget, setAlertTarget] = useState("")
  const [message, setMessage] = useState("")
  const [isCreatingWl, setIsCreatingWl] = useState(false)
  const [isCreatingAlert, setIsCreatingAlert] = useState(false)

  const stocks = useAtomValue(stockListAtom)
  const prices = useAtomValue(priceMapAtom)
  const watchlists = useAtomValue(watchlistsAtom)
  const allAlerts = useAtomValue(activeAlertsAtom)
  const triggered = useAtomValue(triggeredAlertsAtom)

  // Subscribe to alert evaluation engine
  useAtomValue(alertEvaluationAtom)

  const createWl = useAtomSet(createWatchlistAtom, { mode: "promiseExit" })
  const deleteWl = useAtomSet(deleteWatchlistAtom, { mode: "promiseExit" })
  const createAl = useAtomSet(createAlertAtom, { mode: "promiseExit" })
  const dismissAl = useAtomSet(dismissAlertAtom, { mode: "promiseExit" })

  const activeAlerts = allAlerts.filter((a) => a.status === "active")

  const isTaggedError = (e: unknown): e is { readonly _tag: string } =>
    e !== null && typeof e === "object" && "_tag" in e

  const extractWatchlistError = (exit: Exit.Exit<unknown, unknown>): string => {
    if (!Exit.isFailure(exit)) return ""
    const error = Cause.failureOption(exit.cause)
    if (error._tag === "Some") {
      const e = error.value
      if (isTaggedError(e)) {
        switch (e._tag) {
          case "DuplicateSymbolInWatchlist":
            return `이미 추가된 종목입니다: ${(e as DuplicateSymbolInWatchlist).symbol}`
          case "WatchlistNotFound":
            return "워치리스트를 찾을 수 없습니다"
          case "AlertNotFound":
            return "알림을 찾을 수 없습니다"
          default:
            return `실패: ${e._tag}`
        }
      }
    }
    return "알 수 없는 오류가 발생했습니다"
  }

  const handleCreateWatchlist = async () => {
    if (!wlName.trim()) return
    setIsCreatingWl(true)
    try {
      const exit = await createWl({ name: wlName.trim(), symbols: selectedSymbols })
      if (Exit.isSuccess(exit)) {
        setMessage(`워치리스트 "${wlName}" 생성 완료`)
        setWlName("")
        setSelectedSymbols([])
      } else {
        setMessage(extractWatchlistError(exit))
      }
    } finally {
      setIsCreatingWl(false)
    }
  }

  const handleDeleteWatchlist = async (id: WatchlistId) => {
    const exit = await deleteWl(id)
    if (Exit.isSuccess(exit)) {
      setMessage("워치리스트 삭제 완료")
    }
  }

  const handleCreateAlert = async () => {
    if (!alertSymbol || !alertTarget) return
    setIsCreatingAlert(true)
    try {
      const exit = await createAl({
        symbol: alertSymbol as StockSymbol,
        conditionType: alertCondition,
        targetValue: Number(alertTarget),
      })
      if (Exit.isSuccess(exit)) {
        setMessage("알림 설정 완료")
        setAlertTarget("")
      } else {
        setMessage(extractWatchlistError(exit))
      }
    } finally {
      setIsCreatingAlert(false)
    }
  }

  const handleDismiss = async (id: AlertId) => {
    await dismissAl(id)
  }

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">워치리스트 & 알림</h2>
      </div>

      <div className="p-5 space-y-6">
        {/* ── 워치리스트 생성 ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">워치리스트 생성</h3>
          <input
            type="text"
            value={wlName}
            onChange={(e) => setWlName(e.target.value)}
            placeholder="워치리스트 이름"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex flex-wrap gap-2">
            {stocks.map((s) => (
              <button
                key={s.symbol}
                onClick={() => toggleSymbol(s.symbol)}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  selectedSymbols.includes(s.symbol)
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {s.symbol}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreateWatchlist}
            disabled={!wlName.trim() || isCreatingWl}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isCreatingWl ? "생성 중..." : "워치리스트 생성"}
          </button>
        </div>

        {/* ── 워치리스트 목록 ── */}
        {watchlists.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">내 워치리스트</h3>
            {watchlists.map((wl) => (
              <div key={wl.id} className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{wl.name}</span>
                  <button
                    onClick={() => handleDeleteWatchlist(wl.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
                <div className="space-y-1">
                  {wl.symbols.map((symbol) => {
                    const price = prices.get(symbol as StockSymbol)
                    return (
                      <div key={symbol} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{symbol}</span>
                        <span className="font-medium text-gray-900">
                          {price !== undefined ? `₩${price.toLocaleString()}` : "-"}
                        </span>
                      </div>
                    )
                  })}
                  {wl.symbols.length === 0 && (
                    <p className="text-xs text-gray-400">종목이 없습니다</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 알림 생성 ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">가격 알림 설정</h3>
          <select
            value={alertSymbol}
            onChange={(e) => setAlertSymbol(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">종목 선택</option>
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} - {s.name}
              </option>
            ))}
          </select>
          <select
            value={alertCondition}
            onChange={(e) => setAlertCondition(e.target.value as AlertConditionType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {(Object.keys(CONDITION_LABELS) as AlertConditionType[]).map((type) => (
              <option key={type} value={type}>
                {CONDITION_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={alertTarget}
            onChange={(e) => setAlertTarget(e.target.value)}
            placeholder="목표 값"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleCreateAlert}
            disabled={!alertSymbol || !alertTarget || isCreatingAlert}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-md hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isCreatingAlert ? "생성 중..." : "알림 설정"}
          </button>
        </div>

        {/* ── 활성 알림 ── */}
        {activeAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">활성 알림</h3>
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                <div>
                  <span className="text-sm font-medium text-gray-900">{alert.symbol}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {CONDITION_LABELS[alert.conditionType]} {alert.targetValue}
                  </span>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  활성
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── 트리거된 알림 ── */}
        {triggered.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">트리거된 알림</h3>
            {triggered.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-md border border-amber-200">
                <div>
                  <span className="text-sm font-medium text-gray-900">{alert.symbol}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {CONDITION_LABELS[alert.conditionType]} {alert.targetValue}
                  </span>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors"
                >
                  확인
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── 메시지 ── */}
        {message && (
          <p className="text-sm text-center py-2 px-3 bg-gray-50 rounded-md text-gray-700">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
