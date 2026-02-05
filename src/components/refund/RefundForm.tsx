"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { refundFormAtom, isProcessingAtom } from "@/src/atoms/refund/core"
import { selectedOrderAtom, canRefundSelectedOrderAtom, selectedOrderRefundAtom } from "@/src/atoms/refund/derived"
import { requestRefundAtom, selectOrderAtom } from "@/src/atoms/refund/actions"
import { RefundReasonLabel, PaymentMethodLabel, type RefundReason } from "@/src/domain/refund/model"

const REFUND_REASONS: RefundReason[] = [
  "customer_request",
  "defective_product",
  "wrong_delivery",
  "late_delivery",
  "other",
]

export function RefundForm() {
  const selectedOrder = useAtomValue(selectedOrderAtom)
  const canRefund = useAtomValue(canRefundSelectedOrderAtom)
  const existingRefund = useAtomValue(selectedOrderRefundAtom)
  const form = useAtomValue(refundFormAtom)
  const setForm = useAtomSet(refundFormAtom)
  const requestRefund = useAtomSet(requestRefundAtom)
  const selectOrder = useAtomSet(selectOrderAtom)
  const isProcessing = useAtomValue(isProcessingAtom)

  if (!selectedOrder) {
    return (
      <div className="p-4 bg-gray-50 border rounded-lg text-center text-gray-500 text-sm">
        환불을 요청할 주문을 선택해주세요.
      </div>
    )
  }

  if (existingRefund) {
    return (
      <div className="p-4 bg-gray-50 border rounded-lg">
        <h3 className="text-sm font-semibold mb-2">환불 정보</h3>
        <p className="text-sm text-gray-600 mb-2">{existingRefund.message}</p>
        <div className="text-xs text-gray-500">
          <p>상태: {existingRefund.status}</p>
          <p>처리일: {existingRefund.processedAt.toLocaleDateString("ko-KR")}</p>
        </div>
        <button
          onClick={() => selectOrder(null)}
          className="mt-3 w-full bg-gray-200 text-gray-700 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          닫기
        </button>
      </div>
    )
  }

  if (!canRefund) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-sm font-semibold text-red-800 mb-2">환불 불가</h3>
        <p className="text-sm text-red-600">
          {selectedOrder.isUsed
            ? "이미 사용된 상품은 환불할 수 없습니다."
            : "해당 주문은 환불할 수 없습니다."}
        </p>
        <button
          onClick={() => selectOrder(null)}
          className="mt-3 w-full bg-gray-200 text-gray-700 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          닫기
        </button>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.requestedAmount) return

    requestRefund({
      orderId: selectedOrder.id,
      reason: form.reason,
      requestedAmount: Number(form.requestedAmount),
      description: form.description || undefined,
    })
  }

  const isPartialRefund = Number(form.requestedAmount) < selectedOrder.amount

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-sm font-semibold mb-3">환불 요청</h3>

      {/* Order Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">상품</span>
          <span className="font-medium">{selectedOrder.productName}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">결제 금액</span>
          <span className="font-medium">{selectedOrder.amount.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">결제 수단</span>
          <span>{PaymentMethodLabel[selectedOrder.paymentMethod]}</span>
        </div>
        {selectedOrder.usedPoint > 0 && (
          <div className="flex justify-between text-gray-500 mt-1">
            <span>사용 포인트</span>
            <span>{selectedOrder.usedPoint.toLocaleString()}P</span>
          </div>
        )}
      </div>

      {/* Refund Form */}
      <div className="space-y-3">
        <label className="block text-xs">
          <span className="text-gray-600 mb-1 block">환불 사유</span>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value as RefundReason })}
          >
            {REFUND_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {RefundReasonLabel[reason]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs">
          <span className="text-gray-600 mb-1 block">환불 요청 금액</span>
          <div className="flex gap-2">
            <input
              type="number"
              className="flex-1 border rounded px-3 py-2 text-sm"
              value={form.requestedAmount}
              onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })}
              max={selectedOrder.amount}
            />
            <button
              type="button"
              className="px-3 py-2 bg-gray-100 rounded text-xs hover:bg-gray-200 transition-colors"
              onClick={() => setForm({ ...form, requestedAmount: String(selectedOrder.amount) })}
            >
              전액
            </button>
          </div>
          {isPartialRefund && (
            <p className="mt-1 text-yellow-600 text-xs">* 부분 환불 요청</p>
          )}
        </label>

        <label className="block text-xs">
          <span className="text-gray-600 mb-1 block">상세 사유 (선택)</span>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm resize-none"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="추가 설명이 있다면 입력해주세요."
          />
        </label>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => selectOrder(null)}
          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isProcessing || !form.requestedAmount}
          className="flex-1 bg-red-500 text-white py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
        >
          {isProcessing ? "처리 중..." : "환불 요청"}
        </button>
      </div>
    </form>
  )
}
