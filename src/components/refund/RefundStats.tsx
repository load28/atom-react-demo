"use client"

import { useAtomValue } from "@effect-atom/atom-react/Hooks"
import { refundStatsAtom } from "@/src/atoms/refund"

export function RefundStats() {
  const stats = useAtomValue(refundStatsAtom)

  return (
    <div className="flex gap-4 px-4 py-3 border-b bg-gray-50 text-xs" data-testid="refund-stats">
      <span>
        총 주문: <strong>{stats.totalOrders}</strong>
      </span>
      <span>
        환불 요청: <strong>{stats.totalRefunds}</strong>
      </span>
      <span>
        처리 중: <strong className="text-yellow-600">{stats.pendingRefunds}</strong>
      </span>
      <span>
        완료: <strong className="text-green-600">{stats.completedRefunds}</strong>
      </span>
      <span>
        환불 금액: <strong>{stats.totalRefundAmount.toLocaleString()}원</strong>
      </span>
      <span>
        환불률: <strong>{stats.refundRate}%</strong>
      </span>
    </div>
  )
}
