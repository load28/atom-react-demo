import { Data } from "effect"
import type { OrderId, RefundId, PaymentMethod } from "./model"

export class OrderNotFound extends Data.TaggedError("OrderNotFound")<{
  readonly orderId: OrderId
}> {}

export class RefundNotFound extends Data.TaggedError("RefundNotFound")<{
  readonly refundId: RefundId
}> {}

export class RefundPeriodExpired extends Data.TaggedError("RefundPeriodExpired")<{
  readonly orderId: OrderId
  readonly maxDays: number
  readonly daysSincePurchase: number
}> {}

export class ProductAlreadyUsed extends Data.TaggedError("ProductAlreadyUsed")<{
  readonly orderId: OrderId
}> {}

export class InsufficientRefundAmount extends Data.TaggedError("InsufficientRefundAmount")<{
  readonly requestedAmount: number
  readonly minAmount: number
}> {}

export class PartialRefundNotAllowed extends Data.TaggedError("PartialRefundNotAllowed")<{
  readonly paymentMethod: PaymentMethod
}> {}

export class RefundAlreadyProcessed extends Data.TaggedError("RefundAlreadyProcessed")<{
  readonly orderId: OrderId
  readonly existingRefundId: RefundId
}> {}

export class InvalidRefundAmount extends Data.TaggedError("InvalidRefundAmount")<{
  readonly requestedAmount: number
  readonly maxAmount: number
}> {}

export type RefundError =
  | OrderNotFound
  | RefundNotFound
  | RefundPeriodExpired
  | ProductAlreadyUsed
  | InsufficientRefundAmount
  | PartialRefundNotAllowed
  | RefundAlreadyProcessed
  | InvalidRefundAmount
