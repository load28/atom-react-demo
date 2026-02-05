import { Atom } from "@effect-atom/atom-react"
import type { Order, RefundResult, OrderId, PaymentMethod, RefundReason } from "@/src/domain/refund/model"

// ============ State Atoms ============
export const ordersAtom = Atom.make<Map<OrderId, Order>>(new Map())

export const refundsAtom = Atom.make<Map<OrderId, RefundResult>>(new Map())

export const selectedOrderIdAtom = Atom.make<OrderId | null>(null)

// ============ Form State Atoms ============
export interface OrderFormState {
  productName: string
  amount: string
  paymentMethod: PaymentMethod
  usedPoint: string
}

export const orderFormAtom = Atom.make<OrderFormState>({
  productName: "",
  amount: "",
  paymentMethod: "credit_card",
  usedPoint: "0",
})

export interface RefundFormState {
  reason: RefundReason
  requestedAmount: string
  description: string
}

export const refundFormAtom = Atom.make<RefundFormState>({
  reason: "customer_request",
  requestedAmount: "",
  description: "",
})

// ============ UI State Atoms ============
export const isProcessingAtom = Atom.make<boolean>(false)

export const errorMessageAtom = Atom.make<string | null>(null)

export const successMessageAtom = Atom.make<string | null>(null)
