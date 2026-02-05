"use client"

import { useState } from "react"
import { PaymentMethodLabel, type RefundPolicyConfig } from "@/src/domain/refund/model"

// Policy configurations (same as service for display purposes)
const POLICY_CONFIGS: readonly RefundPolicyConfig[] = [
  {
    paymentMethod: "credit_card",
    maxRefundDays: 30,
    feeRate: 0,
    allowPartialRefund: true,
    requiresDeliveryReturn: true,
    instantRefund: false,
    minRefundAmount: 1000,
  },
  {
    paymentMethod: "bank_transfer",
    maxRefundDays: 14,
    feeRate: 0.01,
    allowPartialRefund: true,
    requiresDeliveryReturn: true,
    instantRefund: false,
    minRefundAmount: 5000,
  },
  {
    paymentMethod: "point",
    maxRefundDays: 365,
    feeRate: 0,
    allowPartialRefund: true,
    requiresDeliveryReturn: false,
    instantRefund: true,
    minRefundAmount: 100,
  },
  {
    paymentMethod: "kakao_pay",
    maxRefundDays: 30,
    feeRate: 0,
    allowPartialRefund: true,
    requiresDeliveryReturn: true,
    instantRefund: true,
    minRefundAmount: 1000,
  },
  {
    paymentMethod: "naver_pay",
    maxRefundDays: 30,
    feeRate: 0,
    allowPartialRefund: false,
    requiresDeliveryReturn: true,
    instantRefund: true,
    minRefundAmount: 1000,
  },
]

export function PolicyInfo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex justify-between items-center text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <span>결제 수단별 환불 정책</span>
        <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="border-t">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">결제 수단</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">환불 기한</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">수수료</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">부분 환불</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">즉시 환불</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">최소 금액</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {POLICY_CONFIGS.map((policy) => (
                <tr key={policy.paymentMethod} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">
                    {PaymentMethodLabel[policy.paymentMethod]}
                  </td>
                  <td className="px-3 py-2 text-center">{policy.maxRefundDays}일</td>
                  <td className="px-3 py-2 text-center">
                    {policy.feeRate > 0 ? `${policy.feeRate * 100}%` : "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block w-4 h-4 rounded-full ${
                        policy.allowPartialRefund ? "bg-green-500" : "bg-red-400"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block w-4 h-4 rounded-full ${
                        policy.instantRefund ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {policy.minRefundAmount.toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
            <p>* 고객 변심으로 인한 환불 시 구매 후 7일 경과 시 추가 수수료(2%)가 부과됩니다.</p>
            <p>* 상품 반송이 필요한 경우 반송 확인 후 환불이 진행됩니다.</p>
          </div>
        </div>
      )}
    </div>
  )
}
