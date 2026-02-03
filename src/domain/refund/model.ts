import { Schema } from "effect"

// ============ IDs ============
export const OrderId = Schema.String.pipe(Schema.brand("OrderId"))
export type OrderId = typeof OrderId.Type

export const RefundId = Schema.String.pipe(Schema.brand("RefundId"))
export type RefundId = typeof RefundId.Type

// ============ Payment Methods ============
export const PaymentMethod = Schema.Literal(
  "credit_card",
  "bank_transfer",
  "point",
  "kakao_pay",
  "naver_pay"
)
export type PaymentMethod = typeof PaymentMethod.Type

export const PaymentMethodLabel: Record<PaymentMethod, string> = {
  credit_card: "신용카드",
  bank_transfer: "계좌이체",
  point: "포인트",
  kakao_pay: "카카오페이",
  naver_pay: "네이버페이",
}

// ============ Refund Status ============
export const RefundStatus = Schema.Literal(
  "pending",
  "approved",
  "rejected",
  "completed",
  "partial"
)
export type RefundStatus = typeof RefundStatus.Type

// ============ Refund Reason ============
export const RefundReason = Schema.Literal(
  "customer_request",
  "defective_product",
  "wrong_delivery",
  "late_delivery",
  "other"
)
export type RefundReason = typeof RefundReason.Type

export const RefundReasonLabel: Record<RefundReason, string> = {
  customer_request: "고객 변심",
  defective_product: "상품 불량",
  wrong_delivery: "오배송",
  late_delivery: "배송 지연",
  other: "기타",
}

// ============ Order ============
export const Order = Schema.Struct({
  id: OrderId,
  productName: Schema.NonEmptyString,
  amount: Schema.Positive,
  paymentMethod: PaymentMethod,
  paidAt: Schema.DateFromSelf,
  usedPoint: Schema.NonNegativeInt,
  isDelivered: Schema.Boolean,
  isUsed: Schema.Boolean,
})
export type Order = typeof Order.Type

// ============ Refund Policy Config ============
export interface RefundPolicyConfig {
  readonly paymentMethod: PaymentMethod
  readonly maxRefundDays: number
  readonly feeRate: number
  readonly allowPartialRefund: boolean
  readonly requiresDeliveryReturn: boolean
  readonly instantRefund: boolean
  readonly minRefundAmount: number
}

// ============ Refund Request ============
export const RefundRequest = Schema.Struct({
  id: RefundId,
  orderId: OrderId,
  reason: RefundReason,
  requestedAmount: Schema.Positive,
  requestedAt: Schema.DateFromSelf,
  description: Schema.optional(Schema.String),
})
export type RefundRequest = typeof RefundRequest.Type

// ============ Refund Result ============
export interface RefundCalculation {
  readonly originalAmount: number
  readonly fee: number
  readonly pointRefund: number
  readonly cashRefund: number
  readonly totalRefund: number
}

export interface RefundResult {
  readonly id: RefundId
  readonly orderId: OrderId
  readonly status: RefundStatus
  readonly calculation: RefundCalculation
  readonly message: string
  readonly processedAt: Date
  readonly estimatedCompletionDays: number
}

// ============ Validation Result ============
export interface ValidationResult {
  readonly isValid: boolean
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
}
