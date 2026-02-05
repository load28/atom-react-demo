"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { orderFormAtom, isProcessingAtom } from "@/src/atoms/refund/core"
import { createOrderAtom } from "@/src/atoms/refund/actions"
import { PaymentMethodLabel, type PaymentMethod } from "@/src/domain/refund/model"

const PAYMENT_METHODS: PaymentMethod[] = [
  "credit_card",
  "bank_transfer",
  "point",
  "kakao_pay",
  "naver_pay",
]

export function OrderForm() {
  const form = useAtomValue(orderFormAtom)
  const setForm = useAtomSet(orderFormAtom)
  const createOrder = useAtomSet(createOrderAtom)
  const isProcessing = useAtomValue(isProcessingAtom)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.productName || !form.amount) return

    createOrder({
      productName: form.productName,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      usedPoint: Number(form.usedPoint) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-sm font-semibold mb-3">새 주문 생성</h3>
      <div className="flex gap-2 items-end flex-wrap">
        <label className="flex flex-col text-xs">
          상품명
          <input
            className="border rounded px-2 py-1.5 text-sm w-40"
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            placeholder="상품명 입력"
          />
        </label>
        <label className="flex flex-col text-xs">
          결제 금액
          <input
            type="number"
            className="border rounded px-2 py-1.5 text-sm w-32"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="금액"
          />
        </label>
        <label className="flex flex-col text-xs">
          결제 수단
          <select
            className="border rounded px-2 py-1.5 text-sm"
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PaymentMethodLabel[method]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          사용 포인트
          <input
            type="number"
            className="border rounded px-2 py-1.5 text-sm w-24"
            value={form.usedPoint}
            onChange={(e) => setForm({ ...form, usedPoint: e.target.value })}
            placeholder="0"
          />
        </label>
        <button
          type="submit"
          disabled={isProcessing || !form.productName || !form.amount}
          className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
        >
          {isProcessing ? "처리 중..." : "주문 생성"}
        </button>
      </div>
    </form>
  )
}
