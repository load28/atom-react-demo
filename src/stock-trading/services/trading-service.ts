import { Effect, Ref, HashMap } from "effect"
import type { Order, Holding, UserId, StockSymbol, OrderId } from "@/src/stock-trading/domain/model"
import { InsufficientBalance, InsufficientShares } from "@/src/stock-trading/domain/errors"
import { StockService } from "./stock-service"
import { AuthService } from "./auth-service"

let orderCounter = 0
const nextOrderId = (): OrderId => `order-${++orderCounter}` as OrderId

export class TradingService extends Effect.Service<TradingService>()("TradingService", {
  effect: Effect.gen(function* () {
    const orders = yield* Ref.make(HashMap.empty<OrderId, Order>())
    const holdings = yield* Ref.make(HashMap.empty<string, Holding>()) // key: `${userId}:${symbol}`

    const holdingKey = (userId: UserId, symbol: StockSymbol) => `${userId}:${symbol}`

    const placeBuyOrder = (userId: UserId, symbol: StockSymbol, quantity: number) =>
      Effect.gen(function* () {
        const stockService = yield* StockService
        const authService = yield* AuthService
        const stock = yield* stockService.getStock(symbol)
        const totalCost = stock.price * quantity
        const balance = yield* authService.getBalance(userId)

        if (balance < totalCost) {
          return yield* Effect.fail(new InsufficientBalance({ required: totalCost, available: balance }))
        }

        yield* authService.updateBalance(userId, balance - totalCost)

        const order: Order = {
          id: nextOrderId(),
          userId,
          symbol,
          type: "buy",
          quantity,
          price: stock.price,
          status: "filled",
          createdAt: new Date(),
          filledAt: new Date(),
        }
        yield* Ref.update(orders, HashMap.set(order.id, order))

        // 보유 수량 업데이트
        const key = holdingKey(userId, symbol)
        const currentHoldings = yield* Ref.get(holdings)
        const existing = HashMap.get(currentHoldings, key)

        if (existing._tag === "Some") {
          const prev = existing.value
          const newQuantity = prev.quantity + quantity
          const newAvgPrice = (prev.averagePrice * prev.quantity + stock.price * quantity) / newQuantity
          yield* Ref.update(holdings, HashMap.set(key, {
            symbol,
            quantity: newQuantity,
            averagePrice: newAvgPrice,
          } as Holding))
        } else {
          yield* Ref.update(holdings, HashMap.set(key, {
            symbol,
            quantity,
            averagePrice: stock.price,
          } as Holding))
        }

        return order
      })

    const placeSellOrder = (userId: UserId, symbol: StockSymbol, quantity: number) =>
      Effect.gen(function* () {
        const stockService = yield* StockService
        const authService = yield* AuthService
        const stock = yield* stockService.getStock(symbol)
        const key = holdingKey(userId, symbol)
        const currentHoldings = yield* Ref.get(holdings)
        const existing = HashMap.get(currentHoldings, key)

        if (existing._tag === "None" || existing.value.quantity < quantity) {
          return yield* Effect.fail(new InsufficientShares({
            symbol,
            required: quantity,
            available: existing._tag === "Some" ? existing.value.quantity : 0,
          }))
        }

        const totalRevenue = stock.price * quantity
        const balance = yield* authService.getBalance(userId)
        yield* authService.updateBalance(userId, balance + totalRevenue)

        const order: Order = {
          id: nextOrderId(),
          userId,
          symbol,
          type: "sell",
          quantity,
          price: stock.price,
          status: "filled",
          createdAt: new Date(),
          filledAt: new Date(),
        }
        yield* Ref.update(orders, HashMap.set(order.id, order))

        // 보유 수량 업데이트
        const prev = existing.value
        const newQuantity = prev.quantity - quantity
        if (newQuantity === 0) {
          yield* Ref.update(holdings, HashMap.remove(key))
        } else {
          yield* Ref.update(holdings, HashMap.set(key, {
            ...prev,
            quantity: newQuantity,
          } as Holding))
        }

        return order
      })

    const getOrders = (userId: UserId) =>
      Effect.map(Ref.get(orders), (map) =>
        [...HashMap.values(map)].filter((o) => o.userId === userId)
      )

    const getHoldings = (userId: UserId) =>
      Effect.map(Ref.get(holdings), (map) =>
        [...HashMap.entries(map)]
          .filter(([key]) => key.startsWith(`${userId}:`))
          .map(([, holding]) => holding)
      )

    return { placeBuyOrder, placeSellOrder, getOrders, getHoldings } as const
  }),
}) {}
