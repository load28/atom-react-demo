import { Data } from "effect"
import type { UserId, StockSymbol, OrderId } from "./model"

export class InvalidCredentials extends Data.TaggedError("InvalidCredentials")<{
  readonly username: string
}> {}

export class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: UserId
}> {}

export class StockNotFound extends Data.TaggedError("StockNotFound")<{
  readonly symbol: StockSymbol
}> {}

export class InsufficientBalance extends Data.TaggedError("InsufficientBalance")<{
  readonly required: number
  readonly available: number
}> {}

export class InsufficientShares extends Data.TaggedError("InsufficientShares")<{
  readonly symbol: StockSymbol
  readonly required: number
  readonly available: number
}> {}

export class OrderNotFound extends Data.TaggedError("OrderNotFound")<{
  readonly id: OrderId
}> {}
