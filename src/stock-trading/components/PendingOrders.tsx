"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import type { OrderExecutionType } from "@/src/stock-trading/domain/model"
import { currentUserAtom } from "@/src/stock-trading/atoms/auth"
import { pendingOrdersAtom, cancelPendingOrderAtom, orderMatchingAtom } from "@/src/stock-trading/atoms/pending-orders"

const EXECUTION_LABELS: Record<OrderExecutionType, string> = {
  market: "시장가",
  limit: "지정가",
  stop: "손절",
  stop_limit: "스탑리밋",
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  filled: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  expired: "bg-red-100 text-red-600",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  filled: "체결",
  cancelled: "취소",
  expired: "만료",
}

export const PendingOrders = () => {
  const currentUser = useAtomValue(currentUserAtom)
  const pendingOrders = useAtomValue(pendingOrdersAtom)
  const cancel = useAtomSet(cancelPendingOrderAtom)

  // 실시간 매칭 엔진 구독 — 이 컴포넌트가 마운트되면 매칭 엔진이 활성화된다
  useAtomValue(orderMatchingAtom)

  if (!currentUser) return null
  if (pendingOrders.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">대기 주문</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
          {pendingOrders.length}건 대기
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">종목</th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">조건가</th>
              <th scope="col" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
              <th scope="col" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase"><span className="sr-only">작업</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendingOrders.map((order) => (
              <tr key={order.id} data-testid={`pending-order-${order.id}`} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="text-sm font-medium text-gray-900">{order.symbol}</div>
                  <div className="text-xs text-gray-400">{EXECUTION_LABELS[order.executionType]}</div>
                </td>
                <td className={`px-4 py-2 text-sm font-medium ${order.type === "buy" ? "text-red-500" : "text-blue-500"}`}>
                  {order.type === "buy" ? "매수" : "매도"}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-700">{order.quantity}</td>
                <td className="px-4 py-2 text-right">
                  <div className="text-sm text-gray-700">
                    {order.limitPrice && (
                      <div className="text-xs">
                        <span className="text-amber-600">지정</span> ₩{order.limitPrice.toLocaleString()}
                      </div>
                    )}
                    {order.stopPrice && (
                      <div className="text-xs">
                        <span className="text-orange-600">스탑</span> ₩{order.stopPrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  {order.status === "pending" && (
                    <button
                      onClick={() => cancel(order.id)}
                      data-testid={`cancel-order-${order.id}`}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      취소
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
