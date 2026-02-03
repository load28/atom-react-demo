"use client"

import { useEffect } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { orderListAtom } from "@/src/atoms/refund/derived"
import { errorMessageAtom, successMessageAtom } from "@/src/atoms/refund/core"
import { generateDemoOrdersAtom, clearMessagesAtom } from "@/src/atoms/refund/actions"
import { RefundStats } from "./RefundStats"
import { OrderForm } from "./OrderForm"
import { OrderCard } from "./OrderCard"
import { RefundForm } from "./RefundForm"
import { PolicyInfo } from "./PolicyInfo"

export function RefundDemo() {
  const orders = useAtomValue(orderListAtom)
  const errorMessage = useAtomValue(errorMessageAtom)
  const successMessage = useAtomValue(successMessageAtom)
  const generateDemoOrders = useAtomSet(generateDemoOrdersAtom)
  const clearMessages = useAtomSet(clearMessagesAtom)

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => clearMessages(), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, successMessage, clearMessages])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-800">환불 프로세스 데모</h1>
          <p className="text-sm text-gray-500 mt-1">
            Effect를 활용한 결제 방식별 환불 조건 처리 시스템
          </p>
        </div>
      </header>

      {/* Stats */}
      <RefundStats />

      {/* Messages */}
      {(errorMessage || successMessage) && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-2">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-2">
              {successMessage}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Form & Policy */}
          <div className="space-y-4">
            <OrderForm />
            <PolicyInfo />
            <button
              onClick={() => generateDemoOrders()}
              className="w-full bg-purple-500 text-white py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors"
            >
              데모 데이터 생성
            </button>
          </div>

          {/* Center Column - Order List */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-lg">
              <div className="px-4 py-3 border-b">
                <h2 className="text-sm font-semibold">주문 목록 ({orders.length})</h2>
              </div>
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {orders.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">
                    주문이 없습니다. 새 주문을 생성하거나 데모 데이터를 생성해주세요.
                  </p>
                ) : (
                  orders.map((order) => <OrderCard key={order.id} order={order} />)
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Refund Form */}
          <div>
            <RefundForm />

            {/* Architecture Info */}
            <div className="mt-4 p-4 bg-white border rounded-lg">
              <h3 className="text-sm font-semibold mb-3">아키텍처 특징</h3>
              <ul className="text-xs text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">●</span>
                  <span>
                    <strong>Strategy Pattern:</strong> 결제 방식별 환불 정책을 분리하여 쉽게 확장
                    가능
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">●</span>
                  <span>
                    <strong>Effect Service:</strong> 비즈니스 로직을 순수 함수로 분리하여 테스트
                    용이
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">●</span>
                  <span>
                    <strong>Tagged Errors:</strong> 타입 안전한 에러 처리로 모든 실패 케이스 명시적
                    처리
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">●</span>
                  <span>
                    <strong>Composable Validation:</strong> 여러 검증 규칙을 파이프라인으로 조합
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
