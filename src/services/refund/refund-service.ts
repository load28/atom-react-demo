import { Effect, Ref, HashMap, Option, pipe } from "effect"
import type {
  OrderId,
  RefundId,
  Order,
  RefundRequest,
  RefundResult,
  RefundReason,
} from "@/src/domain/refund/model"
import {
  OrderNotFound,
  RefundNotFound,
  RefundAlreadyProcessed,
  type RefundError,
} from "@/src/domain/refund/errors"
import { RefundPolicyService } from "./refund-policy-service"

// ============ Input Types ============
export interface CreateOrderInput {
  readonly productName: string
  readonly amount: number
  readonly paymentMethod: Order["paymentMethod"]
  readonly usedPoint?: number
}

export interface RequestRefundInput {
  readonly orderId: OrderId
  readonly reason: RefundReason
  readonly requestedAmount: number
  readonly description?: string
}

// ============ Service Implementation ============
export class RefundService extends Effect.Service<RefundService>()(
  "RefundService",
  {
    effect: Effect.gen(function* () {
      const orderStore = yield* Ref.make(HashMap.empty<OrderId, Order>())
      const refundStore = yield* Ref.make(HashMap.empty<RefundId, RefundResult>())
      const orderRefundMap = yield* Ref.make(HashMap.empty<OrderId, RefundId>())

      const generateOrderId = (): OrderId =>
        `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as OrderId

      const generateRefundId = (): RefundId =>
        `REF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as RefundId

      return {
        // ============ Order Operations ============
        createOrder: (input: CreateOrderInput) =>
          Effect.gen(function* () {
            const order: Order = {
              id: generateOrderId(),
              productName: input.productName,
              amount: input.amount,
              paymentMethod: input.paymentMethod,
              paidAt: new Date(),
              usedPoint: input.usedPoint ?? 0,
              isDelivered: false,
              isUsed: false,
            }
            yield* Ref.update(orderStore, HashMap.set(order.id, order))
            return order
          }),

        getOrder: (orderId: OrderId) =>
          Effect.gen(function* () {
            const orders = yield* Ref.get(orderStore)
            return pipe(
              HashMap.get(orders, orderId),
              Option.match({
                onNone: () => Effect.fail(new OrderNotFound({ orderId })),
                onSome: Effect.succeed,
              })
            )
          }).pipe(Effect.flatten),

        getAllOrders: () =>
          Effect.gen(function* () {
            const orders = yield* Ref.get(orderStore)
            return [...HashMap.values(orders)]
          }),

        updateOrderStatus: (
          orderId: OrderId,
          update: { isDelivered?: boolean; isUsed?: boolean }
        ) =>
          Effect.gen(function* () {
            const orders = yield* Ref.get(orderStore)
            const order = yield* pipe(
              HashMap.get(orders, orderId),
              Option.match({
                onNone: () => Effect.fail(new OrderNotFound({ orderId })),
                onSome: Effect.succeed,
              })
            )
            const updated: Order = {
              ...order,
              isDelivered: update.isDelivered ?? order.isDelivered,
              isUsed: update.isUsed ?? order.isUsed,
            }
            yield* Ref.update(orderStore, HashMap.set(orderId, updated))
            return updated
          }),

        // ============ Refund Operations ============
        requestRefund: (input: RequestRefundInput) =>
          Effect.gen(function* () {
            const policyService = yield* RefundPolicyService

            // Check if order exists
            const orders = yield* Ref.get(orderStore)
            const order = yield* pipe(
              HashMap.get(orders, input.orderId),
              Option.match({
                onNone: () => Effect.fail(new OrderNotFound({ orderId: input.orderId })),
                onSome: Effect.succeed,
              })
            )

            // Check if refund already exists for this order
            const existingRefunds = yield* Ref.get(orderRefundMap)
            const existingRefundId = HashMap.get(existingRefunds, input.orderId)
            if (Option.isSome(existingRefundId)) {
              yield* Effect.fail(
                new RefundAlreadyProcessed({
                  orderId: input.orderId,
                  existingRefundId: existingRefundId.value,
                })
              )
            }

            // Create refund request
            const request: RefundRequest = {
              id: generateRefundId(),
              orderId: input.orderId,
              reason: input.reason,
              requestedAmount: input.requestedAmount,
              requestedAt: new Date(),
              description: input.description,
            }

            // Validate refund
            yield* policyService.validateRefund(order, request)

            // Calculate refund
            const isCustomerRequest = input.reason === "customer_request"
            const calculation = policyService.calculateRefund(order, request, isCustomerRequest)
            const estimatedDays = policyService.getEstimatedDays(order.paymentMethod)

            // Create refund result
            const result: RefundResult = {
              id: request.id,
              orderId: order.id,
              status: estimatedDays === 0 ? "completed" : "approved",
              calculation,
              message: getRefundMessage(order, calculation, estimatedDays),
              processedAt: new Date(),
              estimatedCompletionDays: estimatedDays,
            }

            // Store refund
            yield* Ref.update(refundStore, HashMap.set(result.id, result))
            yield* Ref.update(orderRefundMap, HashMap.set(order.id, result.id))

            return result
          }),

        getRefund: (refundId: RefundId) =>
          Effect.gen(function* () {
            const refunds = yield* Ref.get(refundStore)
            return pipe(
              HashMap.get(refunds, refundId),
              Option.match({
                onNone: () => Effect.fail(new RefundNotFound({ refundId })),
                onSome: Effect.succeed,
              })
            )
          }).pipe(Effect.flatten),

        getRefundByOrderId: (orderId: OrderId) =>
          Effect.gen(function* () {
            const orderRefunds = yield* Ref.get(orderRefundMap)
            const refundId = HashMap.get(orderRefunds, orderId)
            if (Option.isNone(refundId)) {
              return Option.none<RefundResult>()
            }
            const refunds = yield* Ref.get(refundStore)
            return HashMap.get(refunds, refundId.value)
          }),

        getAllRefunds: () =>
          Effect.gen(function* () {
            const refunds = yield* Ref.get(refundStore)
            return [...HashMap.values(refunds)]
          }),

        // ============ Simulation: Complete pending refund ============
        completeRefund: (refundId: RefundId) =>
          Effect.gen(function* () {
            const refunds = yield* Ref.get(refundStore)
            const refund = yield* pipe(
              HashMap.get(refunds, refundId),
              Option.match({
                onNone: () => Effect.fail(new RefundNotFound({ refundId })),
                onSome: Effect.succeed,
              })
            )

            if (refund.status === "completed") {
              return refund
            }

            const updated: RefundResult = {
              ...refund,
              status: "completed",
              message: "환불이 완료되었습니다.",
            }

            yield* Ref.update(refundStore, HashMap.set(refundId, updated))
            return updated
          }),
      }
    }),
    dependencies: [RefundPolicyService.Default],
  }
) {}

// ============ Helper Functions ============
function getRefundMessage(
  order: Order,
  calculation: RefundResult["calculation"],
  estimatedDays: number
): string {
  const parts: string[] = []

  if (calculation.fee > 0) {
    parts.push(`수수료 ${calculation.fee.toLocaleString()}원이 차감되었습니다.`)
  }

  if (calculation.pointRefund > 0) {
    parts.push(`${calculation.pointRefund.toLocaleString()}P가 포인트로 환불됩니다.`)
  }

  if (calculation.cashRefund > 0) {
    const methodName = getPaymentMethodName(order.paymentMethod)
    parts.push(`${calculation.cashRefund.toLocaleString()}원이 ${methodName}로 환불됩니다.`)
  }

  if (estimatedDays === 0) {
    parts.push("즉시 환불 처리되었습니다.")
  } else {
    parts.push(`약 ${estimatedDays}일 내 환불이 완료됩니다.`)
  }

  return parts.join(" ")
}

function getPaymentMethodName(method: Order["paymentMethod"]): string {
  const names: Record<Order["paymentMethod"], string> = {
    credit_card: "신용카드",
    bank_transfer: "계좌",
    point: "포인트",
    kakao_pay: "카카오페이",
    naver_pay: "네이버페이",
  }
  return names[method]
}
