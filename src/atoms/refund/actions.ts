import { Atom } from "@effect-atom/atom-react"
import { Effect, Layer } from "effect"
import { RefundService, type CreateOrderInput, type RequestRefundInput } from "@/src/services/refund/refund-service"
import { RefundPolicyService } from "@/src/services/refund/refund-policy-service"
import type { OrderId, PaymentMethod } from "@/src/domain/refund/model"
import {
  ordersAtom,
  refundsAtom,
  selectedOrderIdAtom,
  isProcessingAtom,
  errorMessageAtom,
  successMessageAtom,
  orderFormAtom,
  refundFormAtom,
} from "./core"

// ============ Runtime with Services ============
// Combine both services into a single layer
const CombinedLayer = Layer.merge(RefundPolicyService.Default, RefundService.Default)
const refundRuntimeAtom = Atom.runtime(CombinedLayer)
const policyRuntimeAtom = Atom.runtime(RefundPolicyService.Default)

// ============ Order Actions ============
export const createOrderAtom = refundRuntimeAtom.fn((input: CreateOrderInput, get) =>
  Effect.gen(function* () {
    get.set(isProcessingAtom, true)
    get.set(errorMessageAtom, null)

    const service = yield* RefundService
    const order = yield* service.createOrder(input)

    const orders = new Map(get(ordersAtom))
    orders.set(order.id, order)
    get.set(ordersAtom, orders)
    get.set(successMessageAtom, `주문이 생성되었습니다: ${order.productName}`)
    get.set(orderFormAtom, {
      productName: "",
      amount: "",
      paymentMethod: "credit_card",
      usedPoint: "0",
    })
    get.set(isProcessingAtom, false)

    return order
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        get.set(errorMessageAtom, `주문 생성 실패: ${cause}`)
        get.set(isProcessingAtom, false)
        return null
      })
    )
  )
)

export const updateOrderStatusAtom = refundRuntimeAtom.fn(
  (input: { orderId: OrderId; isDelivered?: boolean; isUsed?: boolean }, get) =>
    Effect.gen(function* () {
      const service = yield* RefundService
      const updated = yield* service.updateOrderStatus(input.orderId, {
        isDelivered: input.isDelivered,
        isUsed: input.isUsed,
      })

      const orders = new Map(get(ordersAtom))
      orders.set(updated.id, updated)
      get.set(ordersAtom, orders)

      return updated
    }).pipe(
      Effect.catchAllCause((cause) =>
        Effect.sync(() => {
          get.set(errorMessageAtom, `상태 업데이트 실패: ${cause}`)
          return null
        })
      )
    )
)

// selectOrderAtom is a simple action that sets selected order and resets form
export const selectOrderAtom = refundRuntimeAtom.fn((orderId: OrderId | null, get) =>
  Effect.sync(() => {
    get.set(selectedOrderIdAtom, orderId)
    get.set(errorMessageAtom, null)
    get.set(successMessageAtom, null)

    // Reset refund form when selecting new order
    if (orderId) {
      const order = get(ordersAtom).get(orderId)
      if (order) {
        get.set(refundFormAtom, {
          reason: "customer_request",
          requestedAmount: String(order.amount),
          description: "",
        })
      }
    }
    return orderId
  })
)

// ============ Refund Actions ============
export const requestRefundAtom = refundRuntimeAtom.fn((input: RequestRefundInput, get) =>
  Effect.gen(function* () {
    get.set(isProcessingAtom, true)
    get.set(errorMessageAtom, null)

    const service = yield* RefundService
    const result = yield* service.requestRefund(input)

    const refunds = new Map(get(refundsAtom))
    refunds.set(result.orderId, result)
    get.set(refundsAtom, refunds)
    get.set(successMessageAtom, result.message)
    get.set(selectedOrderIdAtom, null)
    get.set(isProcessingAtom, false)

    return result
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        const message = getErrorMessage(error)
        get.set(errorMessageAtom, message)
        get.set(isProcessingAtom, false)
        return null
      })
    )
  )
)

export const completeRefundAtom = refundRuntimeAtom.fn((orderId: OrderId, get) =>
  Effect.gen(function* () {
    const service = yield* RefundService
    const existingRefund = get(refundsAtom).get(orderId)
    if (!existingRefund) {
      get.set(errorMessageAtom, "환불 정보를 찾을 수 없습니다.")
      return null
    }

    const result = yield* service.completeRefund(existingRefund.id)

    const refunds = new Map(get(refundsAtom))
    refunds.set(orderId, result)
    get.set(refundsAtom, refunds)
    get.set(successMessageAtom, "환불이 완료되었습니다.")

    return result
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        get.set(errorMessageAtom, `환불 완료 실패: ${cause}`)
        return null
      })
    )
  )
)

// ============ Policy Actions ============
export const getPolicyAtom = policyRuntimeAtom.fn((paymentMethod: PaymentMethod, _get) =>
  Effect.gen(function* () {
    const service = yield* RefundPolicyService
    return service.getPolicy(paymentMethod)
  })
)

export const getAllPoliciesAtom = policyRuntimeAtom.fn((_: void, _get) =>
  Effect.gen(function* () {
    const service = yield* RefundPolicyService
    return service.getAllPolicies()
  })
)

// ============ Demo Data Generation ============
export const generateDemoOrdersAtom = refundRuntimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const service = yield* RefundService

    const demoOrders: CreateOrderInput[] = [
      { productName: "맥북 프로 14인치", amount: 2890000, paymentMethod: "credit_card", usedPoint: 50000 },
      { productName: "아이패드 에어", amount: 899000, paymentMethod: "kakao_pay", usedPoint: 0 },
      { productName: "에어팟 프로", amount: 359000, paymentMethod: "naver_pay", usedPoint: 10000 },
      { productName: "매직 키보드", amount: 169000, paymentMethod: "bank_transfer", usedPoint: 0 },
      { productName: "충전 케이블", amount: 29000, paymentMethod: "point", usedPoint: 29000 },
    ]

    const orders = new Map(get(ordersAtom))

    for (const input of demoOrders) {
      const order = yield* service.createOrder(input)
      orders.set(order.id, order)
    }

    // Make some orders delivered/used for demo
    const orderList = [...orders.values()]
    if (orderList[0]) {
      const delivered = yield* service.updateOrderStatus(orderList[0].id, { isDelivered: true })
      orders.set(delivered.id, delivered)
    }
    if (orderList[1]) {
      const used = yield* service.updateOrderStatus(orderList[1].id, { isDelivered: true, isUsed: true })
      orders.set(used.id, used)
    }

    get.set(ordersAtom, orders)
    get.set(successMessageAtom, `${demoOrders.length}개의 데모 주문이 생성되었습니다.`)

    return orderList
  })
)

// ============ Clear Messages ============
export const clearMessagesAtom = refundRuntimeAtom.fn((_: void, get) =>
  Effect.sync(() => {
    get.set(errorMessageAtom, null)
    get.set(successMessageAtom, null)
  })
)

// ============ Helper Functions ============
function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    const tagged = error as { _tag: string; [key: string]: unknown }
    switch (tagged._tag) {
      case "RefundPeriodExpired":
        return `환불 기간이 만료되었습니다. (최대 ${tagged.maxDays}일, 현재 ${tagged.daysSincePurchase}일 경과)`
      case "ProductAlreadyUsed":
        return "이미 사용된 상품은 환불할 수 없습니다."
      case "InsufficientRefundAmount":
        return `최소 환불 금액(${(tagged.minAmount as number).toLocaleString()}원) 이상이어야 합니다.`
      case "PartialRefundNotAllowed":
        return "해당 결제 수단은 부분 환불을 지원하지 않습니다."
      case "RefundAlreadyProcessed":
        return "이미 환불 처리된 주문입니다."
      case "InvalidRefundAmount":
        return `환불 금액이 주문 금액(${(tagged.maxAmount as number).toLocaleString()}원)을 초과할 수 없습니다.`
      case "OrderNotFound":
        return "주문을 찾을 수 없습니다."
      default:
        return `오류가 발생했습니다: ${tagged._tag}`
    }
  }
  return "알 수 없는 오류가 발생했습니다."
}
