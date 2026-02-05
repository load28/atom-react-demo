"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { refundsAtom, selectedOrderIdAtom } from "@/src/atoms/refund/core"
import { selectOrderAtom, updateOrderStatusAtom, completeRefundAtom } from "@/src/atoms/refund/actions"
import { PaymentMethodLabel, type Order, type RefundResult } from "@/src/domain/refund/model"

interface OrderCardProps {
  order: Order
}

const STATUS_COLORS: Record<RefundResult["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  partial: "bg-purple-100 text-purple-800",
}

const STATUS_LABELS: Record<RefundResult["status"], string> = {
  pending: "대기 중",
  approved: "승인됨",
  rejected: "거절됨",
  completed: "완료",
  partial: "부분 환불",
}

export function OrderCard({ order }: OrderCardProps) {
  const refunds = useAtomValue(refundsAtom)
  const selectedOrderId = useAtomValue(selectedOrderIdAtom)
  const selectOrder = useAtomSet(selectOrderAtom)
  const updateOrderStatus = useAtomSet(updateOrderStatusAtom)
  const completeRefund = useAtomSet(completeRefundAtom)

  const refund = refunds.get(order.id)
  const isSelected = selectedOrderId === order.id
  const canRefund = !refund && !order.isUsed

  return (
    <div
      className={`p-4 border rounded-lg transition-all cursor-pointer ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
      onClick={() => selectOrder(isSelected ? null : order.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-sm">{order.productName}</h4>
          <p className="text-xs text-gray-500">
            {order.paidAt.toLocaleDateString("ko-KR")} | {PaymentMethodLabel[order.paymentMethod]}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm">{order.amount.toLocaleString()}원</p>
          {order.usedPoint > 0 && (
            <p className="text-xs text-gray-500">포인트 {order.usedPoint.toLocaleString()}P</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center text-xs mb-2">
        <span
          className={`px-2 py-0.5 rounded ${
            order.isDelivered ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {order.isDelivered ? "배송완료" : "배송전"}
        </span>
        <span
          className={`px-2 py-0.5 rounded ${
            order.isUsed ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {order.isUsed ? "사용됨" : "미사용"}
        </span>
        {refund && (
          <span className={`px-2 py-0.5 rounded ${STATUS_COLORS[refund.status]}`}>
            환불 {STATUS_LABELS[refund.status]}
          </span>
        )}
      </div>

      {/* Refund Info */}
      {refund && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">환불 금액</span>
            <span className="font-medium">{refund.calculation.totalRefund.toLocaleString()}원</span>
          </div>
          {refund.calculation.fee > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>수수료</span>
              <span>-{refund.calculation.fee.toLocaleString()}원</span>
            </div>
          )}
          <p className="mt-1 text-gray-600">{refund.message}</p>
          {refund.status !== "completed" && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                completeRefund(order.id)
              }}
              className="mt-2 w-full bg-green-500 text-white py-1 rounded text-xs hover:bg-green-600 transition-colors"
            >
              환불 완료 처리 (시뮬레이션)
            </button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {!refund && (
        <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
          {!order.isDelivered && (
            <button
              onClick={() => updateOrderStatus({ orderId: order.id, isDelivered: true })}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              배송 완료
            </button>
          )}
          {order.isDelivered && !order.isUsed && (
            <button
              onClick={() => updateOrderStatus({ orderId: order.id, isUsed: true })}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              사용 처리
            </button>
          )}
          {canRefund && (
            <span className="text-xs text-green-600 ml-auto">환불 가능</span>
          )}
          {order.isUsed && (
            <span className="text-xs text-red-600 ml-auto">환불 불가</span>
          )}
        </div>
      )}
    </div>
  )
}
