import { Effect, pipe } from "effect"
import type {
  PaymentMethod,
  RefundPolicyConfig,
  Order,
  RefundRequest,
  ValidationResult,
  RefundCalculation,
} from "@/src/domain/refund/model"
import {
  RefundPeriodExpired,
  ProductAlreadyUsed,
  InsufficientRefundAmount,
  PartialRefundNotAllowed,
  InvalidRefundAmount,
} from "@/src/domain/refund/errors"

// ============ Policy Configurations (easily extensible) ============
const POLICY_CONFIGS: Record<PaymentMethod, RefundPolicyConfig> = {
  credit_card: {
    paymentMethod: "credit_card",
    maxRefundDays: 30,
    feeRate: 0,
    allowPartialRefund: true,
    requiresDeliveryReturn: true,
    instantRefund: false,
    minRefundAmount: 1000,
  },
  bank_transfer: {
    paymentMethod: "bank_transfer",
    maxRefundDays: 14,
    feeRate: 0.01,
    allowPartialRefund: true,
    requiresDeliveryReturn: true,
    instantRefund: false,
    minRefundAmount: 5000,
  },
  point: {
    paymentMethod: "point",
    maxRefundDays: 365,
    feeRate: 0,
    allowPartialRefund: true,
    requiresDeliveryReturn: false,
    instantRefund: true,
    minRefundAmount: 100,
  },
  kakao_pay: {
    paymentMethod: "kakao_pay",
    maxRefundDays: 30,
    feeRate: 0,
    allowPartialRefund: true,
    requiresDeliveryReturn: true,
    instantRefund: true,
    minRefundAmount: 1000,
  },
  naver_pay: {
    paymentMethod: "naver_pay",
    maxRefundDays: 30,
    feeRate: 0,
    allowPartialRefund: false,
    requiresDeliveryReturn: true,
    instantRefund: true,
    minRefundAmount: 1000,
  },
}

// ============ Validation Strategies (composable) ============
type ValidationStrategy = (
  order: Order,
  request: RefundRequest,
  config: RefundPolicyConfig
) => Effect.Effect<void, RefundPeriodExpired | ProductAlreadyUsed | InsufficientRefundAmount | PartialRefundNotAllowed | InvalidRefundAmount>

const validateRefundPeriod: ValidationStrategy = (order, request, config) =>
  Effect.gen(function* () {
    const daysSincePurchase = Math.floor(
      (request.requestedAt.getTime() - order.paidAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSincePurchase > config.maxRefundDays) {
      yield* Effect.fail(
        new RefundPeriodExpired({
          orderId: order.id,
          maxDays: config.maxRefundDays,
          daysSincePurchase,
        })
      )
    }
  })

const validateProductUsage: ValidationStrategy = (order, _request, _config) =>
  Effect.gen(function* () {
    if (order.isUsed) {
      yield* Effect.fail(new ProductAlreadyUsed({ orderId: order.id }))
    }
  })

const validateMinAmount: ValidationStrategy = (_order, request, config) =>
  Effect.gen(function* () {
    if (request.requestedAmount < config.minRefundAmount) {
      yield* Effect.fail(
        new InsufficientRefundAmount({
          requestedAmount: request.requestedAmount,
          minAmount: config.minRefundAmount,
        })
      )
    }
  })

const validatePartialRefund: ValidationStrategy = (order, request, config) =>
  Effect.gen(function* () {
    const isPartialRefund = request.requestedAmount < order.amount
    if (isPartialRefund && !config.allowPartialRefund) {
      yield* Effect.fail(
        new PartialRefundNotAllowed({ paymentMethod: config.paymentMethod })
      )
    }
  })

const validateMaxAmount: ValidationStrategy = (order, request, _config) =>
  Effect.gen(function* () {
    if (request.requestedAmount > order.amount) {
      yield* Effect.fail(
        new InvalidRefundAmount({
          requestedAmount: request.requestedAmount,
          maxAmount: order.amount,
        })
      )
    }
  })

// ============ Fee Calculation Strategies ============
type FeeCalculator = (
  order: Order,
  requestedAmount: number,
  config: RefundPolicyConfig
) => number

const standardFeeCalculator: FeeCalculator = (_order, requestedAmount, config) =>
  Math.floor(requestedAmount * config.feeRate)

const customerRequestFeeCalculator: FeeCalculator = (order, requestedAmount, config) => {
  const baseFee = standardFeeCalculator(order, requestedAmount, config)
  const daysSincePurchase = Math.floor(
    (new Date().getTime() - order.paidAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSincePurchase > 7) {
    return baseFee + Math.floor(requestedAmount * 0.02)
  }
  return baseFee
}

// ============ Service Implementation ============
export class RefundPolicyService extends Effect.Service<RefundPolicyService>()(
  "RefundPolicyService",
  {
    succeed: {
      getPolicy: (paymentMethod: PaymentMethod): RefundPolicyConfig => {
        return POLICY_CONFIGS[paymentMethod]
      },

      validateRefund: (
        order: Order,
        request: RefundRequest
      ): Effect.Effect<
        ValidationResult,
        RefundPeriodExpired | ProductAlreadyUsed | InsufficientRefundAmount | PartialRefundNotAllowed | InvalidRefundAmount
      > => {
        const config = POLICY_CONFIGS[order.paymentMethod]
        const validations = [
          validateRefundPeriod,
          validateProductUsage,
          validateMinAmount,
          validatePartialRefund,
          validateMaxAmount,
        ]

        return pipe(
          Effect.all(
            validations.map((validate) => validate(order, request, config)),
            { concurrency: "unbounded" }
          ),
          Effect.map(() => ({
            isValid: true,
            errors: [] as readonly string[],
            warnings: getWarnings(order, request, config),
          }))
        )
      },

      calculateRefund: (
        order: Order,
        request: RefundRequest,
        isCustomerRequest: boolean
      ): RefundCalculation => {
        const config = POLICY_CONFIGS[order.paymentMethod]
        const feeCalculator = isCustomerRequest
          ? customerRequestFeeCalculator
          : standardFeeCalculator

        const fee = feeCalculator(order, request.requestedAmount, config)
        const pointRefund = Math.min(order.usedPoint, request.requestedAmount - fee)
        const cashRefund = request.requestedAmount - fee - pointRefund
        const totalRefund = pointRefund + cashRefund

        return {
          originalAmount: request.requestedAmount,
          fee,
          pointRefund,
          cashRefund,
          totalRefund,
        }
      },

      getEstimatedDays: (paymentMethod: PaymentMethod): number => {
        const config = POLICY_CONFIGS[paymentMethod]
        if (config.instantRefund) return 0
        switch (paymentMethod) {
          case "credit_card":
            return 3
          case "bank_transfer":
            return 2
          default:
            return 1
        }
      },

      getAllPolicies: (): readonly RefundPolicyConfig[] => {
        return Object.values(POLICY_CONFIGS)
      },
    },
  }
) {}

// ============ Helper Functions ============
function getWarnings(
  order: Order,
  request: RefundRequest,
  config: RefundPolicyConfig
): readonly string[] {
  const warnings: string[] = []

  const daysSincePurchase = Math.floor(
    (request.requestedAt.getTime() - order.paidAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSincePurchase > config.maxRefundDays * 0.8) {
    warnings.push(`환불 기한이 ${config.maxRefundDays - daysSincePurchase}일 남았습니다.`)
  }

  if (config.requiresDeliveryReturn && order.isDelivered) {
    warnings.push("상품 반송이 필요합니다.")
  }

  if (order.usedPoint > 0) {
    warnings.push(`사용하신 ${order.usedPoint.toLocaleString()}P는 포인트로 환불됩니다.`)
  }

  return warnings
}
