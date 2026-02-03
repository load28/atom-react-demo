import { Atom } from "@effect-atom/atom-react"
import { ordersAtom, refundsAtom, selectedOrderIdAtom } from "./core"
import type { Order, RefundResult } from "@/src/domain/refund/model"

// ============ Derived Atoms ============
export const orderListAtom = Atom.make((get) => {
  const orders = get(ordersAtom)
  return [...orders.values()].sort(
    (a, b) => b.paidAt.getTime() - a.paidAt.getTime()
  )
})

export const refundListAtom = Atom.make((get) => {
  const refunds = get(refundsAtom)
  return [...refunds.values()].sort(
    (a, b) => b.processedAt.getTime() - a.processedAt.getTime()
  )
})

export const selectedOrderAtom = Atom.make((get): Order | null => {
  const id = get(selectedOrderIdAtom)
  if (!id) return null
  return get(ordersAtom).get(id) ?? null
})

export const selectedOrderRefundAtom = Atom.make((get): RefundResult | null => {
  const id = get(selectedOrderIdAtom)
  if (!id) return null
  return get(refundsAtom).get(id) ?? null
})

export const canRefundSelectedOrderAtom = Atom.make((get): boolean => {
  const order = get(selectedOrderAtom)
  const existingRefund = get(selectedOrderRefundAtom)
  if (!order) return false
  if (existingRefund) return false
  return !order.isUsed
})

// ============ Statistics Atoms ============
export interface RefundStats {
  totalOrders: number
  totalRefunds: number
  pendingRefunds: number
  completedRefunds: number
  totalRefundAmount: number
  refundRate: number
}

export const refundStatsAtom = Atom.make((get): RefundStats => {
  const orders = get(ordersAtom)
  const refunds = get(refundsAtom)

  const totalOrders = orders.size
  const refundList = [...refunds.values()]
  const totalRefunds = refundList.length
  const pendingRefunds = refundList.filter(
    (r) => r.status === "pending" || r.status === "approved"
  ).length
  const completedRefunds = refundList.filter(
    (r) => r.status === "completed"
  ).length
  const totalRefundAmount = refundList.reduce(
    (sum, r) => sum + r.calculation.totalRefund,
    0
  )
  const refundRate = totalOrders > 0 ? Math.round((totalRefunds / totalOrders) * 100) : 0

  return {
    totalOrders,
    totalRefunds,
    pendingRefunds,
    completedRefunds,
    totalRefundAmount,
    refundRate,
  }
})

// ============ Grouped Orders by Payment Method ============
export const ordersByPaymentMethodAtom = Atom.make((get) => {
  const orders = get(orderListAtom)
  const grouped = new Map<Order["paymentMethod"], Order[]>()

  for (const order of orders) {
    const list = grouped.get(order.paymentMethod) ?? []
    list.push(order)
    grouped.set(order.paymentMethod, list)
  }

  return grouped
})
